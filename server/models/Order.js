// const mongoose = require("mongoose");

// const ActivitySchema = new mongoose.Schema(
//   {
//     author: {
//       type: String,
//       default: "User",
//     },
//     // ইভেন্টের ধরন (যেমন: 'Order Created', 'Status Updated', 'Note Added')
//     type: {
//       type: String,
//       required: true,
//     },
//     // টাইমলাইনে দেখানোর জন্য মূল টেক্সট/নোট
//     description: {
//       type: String,
//       required: true,
//     },
//     // ডেটা পরিবর্তনের ক্ষেত্রে পূর্ববর্তী ও নতুন মান (যদি প্রয়োজন হয়)
//     details: {
//       type: mongoose.Schema.Types.Mixed, // JSON object
//     },
//     // ইভেন্টের সময়
//     timestamp: {
//       type: Date,
//       default: Date.now,
//     },
//   },
//   { _id: false },
// );

// // --- ২. মূল Order স্কিমা ---
// const OrderSchema = new mongoose.Schema({
//   rawInputText: { type: String, required: true },
//   castomerName: { type: String, required: true },
//   castomerPhone: { type: [String], required: true },
//   productCode: { type: String, required: true },
//   totalCOD: { type: Number, required: true },
//   orderSource: { type: String, default: "Manual Messenger" },
//   note: { type: String, required: false },
//   needsAttention: { type: Boolean, default: false },
//   permanentNote: { type: String, required: false },
//   courierHistory: {
//     our: {
//       type: String,
//       required: false,
//     },
//     all: {
//       success: {
//         type: String,
//         required: false,
//       },
//       cancel: {
//         type: String,
//         required: false,
//       },
//     },
//   },
//   //-- castomer outher courier histroy
//   orderStatus: {
//     type: String,
//     default: "Pending",
//     enum: [
//       "Pending",
//       "confirmed",
//       "released",
//       "Delivered",
//       "Cancelled",
//       "Booked",
//       "Scheduled",
//     ],
//   },
//   scheduledDate: {
//     type: Date,
//     default: null,
//   },
//   activities: {
//     type: [ActivitySchema],
//     default: [],
//   },
//   // --- ৩. কুরিয়ার ডেটা ফিল্ড ---
//   courier: {
//     trackingId: { type: String, default: null },
//     responseData: { type: mongoose.Schema.Types.Mixed, default: null },
//     bookedAt: { type: Date, default: null },
//     bookingStatus: {
//       type: String,
//       enum: ["N/A", "Booked", "Failed", "Pending", "Shipping", "Delivered"],
//       default: "Pending",
//     },
//     courierStatus: {
//       type: String,
//       enum: ["Unknown", "Review", "Pending", "Assigned", "Delivered", "Cancelled"],
//       default: "Unknown",
//     },
//     // --- ড্যাশবোর্ড/ফাইন্যান্সিয়াল ট্র্যাকিং-এর জন্য (delivery_status webhook থেকে আসে) ---
//     deliveredCodAmount: { type: Number, default: null }, // কুরিয়ার কনফার্ম করা প্রকৃত COD এমাউন্ট
//     deliveryCharge: { type: Number, default: null }, // কুরিয়ারের ডেলিভারি চার্জ (delivered ও cancelled উভয় ক্ষেত্রে)
//     codChargeAmount: { type: Number, default: null }, // হিসাব করা ১% COD চার্জ (শুধু Delivered-এর জন্য)
//     statusUpdatedAt: { type: Date, default: null }, // Delivered/Cancelled status webhook পাওয়ার সময় (ড্যাশবোর্ড ডেট-ফিল্টারের জন্য)
//   },
// });

// module.exports = mongoose.model("Order", OrderSchema);


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
});

module.exports = mongoose.model("Order", OrderSchema);