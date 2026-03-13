// backend/routes/superAdminRoutes.js
// 👑 مسؤول: مسارات خاصة بإنشاء وإدارة الأدمن

const express = require("express");
const router = express.Router();
const superAdminAuth = require("../middleware/superAdminAuth");
const superAdminController = require("../controllers/superAdminController");

// إنشاء أول أدمن (يتطلب مصادقة super admin)
router.post("/create-first-admin",
    superAdminAuth,
    superAdminController.createFirstAdmin
);

// التحقق من حالة الأدمن (يتطلب مصادقة super admin)
router.get("/status",
    superAdminAuth,
    superAdminController.checkAdminStatus
);

module.exports = router;