const mongoose = require("mongoose");

const classRoutineSchema = new mongoose.Schema(
    {
        class: { type: String, required: true },
        section: { type: String, required: true },
        subject: { type: String, required: true },
        teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
        day: {
            type: String,
            enum: ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"],
            required: true,
        },
        startTime: { type: String, required: true }, // "09:00"
        endTime: { type: String, required: true }, // "09:45"
    },
    { timestamps: true }
);

module.exports = mongoose.model("ClassRoutine", classRoutineSchema);