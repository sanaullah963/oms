const { all } = require("axios");
const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema(
  {
    actor: {
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
  // কাস্টমারের কাছ থেকে আসা মূল টেক্সট
  rawInputText: {
    type: String,
    required: true,
  },

  // পার্স করা এবং চূড়ান্ত ডেটা
  castomerName: { type: String, required: true },
  castomerPhone: { type: String, required: true },
  castomerAddress: { type: String, required: true },
  productCode: { type: String, required: true },
  totalCOD: { type: Number, required: true },
  orderSource: { type: String, default: "Manual Messenger" },
  note: { type: String, required: false },
  courierHistory: {
    // type: mongoose.Schema.Types.Mixed,
    our: {
      success: {
        type: String,
        required: false,
      },
      cancel: {
        type: String,
        required: false,
      },
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

  // এডিট হিস্ট্রি (ঐচ্ছিক কিন্তু এডিটের জন্য সহায়ক)
  activities: {
    type: [ActivitySchema],
    default: [],
  },
  // --- ৩. কুরিয়ার ডেটা ফিল্ড (নতুন) ---
  courier: {
    // কুরিয়ার থেকে পাওয়া ট্র্যাকিং আইডি
    trackingId: { type: String, default: null }, // কুরিয়ার বুকিং এর সময় যে JSON ডেটা পাঠানো হয়েছিল
    requestPayload: { type: mongoose.Schema.Types.Mixed, default: null }, // কুরিয়ার থেকে পাওয়া রেসপন্স ডেটা
    responseData: { type: mongoose.Schema.Types.Mixed, default: null }, // বুকিং এর সময়
    bookedAt: { type: Date, default: null }, // বুকিং স্ট্যাটাস
    bookingStatus: {
      type: String,
      enum: [
        "In-review",
        "Pending",
        "Failed",
        "Booked",
        "Shipping",
        "Delivered",
      ],
      default: "Pending",
    },
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", OrderSchema);
