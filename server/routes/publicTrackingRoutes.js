const express = require("express");
const router = express.Router();
const { updateSession, saveDraftOrder } = require("../controllers/publicTrackingController");

router.post("/session", updateSession);
router.post("/draft", saveDraftOrder);

module.exports = router;