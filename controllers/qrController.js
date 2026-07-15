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
            // Be explicit so QR rotation remains valid even if schema defaults
            // change or an older deployment has a different default.
            isActive: true,
        });

        const qrDataUrl = await buildQRDataUrl(session._id, token);

        // Notify connected clients (e.g. a big-screen display) via socket.io if available
        req.app.get("io")?.to(`session:${session._id}`).emit("qr:update", {
            sessionId: session._id,
            qrDataUrl,
            expiresAt: session.tokenExpiresAt,
            rotateSeconds: ROTATE_SECONDS,
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


const rotateToken = async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ user: req.user._id });
        if (!teacher) return res.status(404).json({ message: "Teacher profile not found" });

        const session = await QRSession.findById(req.params.sessionId);
        if (!session) return res.status(404).json({ message: "QR session not found" });
        if (!session.teacher.equals(teacher._id)) {
            return res.status(403).json({ message: "You cannot rotate another teacher's QR session" });
        }
        if (!session.isActive) {
            return res.status(409).json({
                message: `This class session was ended${session.endedAt ? ` at ${session.endedAt.toISOString()}` : ""}. Start a new session to rotate its QR code.`,
            });
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

        res.json({
            sessionId: session._id,
            qrDataUrl,
            expiresAt: session.tokenExpiresAt,
            rotateSeconds: ROTATE_SECONDS,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


const endClass = async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ user: req.user._id });
        if (!teacher) return res.status(404).json({ message: "Teacher profile not found" });

        const session = await QRSession.findById(req.params.sessionId);
        if (!session) return res.status(404).json({ message: "Session not found" });
        if (!session.teacher.equals(teacher._id)) {
            return res.status(403).json({ message: "You cannot end another teacher's class session" });
        }
        if (!session.isActive) {
            return res.status(409).json({ message: "This class session has already ended" });
        }

        session.isActive = false;
        session.endedAt = new Date();
        await session.save();
        console.warn("QR session ended", {
            sessionId: session._id.toString(),
            teacherId: teacher._id.toString(),
            endedAt: session.endedAt.toISOString(),
            ip: req.ip,
            forwardedFor: req.get("x-forwarded-for") || null,
            userAgent: req.get("user-agent") || null,
        });
        res.json({ message: "Class ended", session });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { startClass, rotateToken, endClass };
