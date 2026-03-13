// backend/routes/userRoutes.js
const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const upload = require("../middleware/upload");
const {
    getAllUsers,
    getUser,
    updateUser,
    updateAvatar,
    deleteUser,
    searchUsers,
} = require("../controllers/userController");
const {
    followUser,
    unfollowUser,
    getFollowStatus,
    getBulkFollowStatus,
    getFollowers,
    getFollowing
} = require("../controllers/followController");

// ==========================================================================
// المسارات العامة (لا تحتاج توكن)
// ==========================================================================
router.get("/", getAllUsers); // ✅ جلب جميع المستخدمين (عام)
router.get("/search", searchUsers); // البحث عن مستخدمين (عام)

// ==========================================================================
// تطبيق middleware التحقق من التوكن على جميع المسارات التالية
// ==========================================================================
router.use(verifyJWT);

// ==========================================================================
// المسارات المحمية (تحتاج توكن)
// ==========================================================================
router.get("/:id", getUser);
router.put("/:id", updateUser);
router.put("/:id/avatar", upload.single("avatar"), updateAvatar);
router.delete("/:id", deleteUser);

// ==========================================================================
// مسارات المتابعة
// ==========================================================================
router.post("/:userId/follow", followUser);
router.delete("/:userId/follow", unfollowUser);
router.get("/:userId/follow/status", getFollowStatus);
router.get("/:userId/followers", getFollowers);
router.get("/:userId/following", getFollowing);
router.post("/follow/bulk-status", getBulkFollowStatus);

module.exports = router;