const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        teacherId: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        designation: { type: String },
        subject: [{ type: String }],
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Teacher", teacherSchema);