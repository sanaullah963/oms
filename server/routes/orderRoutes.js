const express = require("express");
const router = express.Router();

const orderController = require("../controllers/orderController");
const { bookSteadfast } = require("../controllers/steadfastController");
const { bookSteadfastBulk } = require("../controllers/steadfastBulkController");
const {
  updateDraftOrder,
  convertDraftToOrder,
  updateDraftCallStatus,
} = require("../controllers/draftOrderController");

router.get("/", orderController.getOrders);

// মাস্টার সার্চ — parcel/order ID, courier.trackingId, অথবা ফোন নম্বর দিয়ে খোঁজা (একাধিক থাকলে সবগুলো)
router.get("/master-search", orderController.masterSearchOrders);
// মাস্টার সার্চ থেকে সীমিত ফিল্ড এডিট (নাম/ফোন/প্রোডাক্ট কোড/ঠিকানা/অর্ডার স্ট্যাটাস/কুরিয়ার স্ট্যাটাস) —
// fbp/fbc/fingerprintHash-এর মতো লকড ফিল্ড এই এন্ডপয়েন্ট কখনো ছোঁয় না, প্রতি ফিল্ডের জন্য audit log হয়
router.patch("/:id/master-edit", orderController.masterEditOrder);
// মাস্টার সার্চ থেকে activities লগের একটা নির্দিষ্ট এন্ট্রির description এডিট (শুধু টেক্সট, type নয়)
router.patch("/:id/activity-edit", orderController.masterEditActivity);
// OrderCard-এর "History" বাটন — কাস্টমারের সব কুরিয়ার মিলিয়ে success/cancel history (HTTP, socket না)
router.post("/:id/courier-history", orderController.getCourierHistory);

// ইনকমপ্লিট/ড্রাফট অর্ডার (কাস্টমার সাবমিট করার আগেই ফর্মে যা পূরণ করেছে)
router.get("/drafts", orderController.getDraftOrders);
router.patch("/drafts/:id", updateDraftOrder); // এডিট করে সেভ (কনভার্ট না করেই)
router.patch("/drafts/:id/call-status", updateDraftCallStatus); // কল ধরেনি/ফোন বন্ধ/কথা হয়েছে/বাতিল
router.post("/drafts/:id/convert", convertDraftToOrder); // Pending queue-তে কনভার্ট
router.delete("/drafts/:id", orderController.dismissDraftOrder); // সম্পূর্ণ ডিলিট করে
router.post("/manual-single", orderController.createManualOrder);
router.delete("/delete/:id", orderController.deleteOrder);
router.put("/update-order/:id", orderController.updateOrder);
router.patch("/update-need-attention/:id", orderController.updateNeedAttention);
// Note বাবলের সমাধান/ব্যর্থ/ট্রাই নেক্সট অ্যাকশন (activities-এ কে করেছে তা মিনিমাল টেক্সটে লগ হয়)
router.patch("/:id/note-action", orderController.noteAction);
// Note বাবলের "আগের অর্ডার" মডেল — একই ফোন নম্বরের আগের অর্ডারগুলোর স্ট্যাটাস
router.get("/:id/previous-orders", orderController.getPreviousOrders);
router.patch("/:id/fix-cod-mismatch", orderController.fixCodMismatch);
router.patch("/order-schedule/:orderId", orderController.scheduleOrder);

// ফ্রড/ডুপ্লিকেট ডিটেকশন — অ্যাডমিন/মডারেটর একটা অর্ডার Approve/Ignore/Block করে
router.patch("/:id/fraud-review", orderController.reviewFraudOrder);
router.get("/:id/fraud-matches", orderController.getFraudMatches);

// courier booking
router.post("/courier/steadfast/:orderId", bookSteadfast);
router.post("/courier/steadfast-bulk", bookSteadfastBulk);
router.post("/webhook/steadfast", orderController.steadfastBookingWebhook);

module.exports = router;