const axios = require("axios");
const Order = require("../models/Order");
const DraftOrder = require("../models/DraftOrder");
const EventLog = require("../models/EventLog");
const convertNumber = require("../utils/convertNumber");
const { emitOrderUpdate } = require("../utils/socketBroadcast");
const { sendCapiEvent } = require("../utils/metaCapi");
const { buildActivity } = require("../utils/activityLogger");
const { BDCOURIER_SECRET_KEY } = require("../config/env");

// --- "Confirmed" হলে Meta CAPI-তে Purchase ইভেন্ট পাঠানো (একটা অর্ডারে সর্বোচ্চ একবারই) ---
async function triggerPurchaseEvent(order) {
  const alreadySent = await EventLog.findOne({
    order: order._id,
    eventName: "Purchase",
    status: "sent",
  });
  if (alreadySent) return; // দ্বিতীয়বার Confirm হলেও (বা ভুলে দুইবার ক্লিক হলেও) আবার পাঠানো হবে না

  await sendCapiEvent({
    eventName: "Purchase",
    eventId: `purchase_${order._id}`,
    orderId: order._id,
    sessionId: order.tracking?.sessionId,
    userData: {
      phone: order.castomerPhone?.[0],
      ip: order.tracking?.ip,
      userAgent: order.tracking?.userAgent,
      fbc: order.tracking?.fbc,
      fbp: order.tracking?.fbp,
    },
    customData: {
      value: order.totalCOD,
      contentName: order.productCode,
      contentIds: order.productCode ? [order.productCode] : undefined,
      numItems: 1,
    },
  });
}

// --- অর্ডার স্ট্যাটাস আপডেট ---
async function handleUpdateStatus(io, socket, { orderId, newStatus, note }) {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        orderStatus: newStatus,
        $push: {
          activities: buildActivity({
            description: note,
            // type: newStatus,
            author: socket.user?.name,
          }),
        },
      },
      { new: true },
    );

    if (!updatedOrder) {
      return socket.emit("statusUpdated", { success: false, message: "Order not found" });
    }

    socket.emit("statusUpdated", { success: true, order: updatedOrder });
    emitOrderUpdate(io, updatedOrder);

    // --- এখানেই আসল কাজ: Purchase ইভেন্ট শুধু এখন পাঠানো হয়, ফর্ম সাবমিটের সময় না —
    // এবং শুধুমাত্র ল্যান্ডিং পেজ থেকে আসা অর্ডারের জন্যই (origin === "landing_page")।
    // ম্যানুয়ালি/পেস্ট করে বানানো অর্ডারে কোনো fbp/fbc/সেশন ডেটা থাকে না, তাই সেগুলোর
    // জন্য Purchase ইভেন্ট কখনো পাঠানো হবে না। ---
    if (newStatus === "Confirmed" && updatedOrder.origin === "landing_page") {
      triggerPurchaseEvent(updatedOrder).catch((err) =>
        console.error("Purchase CAPI trigger error:", err),
      );
    }
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
      socket.user?.role === "moderator"
        ? { $or: [{ createdBy: socket.user._id }, { createdBy: null }] }
        : {};

    const orders = await Order.find({
      $and: [
        ownershipFilter,
        {
          $or: [
            { castomerPhone: { $regex: regex } },
            { castomerName: { $regex: regex } },
            { rawInputText: { $regex: regex } },
            { "courier.trackingId": { $regex: regex } },
          ],
        },
      ],
    }).limit(5);

    socket.emit("searchResult", { orders });
  } catch (err) {
    console.error("Search error:", err);
    socket.emit("searchResult", { orders: [] });
  }
}

// --- ড্রাফট (ইনকমপ্লিট) অর্ডার কার্ডের জন্য কাস্টমার হিস্ট্রি — real Order-এর "History"
// বাটন এখন HTTP দিয়ে হয় (orderController.js-এর getCourierHistory, socket না), কিন্তু
// DraftOrder-এ courier.trackingId/castomerPhone array নেই (শুধু একটা phone স্ট্রিং),
// আর ড্রাফট আপডেট যেহেতু এমনিতেই socket ("draftOrderUpdate") দিয়ে broadcast হয়, তাই
// এটা আপাতত socket-ভিত্তিকই রাখা হলো। "our" = আমাদের নিজের Order কালেকশনে এই ফোন
// নম্বরে আগে কতগুলো অর্ডার হয়েছে (attachCourierHistory-এর মতোই হিসাব, কিন্তু লাইভ),
// "all" = bdcourier.com API দিয়ে সব কুরিয়ার মিলিয়ে success/cancel ---
async function handleDraftCourierHistory(socket, { draftId }) {
  try {
    const draft = await DraftOrder.findById(draftId).select("phone");
    if (!draft) return;

    if (!draft.phone) {
      return socket.emit("distributeDraftCourierHistory", {
        draftId,
        result: "ফোন নম্বর নেই",
        success: false,
      });
    }

    const ourCountPromise = Order.countDocuments({
      castomerPhone: draft.phone,
    });

    const engNum = convertNumber(draft.phone);
    const bdCourierPromise = axios
      .post(
        "https://bdcourier.com/api/courier-check",
        { phone: engNum },
        { headers: { Authorization: `Bearer ${BDCOURIER_SECRET_KEY}` } },
      )
      .catch((err) => {
        console.error("bdcourier API error (draft):", err.message);
        return null;
      });

    const [ourCount, bdRes] = await Promise.all([
      ourCountPromise,
      bdCourierPromise,
    ]);

    const courierHistory = {
      our: ourCount,
      all: {
        success: bdRes?.data?.courierData?.summary?.success_parcel || 0,
        cancel: bdRes?.data?.courierData?.summary?.cancelled_parcel || 0,
      },
    };

    await DraftOrder.findByIdAndUpdate(draft._id, {
      $set: { courierHistory },
    });

    socket.emit("distributeDraftCourierHistory", {
      draftId,
      result: courierHistory,
      success: true,
    });
  } catch (err) {
    console.error("Error getting draft courier history:", err);
    socket.emit("distributeDraftCourierHistory", {
      draftId,
      result: "bdCourier api response error",
      success: false,
    });
  }
}

// --- প্রতিটি নতুন Socket connection-এর জন্য সব event listener রেজিস্টার করা ---
function registerOrderSocketHandlers(io, socket) {
  socket.on("updateStatus", (payload) => handleUpdateStatus(io, socket, payload));

  socket.on("addNote", (payload) => handleAddNote(socket, payload));

  socket.on("draftCourierHistory", (payload) => handleDraftCourierHistory(socket, payload));

  socket.on("searchQuery", (q) => handleSearchQuery(socket, q));

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
}

module.exports = registerOrderSocketHandlers;