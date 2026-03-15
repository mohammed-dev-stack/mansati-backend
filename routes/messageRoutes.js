const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const { sendMessage, getConversation, getUserConversations, markMessagesAsRead } = require("../controllers/messageController");

router.use(verifyJWT);

/**
 * @openapi
 * tags:
 *   - name: Messages
 *     description: نظام الدردشة والمراسلة الفورية
 */

/**
 * @openapi
 * /api/messages:
 *   post:
 *     summary: إرسال رسالة جديدة
 *     tags: [Messages]
 *     responses:
 *       200:
 *         description: تم إرسال الرسالة بنجاح
 */
router.post("/", sendMessage);

/**
 * @openapi
 * /api/messages/user:
 *   get:
 *     summary: جلب كافة المحادثات الخاصة بالمستخدم الحالي
 *     tags: [Messages]
 *     responses:
 *       200:
 *         description: قائمة المحادثات جاهزة
 */
router.get("/user", getUserConversations);

/**
 * @openapi
 * /api/messages/conversation/{receiverId}:
 *   get:
 *     summary: جلب محادثة مع مستخدم محدد
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: receiverId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: تم جلب المحادثة بنجاح
 */
router.get("/conversation/:receiverId", getConversation);

/**
 * @openapi
 * /api/messages/read/{senderId}:
 *   patch:
 *     summary: تعليم رسائل كمقروءة من مستخدم محدد
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: senderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: تم تحديث حالة الرسائل بنجاح
 */
router.patch("/read/:senderId", markMessagesAsRead);

module.exports = router;