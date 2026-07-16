const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        name: { type: String, required: true },
        class: { type: String, required: true },
        section: { type: String, required: true },
        roll: { type: String, required: true },
        photo: { type: String },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);