const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifies JWT and attaches `req.user`
const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        let token;
        if (authHeader && authHeader.startsWith("Bearer")) {
            token = authHeader.split(" ")[1];
        } else if (req.query.token) {
            // Fallback for direct browser downloads (e.g. <a href="...pdf?token=...">)
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({ message: "Not authorized, no token" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);
        if (!user || !user.isActive) {
            return res.status(401).json({ message: "User not found or inactive" });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Not authorized, invalid token" });
    }
};

// Restrict route to specific roles: authorize("admin", "teacher")
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden: insufficient role" });
        }
        next();
    };
};

module.exports = { protect, authorize };