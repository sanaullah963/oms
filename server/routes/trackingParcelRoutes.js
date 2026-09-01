const express = require("express");
const router = express.Router();
const {
  getTrackingParcelSummary,
  getTrackingParcelOrders,
} = require("../controllers/trackingParcelController");

router.get("/summary", getTrackingParcelSummary);
router.get("/orders", getTrackingParcelOrders);

module.exports = router;