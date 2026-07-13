const express = require("express");
const router = express.Router();
const { summary, monthlyTrend } = require("../controllers/dashboardController");
const { protect, authorize } = require("../middleware/auth");

router.get("/summary", protect, authorize("admin", "teacher"), summary);
router.get("/monthly", protect, authorize("admin", "teacher"), monthlyTrend);

module.exports = router;