// backend/routes/adminRoutes.js
// 👑 مسؤول: مسارات لوحة التحكم - نسخة احترافية آمنة
// @version 3.3.0

const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit"); // حماية إضافية
const verifyJWT = require("../middleware/verifyJWT");
const adminAuth = require("../middleware/adminAuth");
const adminController = require("../controllers/adminController");

// 🛡️ تحديد معدل الطلبات للوحة التحكم (أمان متقدم)
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 500, // حد أقصى 500 طلب لكل IP
    message: "Too many requests from this IP, please try again after 15 minutes"
});

// تطبيق الحماية والمحدد على جميع المسارات
router.use(adminLimiter);
router.use(verifyJWT);
router.use(adminAuth);

/**
 * @swagger
 * /api/admin/stats:
 * get:
 * summary: جلب إحصائيات لوحة التحكم العامة
 */
// 📊 الإحصائيات والتحليلات
router.get("/stats", adminController.getStats);
router.get("/analytics", adminController.getAnalytics);
router.get("/messages/stats", adminController.getMessagesStats);

// 👥 إدارة المستخدمين
router.route("/users")
    .get(adminController.getUsers);

router.get("/users/recent", adminController.getRecentUsers);

router.route("/users/:userId")
    .put(adminController.updateUser)
    .delete(adminController.deleteUser);

// 📝 إدارة المنشورات
router.get("/posts", adminController.getPosts);
router.get("/posts/recent", adminController.getRecentPosts);
router.delete("/posts/:postId", adminController.deletePost);

// 💬 إدارة المحادثات (دعم المسارات المختصرة والأصلية لتوافق الخدمات)
router.get("/conversations", adminController.getAllConversations);
router.get("/messages/conversations", adminController.getAllConversations);

router.route("/conversations/:conversationId")
    .get(adminController.getConversationMessages)
    .delete(adminController.deleteConversation);

router.delete("/messages/:messageId", adminController.adminDeleteMessage);

// 💻 حالة النظام والملف الشخصي
router.get("/health", adminController.getSystemHealth);
router.get("/profile", adminController.getCurrentAdmin);

// تشخيص تحميل المسارات
console.log(`[${new Date().toISOString()}] 🔥 AdminRoutes: All /api/admin/* routes secured and loaded.`);

module.exports = router;