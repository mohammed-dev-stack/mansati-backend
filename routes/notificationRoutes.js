// 🔔 Mansati Notification Engine - مسارات الإشعارات
// @version 2.1.0
// @access: Private (JWT Required)

const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const adminAuth = require("../middleware/adminAuth");
const notificationController = require("../controllers/notificationController");


// 🛡️ حماية جميع المسارات: تتطلب تسجيل الدخول
router.use(verifyJWT);


router.get("/", notificationController.getUserNotifications);

router.get("/unread-count", notificationController.getUnreadCount);


router.patch("/:notificationId/read", notificationController.markAsRead);


router.patch("/read-all", notificationController.markAllAsRead);


router.delete("/:notificationId", notificationController.deleteNotification);


router.post("/", adminAuth, notificationController.createNotification);

// ✅ التصدير البرمجي - أساسي لعمل السيرفر
module.exports = router;