const express = require('express')
const app = express()
const server = require('http').Server(app)
const port = '3000';
const io = require('socket.io')(server)
const Nightmare = require('nightmare')
const cheerio = require('cheerio');
const fs = require('fs');
const { events } = require('socket.io/lib/namespace');

let shopUrl = '';

app.set('views', './views')
app.set('view engine', 'ejs')
app.use(express.static(__dirname + '/public'))
app.use(express.urlencoded({ extended: true }))

const rooms = {}

app.get('/', (req, res) => {
  res.render('index', { rooms: rooms })
})

app.post('/room', (req, res) => {
  // Create room with shop URL
  if (rooms[req.body.orderShopName] != null) {
    return res.redirect('/')
  }
  // Clear menu before create new room
  fs.writeFile(__dirname + "/data/menu.json", '[]', function () {
    console.log('Menu has been reset')
  })
  // Clear order log before create new room
  fs.writeFile(__dirname + "/data/orders.json", '[]', function () {
    console.log('Order log has been cleared')
  })
  rooms[req.body.orderShopName] = { users: {} }
  shopUrl = req.body.orderShopUrl;
  res.redirect(req.body.orderShopName)
  // Send message that new room was created
  io.emit('room-created', req.body.orderShopName)
})

app.get('/:room', (req, res) => {
  if (rooms[req.params.room] == null) {
    return res.redirect('/')
  }
  let menuJson = fs.readFileSync(__dirname + "/data/menu.json");
  if (menuJson.length < 3) {
    crawlerShopeeFood(req, res);
  } else {
    res.render('menu', { roomName: req.params.room, foods: JSON.parse(menuJson) })
  }
})

io.on('connection', socket => {
  socket.on('new-user', (room, name) => {
    socket.join(room)
    rooms[room].users[socket.id] = name
    socket.to(room).broadcast.emit('user-connected', name)
  })
  
  /**
   * Tracking orders
   */
  fs.watch(__dirname + "/data/orders.json", () => {
    let orders = fs.readFileSync(__dirname + "/data/orders.json")
    console.log("Sent JSON" + orders);
  })

  socket.on('disconnect', () => {
    getUserRooms(socket).forEach(room => {
      socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id])
      delete rooms[room].users[socket.id]
    })
  })

  /**
   * Send order detail
   */
  socket.on('send-order', (orderDetail) => {

    // Saving order detail to file
    orders = fs.readFileSync(__dirname + "/data/orders.json");
    let ordersJson = JSON.parse(orders);
    ordersJson.push(orderDetail);

    fs.writeFile(__dirname + "/data/orders.json", JSON.stringify(ordersJson), 'utf8', function (err) {
      // Error checking
      if (err) throw err;
      console.log("New order added: " + orderDetail.orderUser + ' ' + orderDetail.foodTitle + ' ' + orderDetail.foodPrice);
    });

  })
})

server.listen(port, function () {
  console.log("Server is running ");
  console.log("http://localhost:" + port);
});

function getUserRooms(socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) names.push(name)
    return names
  }, [])
}

function crawlerShopeeFood(req, res) {
  const nightmare = Nightmare({ show: false })
  nightmare
    .goto(shopUrl)
    .wait('body')
    .wait('.menu-restaurant-list')
    .evaluate(() => document.querySelector('div#restaurant-item').innerHTML)
    .end()
    .then(response => {
      getData(response);
    }).catch(err => {
      console.log(err);
    });

  let getData = html => {
    let foodsData = []
    const $ = cheerio.load(html);
    $('.item-restaurant-row').each((i, elem) => {
      let item = {
        title: $(elem).find('.item-restaurant-info > .item-restaurant-name').text(),
        image: $(elem).find('img').attr('src'),
        des: $(elem).find('div.item-restaurant-desc').text(),
        price: $(elem).find('div.current-price').text()
      }
      foodsData.push(item)
    })

    fs.writeFile(__dirname + "/data/menu.json", JSON.stringify(foodsData), 'utf8', function (err) {
      if (err) {
        console.log("An error occured while writing JSON Object to File.");
        return console.log(err);
      }

      console.log(shopUrl)
      console.log("Crawling data complete...")
      res.render('menu', { roomName: req.params.room, foods: foodsData })
    });
  }
}