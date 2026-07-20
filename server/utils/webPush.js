const webpush = require("web-push");
const User = require("../models/User");
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = require("../config/env");

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * সব approved ইউজারের সব ডিভাইসে push notification পাঠায়।
 * এক্সপায়ার্ড/ইনভ্যালিড সাবস্ক্রিপশন (410/404) পাওয়া গেলে DB থেকে সরিয়ে দেয়।
 * @param {{title: string, body: string, url?: string}} payload
 */
async function sendNotificationToApprovedUsers(payload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("VAPID কী সেট করা নেই, push notification পাঠানো গেল না।");
    return;
  }

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/",
  });

  const users = await User.find({
    isApproved: true,
    "pushSubscriptions.0": { $exists: true },
  });

  for (const user of users) {
    const stillValidSubs = [];

    for (const sub of user.pushSubscriptions) {
      try {
        await webpush.sendNotification(sub, notificationPayload);
        stillValidSubs.push(sub);
      } catch (error) {
        // 410 Gone / 404 Not Found মানে সাবস্ক্রিপশনটা আর সচল নেই (ইউজার আনসাবস্ক্রাইব করেছে/ব্রাউজার ডেটা মুছে ফেলেছে)
        if (error.statusCode !== 410 && error.statusCode !== 404) {
          stillValidSubs.push(sub);
          console.error(`Push error for user ${user._id}:`, error.statusCode, error.message);
        }
      }
    }

    if (stillValidSubs.length !== user.pushSubscriptions.length) {
      user.pushSubscriptions = stillValidSubs;
      await user.save();
    }
  }
}

module.exports = { sendNotificationToApprovedUsers };
