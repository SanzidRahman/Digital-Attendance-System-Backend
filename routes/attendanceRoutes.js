const express = require("express");
const router = express.Router();
const {
    scanQR,
    markManual,
    editAttendance,
    myHistory,
    dailyReport,
} = require("../controllers/attendanceController");
const { protect, authorize } = require("../middleware/auth");

router.post("/scan", protect, authorize("student"), scanQR);
router.post("/manual", protect, authorize("teacher"), markManual);
router.patch("/:id", protect, authorize("teacher", "admin"), editAttendance);
router.get("/history", protect, authorize("student"), myHistory);
router.get("/daily-report", protect, authorize("teacher", "admin"), dailyReport);

module.exports = router;