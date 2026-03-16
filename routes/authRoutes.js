const express = require("express");
const router = express.Router();
const { register, login, refresh, logout } = require("../controllers/authController");

/**
 * @openapi
 * tags:
 * - name: Authentication
 * description: عمليات التسجيل ودخول المستخدمين في منصتي
 */

/**
 * @openapi
 * /api/auth/register:
 * post:
 * summary: إنشاء حساب مستخدم جديد
 * tags: [Authentication]
 * responses:
 * 200:
 * description: تم إنشاء الحساب بنجاح
 */
router.post("/register", register);

/**
 * @openapi
 * /api/auth/login:
 * post:
 * summary: تسجيل الدخول والحصول على التوكن
 * tags: [Authentication]
 * responses:
 * 200:
 * description: تم تسجيل الدخول بنجاح
 */
router.post("/login", login);

/**
 * @openapi
 * /api/auth/refresh:
 * post:  // ✅ تم التغيير من get إلى post ليطابق طلب الفرونت-إند
 * summary: تحديث التوكن باستخدام Refresh Token
 * tags: [Authentication]
 * responses:
 * 200:
 * description: تم تحديث التوكن بنجاح
 * 401:
 * description: فشل التحديث - التوكن غير صالح أو انتهى
 */
router.post("/refresh", refresh); // ✅ الإصلاح الجوهري هنا

/**
 * @openapi
 * /api/auth/logout:
 * post:
 * summary: تسجيل الخروج وإلغاء التوكن
 * tags: [Authentication]
 * responses:
 * 200:
 * description: تم تسجيل الخروج بنجاح
 */
router.post("/logout", logout);

module.exports = router;