const express = require("express");
const router = express.Router();

const orderController = require("../controllers/orderController");
const { bookSteadfast } = require("../controllers/steadfastController");
const { bookSteadfastBulk } = require("../controllers/steadfastBulkController");

router.get("/", orderController.getOrders);
router.post("/manual-single", orderController.createManualOrder);
router.delete("/delete/:id", orderController.deleteOrder);
router.put("/update-order/:id", orderController.updateOrder);
router.patch("/update-need-attention/:id", orderController.updateNeedAttention);
router.patch("/order-schedule/:orderId", orderController.scheduleOrder);

// courier booking
router.post("/courier/steadfast/:orderId", bookSteadfast);
router.post("/courier/steadfast-bulk", bookSteadfastBulk);
router.post("/webhook/steadfast", orderController.steadfastBookingWebhook);

module.exports = router;
