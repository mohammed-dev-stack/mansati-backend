const express = require('express');
const router = express.Router();
const verifyJWT = require('../middleware/verifyJWT');
const followController = require('../controllers/followController');

router.use(verifyJWT);

/**
 * @openapi
 * tags:
 *   - name: Social
 *     description: إدارة المتابعات والعلاقات بين المستخدمين
 */

/**
 * @openapi
 * /api/users/{userId}/follow:
 *   post:
 *     summary: متابعة مستخدم معين
 *     tags: [Social]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: تم متابعة المستخدم بنجاح
 */
router.post('/:userId/follow', followController.followUser);

/**
 * @openapi
 * /api/users/{userId}/follow:
 *   delete:
 *     summary: إلغاء متابعة مستخدم معين
 *     tags: [Social]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: تم إلغاء المتابعة بنجاح
 */
router.delete('/:userId/follow', followController.unfollowUser);

/**
 * @openapi
 * /api/users/{userId}/follow/status:
 *   get:
 *     summary: التحقق من حالة المتابعة بين المستخدمين
 *     tags: [Social]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: حالة المتابعة جاهزة
 */
router.get('/:userId/follow/status', followController.getFollowStatus);

/**
 * @openapi
 * /api/users/{userId}/followers:
 *   get:
 *     summary: جلب قائمة المتابعين لمستخدم معين
 *     tags: [Social]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: قائمة المتابعين جاهزة
 */
router.get('/:userId/followers', followController.getFollowers);

/**
 * @openapi
 * /api/users/{userId}/following:
 *   get:
 *     summary: جلب قائمة المستخدمين الذين يتابعهم مستخدم معين
 *     tags: [Social]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: قائمة المتابَعين جاهزة
 */
router.get('/:userId/following', followController.getFollowing);

/**
 * @openapi
 * /api/users/follow/bulk-status:
 *   post:
 *     summary: التحقق من حالة المتابعة لمجموعة من المستخدمين
 *     tags: [Social]
 *     responses:
 *       200:
 *         description: تم جلب الحالات بنجاح
 */
router.post('/follow/bulk-status', followController.getBulkFollowStatus);

module.exports = router;