const QRSession = require("../models/QRSession");
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const { getDistanceInMeters } = require("../utils/geo");

const MAX_DISTANCE = Number(process.env.GPS_MAX_DISTANCE_METERS || 100);
const todayStr = () => new Date().toISOString().slice(0, 10);

// @desc Student scans the QR code -> validates token + GPS -> marks attendance
// @route POST /api/attendance/scan
// body: { sessionId, token, lat, lng }

const scanQR = async (req, res) => {
    try {
        const { sessionId, token, lat, lng } = req.body;

        const student = await Student.findOne({ user: req.user._id });
        if (!student) return res.status(404).json({ message: "Student profile not found" });

        const session = await QRSession.findById(sessionId);
        if (!session || !session.isActive) {
            return res.status(400).json({ message: "This class session is no longer active" });
        }
        if (session.currentToken !== token || session.tokenExpiresAt < new Date()) {
            return res.status(400).json({ message: "QR code expired, please rescan the latest code" });
        }
        if (student.class !== session.class || student.section !== session.section) {
            return res.status(403).json({ message: "This class is not for your section" });
        }

        if (lat === undefined || lng === undefined) {
            return res.status(400).json({ message: "Location permission is required to check in" });
        }
        const distance = getDistanceInMeters(lat, lng, session.location.lat, session.location.lng);
        if (distance > MAX_DISTANCE) {
            return res.status(403).json({
                message: `You appear to be too far from class (${Math.round(distance)}m). Attendance rejected.`,
            });
        }

        const attendance = await Attendance.findOneAndUpdate(
            { student: student._id, subject: session.subject, date: todayStr() },
            {
                student: student._id,
                session: session._id,
                class: session.class,
                section: session.section,
                subject: session.subject,
                date: todayStr(),
                checkInTime: new Date(),
                status: "present",
                method: "qr",
                studentLocation: { lat, lng },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const io = req.app.get("io");
        const timeStr = new Date(attendance.checkInTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

        // Trigger live socket check-in event to update screens
        io?.emit("attendance:new", {
            studentName: student.name,
            roll: student.roll,
            time: timeStr,
            status: "present"
        });

        // Trigger SMS, Email, WhatsApp notifications
        const { triggerAttendanceNotifications } = require("../services/notificationService");
        triggerAttendanceNotifications(student, "present", timeStr, io);

        res.json({ message: "Attendance marked successfully", attendance });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "Attendance already recorded for this subject today" });
        }
        res.status(500).json({ message: err.message });
    }
};

// @desc Teacher marks attendance manually for one or more students
// @route POST /api/attendance/manual
// body: { class, section, subject, date, records: [{ studentId, status }] }
const markManual = async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ user: req.user._id });
        if (!teacher) return res.status(404).json({ message: "Teacher profile not found" });

        const { class: cls, section, subject, date, records } = req.body;
        const day = date || todayStr();

        const ops = records.map((r) => ({
            updateOne: {
                filter: { student: r.studentId, subject, date: day },
                update: {
                    $set: {
                        student: r.studentId,
                        class: cls,
                        section,
                        subject,
                        date: day,
                        status: r.status,
                        method: "manual",
                        markedBy: teacher._id,
                        checkInTime: new Date(),
                    },
                },
                upsert: true,
            },
        }));

        await Attendance.bulkWrite(ops);

        // Fetch students to send notifications and emit sockets
        const io = req.app.get("io");
        const { triggerAttendanceNotifications } = require("../services/notificationService");

        for (const record of records) {
            const student = await Student.findById(record.studentId);
            if (student) {
                const timeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

                // Live broadcast
                io?.emit("attendance:new", {
                    studentName: student.name,
                    roll: student.roll,
                    time: timeStr,
                    status: record.status
                });

                // Notifications
                triggerAttendanceNotifications(student, record.status, timeStr, io);
            }
        }

        res.json({ message: `Attendance saved for ${records.length} students` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc Teacher/Admin edits a single attendance record
// @route PATCH /api/attendance/:id
const editAttendance = async (req, res) => {
    try {
        const { status } = req.body;
        const record = await Attendance.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!record) return res.status(404).json({ message: "Record not found" });
        res.json({ message: "Attendance updated", record });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc Student's own attendance history + percentage
// @route GET /api/attendance/history
const myHistory = async (req, res) => {
    try {
        const student = await Student.findOne({ user: req.user._id });
        if (!student) return res.status(404).json({ message: "Student profile not found" });

        const { month } = req.query; // "YYYY-MM" optional filter
        const filter = { student: student._id };
        if (month) filter.date = { $regex: `^${month}` };

        const records = await Attendance.find(filter).sort({ date: -1 });
        const total = records.length;
        const present = records.filter((r) => r.status !== "absent").length;
        const percentage = total ? ((present / total) * 100).toFixed(1) : "0.0";

        res.json({ records, total, present, percentage });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc Teacher's daily report for a class/section/subject
// @route GET /api/attendance/daily-report?class=&section=&subject=&date=
const dailyReport = async (req, res) => {
    try {
        const { class: cls, section, subject, date } = req.query;
        const filter = { date: date || todayStr() };
        if (cls) filter.class = cls;
        if (section) filter.section = section;
        if (subject) filter.subject = subject;

        const records = await Attendance.find(filter).populate("student", "name studentId roll photo");
        res.json({ date: filter.date, count: records.length, records });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { scanQR, markManual, editAttendance, myHistory, dailyReport };