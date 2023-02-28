const mongoose = require("mongoose");

const OrderHistorySchema = new mongoose.Schema({
  roomName: String,
  userName: String,
  title: String,
  price: Number,
  qty: Number,
  date: Date,
});

const OrderHistory = mongoose.model("OrderHistory", OrderHistorySchema);

module.exports = { OrderHistory, OrderHistorySchema };