const mongoose = require("mongoose");

// --- একটা ডিভাইসের Web Push Subscription (browser থেকে আসে) ---
const PushSubscriptionSchema = new mongoose.Schema(
  {
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { _id: false },
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "moderator"],
      default: "moderator",
    },
    // সাইনআপ করলেই একাউন্ট সক্রিয় হবে না, এডমিন approve করলে তবেই লগইন করতে পারবে
    isApproved: { type: Boolean, default: false },
    // মডারেটরের পারমিশন-ওভাররাইড (config/permissions.js-এর রেজিস্ট্রি অনুযায়ী)। শুধু অ্যাডমিনের
    // এক্সপ্লিসিটলি সেট করা এবং ডিফল্ট থেকে আলাদা মানগুলোই এখানে থাকে; বাকিটা রেজিস্ট্রির ডিফল্ট।
    // অ্যারে-অফ-{key,allowed} রাখা হয়েছে যাতে নতুন পারমিশন যোগ করতে স্কিমা বদলাতে না হয়।
    permissions: {
      type: [
        new mongoose.Schema(
          { key: { type: String, required: true }, allowed: { type: Boolean, required: true } },
          { _id: false },
        ),
      ],
      default: [],
    },
    pushSubscriptions: { type: [PushSubscriptionSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", UserSchema);
