require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/dbConfig");

const User = require("../models/User");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const ClassRoutine = require("../models/ClassRoutine");
const Attendance = require("../models/Attendance");
const LeaveApplication = require("../models/LeaveApplication");

const seed = async () => {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected. Clearing old collections...");

        await User.deleteMany({});
        await Student.deleteMany({});
        await Teacher.deleteMany({});
        await ClassRoutine.deleteMany({});
        await Attendance.deleteMany({});
        await LeaveApplication.deleteMany({});

        console.log("Creating default Users & Profiles...");

        // 1. Admin
        const adminUser = await User.create({
            name: "School Admin",
            email: "admin@school.com",
            password: "admin123", // Password will be hashed by mongoose pre-save hook
            role: "admin",
            campus: "Dhaka Campus"
        });

        // 2. Teacher
        const teacherUser = await User.create({
            name: "Abdur Rahman",
            email: "teacher@school.com",
            password: "teacher123",
            role: "teacher",
            campus: "Dhaka Campus"
        });

        const teacherProfile = await Teacher.create({
            user: teacherUser._id,
            teacherId: "TCH201",
            name: "Abdur Rahman",
            designation: "Assistant Professor",
            subject: ["Mathematics", "Physics", "Chemistry"]
        });

        teacherUser.profileRef = teacherProfile._id;
        await teacherUser.save();

        // 3. Students
        const studentData = [
            { name: "Adnan Hossain", email: "adnan@school.com", studentId: "STD101", roll: "101" },
            { name: "Nabila Akter", email: "nabila@school.com", studentId: "STD102", roll: "102" },
            { name: "Rifat Islam", email: "rifat@school.com", studentId: "STD103", roll: "103" },
            { name: "Sadia Khan", email: "sadia@school.com", studentId: "STD104", roll: "104" },
            { name: "Tanvir Ahmed", email: "tanvir@school.com", studentId: "STD105", roll: "105" }
        ];

        const studentProfiles = [];
        for (const data of studentData) {
            const user = await User.create({
                name: data.name,
                email: data.email,
                password: "student123",
                role: "student",
                campus: "Dhaka Campus"
            });

            const profile = await Student.create({
                user: user._id,
                studentId: data.studentId,
                name: data.name,
                class: "10",
                section: "A",
                roll: data.roll,
                guardianContact: {
                    phone: "+8801700000000",
                    email: "guardian@test.com"
                }
            });

            user.profileRef = profile._id;
            await user.save();
            studentProfiles.push(profile);
        }

        // 4. Parent (Linked to Adnan Hossain)
        await User.create({
            name: "Adnan's Parent",
            email: "parent@school.com",
            password: "parent123",
            role: "parent",
            campus: "Dhaka Campus"
        });

        console.log("Creating Class Routines...");

        // Routines for Sunday-Thursday
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu"];
        const routines = [];

        for (const day of days) {
            // Math class
            routines.push({
                class: "10",
                section: "A",
                subject: "Mathematics",
                teacher: teacherProfile._id,
                day,
                startTime: "09:00",
                endTime: "10:00"
            });

            // Physics class
            routines.push({
                class: "10",
                section: "A",
                subject: "Physics",
                teacher: teacherProfile._id,
                day,
                startTime: "10:15",
                endTime: "11:15"
            });

            // Chemistry class
            routines.push({
                class: "10",
                section: "A",
                subject: "Chemistry",
                teacher: teacherProfile._id,
                day,
                startTime: "12:00",
                endTime: "13:00"
            });
        }

        await ClassRoutine.insertMany(routines);

        console.log("Generating past Attendance history...");

        // Generate attendance logs for the last 15 days
        const subjects = ["Mathematics", "Physics", "Chemistry"];
        const today = new Date();
        const attendanceLogs = [];

        for (let i = 20; i >= 1; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            
            // Skip weekends
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 5 || dayOfWeek === 6) continue; // Skip Fri/Sat in BD context

            const dateStr = date.toISOString().slice(0, 10);

            for (const sub of subjects) {
                for (const student of studentProfiles) {
                    // Randomize status: 85% Present, 10% Late, 5% Absent
                    const rand = Math.random();
                    let status = "present";
                    let checkInTime = new Date(date);

                    if (rand < 0.05) {
                        status = "absent";
                    } else if (rand < 0.15) {
                        status = "late";
                        // Late check in: around 9:15 AM
                        checkInTime.setHours(9, 10 + Math.floor(Math.random() * 10), 0);
                    } else {
                        // On time: around 8:55 AM
                        checkInTime.setHours(8, 50 + Math.floor(Math.random() * 10), 0);
                    }

                    attendanceLogs.push({
                        student: student._id,
                        class: student.class,
                        section: student.section,
                        subject: sub,
                        date: dateStr,
                        checkInTime: status === "absent" ? null : checkInTime,
                        status,
                        method: "qr",
                        studentLocation: {
                            lat: 23.8103 + (Math.random() - 0.5) * 0.0005,
                            lng: 90.4125 + (Math.random() - 0.5) * 0.0005
                        }
                    });
                }
            }
        }

        await Attendance.insertMany(attendanceLogs);

        console.log("Seeding Leave Applications...");
        await LeaveApplication.create({
            student: studentProfiles[0]._id, // Adnan
            fromDate: today.toISOString().slice(0, 10),
            toDate: new Date(today.getTime() + 86400000 * 2).toISOString().slice(0, 10),
            reason: "Sickness / Fever",
            status: "pending"
        });

        console.log("✅ Database seeded successfully!");
        console.log("\nDefault credentials:");
        console.log("Admin:   admin@school.com    / admin123");
        console.log("Teacher: teacher@school.com  / teacher123");
        console.log("Student: adnan@school.com    / student123");
        console.log("Parent:  parent@school.com   / parent123");

        mongoose.connection.close();
    } catch (err) {
        console.error("Seeding Error:", err);
        process.exit(1);
    }
};

seed();
