// সব Environment Variable এক জায়গায় লোড ও যাচাই করা হয়
require("dotenv").config();

const REQUIRED_VARS = ["MONGODB_URI", "JWT_SECRET"];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `🚨 CRITICAL: প্রয়োজনীয় Environment Variable পাওয়া যায়নি: ${missing.join(", ")}`,
  );
}

if (!process.env.FB_VERIFY_TOKEN) {
  console.warn(
    "⚠️ FB_VERIFY_TOKEN .env-এ সেট করা নেই। Facebook webhook verification কাজ করবে না।",
  );
}

if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.warn(
    "⚠️ VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY .env-এ সেট করা নেই। Push notification পাঠানো যাবে না।",
  );
}

if (!process.env.META_PIXEL_ID || !process.env.META_CAPI_ACCESS_TOKEN) {
  console.warn(
    "⚠️ META_PIXEL_ID/META_CAPI_ACCESS_TOKEN .env-এ সেট করা নেই। Meta Conversion API ইভেন্ট পাঠানো যাবে না।",
  );
}

module.exports = {
  PORT: process.env.PORT || 9000,
  MONGO_URI: process.env.MONGODB_URI,
  CLIENT_URL: process.env.CLIENT_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "30d",
  FB_PAGE_ID: process.env.FB_PAGE_ID,
  FB_PAGE_ACCESS_TOKEN: process.env.FB_PAGE_ACCESS_TOKEN,
  FB_VERIFY_TOKEN: process.env.FB_VERIFY_TOKEN,
  BDCOURIER_SECRET_KEY: process.env.BDCOURIER_SECRET_KEY,
  STEADFAST_API_URL: process.env.STEADFAST_API_URL,
  STEADFAST_API_KEY: process.env.STEADFAST_API_KEY,
  STEADFAST_SECRET_KEY: process.env.STEADFAST_SECRET_KEY,
  STEADFAST_WEBHOOK_TOKEN: process.env.STEADFAST_WEBHOOK_TOKEN,
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || "mailto:admin@example.com",
  META_PIXEL_ID: process.env.META_PIXEL_ID,
  META_CAPI_ACCESS_TOKEN: process.env.META_CAPI_ACCESS_TOKEN,
  META_GRAPH_API_VERSION: process.env.META_GRAPH_API_VERSION || "v21.0",
  META_TEST_EVENT_CODE: process.env.META_TEST_EVENT_CODE || null, // Test Events
};