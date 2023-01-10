const socket = io()
const messageContainer = document.getElementById('message-container')
const logContainer = document.getElementById('log-container')
const roomContainer = document.getElementById('room-container')
const messageForm = document.getElementById('send-container')
const orderButton = document.querySelectorAll('#button-add')
let orderDetail = '';
var userName = '';

// send food oder detail
function sendOrder(event) {
  let oderDetail = {
    orderUser : userName,
    foodTitle : event.getAttribute('data-title'),
    foodPrice : event.getAttribute('data-price')
  };
  
  socket.emit('send-order', oderDetail)
}

if (messageForm != null) {
  let name = prompt('What is your name?')
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
  appendMessage(`${data.message}`)
})

socket.on('user-connected', name => {
  appendLog(`${name} connected`)
})

socket.on('user-disconnected', name => {
  appendLog(`${name} disconnected`)
})

function appendMessage(message) {
  const messageElement = document.createElement('li')
  messageElement.innerText = message
  messageContainer.append(messageElement)
}

function appendLog(log) {
  const logElement = document.createElement('li')
  logElement.innerText = log
  logContainer.append(logElement)
}