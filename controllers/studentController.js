const Student = require("../models/Student");
const LeaveApplication = require("../models/LeaveApplication");


const listStudents = async (req, res) => {
    try {
        const { class: cls, section } = req.query;
        const filter = { isActive: true };
        if (cls) filter.class = cls;
        if (section) filter.section = section;
        const students = await Student.find(filter).sort({ roll: 1 });
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


const applyLeave = async (req, res) => {
    try {
        const student = await Student.findOne({ user: req.user._id });
        if (!student) return res.status(404).json({ message: "Student profile not found" });

        const { fromDate, toDate, reason } = req.body;
        const leave = await LeaveApplication.create({ student: student._id, fromDate, toDate, reason });
        res.status(201).json(leave);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


const reviewLeave = async (req, res) => {
    try {
        const { status } = req.body; // "approved" | "rejected"
        const leave = await LeaveApplication.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!leave) return res.status(404).json({ message: "Leave application not found" });
        res.json(leave);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


const getStudentAttendanceForParent = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: "Student ID or Roll is required for search" });
        }

        const Student = require("../models/Student");
        const Attendance = require("../models/Attendance");

        // Find student by Student ID or Roll number
        const student = await Student.findOne({
            $or: [{ studentId: search }, { roll: search }]
        });

        if (!student) {
            return res.status(404).json({ message: "Student not found with this ID or Roll" });
        }

        // Fetch attendance logs
        const records = await Attendance.find({ student: student._id }).sort({ date: -1 });
        const total = records.length;
        const present = records.filter((r) => r.status !== "absent").length;
        const percentage = total ? ((present / total) * 100).toFixed(1) : "0.0";

        res.json({ student, records, total, present, percentage });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { listStudents, applyLeave, reviewLeave, getStudentAttendanceForParent };