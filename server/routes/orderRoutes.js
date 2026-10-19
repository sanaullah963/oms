const express = require("express");
const router = express.Router();

const orderController = require("../controllers/orderController");
const { orderAccess,requirePermission } = require("../middleware/permissions");
const { bookSteadfast } = require("../controllers/steadfastController");
const { bookSteadfastBulk } = require("../controllers/steadfastBulkController");
const {
  updateDraftOrder,
  convertDraftToOrder,
  updateDraftCallStatus,
  getDraftCourierHistory,
  getDraftCourierHistoryBulk,
} = require("../controllers/draftOrderController");


// ============================================================================
// 🔐 অর্ডার-অ্যাক্সেস গার্ড (middleware/permissions.js → orderAccess)
// :id/:orderId দিয়ে আসা প্রতিটা রুটে যাচাই হয় অর্ডারটা এই ইউজারের স্কোপে আছে কিনা
// (admin / orders.viewOthers পারমিশন / নিজের+মালিকহীন — utils/orderScope.js)।
//   • via: ["courierNotes"] → নোট-সম্পর্কিত রুট; courierNotes.viewAll পারমিশন-ওয়ালা মডারেটরও
//     (অর্ডারের মালিক না হলেও) ফ্ল্যাগ-ওয়ালা অর্ডারে এগুলো চালাতে পারবে
//   • বাল্ক রুট (courier-history-bulk, steadfast-bulk) — গার্ড নয়, কন্ট্রোলারে স্কোপ-ফিল্টার করা
// নতুন রুট যোগ করলে :id থাকলে orderAccess() বসাতে ভুলবেন না।
// ============================================================================

router.get("/", orderController.getOrders);

// মাস্টার সার্চ — parcel/order ID, courier.trackingId, অথবা ফোন নম্বর দিয়ে খোঁজা (একাধিক থাকলে সবগুলো)
router.get("/master-search", orderController.masterSearchOrders);
// হোমপেজ সার্চবক্সের DB সার্চ (HTTP — socket না, আগে socket.emit("searchQuery") দিয়ে হতো)
router.get("/search", orderController.searchOrders);
// মাস্টার সার্চ থেকে সীমিত ফিল্ড এডিট (নাম/ফোন/প্রোডাক্ট কোড/ঠিকানা/অর্ডার স্ট্যাটাস/কুরিয়ার স্ট্যাটাস) —
// fbp/fbc/fingerprintHash-এর মতো লকড ফিল্ড এই এন্ডপয়েন্ট কখনো ছোঁয় না, প্রতি ফিল্ডের জন্য audit log হয়
router.patch("/:id/master-edit", orderAccess(), orderController.masterEditOrder);
// মাস্টার সার্চ থেকে activities লগের একটা নির্দিষ্ট এন্ট্রির description এডিট (শুধু টেক্সট, type নয়)
router.patch("/:id/activity-edit", orderAccess(), orderController.masterEditActivity);
// OrderCard-এর "History" বাটন — কাস্টমারের সব কুরিয়ার মিলিয়ে success/cancel history (HTTP, socket না)
router.post("/:id/courier-history", orderAccess(), orderController.getCourierHistory);
// হোমপেজে একসাথে একাধিক অর্ডার সিলেক্ট করে "History" — সবগুলোর জন্য একবারেই রিকোয়েস্ট
router.post("/courier-history-bulk", orderController.getCourierHistoryBulk);
// OrderCard-এর নোট সেকশন (HTTP, socket না — আগে socket.emit("addNote") দিয়ে হতো)
router.patch("/:id/note", orderAccess(), orderController.addNote);

// ইনকমপ্লিট/ড্রাফট অর্ডার (কাস্টমার সাবমিট করার আগেই ফর্মে যা পূরণ করেছে)
router.use("/drafts", requirePermission("orders.viewLandingPage"));
router.get("/drafts", orderController.getDraftOrders);
router.get("/drafts/search", orderController.searchDraftOrders);
router.get("/drafts/count", orderController.getDraftOrderCount);


router.patch("/drafts/:id", updateDraftOrder); // এডিট করে সেভ (কনভার্ট না করেই)
router.patch("/drafts/:id/call-status", updateDraftCallStatus); // কল ধরেনি/ফোন বন্ধ/কথা হয়েছে/বাতিল
router.post("/drafts/:id/convert", convertDraftToOrder); // Pending queue-তে কনভার্ট
// DraftOrderCard-এর "History" বাটন — OrderCard-এর courier-history-এর হুবহু একই প্যাটার্ন
router.post("/drafts/:id/courier-history", getDraftCourierHistory);
// ইনকমপ্লিট লিস্টে একসাথে একাধিক ড্রাফট সিলেক্ট করে "History" — সবগুলোর জন্য একবারেই রিকোয়েস্ট
router.post("/drafts/courier-history-bulk", getDraftCourierHistoryBulk);
router.delete("/drafts/:id", orderController.dismissDraftOrder); // সম্পূর্ণ ডিলিট করে
router.post("/manual-single", orderController.createManualOrder);
router.delete("/delete/:id", orderAccess(), orderController.deleteOrder);
router.put("/update-order/:id", orderAccess(), orderController.updateOrder);
// OrderCard-এর স্ট্যাটাস শর্টকাট বাটন (HTTP, socket না — আগে socket.emit("updateStatus") দিয়ে হতো)
router.patch("/:id/status", orderAccess(), orderController.updateStatus);
router.patch("/update-need-attention/:id", orderAccess({ via: ["courierNotes"] }), orderController.updateNeedAttention);
// Courier Tracking Attention পেজের "Tracking OK" বাটন
router.patch("/:id/tracking-ok", orderAccess({ via: ["courierNotes"] }), orderController.trackingOk);
// Note বাবলের সমাধান/ব্যর্থ/ট্রাই নেক্সট অ্যাকশন (activities-এ কে করেছে তা মিনিমাল টেক্সটে লগ হয়)
router.patch("/:id/note-action", orderAccess({ via: ["courierNotes"] }), orderController.noteAction);
// Note বাবলের "আগের অর্ডার" মডেল — একই ফোন নম্বরের আগের অর্ডারগুলোর স্ট্যাটাস
router.get("/:id/previous-orders", orderAccess({ via: ["courierNotes"] }), orderController.getPreviousOrders);
router.patch("/:id/fix-cod-mismatch", orderAccess(), orderController.fixCodMismatch);
router.patch("/order-schedule/:orderId", orderAccess({ param: "orderId" }), orderController.scheduleOrder);

// ফ্রড/ডুপ্লিকেট ডিটেকশন — অ্যাডমিন/মডারেটর একটা অর্ডার Approve/Ignore/Block করে
router.patch("/:id/fraud-review", orderAccess(), orderController.reviewFraudOrder);
router.get("/:id/fraud-matches", orderAccess(), orderController.getFraudMatches);

// courier booking
router.post("/courier/steadfast/:orderId", orderAccess({ param: "orderId" }), bookSteadfast);
router.post("/courier/steadfast-bulk", bookSteadfastBulk);
router.post("/webhook/steadfast", orderController.steadfastBookingWebhook);

module.exports = router;