// backend/middleware/adminAuth.js
// 🛡️ مسؤول: التحقق من صلاحيات الأدمن - نسخة محسنة مع التوثيق

const User = require("../models/User");

const adminAuth = async(req, res, next) => {
    try {
        if (!req.user) {
            console.error("❌ AdminAuth: No user object found.");
            return res.status(401).json({ success: false, message: "غير مصرح به - يرجى تسجيل الدخول" });
        }

        const userId = req.user._id || req.user.id;
        if (!userId) {
            console.error("❌ AdminAuth: User ID not found in req.user:", req.user);
            return res.status(401).json({ success: false, message: "بيانات المستخدم غير مكتملة" });
        }

        const user = await User.findById(userId).select('role isActive');
        if (!user) {
            console.warn(`⚠️ AdminAuth: User with ID ${userId} not found in database`);
            return res.status(401).json({ success: false, message: "المستخدم غير موجود" });
        }

        if (!user.isActive) {
            console.warn(`⚠️ AdminAuth: User ${userId} is inactive`);
            return res.status(403).json({ success: false, message: "الحساب معطل" });
        }

        if (user.role !== 'admin') {
            console.warn(`⚠️ AdminAuth: User ${userId} attempted admin access with role: ${user.role}`);
            return res.status(403).json({ success: false, message: "غير مصرح بالدخول إلى لوحة التحكم" });
        }

        req.admin = user;
        console.log(`✅ AdminAuth: Authorized admin access for ${user.email}`);
        next();
    } catch (error) {
        console.error("❌ AdminAuth error:", error);
        res.status(500).json({ success: false, message: "خطأ في الخادم" });
    }
};

module.exports = adminAuth;