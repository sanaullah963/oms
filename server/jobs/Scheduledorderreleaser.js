const cron = require("node-cron");
const Order = require("../models/Order");
const { emitOrderUpdate } = require("../utils/socketBroadcast");

// আজকের দিনের শুরুতে (00:00:00) রিলিজ ডেট থাকা 'Scheduled' অর্ডারগুলোকে 'Pending'-এ রিলিজ করে
async function releaseScheduledOrders(io) {
  console.log(`[Scheduler - ${new Date().toLocaleString("bn-BD")}] শিডিউলার কাজ শুরু করেছে...`);

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filter = {
      orderStatus: "Scheduled",
      releaseDate: { $lte: today },
    };

    const scheduledOrders = await Order.find(filter);

    if (scheduledOrders.length === 0) {
      console.log("[Scheduler] রিলিজ করার মতো কোনো শিডিউলড অর্ডার পাওয়া যায়নি।");
      return;
    }

    console.log(`[Scheduler] মোট ${scheduledOrders.length} টি অর্ডার রিলিজ করা হচ্ছে...`);

    for (const order of scheduledOrders) {
      order.orderStatus = "Pending";
      order.activities.push({
        type: "Status Updated",
        description:
          "অর্ডারটি নির্ধারিত শিডিউল (ভোর ৬:০০ টা) অনুযায়ী স্বয়ংক্রিয়ভাবে রিলিজ করা হয়েছে।",
        timestamp: new Date(),
      });
      await order.save();

      if (io) emitOrderUpdate(io, order);
    }

    console.log("[Scheduler] সকল নির্ধারিত অর্ডার সফলভাবে রিলিজ করা হয়েছে!");
  } catch (error) {
    console.error("[Scheduler Error] অর্ডার রিলিজ করার সময় ত্রুটি হয়েছে:", error);
  }
}

// প্রতিদিন নির্ধারিত সময়ে (UTC) cron job শুরু করা
function startScheduledOrderReleaserJob(io) {
  cron.schedule(
    "0 0 * * *",
    () => releaseScheduledOrders(io),
    { scheduled: true, timezone: "UTC" },
  );
}

module.exports = startScheduledOrderReleaserJob;