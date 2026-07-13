const mongoose = require("mongoose");

// One document = one "class started" session by a teacher.
// The `currentToken` field rotates every QR_ROTATE_SECONDS (handled in qrController + socket.io).
const qrSessionSchema = new mongoose.Schema(
    {
        routine: { type: mongoose.Schema.Types.ObjectId, ref: "ClassRoutine" },
        teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
        class: { type: String, required: true },
        section: { type: String, required: true },
        subject: { type: String, required: true },

        // Rotating dynamic token + when it expires
        currentToken: { type: String, required: true },
        tokenExpiresAt: { type: Date, required: true },

        // Teacher's location at class start - used to verify student is physically present
        location: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
        },

        isActive: { type: Boolean, default: true }, // teacher can "End Class"
        startedAt: { type: Date, default: Date.now },
        endedAt: { type: Date },
    },
    { timestamps: true }
);

module.exports = mongoose.model("QRSession", qrSessionSchema);