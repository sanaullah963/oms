const mongoose = require("mongoose");

// --- BlockedReactor: কোনো পোস্টে "haha" বা "angry" রিয়েক্ট দিলে সিস্টেম নিজে থেকে
// (রিয়েল-টাইম, webhook থেকে) সেই ইউজারকে Facebook Graph API দিয়ে পেজ থেকে ব্লক করে
// দেয় এবং এখানে একটা রেকর্ড রাখে — কারণ রিয়েকশন কমেন্টের মতো ডিলিট করা যায় না।
// অ্যাডমিন এখান থেকে লিস্ট দেখে চাইলে Facebook-এ সত্যিকারের আনব্লক করতে পারে
// (isActive: false হয়ে যায়), অথবা রেকর্ডটা সম্পূর্ণ ডিলিট করে দিতে পারে।
const BlockedReactorSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true, index: true }, // Facebook user id
    name: { type: String, default: "Unknown" },
    profileLink: { type: String, default: null },

    reactionType: { type: String, enum: ["haha", "angry"], required: true },

    pageId: { type: String, required: true },
    pageName: { type: String, default: "Unknown Page" },
    postId: { type: String, default: null },

    // --- Facebook Graph API-তে আসল ব্লক কল সফল হয়েছিল কিনা ---
    blockedOnFacebook: { type: Boolean, default: false },
    blockError: { type: String, default: null },

    // --- অ্যাডমিন ড্যাশবোর্ড থেকে ম্যানুয়ালি আনব্লক করলে ---
    isActive: { type: Boolean, default: true },
    unblockedAt: { type: Date, default: null },
    unblockError: { type: String, default: null },
  },
  { timestamps: true },
);

// একই ইউজার একই পেজে বারবার haha/angry দিলে ডুপ্লিকেট রেকর্ড না বেড়ে upsert হবে
BlockedReactorSchema.index({ senderId: 1, pageId: 1 }, { unique: true });

module.exports = mongoose.model("BlockedReactor", BlockedReactorSchema);