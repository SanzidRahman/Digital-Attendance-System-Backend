const mongoose = require("mongoose");

const leaveApplicationSchema = new mongoose.Schema(
    {
        student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
        fromDate: { type: String, required: true },
        toDate: { type: String, required: true },
        reason: { type: String, required: true },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("LeaveApplication", leaveApplicationSchema);