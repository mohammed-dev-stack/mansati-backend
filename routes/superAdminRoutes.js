const express = require("express");
const router = express.Router();
const superAdminAuth = require("../middleware/superAdminAuth");
const superAdminController = require("../controllers/superAdminController");

/**
 * @openapi
 * /api/super-admin/create-first-admin:
 * post:
 * summary: إنشاء أول مسؤول للنظام (بصلاحيات Super Admin)
 * tags: [Admin]
 */
router.post("/create-first-admin",
    superAdminAuth,
    superAdminController.createFirstAdmin
);

/**
 * @openapi
 * /api/super-admin/status:
 * get:
 * summary: التحقق من حالة إعدادات المسؤول
 * tags: [Admin]
 */
router.get("/status",
    superAdminAuth,
    superAdminController.checkAdminStatus
);

module.exports = router;