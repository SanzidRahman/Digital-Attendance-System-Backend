const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const Attendance = require("../models/Attendance");

const todayStr = () => new Date().toISOString().slice(0, 10);

const fetchRecords = async ({ cls, section, subject, from, to }) => {
    const filter = {};
    if (cls) filter.class = cls;
    if (section) filter.section = section;
    if (subject) filter.subject = subject;
    if (from && to) filter.date = { $gte: from, $lte: to };

    return Attendance.find(filter)
        .populate("student", "name studentId roll")
        .sort({ date: 1 });
};

// @desc Download attendance report as PDF
// @route GET /api/reports/pdf?class=&section=&subject=&from=&to=
const downloadPDF = async (req, res) => {
    try {
        const records = await fetchRecords(req.query);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=attendance-${todayStr()}.pdf`);

        const doc = new PDFDocument({ margin: 40 });
        doc.pipe(res);

        doc.fontSize(18).text("Attendance Report", { align: "center" });
        doc.moveDown();
        doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`);
        doc.moveDown();

        records.forEach((r) => {
            doc
                .fontSize(10)
                .text(
                    `${r.date}  |  ${r.student?.studentId || "-"}  |  ${r.student?.name || "-"}  |  ${r.subject}  |  ${r.status.toUpperCase()}`
                );
        });

        doc.end();
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc Download attendance report as Excel
// @route GET /api/reports/excel?class=&section=&subject=&from=&to=
const downloadExcel = async (req, res) => {
    try {
        const records = await fetchRecords(req.query);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Attendance");

        sheet.columns = [
            { header: "Date", key: "date", width: 14 },
            { header: "Student ID", key: "studentId", width: 14 },
            { header: "Name", key: "name", width: 24 },
            { header: "Class", key: "class", width: 10 },
            { header: "Section", key: "section", width: 10 },
            { header: "Subject", key: "subject", width: 16 },
            { header: "Status", key: "status", width: 12 },
            { header: "Method", key: "method", width: 10 },
        ];
        sheet.getRow(1).font = { bold: true };

        records.forEach((r) => {
            sheet.addRow({
                date: r.date,
                studentId: r.student?.studentId,
                name: r.student?.name,
                class: r.class,
                section: r.section,
                subject: r.subject,
                status: r.status,
                method: r.method,
            });
        });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader("Content-Disposition", `attachment; filename=attendance-${todayStr()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { downloadPDF, downloadExcel };