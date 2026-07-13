const express = require("express");
const router = express.Router();
const { startClass, rotateToken, endClass } = require("../controllers/qrController");
const { protect, authorize } = require("../middleware/auth");

router.post("/start", protect, authorize("teacher"), startClass);
router.post("/:sessionId/rotate", protect, authorize("teacher"), rotateToken);
router.post("/:sessionId/end", protect, authorize("teacher"), endClass);

module.exports = router;