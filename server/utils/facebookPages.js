const FacebookPage = require("../models/FacebookPage");
const FacebookComment = require("../models/FacebookComment");

// --- pageId দিয়ে সক্রিয় পেজ খোঁজা ---
async function getPageById(pageId) {
  return FacebookPage.findOne({ pageId, isActive: true });
}

async function getAllActivePageIds() {
  const pages = await FacebookPage.find({ isActive: true }).select("pageId");
  return pages.map((p) => p.pageId);
}

/**
 * একটা কমেন্টের commentId দিয়ে সেই কমেন্ট যে পেজের, সেই পেজের Access Token বের করে।
 * reply/delete/block — সব অ্যাকশনের জন্য এই একই ফাংশন ব্যবহার হয়, যাতে সবসময় সঠিক পেজের
 * টোকেন দিয়ে অ্যাকশন হয় (আগে সবসময় একটামাত্র env টোকেন ব্যবহার হতো, যেটা bug ছিল)।
 */
async function getPageTokenForComment(commentId) {
  const comment = await FacebookComment.findOne({ commentId });
  if (!comment) {
    return { error: "কমেন্ট ডাটাবেজে খুঁজে পাওয়া যায়নি।" };
  }

  const page = await getPageById(comment.pageId);
  if (!page) {
    return {
      error: `এই কমেন্টের পেজ (${comment.pageId}) এর জন্য কোনো Access Token সেভ করা নেই। প্রথমে '/dashboard/facebook-pages' থেকে পেজটি যোগ করুন।`,
    };
  }

  return { comment, page };
}

// --- .env-এ পুরনো সিস্টেমের টোকেন থাকলে, DB খালি অবস্থায় প্রথমবার সেটাকে সিড করে দেওয়া (মাইগ্রেশন সুবিধা) ---
async function seedFromEnvIfEmpty() {
  const { FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN } = require("../config/env");
  if (!FB_PAGE_ID || !FB_PAGE_ACCESS_TOKEN) return;

  const count = await FacebookPage.countDocuments();
  if (count === 0) {
    await FacebookPage.create({
      pageId: FB_PAGE_ID,
      pageName: "Default Page (.env থেকে মাইগ্রেট করা)",
      pageAccessToken: FB_PAGE_ACCESS_TOKEN,
    });
    console.log("✅ .env-এর Facebook Page টোকেন FacebookPage কালেকশনে মাইগ্রেট করা হয়েছে।");
  }
}

module.exports = { getPageById, getAllActivePageIds, getPageTokenForComment, seedFromEnvIfEmpty };
