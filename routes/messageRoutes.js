const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");

const {
    sendMessage,
    getConversation,
    getUserConversations,
    markMessagesAsRead,
} = require("../controllers/messageController");

// ✅ جميع المسارات محمية بالتوكن
router.use(verifyJWT);

// ✅ إرسال رسالة
router.post("/", sendMessage);

// ✅ جلب المحادثة مع مستخدم آخر
router.get("/conversation/:receiverId", getConversation);

// ✅ جلب كل محادثات المستخدم
router.get("/user", getUserConversations);

// ✅ تحديث حالة قراءة الرسائل
router.patch("/read/:senderId", markMessagesAsRead);

module.exports = router;