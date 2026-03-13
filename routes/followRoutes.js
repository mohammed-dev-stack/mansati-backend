// backend/routes/followRoutes.js
// 🛣️ مسارات المتابعة - API endpoints
// @version 1.0.0
// @lastUpdated 2026

const express = require('express');
const router = express.Router();
const verifyJWT = require('../middleware/verifyJWT');
const followController = require('../controllers/followController');

// ============================================================================
// جميع المسارات محمية بالتوكن (JWT)
// ============================================================================
router.use(verifyJWT);

// ============================================================================
// مسارات المتابعة الرئيسية
// ============================================================================

/**
 * @route   POST /api/users/:userId/follow
 * @desc    متابعة مستخدم
 * @access  Private
 */
router.post('/:userId/follow', followController.followUser);

/**
 * @route   DELETE /api/users/:userId/follow
 * @desc    إلغاء متابعة مستخدم
 * @access  Private
 */
router.delete('/:userId/follow', followController.unfollowUser);

/**
 * @route   GET /api/users/:userId/follow/status
 * @desc    التحقق من حالة المتابعة
 * @access  Private
 */
router.get('/:userId/follow/status', followController.getFollowStatus);

// ============================================================================
// مسارات القوائم (Lists)
// ============================================================================

/**
 * @route   GET /api/users/:userId/followers
 * @desc    جلب قائمة متابعي مستخدم
 * @access  Private
 */
router.get('/:userId/followers', followController.getFollowers);

/**
 * @route   GET /api/users/:userId/following
 * @desc    جلب قائمة المستخدمين الذين يتابعهم
 * @access  Private
 */
router.get('/:userId/following', followController.getFollowing);

// ============================================================================
// مسار الحالات المتعددة (دفعة واحدة)
// ============================================================================

/**
 * @route   POST /api/users/follow/bulk-status
 * @desc    الحصول على حالة المتابعة لعدة مستخدمين دفعة واحدة
 * @access  Private
 */
router.post('/follow/bulk-status', followController.getBulkFollowStatus);

// ============================================================================
// تصدير المسارات
// ============================================================================

module.exports = router;