// backend/controllers/superAdminController.js
// 👑 Super Admin Controller - Secure Version

const User = require("../models/User");
const bcrypt = require("bcrypt");

const CONSTANTS = {
    MIN_PASSWORD_LENGTH: 8
};

/**
 * التحقق من صحة البريد
 */
const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

/**
 * إنشاء أول أدمن في النظام
 */
const createFirstAdmin = async(req, res) => {
    try {

        console.log("[SuperAdmin] Create first admin request");

        // التحقق من وجود أدمن مسبقاً
        const existingAdmin = await User.findOne({ role: "admin" });

        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: "يوجد أدمن بالفعل في النظام"
            });
        }

        // قراءة بيانات الأدمن من env
        const adminName =
            process.env.SUPER_ADMIN_NAME || "Super Admin";

        const adminEmail =
            process.env.SUPER_ADMIN_EMAIL || "admin@example.com";

        const adminPassword =
            process.env.SUPER_ADMIN_PASSWORD;

        if (!adminPassword) {
            console.error("SUPER_ADMIN_PASSWORD not set");
            return res.status(500).json({
                success: false,
                message: "Server configuration error"
            });
        }

        if (!isValidEmail(adminEmail)) {
            return res.status(500).json({
                success: false,
                message: "Invalid admin email configuration"
            });
        }

        if (adminPassword.length < CONSTANTS.MIN_PASSWORD_LENGTH) {
            return res.status(500).json({
                success: false,
                message: "Admin password too weak"
            });
        }

        // تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        // إنشاء الأدمن
        const admin = await User.create({
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            role: "admin",
            isActive: true,
            isVerified: true
        });

        console.log("[SuperAdmin] First admin created:", admin.email);

        res.status(201).json({
            success: true,
            message: "تم إنشاء الأدمن الأول بنجاح",
            data: {
                id: admin._id,
                email: admin.email,
                name: admin.name
            }
        });

    } catch (error) {

        console.error("[SuperAdmin] Error:", error.message);

        res.status(500).json({
            success: false,
            message: "حدث خطأ في السيرفر"
        });
    }
};

/**
 * التحقق من وجود أدمن
 */
const checkAdminStatus = async(req, res) => {
    try {

        const admin = await User.findOne({ role: "admin" }).select("_id");

        res.json({
            success: true,
            data: {
                exists: !!admin
            }
        });

    } catch (error) {

        console.error("[SuperAdmin] Status check error:", error.message);

        res.status(500).json({
            success: false,
            message: "حدث خطأ في السيرفر"
        });
    }
};

module.exports = {
    createFirstAdmin,
    checkAdminStatus
};