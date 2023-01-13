const socket = io()
const orderContainer = document.getElementById('display-order')
const logContainer = document.getElementById('log-container')
const roomContainer = document.getElementById('room-container')
const messageForm = document.getElementById('send-container')
const orderButton = document.querySelectorAll('#button-add')
const showButton = document.getElementById('showDialog');
const nameModal = document.getElementById('name-modal');
const txtuserName = document.getElementById('userName');
const confirmBtn = document.getElementById('confirmBtn');

var orderDetail = '';
var orderJson;
var cookieUserName = getCookie('userName');

// Polling to update data
// setInterval(function () {
//   fetch('/update', {
//     method: 'get'
//   }).then(function (response) {
//     // UPDATE WEATHER HERE
//     // const el = document.createElement('div')
//     // let el1 = "<li>"
//     // let el2 = "<strong id='order-user'>" + message.orderUser + "</strong>"
//     // let el3 = "<p id='order-info'>" + "đã đặt " + message.foodTitle + " x " + message.foodPrice + "</p>"
//     // let el4 = "</li>"
//     // el.innerHTML = el1 + el2 + el3 + el4

//     // orderContainer.appendChild(el)
//     console.log(response)
//   }).catch(function (err) {
//     // Error :(
//   });
// }, 10000) // milliseconds

async function fetchingJson() {
  await fetch('http://localhost:3000/api/order')
  .then((response) => response.json())
  .then((orders) => {
    orderJson = orders
  })
}


function confirmUserName() {
  userName = txtuserName.value;
  document.getElementById("inputForm").style.display = "none";
  setCookie('userName', userName, 1);
  appendLog('You joined')
  socket.emit('new-user', roomName, userName)
}

function setCookie(name, value, days) {
  var expires = "";
  if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days*24*60*60*1000));
      expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for(var i=0;i < ca.length;i++) {
      var c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1,c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  }
  return null;
}

function eraseCookie(name) {   
  document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

if (cookieUserName == null) {
  document.getElementById("inputForm").style.display = "block";
} else {
  document.getElementById("inputForm").style.display = "none";
  setInterval(fetchingJson, 1000);
  socket.emit('old-user', roomName, cookieUserName)
}

// if (messageForm != null) {
//   // let name = prompt('What is your name?')
//   // let name = 'Test'
//   // userName = name;
//   appendLog('You joined')
//   socket.emit('new-user', roomName, userName)

//   messageForm.addEventListener('submit', e => {
//     e.preventDefault()
//     // appendMessage(orderDetail)
//     // socket.emit('send-chat-message', roomName, userName, orderDetail)
//   })
// }

// send food oder detail
function sendOrder(event) {
  orderDetail = {
    roomName: roomName,
    orderUser: cookieUserName,
    foodTitle: event.getAttribute('data-title'),
    foodPrice: event.getAttribute('data-price')
  };

  socket.emit('send-order', orderDetail)
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

socket.on('receive-order', stream => {
  for (const order of orderJson) {
    appendMessage(order)
  }
})

function appendMessage(order) {
    const el = document.createElement('div')
    let el1 = "<li>"
    let el2 = "<strong id='order-user'>" + order.orderUser + "</strong>"
    let el3 = "<p id='order-info'>" + "đã đặt " + order.foodTitle + " x " + order.foodPrice + "</p>"
    let el4 = "</li>"
    el.innerHTML = el1 + el2 + el3 + el4
    orderContainer.appendChild(el)

}

function appendLog(log) {
  const logElement = document.createElement('li')
  logElement.innerText = log
  logContainer.append(logElement)
}