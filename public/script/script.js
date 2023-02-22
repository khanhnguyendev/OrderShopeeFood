const socket = io();
const orderContainer = document.getElementById("display-order");
const summaryContainer = document.getElementById("display-summary");
const roomContainer = document.getElementById("room-container");
const messageForm = document.getElementById("send-container");
const orderButton = document.querySelectorAll("#button-add");
const showButton = document.getElementById("showDialog");
const nameModal = document.getElementById("name-modal");
const txtuserName = document.getElementById("userName");
const confirmBtn = document.getElementById("confirmBtn");
const TOASTR_ERROR = "error";
const TOASTR_SUCCESS = "success";
const TOASTR_WARNING = "warning";
const ERROR = "400";
const SUCCESS = "200";

var orderDetail = "";
var orderJson;
var cookieUserName = getCookie("userName");

function confirmUserName() {
  userName = txtuserName.value;
  document.getElementById("popup-username").style.display = "none";
  setCookie("userName", userName, 1);
  // appendLog('You joined')
  socket.emit("new-user", roomName, userName);
}

function setCookie(name, value, days) {
  var expires = "";
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
  document.getElementById("carousel_329e").classList.remove("disable-event");
}

function getCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function eraseCookie(name) {
  document.cookie = name + "=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
}

/**
 * Display popup define username
 */
if (cookieUserName == null || cookieUserName.length < 1) {
  document.getElementById("popup-username").style.display = "block";
  document.getElementById("carousel_329e").classList.add("disable-event");
} else {
  document.getElementById("popup-username").style.display = "none";
  document.getElementById("carousel_329e").classList.remove("disable-event");
  socket.emit("old-user", roomName, cookieUserName);
}

/**
 * Popup confirm order
 */
function showPopupConfirmOrder(e) {
  document.getElementsByClassName("modal-container")[0].className += " open";
  document.getElementById("popup-confirm").style.display = "block";

  // Fill form
  document.getElementById("txtFoodName").innerHTML =
    e.getAttribute("data-title");
  document.getElementById("txtFoodPrice").innerHTML =
    e.getAttribute("data-price");
  document.getElementById("txtFoodDes").innerHTML =
    e.getAttribute("data-des").length == 0
      ? `No description`
      : e.getAttribute("data-des");
}

function closePopupConfirmOrder() {
  document
    .getElementsByClassName("modal-container")[0]
    .classList.remove("open");
  document.getElementById("popup-confirm").style.display = "none";
}

/**
 * Notify message
 */
function notify(type, mainMessage, subMessage) {
  toastr.options = {
    width: 400,
    progressBar: true,
    timeOut: 3000,
    extendedTimeOut: 2000,
    showMethod: "slideDown",
    hideMethod: "slideUp",
    closeMethod: "slideUp",
    closeButton: true,
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
  return (
    String(currentDate.getHours()).padStart(2, "0") +
    ":" +
    String(currentDate.getMinutes()).padStart(2, "0") +
    ":" +
    String(currentDate.getSeconds()).padStart(2, "0")
  );
}

/**
 * Send food oder detail
 *
 */
function sendOrder(event) {
  try {
    const userName = getCookie("userName");
    if (!userName || userName.length < 1) {
      // User name undefined
      return notify(
        TOASTR_ERROR,
        "Username undefined",
        "Please remove cookies then try again!"
      );
    }

    const orderDetail = {
      roomName: roomName,
      orderUser: userName,
      foodTitle: document.getElementById("txtFoodName").innerText,
      foodPrice: document.getElementById("txtFoodPrice").innerText,
      orderTime: getCurrentTime(),
      foodAmount: document.getElementById("txtFoodQty").value,
      note: document.getElementById("txtNote").value,
    };
    closePopupConfirmOrder();
    socket.emit("send-order", orderDetail);
  } catch (error) {
    notify(TOASTR_ERROR, "Error", error.message);
  }
}

socket.on("room-created", (room) => {
  const roomElement = document.createElement("div");
  roomElement.innerText = room;
  const roomLink = document.createElement("a");
  roomLink.href = `/${room}`;
  roomContainer.append(roomElement);
  roomContainer.append(roomLink);
});

// socket.on('user-connected', name => {
//     appendLog(`${name} connected`)
// })

// socket.on('user-disconnected', name => {
//     appendLog(`${name} disconnected`)
// })

// Listen for order event
socket.on("receive-order", (orderResult) => {
  switch (orderResult.status) {
    case SUCCESS:
      appendMessage(orderResult.orderDetail, orderResult.sumOrders);
      notify(
        TOASTR_SUCCESS,
        `Order Success`,
        `${orderResult.orderDetail.orderUser} : ${orderResult.orderDetail.foodTitle}`
      );
      break;

    default:
      notify(TOASTR_ERROR, "Order Failed", "Something went wrong");
      break;
  }
});

// Listen for clear order event
socket.on("clear-order", (orderId) => {
  // Find order element and remove it
  const deletedOrder = document.getElementById(orderId);
  deletedOrder.parentNode.removeChild(deletedOrder);
});

function appendMessage(orderDetail, summaryOrders) {
  appendOrder(orderDetail);
  appendSummary(summaryOrders);
}

function appendOrder(orderDetail) {
  const orderId = orderDetail.orderId;
  const orderEl = document.getElementById(orderId);

  if (orderEl) {
    // DUPLICATE ORDER
    orderEl.querySelector(
      "#food-amount-txt"
    ).innerHTML = `${orderDetail.foodAmount} x `;
    orderEl.querySelector("#note-txt").innerHTML = `Note: ${orderDetail.note}`;
  } else {
    // NEW ORDER
    const el = document.createElement("li");
    el.id = orderId;
    el.setAttribute("onclick", "confirmDelete(this)");
    el.setAttribute("data-room", orderDetail.roomName);
    el.setAttribute("data-user", orderDetail.orderUser);
    el.setAttribute("data-food", orderDetail.foodTitle);
    el.setAttribute("data-price", orderDetail.foodPrice);
    el.setAttribute("data-time", orderDetail.orderTime);

    el.innerHTML = `
            <span class="order-detail">
                <img class="user-avatar" alt="User Avatar" src="https://haycafe.vn/wp-content/uploads/2022/03/hinh-meo-hai-huoc.jpg">
                <div class="order-text">
                  <div id="order-info-1"><label id="user-txt">${orderDetail.orderUser} </label><label id="order-time-txt">${orderDetail.orderTime}</label></div>
                  <div id="order-info-2"><label id="food-amount-txt">${orderDetail.foodAmount} x </label>${orderDetail.foodTitle} x ${orderDetail.foodPrice}</div>
                  <div id="order-info-2"><label id="note-txt">Note: ${orderDetail.note}</label></div>
                </div>
            </span>
        `;

    orderContainer.appendChild(el);
  }
}

function appendSummary(summaryOrders) {
  while (summaryContainer.firstChild) {
    summaryContainer.removeChild(summaryContainer.firstChild);
  }
  let totalItems = 0;
  let totalPrice = 0;

  summaryOrders.forEach((sumDetail) => {
    const el = document.createElement("div");
    el.classList.add("summary-detail");
    el.innerHTML = `
        <div class="summary-info">
            <span class="sum-qty-txt">${sumDetail.foodAmount}</span>
            <span class="sum-food-txt">${sumDetail.foodTitle}</span>
        </div>
        <div class="sum-total-txt">
            <span>${sumDetail.foodPrice},000đ</span>
        </div>
      `;
    summaryContainer.appendChild(el);
    totalItems += sumDetail.foodAmount;
    totalPrice += sumDetail.foodPrice;
  });

  const subTotalEl = document.getElementById("sub-total-txt");
  subTotalEl.innerHTML = `Subtotal (${totalItems} items)`

  const totalPriceEl = document.getElementById("total-price-txt");
  totalPriceEl.innerHTML = `${totalPrice},000đ`;


  
}

/**
 * Delete Order
 */
function confirmDelete(event) {
  let selectedOrder = {
    roomName: event.getAttribute("data-room"),
    orderId: event.getAttribute("id"),
    foodTitle: event.getAttribute("data-food"),
    orderUser: event.getAttribute("data-user"),
    foodPrice: event.getAttribute("data-price"),
    orderTime: event.getAttribute("data-time"),
    deleteUser: getCookie("userName"),
  };
  fetch("/delete?order=" + encodeURIComponent(JSON.stringify(selectedOrder)), {
    method: "post",
  })
    .then((response) => {
      if (response.status === 200) {
        notify(
          TOASTR_SUCCESS,
          "Delete Order Success",
          `${selectedOrder.foodTitle}`
        );
      } else if (response.status === 401) {
        notify(
          TOASTR_ERROR,
          "Fail to delete your order",
          "You do not have permission!!"
        );
      } else {
        notify(
          TOASTR_ERROR,
          "Fail to delete your order",
          "Something went wrong"
        );
      }
    })
    .catch((err) => {
      notify(TOASTR_ERROR, "Fail to delete your order", err);
    });
}
