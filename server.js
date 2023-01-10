const express = require('express')
const app = express()
const server = require('http').Server(app)
const port = '3000';
const io = require('socket.io')(server)
const Nightmare = require('nightmare')
const cheerio = require('cheerio');
const fs = require('fs');

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
  crawlerShopeeFood(req, res);
})

io.on('connection', socket => {
  socket.on('new-user', (room, name) => {
    socket.join(room)
    rooms[room].users[socket.id] = name
    socket.to(room).broadcast.emit('user-connected', name)
  })
  socket.on('send-chat-message', (room, name, message) => {
    socket.to(room).broadcast.emit('chat-message', { room: room, name: name, message: message, })
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
    let json = [];
    // Saving order detail to file
    fs.readFile(__dirname + '/data/order.json',  function (err, data) {
      json = JSON.parse(data);
      json.push(JSON.stringify(orderDetail));
      console.log(json);
    });    

    fs.writeFile(__dirname + '/data/order.json', JSON.stringify(json), function(err){
      if (err) throw err;
      console.log('Data was appended to file!');
    });

    // Send order detail to views
    let orderMessage = orderDetail.orderUser + ' đã đặt ' + orderDetail.foodTitle + ' x ' + orderDetail.foodPrice
    socket.emit('chat-message', {message: orderMessage});
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
    console.log(shopUrl)
    console.log("Crawling data complete...")
    res.render('menu', { roomName: req.params.room, foods: foodsData })
  }
}