const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
    {
        student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
        session: { type: mongoose.Schema.Types.ObjectId, ref: "QRSession" }, // null if manual entry
        class: { type: String, required: true },
        section: { type: String, required: true },
        subject: { type: String, required: true },
        date: { type: String, required: true }, // "YYYY-MM-DD" for easy day-wise queries
        checkInTime: { type: Date, default: Date.now },
        status: {
            type: String,
            enum: ["present", "absent", "late"],
            default: "present",
        },
        method: {
            type: String,
            enum: ["qr", "manual"],
            default: "qr",
        },
        markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" }, // for manual entries
        studentLocation: {
            lat: Number,
            lng: Number,
        },
    },
    { timestamps: true }
);

// Prevent duplicate attendance for the same student/subject/date
attendanceSchema.index({ student: 1, subject: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);