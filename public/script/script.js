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
const TOASTR_ERROR = 'error'
const TOASTR_SUCCESS = 'success'
const ORDER_ERROR = '400'
const ORDER_SUCCESS = '200'

var orderDetail = ''
var orderJson;
var cookieUserName = getCookie('userName');

function confirmUserName() {
    userName = txtuserName.value;
    document.getElementById("popup-username").style.display = "none";
    setCookie('userName', userName, 1);
    appendLog('You joined')
    socket.emit('new-user', roomName, userName)
}

function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
    document.getElementById("carousel_329e").classList.remove('disable-event');
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function eraseCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

/**
 * Display popup define username
 */
if (cookieUserName == null || cookieUserName.length < 1) {
    document.getElementById("popup-username").style.display = "block";
    document.getElementById("carousel_329e").classList.add('disable-event');
} else {
    document.getElementById("popup-username").style.display = "none";
    document.getElementById("carousel_329e").classList.remove('disable-event');
    socket.emit('old-user', roomName, cookieUserName)
}

/**
 * Notify message
 */
function notify(type, mainMessage, subMessage) {
    toastr.options.progressBar = true;
    toastr.options.timeOut = 3000;
    toastr.options.extendedTimeOut = 2000;
    toastr.options.showMethod = 'slideDown';
    toastr.options.hideMethod = 'slideUp';
    toastr.options.closeMethod = 'slideUp';
    toastr.options.closeButton = true;

    if (TOASTR_ERROR === type) {
        return toastr.error(subMessage, mainMessage)
    }
    if (TOASTR_SUCCESS === type) {
        return toastr.success(subMessage, mainMessage)
    }
}

/**
 * Get Current Time
 * 
 */
function getCurrentTime() {
    var currentDate = new Date();
    return String(currentDate.getHours()).padStart(2, '0') + ":"
        + String(currentDate.getMinutes()).padStart(2, '0') + ":"
        + String(currentDate.getSeconds()).padStart(2, '0');
}

/**
 * Send food oder detail
 * 
 */
function sendOrder(event) {

    let userName = getCookie('userName')

    if (userName === null || userName.length < 1) {
        // User name undefined
        return notify(TOASTR_ERROR, 'Username undefined', 'Please check cookies!')
    }

    orderDetail = {
        roomName: roomName,
        orderUser: userName,
        foodTitle: event.getAttribute('data-title'),
        foodPrice: event.getAttribute('data-price'),
        orderTime: getCurrentTime()
    };

    // submit order
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

/**
 * Handle Order Status & Display Order
 */
socket.on('receive-order', orderDetail => {
    if (ORDER_SUCCESS === orderDetail.status) {
        appendMessage(orderDetail)

        // ORDER SUCCESS
        notify(TOASTR_SUCCESS, 'Order Success', orderDetail.foodTitle + ' has been added')
    } else {        
        // ORDER FAILED
        notify(TOASTR_ERROR, 'Order Failed', 'Something went wrong')
    }
})

function appendMessage(orderDetail) {
    const el = document.createElement('div')
    let el1 = "<li>"
    let el2 = "<span id='order-info'>" + orderDetail.orderUser + " đã đặt " + orderDetail.foodTitle + " x " + orderDetail.foodPrice + " [" + orderDetail.orderTime + "]" + "</span>"
    let el3 = "</li>"
    el.innerHTML = el1 + el2 + el3
    orderContainer.appendChild(el)
}

function appendLog(log) {
    const logElement = document.createElement('li')
    logElement.innerText = log
    logContainer.append(logElement)
}