require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const connectDB = require("./config/dbConfig");

const authRoutes = require("./routes/authRoutes");
const qrRoutes = require("./routes/qrRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const reportRoutes = require("./routes/reportRoutes");
const studentRoutes = require("./routes/studentRoutes");

connectDB();


const app = express();
app.use(
    cors({
        origin: [process.env.CORS_ORIGIN, "https://digital-attendance-system-frontend-alpha.vercel.app"].filter(Boolean),
        credentials: true,
    })
);
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: process.env.CORS_ORIGIN || "https://digital-attendance-system-frontend-alpha.vercel.app", credentials: true },
});

// Make io accessible inside controllers via req.app.get("io")
app.set("io", io);

io.on("connection", (socket) => {
    // Clients (teacher's display, or students waiting) join a room per session
    socket.on("session:join", (sessionId) => {
        socket.join(`session:${sessionId}`);
    });

    socket.on("disconnect", () => {
        // no-op, room membership cleans up automatically
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/students", studentRoutes);

app.get("/", (req, res) => res.json({ status: "Attendance API is running" }));

// Central error handler (fallback)
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: "Server error" });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));