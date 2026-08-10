const Order = require("../models/Order");
const DraftOrder = require("../models/DraftOrder");

// --- GET /api/customers/timeline?phone=01XXXXXXXXX (admin only) ---
exports.getCustomerTimeline = async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ message: "phone প্যারামিটার আবশ্যক।" });
    }

    const [orders, drafts] = await Promise.all([
      Order.find({ castomerPhone: phone })
        .select(
          "castomerName castomerPhone totalCOD orderStatus rawInputText productCode activities courier createdByName createdAt",
        )
        .sort({ createdAt: -1 }),
      DraftOrder.find({ phone }).sort({ createdAt: -1 }),
    ]);

    if (orders.length === 0 && drafts.length === 0) {
      return res.status(404).json({ message: "এই ফোন নম্বরে কোনো অর্ডার/ড্রাফট পাওয়া যায়নি।" });
    }

    // --- সামারি ---
    const summary = {
      totalOrders: orders.length,
      confirmedCount: orders.filter((o) => o.orderStatus === "Confirmed").length,
      deliveredCount: orders.filter((o) => o.orderStatus === "Delivered").length,
      cancelledCount: orders.filter((o) => o.orderStatus === "Cancelled").length,
      pendingCount: orders.filter((o) => o.orderStatus === "Pending").length,
      totalSpent: orders
        .filter((o) => o.orderStatus === "Delivered")
        .reduce((sum, o) => sum + (o.courier?.deliveredCodAmount || o.totalCOD || 0), 0),
      distinctNames: [...new Set(orders.map((o) => o.castomerName).filter(Boolean))],
      distinctAddressCount: new Set(orders.map((o) => o.rawInputText)).size,
      draftCount: drafts.length,
    };

    // --- একত্রিত টাইমলাইন (অর্ডার তৈরি + প্রতিটা status change + draft) ---
    const timeline = [];

    orders.forEach((order) => {
      timeline.push({
        type: "order_created",
        date: order.createdAt,
        description: `অর্ডার তৈরি হয়েছে — ৳${order.totalCOD} (${order.productCode || "-"})`,
        orderId: order._id,
      });
      (order.activities || []).forEach((activity) => {
        timeline.push({
          type: "activity",
          date: activity.timestamp || activity.changedAt || order.createdAt,
          description: `${activity.type || ""}: ${activity.description || ""}`,
          orderId: order._id,
        });
      });
    });

    drafts.forEach((draft) => {
      timeline.push({
        type: "draft",
        date: draft.createdAt,
        description: `ড্রাফট শুরু করেছে (${draft.status}) — ${draft.productName || draft.landingPageSlug || ""}`,
        draftId: draft._id,
      });
    });

    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.status(200).json({ phone, summary, orders, drafts, timeline });
  } catch (error) {
    console.error("Customer timeline error:", error);
    return res.status(500).json({ message: "কাস্টমার প্রোফাইল আনতে ব্যর্থ হয়েছে।" });
  }
};