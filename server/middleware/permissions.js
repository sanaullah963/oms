// ============================================================================
// পারমিশন মিডলওয়্যার — যেকোনো রুট/URL-এ বসানো যায়
// ============================================================================
// ব্যবহার (protect-এর পরে বসাতে হবে, কারণ req.user লাগে):
//
//   // ১) পুরো URL/ফিচার একটা পারমিশনের পেছনে আটকানো:
//   router.get("/something", requirePermission("some.key"), controller.fn);
//
//   // ২) :id (অর্ডার) আছে এমন URL — অর্ডারটা এই ইউজারের স্কোপে আছে কিনা যাচাই:
//   router.patch("/:id/status", orderAccess(), controller.updateStatus);
//   router.patch("/:id/tracking-ok", orderAccess({ via: ["courierNotes"] }), controller.trackingOk);
// ============================================================================

const mongoose = require("mongoose");
const Order = require("../models/Order");
const { can } = require("../config/permissions");
const { canAccessOrder } = require("../utils/orderScope");

// --- পুরো রুট একটা পারমিশনের পেছনে আটকায় (admin সবসময় পাস) ---
function requirePermission(key) {
  return function permissionGate(req, res, next) {
    if (can(req.user, key)) return next();
    console.log(
      `🚫 Permission denied: user=${req.user?.name} (${req.user?._id}) key="${key}" ${req.method} ${req.originalUrl}`,
    );
    return res.status(403).json({
      message: "এই অংশে আপনার অ্যাক্সেস নেই। অ্যাডমিনের কাছ থেকে অনুমতি নিন।",
      permission: key,
    });
  };
}

// --- :id/:orderId দিয়ে আসা অর্ডার ইউজারের স্কোপে আছে কিনা চেক করে ---
// অর্ডার না পাওয়া গেলে/ID ভুল হলে এখানে আটকাই না — কন্ট্রোলারের নিজস্ব 404/400 হ্যান্ডলিং-ই চলবে
function orderAccess({ param = "id", via = [] } = {}) {
  return async function orderAccessGate(req, res, next) {
    try {
      const id = req.params[param];
      if (!id || !mongoose.Types.ObjectId.isValid(id)) return next();

      const order = await Order.findById(id)
        .select("createdBy needsAttention courierTrackingAttention")
        .lean();
      if (!order) return next();

      if (canAccessOrder(req.user, order, { via })) return next();

      console.log(
        `🚫 Order access denied: user=${req.user?.name} (${req.user?._id}) order=${id} owner=${order.createdBy} ${req.method} ${req.originalUrl}`,
      );
      return res.status(403).json({
        message: "এই অর্ডারে আপনার অ্যাক্সেস নেই।",
      });
    } catch (error) {
      console.error("orderAccess middleware error:", error);
      return res.status(500).json({ message: "অ্যাক্সেস যাচাই করতে ব্যর্থ হয়েছে।" });
    }
  };
}

module.exports = { requirePermission, orderAccess };
