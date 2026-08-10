const mongoose = require("mongoose");

// --- BlockedCustomer: অ্যাডমিন ম্যানুয়ালি ব্লক করা কাস্টমার। সিস্টেম কখনো নিজে থেকে
// কাউকে এখানে যোগ করে না — শুধু Fraud Detection Modal থেকে "Block" চাপলে বা
// /dashboard/blocked-customers পেজ থেকে সরাসরি ফোন নম্বর দিয়ে ম্যানুয়ালি ব্লক করলে
// একটা রেকর্ড তৈরি হয়। যেকোনো একটা ফিল্ড ম্যাচ করলেই (phone/fingerprintHash/ip/fbp/fbc/fbclid)
// ব্লক ধরা হয় — publicLandingController.submitPublicOrder-এ অর্ডার নেওয়ার আগে চেক করা হয়। ---

const BlockedCustomerSchema = new mongoose.Schema(
  {
    phone: { type: String, default: null, index: true },
    fingerprintHash: { type: String, default: null, index: true },
    ip: { type: String, default: null, index: true },
    fbp: { type: String, default: null, index: true },
    fbc: { type: String, default: null, index: true },
    fbclid: { type: String, default: null, index: true },

    // --- রেফারেন্সের জন্য: কোন অর্ডার/নাম দেখে ব্লক করা হয়েছিল ---
    castomerName: { type: String, default: null },
    sourceOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },

    reason: { type: String, default: null },
    isActive: { type: Boolean, default: true },

    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    blockedByName: { type: String, default: null },

    unblockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    unblockedByName: { type: String, default: null },
    unblockedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("BlockedCustomer", BlockedCustomerSchema);
