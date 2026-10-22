const express = require("express");
const router = express.Router();
const {
  getDashboardSummary,
  getDashboardOrders,
  getProductSummary,
  getBookedOutcome,
  getProductFinancialSummary,
  getAttentionCounts,
} = require("../controllers/dashboardController");

router.get("/summary", getDashboardSummary);
router.get("/orders", getDashboardOrders);
router.get("/product-summary", getProductSummary);
router.get("/booked-outcome", getBookedOutcome);
router.get("/product-financial-summary", getProductFinancialSummary);
router.get("/attention-counts", getAttentionCounts);

module.exports = router;