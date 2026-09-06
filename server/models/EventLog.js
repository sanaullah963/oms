const mongoose = require("mongoose");

const EventLogSchema = new mongoose.Schema(
  {
    // --- ইভেন্টের ধরন ---
    eventName: {
      type: String,
      enum: ["Purchase", "Lead", "InitiateCheckout", "ViewContent", "PageView"],
      required: true,
    },
    // এই eventId দিয়েই Meta ব্রাউজার Pixel ও Server CAPI-এর একই ইভেন্ট চিনে dedup করে —
    // তাই এটা প্রতিটা "লজিক্যাল ইভেন্ট"-এর জন্য ইউনিক হতে হবে
    eventId: { type: String, required: true, unique: true, index: true },

    // --- সংশ্লিষ্ট অর্ডার/সেশন (থাকলে) ---
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    sessionId: { type: String, default: null },

    // --- কোথা থেকে পাঠানো হয়েছে ---
    source: { type: String, enum: ["capi", "pixel"], default: "capi" },

    // --- Meta-কে যা পাঠানো হয়েছে ও যা ফেরত এসেছে (ডিবাগ/অডিটের জন্য) ---
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
    metaResponse: { type: mongoose.Schema.Types.Mixed, default: null },

    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
      index: true,
    },
    errorMessage: { type: String, default: null },
    retryCount: { type: Number, default: 0 },
    lastAttemptAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// --- ৭ দিন পর শুধু PageView টাইপ ইভেন্ট অটোমেটিক ডিলিট হয়ে যাবে। partialFilterExpression
// দিয়ে TTL শুধু eventName: "PageView"-এর উপর প্রযোজ্য — Lead/InitiateCheckout/ViewContent
// এবং সবচেয়ে গুরুত্বপূর্ণ Purchase (যেটা triggerPurchaseEvent-এর ডাবল-সেন্ড ঠেকানোর
// idempotency-guard হিসেবে ব্যবহার হয়, server/sockets/orderSocket.js দেখুন) এই TTL-এ
// পড়বে না, তাই সেগুলো অপরিবর্তিত/স্থায়ী থাকবে। ---
EventLogSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 60 * 60 * 24 * 7,
    partialFilterExpression: { eventName: "PageView" },
  },
);

module.exports = mongoose.model("EventLog", EventLogSchema);