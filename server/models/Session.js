const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema(
  {
    // এই একটা visit-এর ইউনিক আইডি (প্রতিবার পেজ লোডে নতুন)
    sessionId: { type: String, required: true, unique: true, index: true },
    // একই ব্রাউজারে বারবার ভিজিটেও অপরিবর্তিত থাকে (localStorage-এ persist করা) —
    // এটা দিয়ে "return visitor" শনাক্ত করা যায়
    visitorId: { type: String, required: true, index: true },

    landingPageSlug: { type: String, default: null },

    entryAt: { type: Date, default: Date.now },
    exitAt: { type: Date, default: null },
    timeOnPageSeconds: { type: Number, default: 0 },

    maxScrollDepth: { type: Number, default: 0 }, // 0-100 (%)
    clickCount: { type: Number, default: 0 },
    focusCount: { type: Number, default: 0 },
    blurCount: { type: Number, default: 0 },
    visibilityChangeCount: { type: Number, default: 0 },

    isBounce: { type: Boolean, default: null }, // exit-এর সময় হিসাব করা হয়
    isReturnVisitor: { type: Boolean, default: false }, // তৈরির সময় হিসাব করা হয়

    tracking: {
      fbp: { type: String, default: null },
      fbc: { type: String, default: null },
      fbclid: { type: String, default: null },
      gclid: { type: String, default: null },
      utmSource: { type: String, default: null },
      utmMedium: { type: String, default: null },
      utmCampaign: { type: String, default: null },
      referrer: { type: String, default: null },
      ip: { type: String, default: null },
      userAgent: { type: String, default: null },
      fingerprintHash: { type: String, default: null },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Session", SessionSchema);