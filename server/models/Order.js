const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema(
  {
    author: {
      type: String,
      default: "User",
    },
    // ইভেন্টের ধরন (যেমন: 'Order Created', 'Status Updated', 'Note Added')
    type: {
      type: String,
      required: true,
    },
    // টাইমলাইনে দেখানোর জন্য মূল টেক্সট/নোট
    description: {
      type: String,
      required: true,
    },
    // ডেটা পরিবর্তনের ক্ষেত্রে পূর্ববর্তী ও নতুন মান (যদি প্রয়োজন হয়)
    details: {
      type: mongoose.Schema.Types.Mixed, // JSON object
    },
    // ইভেন্টের সময়
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

// --- ২. মূল Order স্কিমা ---
const OrderSchema = new mongoose.Schema({
  rawInputText: { type: String, required: true },
  castomerName: { type: String, required: true },
  castomerPhone: { type: [String], required: true },
  productCode: { type: String, required: true },
  totalCOD: { type: Number, required: true },
  orderSource: { type: String, default: "Manual Messenger" },
  // --- অর্ডারটা কোথা থেকে এসেছে — শুধু "landing_page" অর্ডারেই Purchase CAPI ইভেন্ট
  // পাঠানো হয় (Confirm করার সময়), "manual" (হাতে পেস্ট করা) অর্ডারে কখনো পাঠানো হয় না,
  // কারণ সেগুলোর সাথে কোনো fbp/fbc/সেশন/অ্যাট্রিবিউশন ডেটা থাকে না — দেখুন orderSocket.js ---
  origin: { type: String, enum: ["landing_page", "manual"], default: "manual" },
  // --- কোন ইউজার (এডমিন/মডারেটর) অর্ডারটা তৈরি করেছে (visibility filter করার জন্য) ---
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  createdByName: { type: String, default: null }, // দ্রুত দেখানোর জন্য নাম ডিনরমালাইজড করে রাখা
  note: { type: String, required: false },
  needsAttention: { type: Boolean, default: false },
  permanentNote: { type: String, required: false },
  courierHistory: {
    our: {
      type: String,
      required: false,
    },
    all: {
      success: {
        type: String,
        required: false,
      },
      cancel: {
        type: String,
        required: false,
      },
    },
  },
  //-- castomer outher courier histroy
  orderStatus: {
    type: String,
    default: "Pending",
    enum: [
      "Pending",
      "confirmed",
      "released",
      "Delivered",
      "Cancelled",
      "Booked",
      "Scheduled",
    ],
  },
  scheduledDate: {
    type: Date,
    default: null,
  },
  activities: {
    type: [ActivitySchema],
    default: [],
  },
  // --- ৩. কুরিয়ার ডেটা ফিল্ড ---
  courier: {
    trackingId: { type: String, default: null },
    responseData: { type: mongoose.Schema.Types.Mixed, default: null },
    bookedAt: { type: Date, default: null },
    bookingStatus: {
      type: String,
      enum: ["N/A", "Booked", "Failed", "Pending", "Shipping", "Delivered"],
      default: "Pending",
    },
    courierStatus: {
      type: String,
      enum: ["Unknown", "Review", "Pending", "Assigned", "Delivered", "Cancelled"],
      default: "Unknown",
    },
    // --- ড্যাশবোর্ড/ফাইন্যান্সিয়াল ট্র্যাকিং-এর জন্য (delivery_status webhook থেকে আসে) ---
    deliveredCodAmount: { type: Number, default: null }, // কুরিয়ার কনফার্ম করা প্রকৃত COD এমাউন্ট
    deliveryCharge: { type: Number, default: null }, // কুরিয়ারের ডেলিভারি চার্জ (delivered ও cancelled উভয় ক্ষেত্রে)
    codChargeAmount: { type: Number, default: null }, // হিসাব করা ১% COD চার্জ (শুধু Delivered-এর জন্য)
    statusUpdatedAt: { type: Date, default: null }, // Delivered/Cancelled status webhook পাওয়ার সময় (ড্যাশবোর্ড ডেট-ফিল্টারের জন্য)
  },

  // meta pixel block
  tracking: {
    sessionId: { type: String, default: null },
    landingPageSlug: { type: String, default: null },
    fbp: { type: String, default: null },
    fbc: { type: String, default: null },
    fbclid: { type: String, default: null },
    gclid: { type: String, default: null },
    utmSource: { type: String, default: null },
    utmMedium: { type: String, default: null },
    utmCampaign: { type: String, default: null },
    utmTerm: { type: String, default: null },
    utmContent: { type: String, default: null },
    referrer: { type: String, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    // --- Browser fingerprint hash (client-side canvas/webgl/navigator hash, SHA-256) ---
    fingerprintHash: { type: String, default: null },
  },

  // --- ৪. ফ্রড/ডুপ্লিকেট কাস্টমার ডিটেকশন (কখনো অটোমেটিক ব্লক করে না, শুধু ফ্ল্যাগ করে) ---
  fraudCheck: {
    isSuspicious: { type: Boolean, default: false },
    // প্রতিটা ম্যাচের কারণ: কোন রুল ম্যাচ করেছে (phone/fingerprint/ip/facebook) এবং কোন কোন পুরনো অর্ডারের সাথে
    reasons: {
      type: [
        {
          rule: {
            type: String,
            enum: ["phone", "fingerprint", "ip", "facebook"],
          },
          label: { type: String }, // যেমন: "Same Phone", "Same Fingerprint"
          matchedOrderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
          _id: false,
        },
      ],
      default: [],
    },
    // অ্যাডমিন ম্যানুয়ালি এই অর্ডারের ডিটেকশন নিয়ে কী করেছে
    reviewStatus: {
      type: String,
      enum: ["none", "pending", "approved", "ignored", "blocked"],
      default: "none",
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedByName: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
  },
});

// --- ইনডেক্স (হোমপেজ লোড, সার্চ, ফিল্টার — সবকিছু দ্রুত করার জন্য) ---

// getOrders (aggregate): moderator ownership filter সবচেয়ে বেশি ব্যবহৃত হয়, orderStatus দিয়ে
// Cancelled/Booked ফিল্টারও চলে। compound index দুটোই কভার করে।
OrderSchema.index({ createdBy: 1, orderStatus: 1 });

// শুধু orderStatus দিয়েও ফিল্টার হয় (এডমিনের ক্ষেত্রে ownershipFilter খালি থাকে)
OrderSchema.index({ orderStatus: 1 });

// getOrders-এর $sort/lastActivityTime এবং Cancelled/Booked-এর ২-দিনের উইন্ডো ফিল্টার
OrderSchema.index({ "activities.timestamp": -1 });

// সার্চ (socket handleSearchQuery) + attachCourierHistory + fraudDetection (phone match) —
// castomerPhone একটা array ফিল্ড, multikey index অটোমেটিক হয়
OrderSchema.index({ castomerPhone: 1 });

// Steadfast trackingId দিয়ে লুকআপ/সার্চ
OrderSchema.index({ "courier.trackingId": 1 });

// "প্রয়োজনীয়" ট্যাব/নোটিফিকেশন ফিল্টার
OrderSchema.index({ needsAttention: 1 });

// dashboardController-এর ডেট-রেঞ্জ অ্যানালিটিক্স (Delivered/Cancelled amount ইত্যাদি)
OrderSchema.index({ "courier.statusUpdatedAt": -1 });

// createdAt দিয়ে সরাসরি সর্ট/ফিল্টার করার দরকার হলে (ডকুমেন্টে timestamps নেই, তবে _id থেকে
// সময় বের করা যায়; ভবিষ্যতে timestamps: true যোগ করলে এই ইনডেক্স কাজে লাগবে)
// OrderSchema.set("timestamps", true); // <-- চাইলে uncomment করে ব্যবহার করা যায়

module.exports = mongoose.model("Order", OrderSchema);