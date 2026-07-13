const Student = require("../models/Student");
const Attendance = require("../models/Attendance");

const todayStr = () => new Date().toISOString().slice(0, 10);

// @desc Admin dashboard summary: totals, present/absent/late today, attendance rate
// @route GET /api/dashboard/summary
const summary = async (req, res) => {
    try {
        const totalStudents = await Student.countDocuments({ isActive: true });
        const today = todayStr();

        const todayRecords = await Attendance.find({ date: today });
        // Distinct students marked present/late today (a student may have multiple subject entries)
        const presentIds = new Set(
            todayRecords.filter((r) => r.status !== "absent").map((r) => String(r.student))
        );
        const lateCount = todayRecords.filter((r) => r.status === "late").length;

        const todayPresent = presentIds.size;
        const todayAbsent = Math.max(totalStudents - todayPresent, 0);
        const attendanceRate = totalStudents
            ? ((todayPresent / totalStudents) * 100).toFixed(1)
            : "0.0";

        res.json({
            totalStudents,
            todayPresent,
            todayAbsent,
            lateStudents: lateCount,
            attendanceRate,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc Monthly attendance trend for charts: [{ date, presentCount }]
// @route GET /api/dashboard/monthly?month=YYYY-MM
const monthlyTrend = async (req, res) => {
    try {
        const month = req.query.month || todayStr().slice(0, 7);

        const trend = await Attendance.aggregate([
            { $match: { date: { $regex: `^${month}` }, status: { $ne: "absent" } } },
            { $group: { _id: { date: "$date", student: "$student" } } },
            { $group: { _id: "$_id.date", presentCount: { $sum: 1 } } },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: "$_id", presentCount: 1 } },
        ]);

        res.json({ month, trend });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { summary, monthlyTrend };