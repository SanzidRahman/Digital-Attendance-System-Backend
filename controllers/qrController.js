const crypto = require("crypto");
const QRCode = require("qrcode");
const QRSession = require("../models/QRSession");
const Teacher = require("../models/Teacher");

const ROTATE_SECONDS = Number(process.env.QR_ROTATE_SECONDS || 45);

const generateRawToken = () => crypto.randomBytes(16).toString("hex");

// Builds the QR image (data URL) for a given session + token
const buildQRDataUrl = async (sessionId, token) => {
    const payload = JSON.stringify({ sessionId, token });
    return QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, width: 320 });
};

// @desc Teacher starts a class -> creates a session + first QR token
// @route POST /api/qr/start
// body: { routine, class, section, subject, lat, lng }
const startClass = async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ user: req.user._id });
        if (!teacher) return res.status(404).json({ message: "Teacher profile not found" });

        const { routine, class: cls, section, subject, lat, lng } = req.body;
        if (lat === undefined || lng === undefined) {
            return res.status(400).json({ message: "Teacher GPS location (lat, lng) is required" });
        }

        const token = generateRawToken();
        const session = await QRSession.create({
            routine,
            teacher: teacher._id,
            class: cls,
            section,
            subject,
            currentToken: token,
            tokenExpiresAt: new Date(Date.now() + ROTATE_SECONDS * 1000),
            location: { lat, lng },
        });

        const qrDataUrl = await buildQRDataUrl(session._id, token);

        // Notify connected clients (e.g. a big-screen display) via socket.io if available
        req.app.get("io")?.to(`session:${session._id}`).emit("qr:update", {
            sessionId: session._id,
            qrDataUrl,
            expiresAt: session.tokenExpiresAt,
        });

        res.status(201).json({
            sessionId: session._id,
            qrDataUrl,
            expiresAt: session.tokenExpiresAt,
            rotateSeconds: ROTATE_SECONDS,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc Rotate (regenerate) the QR token for an active session.
// Call this every ROTATE_SECONDS from the frontend (setInterval) or a server-side cron/socket loop.
// @route POST /api/qr/:sessionId/rotate
const rotateToken = async (req, res) => {
    try {
        const session = await QRSession.findById(req.params.sessionId);
        if (!session || !session.isActive) {
            return res.status(404).json({ message: "Active session not found" });
        }

        session.currentToken = generateRawToken();
        session.tokenExpiresAt = new Date(Date.now() + ROTATE_SECONDS * 1000);
        await session.save();

        const qrDataUrl = await buildQRDataUrl(session._id, session.currentToken);

        req.app.get("io")?.to(`session:${session._id}`).emit("qr:update", {
            sessionId: session._id,
            qrDataUrl,
            expiresAt: session.tokenExpiresAt,
        });

        res.json({ sessionId: session._id, qrDataUrl, expiresAt: session.tokenExpiresAt });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc Teacher ends the class -> session becomes inactive, no more scans accepted
// @route POST /api/qr/:sessionId/end
const endClass = async (req, res) => {
    try {
        const session = await QRSession.findByIdAndUpdate(
            req.params.sessionId,
            { isActive: false, endedAt: new Date() },
            { new: true }
        );
        if (!session) return res.status(404).json({ message: "Session not found" });
        res.json({ message: "Class ended", session });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { startClass, rotateToken, endClass };