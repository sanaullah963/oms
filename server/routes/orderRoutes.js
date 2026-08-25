const express = require("express");
const router = express.Router();

const orderController = require("../controllers/orderController");
const { bookSteadfast } = require("../controllers/steadfastController");
const { bookSteadfastBulk } = require("../controllers/steadfastBulkController");
const {
  updateDraftOrder,
  convertDraftToOrder,
} = require("../controllers/draftOrderController");

router.get("/", orderController.getOrders);

// মাস্টার সার্চ — parcel/order ID, courier.trackingId, অথবা ফোন নম্বর দিয়ে খোঁজা (একাধিক থাকলে সবগুলো)
router.get("/master-search", orderController.masterSearchOrders);

// ইনকমপ্লিট/ড্রাফট অর্ডার (কাস্টমার সাবমিট করার আগেই ফর্মে যা পূরণ করেছে)
router.get("/drafts", orderController.getDraftOrders);
router.patch("/drafts/:id", updateDraftOrder); // এডিট করে সেভ (কনভার্ট না করেই)
router.post("/drafts/:id/convert", convertDraftToOrder); // Pending queue-তে কনভার্ট
router.delete("/drafts/:id", orderController.dismissDraftOrder); // সম্পূর্ণ ডিলিট করে
router.post("/manual-single", orderController.createManualOrder);
router.delete("/delete/:id", orderController.deleteOrder);
router.put("/update-order/:id", orderController.updateOrder);
router.patch("/update-need-attention/:id", orderController.updateNeedAttention);
router.patch("/order-schedule/:orderId", orderController.scheduleOrder);

// ফ্রড/ডুপ্লিকেট ডিটেকশন — অ্যাডমিন/মডারেটর একটা অর্ডার Approve/Ignore/Block করে
router.patch("/:id/fraud-review", orderController.reviewFraudOrder);
router.get("/:id/fraud-matches", orderController.getFraudMatches);

// courier booking
router.post("/courier/steadfast/:orderId", bookSteadfast);
router.post("/courier/steadfast-bulk", bookSteadfastBulk);
router.post("/webhook/steadfast", orderController.steadfastBookingWebhook);

module.exports = router;
