const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const adminAuth = require("../middleware/adminAuth"); // ✅ إضافة Middleware للأدمن
const notificationController = require("../controllers/notificationController");

// جميع المسارات محمية بالتوكن
router.use(verifyJWT);

// جلب إشعارات المستخدم
router.get("/", notificationController.getUserNotifications);

// جلب عدد الإشعارات غير المقروءة
router.get("/unread-count", notificationController.getUnreadCount);

// تحديث إشعار كمقروء
router.patch("/:notificationId/read", notificationController.markAsRead);

// تحديث كل الإشعارات كمقروءة
router.patch("/read-all", notificationController.markAllAsRead);

// حذف إشعار
router.delete("/:notificationId", notificationController.deleteNotification);

// ✅ إنشاء إشعار جديد – متاح فقط للأدمن
router.post("/", adminAuth, notificationController.createNotification);

module.exports = router;