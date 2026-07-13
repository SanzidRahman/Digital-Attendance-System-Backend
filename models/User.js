const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        password: { type: String, required: true, select: false },
        role: {
            type: String,
            enum: ["admin", "teacher", "student", "parent"],
            default: "student",
        },
        // Link to the detailed profile document
        profileRef: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "role", // works because collection names roughly match role names for student/teacher
        },
        campus: { type: String, default: "main" }, // multi-campus support
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);