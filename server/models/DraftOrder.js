const mongoose = require("mongoose");
const { Schema } = mongoose;

// --- DraftOrder: কাস্টমার ল্যান্ডিং পেজের ফর্মে তথ্য দিতে শুরু করলে (কিন্তু সাবমিট
// না করা পর্যন্ত) এখানে "draft" হিসেবে সেভ থাকে — abandoned cart রিকভারি ও
// রিমার্কেটিং-এর জন্য। কাস্টমার সাবমিট করলে সংশ্লিষ্ট draft ডিলিট হয়ে যায় (আসল Order
// আলাদাভাবে তৈরি হয় — দেখুন publicLandingController.js), তাই "ইনকমপ্লিট" ও আসল অর্ডার
// কখনো একসাথে দুই জায়গায় থাকে না। "completed" স্ট্যাটাসটা শুধু রেস-কন্ডিশন এড়াতে
// সাময়িকভাবে ব্যবহৃত হয় (দেখুন submitPublicOrder), ডাটাবেজে সাধারণত থেকে যায় না। ---

const draftOrderSchema = new Schema(
  {
    // --- একই ব্রাউজার সেশন ট্র্যাক করার জন্য (ফ্রন্টএন্ড থেকে জেনারেট করা হয়) ---
    sessionId: {
      type: String,
      required: true,
      index: true,
    },

    landingPageSlug: {
      type: String,
      required: true,
      index: true,
    },

    // --- কাস্টমার এখন পর্যন্ত যা যা টাইপ করেছে (আংশিক/অসম্পূর্ণ হতে পারে) ---
    name: { type: String, default: null },
    phone: { type: String, default: null, index: true },
    address: { type: String, default: null },
    quantity: { type: Number, default: 1 },

    // --- ল্যান্ডিং পেজের প্রোডাক্টের নাম (timeline/UI-তে দেখানোর জন্য, যাতে প্রতিবার
    // LandingPage মডেল populate/lookup না করতে হয়) ---
    productName: { type: String, default: null },

    // --- draft-এর বর্তমান অবস্থা ---
    status: {
      type: String,
      enum: ["active", "completed", "abandoned"],
      default: "active",
      index: true,
    },

    // --- সাবমিট সম্পন্ন হলে আসল Order-এর রেফারেন্স ---
    completedOrder: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    // --- Meta Pixel/CAPI ও অ্যাট্রিবিউশনের জন্য (Order মডেলের tracking অবজেক্টের
    // মতোই কাঠামো, যাতে পরে দরকার হলে সহজে মিলিয়ে ব্যবহার করা যায়) ---
    tracking: {
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
      fingerprintHash: { type: String, default: null },
    },
  },
  { timestamps: true },
);

// --- একই সেশন + ল্যান্ডিং পেজের জন্য দ্রুত lookup (findOneAndUpdate-এ ব্যবহৃত হয়) ---
draftOrderSchema.index({ sessionId: 1, landingPageSlug: 1 });

// --- পুরনো/অসম্পূর্ণ draft গুলো নির্দিষ্ট সময় পর অটো-ডিলিট হয়ে যাবে (৩০ দিন পর) —
// প্রয়োজন না হলে এই TTL ইনডেক্সটি বাদ দিতে পারেন ---
draftOrderSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model("DraftOrder", draftOrderSchema);
