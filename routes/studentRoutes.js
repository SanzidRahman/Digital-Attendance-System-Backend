const express = require("express");
const router = express.Router();
const { listStudents, applyLeave, reviewLeave, getStudentAttendanceForParent } = require("../controllers/studentController");
const { protect, authorize } = require("../middleware/auth");

router.get("/", protect, authorize("admin", "teacher"), listStudents);
router.get("/parent-view", protect, authorize("parent"), getStudentAttendanceForParent);
router.post("/leave", protect, authorize("student"), applyLeave);
router.patch("/leave/:id", protect, authorize("teacher", "admin"), reviewLeave);

module.exports = router;