const { all } = require("axios");
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
    // ডেটা পরিবর্তনের ক্ষেত্রে পূর্ববর্তী ও নতুন মান (যদি প্রয়োজন হয়)
    details: {
      type: mongoose.Schema.Types.Mixed, // JSON object
    },
    // ইভেন্টের সময়
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// --- ২. মূল Order স্কিমা ---
const OrderSchema = new mongoose.Schema({
  rawInputText: {type: String, required: true},
  castomerName: { type: String, required: true },
  castomerPhone: { type: [String], required: true },
  productCode: { type: String, required: true },
  totalCOD: { type: Number, required: true },
  orderSource: { type: String, default: "Manual Messenger" },
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
    ],
  },

  activities: {
    type: [ActivitySchema],
    default: [],
  },
  // --- ৩. কুরিয়ার ডেটা ফিল্ড (নতুন) ---
  courier: {
    // কুরিয়ার থেকে পাওয়া ট্র্যাকিং আইডি
    trackingId: { type: String, default: null }, // কুরিয়ার বুকিং এর সময় যে JSON ডেটা পাঠানো হয়েছিল
    responseData: { type: mongoose.Schema.Types.Mixed, default: null }, // বুকিং এর সময়
    bookedAt: { type: Date, default: null }, // বুকিং স্ট্যাটাস
    bookingStatus: { //for order status
      type: String,
      enum: [
        // "In-review",
        "N/A",
        "Booked",
        "Failed",
        "Pending",
        "Shipping",
        "Delivered",
      ],
      default: "Pending",
    },
    courierStatus: { // for order courier status
      type: String,
      enum: [
        "Unknown",
        "Review",
        "Pending",
        "Assigned",
        "Delivered",
        "Cancelled",
      ],
      default: "Unknown",
    },

  },

  // createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", OrderSchema);
