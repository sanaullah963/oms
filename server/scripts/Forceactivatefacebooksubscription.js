// এই স্ক্রিপ্টটি সার্ভারের অংশ নয় — এটি একবার ম্যানুয়ালি রান করার জন্য (Meta পেজ সাবস্ক্রিপশন force করতে)।
// রান করার নিয়ম: node scripts/forceActivateFacebookSubscription.js
const axios = require("axios");
const { FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN } = require("../config/env");

const runForceSubscription = async () => {
  console.log("⏳ মেটা ক্লাউড সার্ভারে ফোর্স সাবস্ক্রিপশন রিকোয়েস্ট পাঠানো হচ্ছে...");
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v25.0/${FB_PAGE_ID}/subscribed_apps`,
      null,
      {
        params: {
          subscribed_fields: "feed",
          access_token: FB_PAGE_ACCESS_TOKEN,
        },
      },
    );

    console.log("=========================================");
    console.log("🎉 SUCCESS! মেটা রেসপন্স:", response.data);
    console.log("=========================================");
    console.log("🚀 আপনার পেজ এখন অ্যাপের সাথে ১০০% সফলভাবে কানেক্টেড!");
  } catch (error) {
    console.error("❌ সাবস্ক্রিপশন ব্যর্থ হয়েছে!");
    console.error("এরর ডিটেইলস:", error.response?.data || error.message);
  }
};

runForceSubscription();