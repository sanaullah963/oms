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

    // --- localStorage-ভিত্তিক persistent visitor আইডি (sessionId-এর চেয়ে দীর্ঘস্থায়ী,
    // একাধিক সেশন জুড়ে একই কাস্টমারকে চেনার জন্য) ---
    visitorId: { type: String, default: null, index: true },

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

    // --- কাস্টমার যদি প্রোডাক্ট টাইপ/প্যাকেজ সিলেক্ট করে থাকে (LandingPage.productTypes
    // সাব-ডকুমেন্টের _id রেফারেন্স, আলাদা কালেকশন না হওয়ায় ref ছাড়াই স্টোর করা হচ্ছে) ---
    productTypeId: { type: String, default: null },
    // --- ড্যাশবোর্ডে দেখানোর জন্য লেবেল ক্যাশ করে রাখা (productName-এর মতোই, প্রতিবার
    // LandingPage lookup এড়াতে) ---
    productTypeLabel: { type: String, default: null },

    // --- freeDelivery বন্ধ থাকা পেজে কাস্টমার "ভিতরে/বাইরে" যা সিলেক্ট করেছে ---
    deliveryArea: {
      type: String,
      enum: ["inside", "outside"],
      default: "inside",
    },

    // --- ল্যান্ডিং পেজের প্রোডাক্টের নাম (timeline/UI-তে দেখানোর জন্য, যাতে প্রতিবার
    // LandingPage মডেল populate/lookup না করতে হয়) ---
    productName: { type: String, default: null },

    // সর্বশেষ customer/admin পরিবর্তনের সময় — ইনকমপ্লিট লিস্ট sort করার জন্য ব্যবহৃত হয়।
    lastActivityAt: { type: Date, default: Date.now, index: true },

    // --- draft-এর বর্তমান অবস্থা ---
    status: {
      type: String,
      enum: ["active", "completed", "abandoned"],
      default: "active",
      index: true,
    },

    // --- এডমিন কাস্টমারকে কল করার পর কী হয়েছে তার স্ট্যাটাস (status ফিল্ড থেকে
    // আলাদা — status বলে draft-টা এখনো "active" কিনা, callStatus বলে সর্বশেষ কল
    // করার ফলাফল কী):
    //   none      → এখনো কল করা হয়নি
    //   no_answer → কল দেওয়া হয়েছে, কাস্টমার ধরেনি
    //   phone_off → কল দেওয়া হয়েছে, নাম্বার বন্ধ পাওয়া গেছে
    //   talked    → কাস্টমারের সাথে কথা হয়েছে (কী কথা হয়েছে তা callNote-এ থাকে)
    //   cancelled → অনেকবার চেষ্টা করেও কনফার্ম/পেন্ডিং করা যায়নি, তাই বাতিল করা
    //               হয়েছে — এই স্ট্যাটাস হলে getDraftOrders আর এটা ফ্রন্টএন্ডে
    //               লোড করে না (ডাটাবেজ থেকে ডিলিট হয় না, চাইলে রিওপেন করা যায়)
    callStatus: {
      type: String,
      enum: ["none", "no_answer", "phone_off", "talked", "cancelled"],
      default: "none",
      index: true,
    },

    // --- সর্বশেষ কল-স্ট্যাটাসের সাথে সংশ্লিষ্ট কাস্টম নোট (talked হলে কি কথা
    // হয়েছে, cancelled হলে কেন বাতিল করা হলো — এডমিন নিজে লিখে সেভ করে) ---
    callNote: { type: String, default: null },

    // --- মোট কতবার কল করার ফলাফল লগ করা হয়েছে (no_answer/phone_off/talked/
    // cancelled প্রতিবার গণনা হয়) — বারবার চেষ্টার পর cancel করার সিদ্ধান্ত নিতে
    // সাহায্য করে ---
    callAttempts: { type: Number, default: 0 },

    // --- সর্বশেষ কবে কল-স্ট্যাটাস আপডেট হয়েছে ---
    lastCallAt: { type: Date, default: null },

    // --- প্রতিটা কল-স্ট্যাটাস পরিবর্তনের ইতিহাস (UI-তে টাইমলাইন হিসেবে দেখানোর জন্য) ---
    callLogs: {
      type: [
        {
          status: {
            type: String,
            enum: ["no_answer", "phone_off", "talked", "cancelled"],
          },
          note: { type: String, default: null },
          by: { type: String, default: null }, // কোন এডমিন/মডারেটর করেছে (নাম)
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
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
draftOrderSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 },
);

module.exports = mongoose.model("DraftOrder", draftOrderSchema);