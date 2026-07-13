// Mock notification service for SMS, Email, and WhatsApp.
// In a production app, this would integrate with Twilio, Nodemailer, WhatsApp Business API, etc.

const sendSMS = async (phone, message, io) => {
    console.log(`[SMS Sent] to ${phone}: "${message}"`);
    io?.emit("notification:sent", {
        type: "SMS",
        recipient: phone,
        message,
        timestamp: new Date()
    });
};

const sendEmail = async (email, subject, html, io) => {
    console.log(`[Email Sent] to ${email}: Subject: "${subject}"`);
    io?.emit("notification:sent", {
        type: "Email",
        recipient: email,
        message: `Subject: ${subject} (HTML content sent)`,
        timestamp: new Date()
    });
};

const sendWhatsApp = async (phone, message, io) => {
    console.log(`[WhatsApp Sent] to ${phone}: "${message}"`);
    io?.emit("notification:sent", {
        type: "WhatsApp",
        recipient: phone,
        message,
        timestamp: new Date()
    });
};

// Main trigger when attendance is marked (either via QR or manually)
const triggerAttendanceNotifications = async (student, status, timeStr, io) => {
    if (!student || !student.guardianContact) return;

    const { phone, email } = student.guardianContact;
    let statusText = "উপস্থিত";
    if (status === "late") statusText = "দেরি করে উপস্থিত";
    if (status === "absent") statusText = "অনুপস্থিত";

    const time = timeStr || new Date().toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
    const smsMessage = `ডিজিটাল অ্যাটেনডেন্স: আপনার সন্তান ${student.name} আজ সকাল ${time}-এ ${statusText} হয়েছে।`;
    
    // SMS Trigger
    if (phone) {
        await sendSMS(phone, smsMessage, io);
    }

    // WhatsApp Trigger (same message text)
    if (phone) {
        await sendWhatsApp(phone, `*Digital Attendance System*\n${smsMessage}`, io);
    }

    // Email Trigger
    if (email) {
        const subject = `Attendance Alert: ${student.name} is ${status.toUpperCase()} today`;
        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #2563eb;">Digital Attendance Alert</h2>
                <p>Dear Guardian,</p>
                <p>This is to inform you that your child, <strong>${student.name}</strong> (Roll: ${student.roll}, Class: ${student.class}, Section: ${student.section}), has been marked as <strong>${status.toUpperCase()}</strong> today.</p>
                <p><strong>Check-in Time:</strong> ${time}</p>
                <p style="margin-top: 20px; font-size: 0.90em; color: #64748b;">This is an automated notification from the Digital Attendance System.</p>
            </div>
        `;
        await sendEmail(email, subject, html, io);
    }
};

module.exports = {
    sendSMS,
    sendEmail,
    sendWhatsApp,
    triggerAttendanceNotifications
};
