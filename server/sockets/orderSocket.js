const axios = require("axios");
const Order = require("../models/Order");
const DraftOrder = require("../models/DraftOrder");
const convertNumber = require("../utils/convertNumber");
const { BDCOURIER_SECRET_KEY } = require("../config/env");

// note: অর্ডার স্ট্যাটাস আপডেট (আগে এই socket event এখানেই হ্যান্ডেল হতো —
// handleUpdateStatus + triggerPurchaseEvent) এখন HTTP দিয়ে হয়:
// orderController.js-এর exports.updateStatus (রুট: PATCH /api/orders/:id/status)।
// Purchase CAPI ট্রিগার লজিকটা utils/metaCapi.js-এ triggerPurchaseEvent হিসেবে
// সরিয়ে নেওয়া হয়েছে, যাতে দুই জায়গায় (socket/HTTP) কপি-পেস্ট করে রাখতে না হয়।

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
  socket.on("draftCourierHistory", (payload) => handleDraftCourierHistory(socket, payload));

  socket.on("searchQuery", (q) => handleSearchQuery(socket, q));

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
}

module.exports = registerOrderSocketHandlers;