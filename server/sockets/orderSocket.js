const axios = require("axios");
const Order = require("../models/Order");
const convertNumber = require("../utils/convertNumber");
const { emitOrderUpdate } = require("../utils/socketBroadcast");
const { BDCOURIER_SECRET_KEY } = require("../config/env");

// --- অর্ডার স্ট্যাটাস আপডেট ---
async function handleUpdateStatus(io, socket, { orderId, newStatus, note }) {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        orderStatus: newStatus,
        $push: { activities: { description: note, type: newStatus } },
      },
      { new: true },
    );

    if (!updatedOrder) {
      return socket.emit("statusUpdated", { success: false, message: "Order not found" });
    }

    socket.emit("statusUpdated", { success: true, order: updatedOrder });
    emitOrderUpdate(io, updatedOrder);
  } catch (err) {
    console.error("Error updating status:", err);
    socket.emit("statusUpdated", { success: false, message: "Database update failed" });
  }
}

// --- নোট যোগ করা ---
async function handleAddNote(socket, { orderId, note }) {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(orderId, { note }, { new: true });
    if (updatedOrder) {
      socket.emit("noteAdded", { updatedOrder });
    }
  } catch (err) {
    console.error("Error adding note:", err);
  }
}

// --- কাস্টমারের সব কুরিয়ার হিস্ট্রি (bdcourier API) ---
async function handleAllCourierHistory(socket, { orderId }) {
  try {
    const orderDoc = await Order.findById(orderId).select("castomerPhone");
    if (!orderDoc) return;

    if (!Array.isArray(orderDoc.castomerPhone)) {
      return socket.emit("distributecourierHistory", {
        result: "bdCourier api response error",
        success: false,
      });
    }

    const count = { success: 0, cancel: 0 };

    await Promise.all(
      orderDoc.castomerPhone.map(async (phone) => {
        const engNum = convertNumber(phone);
        const res = await axios.post(
          "https://bdcourier.com/api/courier-check",
          { phone: engNum },
          { headers: { Authorization: `Bearer ${BDCOURIER_SECRET_KEY}` } },
        );
        if (res.data) {
          count.success += res.data?.courierData?.summary?.success_parcel || 0;
          count.cancel += res.data?.courierData?.summary?.cancelled_parcel || 0;
        }
      }),
    );

    const updatedOrder = await Order.findByIdAndUpdate(
      orderDoc._id,
      {
        $set: {
          "courierHistory.all.success": count.success,
          "courierHistory.all.cancel": count.cancel,
        },
      },
      { new: true },
    );

    socket.emit("distributecourierHistory", { result: updatedOrder, success: true });
  } catch (err) {
    console.error("Error getting order history:", err);
  }
}

// --- সার্চ কোয়েরি হ্যান্ডেল (মডারেটর হলে শুধু নিজের অর্ডারের মধ্যে সার্চ হবে) ---
async function handleSearchQuery(socket, q) {
  try {
    const safeQuery = (q || "").trim();
    if (!safeQuery) {
      socket.emit("searchResult", { orders: [] });
      return;
    }
    const regex = new RegExp(safeQuery, "i");

    const ownershipFilter =
      socket.user?.role === "moderator" ? { createdBy: socket.user._id } : {};

    const orders = await Order.find({
      ...ownershipFilter,
      $or: [
        { castomerPhone: { $regex: regex } },
        { castomerName: { $regex: regex } },
        { rawInputText: { $regex: regex } },
        { "courier.trackingId": { $regex: regex } },
      ],
    }).limit(5);

    socket.emit("searchResult", { orders });
  } catch (err) {
    console.error("Search error:", err);
    socket.emit("searchResult", { orders: [] });
  }
}

// --- প্রতিটি নতুন Socket connection-এর জন্য সব event listener রেজিস্টার করা ---
function registerOrderSocketHandlers(io, socket) {
  socket.on("updateStatus", (payload) => handleUpdateStatus(io, socket, payload));

  socket.on("addNote", (payload) => handleAddNote(socket, payload));

  socket.on("allCourierHistory", (payload) => handleAllCourierHistory(socket, payload));

  socket.on("searchQuery", (q) => handleSearchQuery(socket, q));

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
}

module.exports = registerOrderSocketHandlers;
