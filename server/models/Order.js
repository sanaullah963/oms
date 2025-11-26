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
); // সাব-ডকুমেন্টে _id দরকার নেই

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

  // পণ্যের তথ্য (MVP-এর জন্য একটিমাত্র আইটেম হিসেবে ধরে নিচ্ছি)
  productCode: { type: String, required: true },
  totalCOD: { type: Number, required: true },

  // স্ট্যাটাস ও সোর্স
  orderSource: { type: String, default: "Manual Messenger" },
  orderStatus: {
    type: String,
    default: "Pending",
    enum: ["Pending", "confirmed", "released", "Delivered", "Cancelled"],
  },

  // এডিট হিস্ট্রি (ঐচ্ছিক কিন্তু এডিটের জন্য সহায়ক)
  activities: {
    type: [ActivitySchema],
    default: [],
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", OrderSchema);
