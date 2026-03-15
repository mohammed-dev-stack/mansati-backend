// 👑 Mansati Admin Engine - مسارات لوحة التحكم
// @version 3.3.0 | 2026
// @access: Restricted to Admins only (Protected by JWT & adminAuth)

const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const verifyJWT = require("../middleware/verifyJWT");
const adminAuth = require("../middleware/adminAuth");
const adminController = require("../controllers/adminController");

/**
 * @openapi
 * tags:
 *   - name: Admin
 *     description: لوحة التحكم المركزية - إدارة المستخدمين، المنشورات، وحالة النظام
 */

// 🛡️ حماية متقدمة: محدد معدل الطلبات للوحة التحكم
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 500,
    message: { message: "تجاوزت حد الطلبات المسموح به للوحة التحكم، يرجى المحاولة لاحقاً." }
});

// تطبيق طبقات الحماية على جميع المسارات أدناه
router.use(adminLimiter);
router.use(verifyJWT);
router.use(adminAuth);

// ============================================================================
// 📊 الإحصائيات والتحليلات (Analytics)
// ============================================================================

/**
 * @openapi
 * /api/admin/stats:
 *   get:
 *     summary: جلب إحصائيات النظام العامة
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: تم جلب البيانات بنجاح
 */
router.get("/stats", adminController.getStats);

router.get("/analytics", adminController.getAnalytics);
router.get("/messages/stats", adminController.getMessagesStats);

// ============================================================================
// 👥 إدارة المستخدمين (User Management)
// ============================================================================

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     summary: عرض قائمة جميع المستخدمين في المنصة
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: قائمة المستخدمين جاهزة
 */
router.get("/users", adminController.getUsers);

router.get("/users/recent", adminController.getRecentUsers);

/**
 * @openapi
 * /api/admin/users/{userId}:
 *   put:
 *     summary: تحديث بيانات مستخدم معين
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: تم تحديث بيانات المستخدم
 */
router.put("/users/:userId", adminController.updateUser);

/**
 * @openapi
 * /api/admin/users/{userId}:
 *   delete:
 *     summary: حذف مستخدم نهائياً من النظام
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: تم حذف المستخدم بنجاح
 */
router.delete("/users/:userId", adminController.deleteUser);

// ============================================================================
// 📝 إدارة المحتوى (Content Management)
// ============================================================================

/**
 * @openapi
 * /api/admin/posts:
 *   get:
 *     summary: رقابة المنشورات العامة
 *     tags: [Admin]
 */
router.get("/posts", adminController.getPosts);
router.get("/posts/recent", adminController.getRecentPosts);
router.delete("/posts/:postId", adminController.deletePost);

// ============================================================================
// 💬 إدارة المحادثات (Communication Management)
// ============================================================================

router.get("/conversations", adminController.getAllConversations);
router.get("/messages/conversations", adminController.getAllConversations);

router.route("/conversations/:conversationId")
    .get(adminController.getConversationMessages)
    .delete(adminController.deleteConversation);

router.delete("/messages/:messageId", adminController.adminDeleteMessage);

// ============================================================================
// 💻 حالة النظام والبروفايل
// ============================================================================

/**
 * @openapi
 * /api/admin/health:
 *   get:
 *     summary: فحص حالة الخادم وقاعدة البيانات
 *     tags: [Admin]
 */
router.get("/health", adminController.getSystemHealth);

router.get("/profile", adminController.getCurrentAdmin);

// تشخيص تحميل المسارات في الـ Console
console.log(`[${new Date().toISOString()}] 🔥 AdminRoutes: All /api/admin/* documentation loaded.`);

module.exports = router;