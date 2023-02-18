const express = require("express");
const https = require("https");
const app = express();
const server = require("http").Server(app);
const port = process.env.PORT || 3000;
const io = require("socket.io")(server);
const Nightmare = require("nightmare");
const cheerio = require("cheerio");
const fs = require("fs");
require = require("esm")(module);

const CONNECTION = "CONNECTION";
const DATA = "DATA";
const DEBUG = "DEBUG";
const SUCCESS = "200";
const ERROR = "400";
const AUTHORITY = "401";
let shopUrl = "";

app.set("views", "./views");
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));

const rooms = {};

app.get("/", (req, res) => {
  res.render("index", { rooms: rooms });
});

app.post("/room", (req, res) => {
  // Handle url not available
  if (rooms[req.body.orderShopName] != null) {
    return res.redirect("/");
  }

  // Clear menu before create new room
  fs.writeFile(__dirname + "/dataJSON/menu.json", "[]", function () {
    logWriter(DATA, "Menu has been reset");
  });

  // Clear order log before create new room
  fs.writeFile(__dirname + "/dataJSON/orders.json", "[]", function () {
    logWriter(DATA, "Order log has been cleared");
  });
  rooms[req.body.orderShopName] = { users: {} };

  // Get shop url
  shopUrl = req.body.orderShopUrl;

  res.redirect(req.body.orderShopName);

  // Send message that new room was created
  io.emit("room-created", req.body.orderShopName);
});

// app.get('/:room', (req, res) => {
//   if (rooms[req.params.room] == null) {
//     return res.redirect('/')
//   } else {
//     let menuJson = fs.readFileSync(__dirname + "/dataJSON/menu.json");
//     if (menuJson.length < 3) {
//       fetchShopeeFood(req, res);
//     } else {
//       let orderJson = fs.readFileSync(__dirname + "/dataJSON/orders.json");
//       res.render('room', { roomName: req.params.room, foods: JSON.parse(menuJson), orders: JSON.parse(orderJson) })
//     }
//   }
// })

app.get("/:room", (req, res) => {
  const room = rooms[req.params.room];
  if (!room) {
    return res.redirect("/");
  }

  const menuJson = fs.readFileSync(__dirname + "/dataJSON/menu.json");
  if (menuJson.length < 3) {
    return fetchShopeeFood(req, res);
  }

  const orderJson = fs.readFileSync(__dirname + "/dataJSON/orders.json");
  res.render("room", {
    roomName: req.params.room,
    foods: JSON.parse(menuJson),
    orders: JSON.parse(orderJson),
  });
});

app.post("/delete", (req, res) => {
  // Deleted order
  let selectedOrd = JSON.parse(req.query.order);

  // Fetching order history
  orders = fs.readFileSync(__dirname + "/dataJSON/orders.json");

  let orderIdDeleted;

  if (orders.length > 2) {
    let ordersJson = JSON.parse(orders);

    let deletedOrderId = selectedOrd.orderId;

    ordersJson.forEach((order) => {
      if (order.orderId == deletedOrderId) {
        if (order.orderUser === selectedOrd.deleteUser) {
          // Find the index of the item to be removed
          let itemIdx = ordersJson.findIndex(
            (item) => item.orderId == deletedOrderId
          );

          // Remove the item using splice
          ordersJson.splice(itemIdx, 1);

          orderIdDeleted = deletedOrderId;

          // Delete log
          logWriter(
            DATA,
            `[Deleted order] [User: ${
              selectedOrd.deleteUser
            }] [${JSON.stringify(selectedOrd)}]`
          );
        }
      }
    });

    if (!orderIdDeleted) {
      res.status(AUTHORITY).send("You do not have permision!!");
    } else {
      // Delele order from file
      fs.writeFile(
        __dirname + "/dataJSON/orders.json",
        JSON.stringify(ordersJson),
        "utf8",
        function (err) {
          // Error checking
          if (err) {
            logWriter(DEBUG, err);
            // Fail to delete order
            res.status(ERROR).send("Fail to delete your order!!");
          }
        }
      );
      io.emit("clear-order", orderIdDeleted);
      res.status(SUCCESS).send("Delete order success!!");
    }
  } else {
    // Fail to delete order
    res.status(ERROR).send("Fail to delete your order!!");
  }
});

io.on("connection", (socket) => {
  socket.on("new-user", (room, name) => {
    socket.join(room);
    rooms[room].users[socket.id] = name;
    socket.to(room).broadcast.emit("user-connected", name);
    logWriter(CONNECTION, name + " connected to " + room);
  });

  socket.on("old-user", (room, name) => {
    socket.join(room);
    rooms[room].users[socket.id] = name;
    socket.to(room).broadcast.emit("user-connected", name);
    logWriter(CONNECTION, name + " connected to " + room);
  });

  socket.on("disconnect", () => {
    getUserRooms(socket).forEach((room) => {
      socket
        .to(room)
        .broadcast.emit("user-disconnected", rooms[room].users[socket.id]);
      logWriter(
        CONNECTION,
        rooms[room].users[socket.id] + " disconnect to " + room
      );
      delete rooms[room].users[socket.id];
    });
  });

  /**
   * Send order detail
   */
  socket.on("send-order", (orderReq) => {
    // Validate Order User
    if (orderReq.orderUser === null || orderReq.orderUser.length < 1) {
      // ORDER FAILED
      orderReq.status = ERROR;
      io.emit("receive-order", orderReq);
    } else {
      // Fetching orders history
      orders = fs.readFileSync(__dirname + "/dataJSON/orders.json");
      let ordersJson = JSON.parse(orders);
      let isDuplicateOrder = false;

      // Duplicate order
      for (const order of ordersJson) {
        if (
          order.orderUser === orderReq.orderUser &&
          order.foodTitle === orderReq.foodTitle
        ) {
          // Update food amount
          order.foodAmount = parseInt(order.foodAmount) + orderReq.foodAmount;

          // Update order request
          orderReq.orderId = order.orderId;
          orderReq.foodAmount = order.foodAmount;

          // Update note
          order.note = orderReq.note;

          // Duplicate Order flag
          isDuplicateOrder = true;
          break;
        }
      }

      // New order
      if (!isDuplicateOrder) {
        orderReq.orderId = ordersJson.length + 1;
        ordersJson.push(orderReq);
      }

      // Saving orders to file
      fs.writeFile(
        __dirname + "/dataJSON/orders.json",
        JSON.stringify(ordersJson),
        "utf8",
        function (err) {
          // Error checking
          if (err) {
            logWriter(DEBUG, err);

            // ORDER FAILED
            orderReq.status = ERROR;
            return io.emit("receive-order", orderReq);
          }
          logWriter(
            DATA,
            `[New order] [User: ${orderReq.orderUser}] [ID: ${orderReq.orderId}] [${orderReq.foodTitle} ${orderReq.foodPrice} ${orderReq.orderTime} ${orderReq.note}]`
          );

          // ORDER SUCCESS
          orderReq.status = SUCCESS;

          // Send order to client
          io.emit("receive-order", orderReq);
        }
      );
    }
  });

  /**
   * Detele Order
   */
  socket.on("delete-confirm", (orderDetail) => {
    // Fetching order history
    orders = fs.readFileSync(__dirname + "/dataJSON/orders.json");
    if (orders.length > 2) {
      let ordersJson = JSON.parse(orders);

      let selectedOrder = {
        roomName: orderDetail.roomName,
        orderUser: orderDetail.orderUser,
        foodTitle: orderDetail.foodTitle,
        foodprice: orderDetail.foodprice,
        orderTime: orderDetail.orderTime,
      };

      ordersJson.forEach((orderJson) => {
        if (orderJson === selectedOrder) {
          ordersJson.splice(orderJson);
        }
      });

      // Delele order from file
      fs.writeFile(
        __dirname + "/dataJSON/orders.json",
        JSON.stringify(ordersJson),
        "utf8",
        function (err) {
          // Error checking
          if (err) {
            logWriter(DEBUG, err);

            // ORDER FAILED
            orderDetail.status = ERROR;
            return io.emit("delete-order", orderDetail);
          }

          // ORDER SUCCESS
          orderDetail.status = SUCCESS;

          // Send order to client
          io.emit("delete-order", orderDetail);
        }
      );
    }
  });
});

server.listen(port, function () {
  logWriter(DEBUG, "Server is running ");
  logWriter(DEBUG, "http://localhost:" + port);
});

/**
 * Get users room
 */
function getUserRooms(socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) names.push(name);
    return names;
  }, []);
}

/**
 * Get Date Time
 */
function getDateTime() {
  var currentDate = new Date();
  return (
    "[" +
    String(currentDate.getDate()).padStart(2, "0") +
    "/" +
    String(currentDate.getMonth() + 1).padStart(2, "0") +
    "/" +
    currentDate.getFullYear() +
    " @ " +
    String(currentDate.getHours()).padStart(2, "0") +
    ":" +
    String(currentDate.getMinutes()).padStart(2, "0") +
    ":" +
    String(currentDate.getSeconds()).padStart(2, "0")
  );
}

/**
 * Log Writer
 */
function logWriter(type, message) {
  console.log(getDateTime() + " " + type + "] " + message);
}

async function fetchShopeeFood(req, res) {
  getResId(req, res);
}

/**
 * Get Restaurant ID
 */
async function getResId(req, res) {
  import("node-fetch")
  .then((module) => {
    const fetch = module.default;

    fetch(
      "https://gappapi.deliverynow.vn/api/delivery/get_from_url?url=" +
        shopUrl.replace("https://shopeefood.vn/", ""),
      {
        method: "GET",
        headers: {
          "x-foody-access-token": "",
          "x-foody-api-version": "1",
          "x-foody-app-type": "1004",
          "x-foody-client-id": "",
          "x-foody-client-language": "en",
          "x-foody-client-type": "1",
          "x-foody-client-version": "3.0.0",
        },
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not OK");
        }
        return response.json();
      })
      .then((data) => {
        logWriter(DEBUG, "Get delivery info successful");
        getDeliveryDishes(data, req, res);
      })
      .catch((error) => {
        logWriter(
          DEBUG,
          "There has been a problem with your fetch operation" + error
        );
        logWriter(DEBUG, "getResId " + error);
      });
  })
  .catch((error) => console.error(error));
}

async function getDeliveryDishes(deliveryInfo, req, res) {
  let urlAPI = "https://gappapi.deliverynow.vn/api/dish/get_delivery_dishes?id_type=2&request_id=" + deliveryInfo.reply.delivery_id;

  import("node-fetch")
  .then((module) => {
    const fetch = module.default;

    fetch(urlAPI, {
      method: "GET",
      headers: {
        "x-foody-client-id": "",
        "x-foody-client-type": "1",
        "x-foody-app-type": "1004",
        "x-foody-client-version": "3.0.0",
        "x-foody-api-version": "1",
        "x-foody-client-language": "vi",
        "x-foody-access-token":
          "6cf780ed31c8c4cd81ee12b0f3f4fdaf05ddf91a29ffce73212e4935ed9295fd354df0f4bc015478450a19bf80fddbe13302a61aa0c705af8315aae5a8e9cd6b",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not OK");
        }
        return response.json();
      })
      .then((json) => {
        logWriter(DEBUG, "Get delivery detail successful");
        // Filter menu list
        getMenuJson(json, req, res);
      })
      .catch((error) => {
        logWriter(DEBUG, "There has been a problem with your fetch operation");
        logWriter(DEBUG, "getDeliveryDishes " + error);
      });
  })
  .catch((error) => console.error(error));
}

/**
 * Get menu list
 */
function getMenuJson(json, req, res) {
  let menuJson = [];
  json.reply.menu_infos.forEach((menuInfo) => {
    menuInfo.dishes.forEach((dish) => {
      let menu = {
        title: dish.name,
        image: dish.photos[1].value,
        des: dish.description,
        price: dish.price.text,
      };
      menuJson.push(menu);
    });
  });

  // Write to file
  saveMenuJson(menuJson, req, res);
}

/**
 * Saving menu list to file
 */
function saveMenuJson(menuJson, req, res) {
  let ordersData = [];

  fs.writeFile(
    __dirname + "/dataJSON/menu.json",
    JSON.stringify(menuJson),
    "utf8",
    function (err) {
      if (err) {
        logWriter(DEBUG, "An error occured while writing JSON Object to File.");
        return logWriter(err);
      }
      logWriter(DEBUG, "Saving menu JSON complete...");
    }
  );

  res.render("room", {
    roomName: req.params.room,
    foods: menuJson,
    orders: ordersData,
  });
}
