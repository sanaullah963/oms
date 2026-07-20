const express = require("express");
const router = express.Router();

const ordercontroller = require("../controllers/ordercontroller");
const { bookSteadfast } = require("../controllers/steadfastController");
const { bookSteadfastBulk } = require("../controllers/steadfastBulkController");

router.get("/", ordercontroller.getOrders);
router.post("/manual-single", ordercontroller.createManualOrder);
router.delete("/delete/:id", ordercontroller.deleteOrder);
router.put("/update-order/:id", ordercontroller.updateOrder);
router.patch("/update-need-attention/:id", ordercontroller.updateNeedAttention);
router.patch("/order-schedule/:orderId", ordercontroller.scheduleOrder);

// courier booking
router.post("/courier/steadfast/:orderId", bookSteadfast);
router.post("/courier/steadfast-bulk", bookSteadfastBulk);
router.post("/webhook/steadfast", ordercontroller.steadfastBookingWebhook);

module.exports = router;