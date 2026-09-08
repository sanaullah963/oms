const express = require("express");
const router = express.Router();
const {
  getDashboardSummary,
  getDashboardOrders,
  getProductSummary,
  getProductFinancialSummary,
} = require("../controllers/dashboardController");

router.get("/summary", getDashboardSummary);
router.get("/orders", getDashboardOrders);
router.get("/product-summary", getProductSummary);
router.get("/product-financial-summary", getProductFinancialSummary);

module.exports = router;