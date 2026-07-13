const User = require("../models/User");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const generateToken = require("../utils/generateToken");

// @desc Register a new user (admin creates teacher/student accounts, or self-signup for demo)
// @route POST /api/auth/register
const register = async (req, res) => {
    try {
        const { name, email, password, role, campus, profileData } = req.body;

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const user = await User.create({ name, email, password, role, campus });

        // Auto-create linked Student/Teacher profile if data supplied
        let profile = null;
        if (role === "student" && profileData) {
            profile = await Student.create({ ...profileData, user: user._id, name });
            user.profileRef = profile._id;
            await user.save();
        } else if (role === "teacher" && profileData) {
            profile = await Teacher.create({ ...profileData, user: user._id, name });
            user.profileRef = profile._id;
            await user.save();
        }

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user),
            profile,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc Login
// @route POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select("+password");

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: "Invalid email or password" });
        }
        if (!user.isActive) {
            return res.status(403).json({ message: "Account deactivated" });
        }

        let profile = null;
        if (user.role === "student") profile = await Student.findOne({ user: user._id });
        if (user.role === "teacher") profile = await Teacher.findOne({ user: user._id });

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            campus: user.campus,
            token: generateToken(user),
            profile,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc Get current logged-in user
// @route GET /api/auth/me
const getMe = async (req, res) => {
    res.json({ user: req.user });
};

module.exports = { register, login, getMe };