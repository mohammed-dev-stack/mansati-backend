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

/**
 * @openapi
 * /api/users:
 * get:
 * summary: جلب قائمة جميع المستخدمين
 * tags: [Social]
 */
router.get("/", getAllUsers);

/**
 * @openapi
 * /api/users/search:
 * get:
 * summary: البحث عن مستخدمين بالاسم أو الإيميل
 * tags: [Social]
 */
router.get("/search", searchUsers);

// --- تطبيق الحماية للمسارات التالية ---
router.use(verifyJWT);

router.get("/:id", getUser);
router.put("/:id", updateUser);
router.put("/:id/avatar", upload.single("avatar"), updateAvatar);
router.delete("/:id", deleteUser);

// --- مسارات المتابعة (Follow System) ---
router.post("/:userId/follow", followUser);
router.delete("/:userId/follow", unfollowUser);
router.get("/:userId/follow/status", getFollowStatus);
router.get("/:userId/followers", getFollowers);
router.get("/:userId/following", getFollowing);
router.post("/follow/bulk-status", getBulkFollowStatus);

module.exports = router;