const express = require("express");
const router = express.Router();
const { register, login, refresh, logout } = require("../controllers/authController");

/**
 * @openapi
 * tags:
 *   - name: Authentication
 *     description: عمليات التسجيل ودخول المستخدمين
 */

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: إنشاء حساب مستخدم جديد
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: تم إنشاء الحساب بنجاح
 */
router.post("/register", register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: تسجيل الدخول والحصول على التوكن
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: تم تسجيل الدخول بنجاح
 */
router.post("/login", login);

/**
 * @openapi
 * /api/auth/refresh:
 *   get:
 *     summary: تحديث التوكن باستخدام Refresh Token
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: تم تحديث التوكن بنجاح
 */
router.get("/refresh", refresh);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: تسجيل الخروج وإلغاء التوكن
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: تم تسجيل الخروج بنجاح
 */
router.post("/logout", logout);

module.exports = router;