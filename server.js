const express = require('express')
const https = require('https');
const app = express()
const server = require('http').Server(app)
const port = '3000';
const io = require('socket.io')(server)
const Nightmare = require('nightmare')
const cheerio = require('cheerio');
const fs = require('fs');
const CONNECTION = 'CONNECTION'
const DATA = 'DATA'
const DEBUG = 'DEBUG'


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
    logWriter(DATA, 'Menu has been reset')
  })
  // Clear order log before create new room
  fs.writeFile(__dirname + "/data/orders.json", '[]', function () {
    logWriter(DATA, 'Order log has been cleared')
  })
  rooms[req.body.orderShopName] = { users: {} }
  shopUrl = req.body.orderShopUrl;
  res.redirect(req.body.orderShopName)
  // Send message that new room was created
  io.emit('room-created', req.body.orderShopName)
})

app.get('/api/order', (req, res) => {
  // let order = fs.readFileSync(__dirname + "/data/menu.json");
  // let orderJson = JSON.parse(order)
  let obj;
  let orders = [];
  fs.readFile(__dirname + "/data/orders.json", 'utf8', function (err, data) {
    if (err) throw err;
    obj = JSON.parse(data);
    logWriter(DATA, obj);

    for (let i = 0; i < obj.length; i++) {
      let ob = obj[i];
      orders.push(ob)
    }

    res.setHeader('Content-Type', 'application/json');
    res.json(orders);
  });
})

app.get('/:room', (req, res) => {
  if (rooms[req.params.room] == null) {
    return res.redirect('/')
  } else {
    let menuJson = fs.readFileSync(__dirname + "/data/menu.json");
    if (menuJson.length < 3) {
      crawlerShopeeFood(req, res);
    } else {
      let orderJson = fs.readFileSync(__dirname + "/data/orders.json");
      res.render('menu', { roomName: req.params.room, foods: JSON.parse(menuJson), orders: JSON.parse(orderJson) })
    }
  }

})


io.on('connection', socket => {
  socket.on('new-user', (room, name) => {
    socket.join(room)
    rooms[room].users[socket.id] = name
    socket.to(room).broadcast.emit('user-connected', name)
    logWriter(CONNECTION, name + ' connected to ' + room)
  })

  socket.on('old-user', (room, name) => {
    socket.join(room)
    rooms[room].users[socket.id] = name
    socket.to(room).broadcast.emit('user-connected', name)
    logWriter(CONNECTION, name + ' connected to ' + room)
  })

  socket.on('disconnect', () => {
    getUserRooms(socket).forEach(room => {
      socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id])
      logWriter(CONNECTION, rooms[room].users[socket.id] + ' disconnect to ' + room)
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
      logWriter(DATA, "[New order added] " + orderDetail.orderUser + ' ' + orderDetail.foodTitle + ' ' + orderDetail.foodPrice + ' ' + orderDetail.orderTime);

      // Send order to client
      io.emit('receive-order', orderDetail)
    });

  })
})

server.listen(port, function () {
  logWriter(DEBUG, "Server is running ");
  logWriter(DEBUG, "http://localhost:" + port);
});

/**
* Get users room
*/
function getUserRooms(socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) names.push(name)
    return names
  }, [])
}

/**
* Get Date Time
*/
function getDateTime(type) {
  var currentDate = new Date();
  return "[" + String(currentDate.getDate()).padStart(2, '0') + "/"
    + String((currentDate.getMonth() + 1)).padStart(2, '0') + "/"
    + currentDate.getFullYear() + " @ "
    + String(currentDate.getHours()).padStart(2, '0') + ":"
    + String(currentDate.getMinutes()).padStart(2, '0') + ":"
    + String(currentDate.getSeconds()).padStart(2, '0') + " --- " + type + "] ";
}

/**
 * Log Writer
 */
function logWriter(type, message) {
  console.log(getDateTime(type) + message)
}

function crawlerShopeeFood() {
  getResId()
}

/**
 * Get Restaurant ID
 */
async function getResId() {
  fetch('https://gappapi.deliverynow.vn/api/delivery/get_from_url?url=ho-chi-minh/con-soi-sua-tuoi-tran-chau-duong-den-nguyen-dinh-chieu', {
    method: 'GET',
    headers: {
      'authority': 'gappapi.deliverynow.vn',
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9',
      'origin': 'https://shopeefood.vn',
      'referer': 'https://shopeefood.vn/',
      'sec-ch-ua': '"Not?A_Brand";v="8", "Chromium";v="108", "Google Chrome";v="108"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
      'x-foody-access-token': '',
      'x-foody-api-version': '1',
      'x-foody-app-type': '1004',
      'x-foody-client-id': '',
      'x-foody-client-language': 'en',
      'x-foody-client-type': '1',
      'x-foody-client-version': '3.0.0'
    },
  })
    .then(response => response.json())
    .then(response => console.log(JSON.stringify(response)))
}

// /**
// * Crawling data shopee food
// */
// function crawlerShopeeFood() {
//   const nightmare = Nightmare({ show: false })
//   nightmare
//     .goto(shopUrl)
//     .wait('body')
//     .wait('.menu-restaurant-list')
//     .evaluate(() => document.querySelector('div#restaurant-item').innerHTML)
//     .end()
//     .then(response => {
//       getData(response);
//     }).catch(err => {
//       logWriter(DEBUG, err);
//     });

//   let getData = html => {
//     let foodsData = []
//     let ordersData = []
//     const $ = cheerio.load(html);
//     $('.item-restaurant-row').each((i, elem) => {
//       let item = {
//         title: $(elem).find('.item-restaurant-info > .item-restaurant-name').text(),
//         image: $(elem).find('img').attr('src'),
//         des: $(elem).find('div.item-restaurant-desc').text(),
//         price: $(elem).find('div.current-price').text()
//       }
//       foodsData.push(item)
//     })

//     fs.writeFile(__dirname + "/data/menu.json", JSON.stringify(foodsData), 'utf8', function (err) {
//       if (err) {
//         logWriter(DEBUG, "An error occured while writing JSON Object to File.");
//         return logWriter(err);
//       }
//       logWriter(DEBUG, shopUrl)
//       logWriter(DEBUG, "Crawling data complete...")

//       // Render HTML
//       res.render('menu', { roomName: req.params.room, foods: foodsData, orders: ordersData })
//     });
//   }
// }