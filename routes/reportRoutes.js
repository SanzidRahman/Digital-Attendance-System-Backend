const express = require("express");
const router = express.Router();
const { downloadPDF, downloadExcel } = require("../controllers/reportController");
const { protect, authorize } = require("../middleware/auth");

router.get("/pdf", protect, authorize("admin", "teacher"), downloadPDF);
router.get("/excel", protect, authorize("admin", "teacher"), downloadExcel);

module.exports = router;