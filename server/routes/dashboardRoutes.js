const express = require("express");
const router = express.Router();
const { adminOnly } = require("../middleware/auth");
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
// আর্থিক হিসাব — শুধু এডমিন (মডারেটর 403 পাবে)
router.get("/product-financial-summary", adminOnly, getProductFinancialSummary);
router.get("/attention-counts", getAttentionCounts);

module.exports = router;