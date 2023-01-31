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
const TOASTR_WARNING = 'warning'
const ERROR = '400'
const SUCCESS = '200'

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

    toastr.options = {
        progressBar: true,
        timeOut: 3000,
        extendedTimeOut: 2000,
        showMethod: 'slideDown',
        hideMethod: 'slideUp',
        closeMethod: 'slideUp',
        closeButton: true
    };

    switch (type) {
        case TOASTR_ERROR:
            return toastr.error(subMessage, mainMessage);
        case TOASTR_SUCCESS:
            return toastr.success(subMessage, mainMessage);
        case TOASTR_WARNING:
            return toastr.warning(subMessage, mainMessage);
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

let nextOrderId = 1;

/**
 * Send food oder detail
 * 
 */
function sendOrder(event) {

    const userName = getCookie('userName')

    if (!userName || userName.length < 1) {
        // User name undefined
        return notify(TOASTR_ERROR, 'Username undefined', 'Please check cookies!')
    }

    orderDetail = {
        roomName: roomName,
        orderUser: userName,
        foodTitle: event.getAttribute('data-title'),
        foodPrice: event.getAttribute('data-price'),
        orderTime: getCurrentTime(),
        foodAmount: 1
    };

    // submit order
    socket.emit('send-order', orderDetail)
}

// Listen for the clear order event
socket.on('clear-order', (orderId) => {
    // Find order element and remove it
    const deletedOrder = document.getElementById(orderId)
    deletedOrder.parentNode.removeChild(deletedOrder);
});

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
    if (SUCCESS === orderDetail.status) {
        appendMessage(orderDetail)

        // ORDER SUCCESS
        notify(TOASTR_SUCCESS, 'Order Success', orderDetail.foodTitle + ' has been added')
    } else {
        // ORDER FAILED
        notify(TOASTR_ERROR, 'Order Failed', 'Something went wrong')
    }
})


function appendMessage(orderDetail) {
    // DUPLICATE ORDER
    const isDuplicateOrder = document.getElementById(orderDetail.orderId)
    if (isDuplicateOrder) {
        isDuplicateOrder.querySelector("#food-amount").innerHTML = `[SL: ${orderDetail.foodAmount}]`
    }
    // NEW ORDER
    else {
        const el = document.createElement('li');
        el.id = orderDetail.orderId;
        el.setAttribute('onclick', "confirmDelete(this)");
        el.setAttribute('data-room', orderDetail.roomName);
        el.setAttribute('data-user', orderDetail.orderUser);
        el.setAttribute('data-food', orderDetail.foodTitle);
        el.setAttribute('data-price', orderDetail.foodPrice);
        el.setAttribute('data-time', orderDetail.orderTime);

        el.innerHTML = `<span id="order-info">
                          <label id="red-txt">${orderDetail.orderUser}</label> order 
                          <label id="red-txt">${orderDetail.foodTitle}</label> x ${orderDetail.foodPrice} [${orderDetail.orderTime}] <label id="food-amount">[SL: ${orderDetail.foodAmount}]</lbel>
                        </span>`;
        orderContainer.appendChild(el);
    }
}


function appendLog(log) {
    const logElement = document.createElement('li')
    logElement.innerText = log
    logContainer.append(logElement)
}

/**
 * Delete Order
 */
function confirmDelete(event) {
    let selectedOrder = {
        roomName: event.getAttribute('data-room'),
        orderId: event.getAttribute('id'),
        foodTitle: event.getAttribute('data-food'),
        orderUser: event.getAttribute('data-user'),
        foodPrice: event.getAttribute('data-price'),
        orderTime: event.getAttribute('data-time'),
        deleteUser: getCookie('userName')
    }
    fetch('/delete?order=' + encodeURIComponent(JSON.stringify(selectedOrder)), {
        method: 'post',
    }).then(function (response) {
        if (200 === response.status) {
            // DELETE SUCCESS
            notify(TOASTR_SUCCESS, 'Delete Order Success', orderDetail.foodTitle + ' has been deleted')
        } else if (401 === response.status) {
            // DELETE FAILED
            notify(TOASTR_ERROR, 'Fail to delete your order', 'You do not have permission!!')
        } else {
            // DELETE FAILED
            notify(TOASTR_ERROR, 'Fail to delete your order', 'Something went wrong')
        }
    }).catch(function (err) {
        // DELETE FAILED
        notify(TOASTR_ERROR, 'Fail to delete your order', err)
    });
}