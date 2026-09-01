const express = require("express");
const router = express.Router();
const {
  getDashboardSummary,
  getDashboardOrders,
  getProductSummary,
} = require("../controllers/dashboardController");

router.get("/summary", getDashboardSummary);
router.get("/orders", getDashboardOrders);
router.get("/product-summary", getProductSummary);

module.exports = router;