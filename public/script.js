const socket = io()
const orderContainer = document.getElementById('display-order')
const logContainer = document.getElementById('log-container')
const roomContainer = document.getElementById('room-container')
const messageForm = document.getElementById('send-container')
const orderButton = document.querySelectorAll('#button-add')
let orderDetail = '';
var userName = '';

// send food oder detail
function sendOrder(event) {
  orderDetail = {
    roomName: roomName,
    orderUser: userName,
    foodTitle: event.getAttribute('data-title'),
    foodPrice: event.getAttribute('data-price')
  };

  socket.emit('send-order', orderDetail)
}

// // Polling to update data
// setInterval(function () {
//   fetch('/update', {
//     method: 'get'
//   }).then(function (response) {
//     // UPDATE WEATHER HERE
//     const el = document.createElement('div')
//     let el1 = "<li>"
//     let el2 = "<strong id='order-user'>" + message.orderUser + "</strong>"
//     let el3 = "<p id='order-info'>" + "đã đặt " + message.foodTitle + " x " + message.foodPrice + "</p>"
//     let el4 = "</li>"
//     el.innerHTML = el1 + el2 + el3 + el4

//     orderContainer.appendChild(el)
//   }).catch(function (err) {
//     // Error :(
//   });
// }, 100) // milliseconds

if (messageForm != null) {
  // let name = prompt('What is your name?')
  let name = 'Test'
  userName = name;
  appendLog('You joined')
  socket.emit('new-user', roomName, name)

  messageForm.addEventListener('submit', e => {
    e.preventDefault()
    appendMessage(orderDetail)
    socket.emit('send-chat-message', roomName, name, orderDetail)
  })
}

socket.on('room-created', room => {
  const roomElement = document.createElement('div')
  roomElement.innerText = room
  const roomLink = document.createElement('a')
  roomLink.href = `/${room}`
  roomContainer.append(roomElement)
  roomContainer.append(roomLink)
})

socket.on('chat-message', data => {
  appendMessage(data.message)
})

socket.on('user-connected', name => {
  appendLog(`${name} connected`)
})

socket.on('user-disconnected', name => {
  appendLog(`${name} disconnected`)
})

function appendMessage(message) {
  const el = document.createElement('div')
  let el1 = "<li>"
  let el2 = "<strong id='order-user'>" + message.orderUser + "</strong>"
  let el3 = "<p id='order-info'>" + "đã đặt " + message.foodTitle + " x " + message.foodPrice + "</p>"
  let el4 = "</li>"
  el.innerHTML = el1 + el2 + el3 + el4

  orderContainer.appendChild(el)
}

function appendLog(log) {
  const logElement = document.createElement('li')
  logElement.innerText = log
  logContainer.append(logElement)
}