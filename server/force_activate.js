const axios = require('axios');
require('dotenv').config();

// আপনার .env ফাইল থেকে ডেটা লোড হবে
const PAGE_ID = process.env.FB_PAGE_ID; 
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN; 

const runForceSubscription = async () => {
    console.log("⏳ মেটা ক্লাউড সার্ভারে ফোর্স সাবস্ক্রিপশন রিকোয়েস্ট পাঠানো হচ্ছে...");
    try {
        const response = await axios.post(
            `https://graph.facebook.com/v25.0/${PAGE_ID}/subscribed_apps`,
            null, // বডি খালি থাকবে
            {
                params: {
                    subscribed_fields: 'feed',
                    access_token: PAGE_ACCESS_TOKEN
                }
            }
        );
        
        console.log("=========================================");
        console.log("🎉 SUCCESS! মেটা রেসপন্স:", response.data);
        console.log("=========================================");
        console.log("🚀 আপনার পেজ এখন অ্যাপের সাথে ১০০% সফলভাবে কানেক্টেড!");
    } catch (error) {
        console.error("❌ সাবস্ক্রিপশন ব্যর্থ হয়েছে!");
        console.error("এরর ডিটেইলস:", error.response?.data || error.message);
    }
};

runForceSubscription();