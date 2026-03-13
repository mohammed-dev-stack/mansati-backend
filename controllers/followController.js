// backend/controllers/followController.js
// 👥 متحكم المتابعة - إدارة المتابعات
// @version 2.0.0 (بدون تغييرات ضرورية، لكن التأكد من استخدام req.user._id)

const mongoose = require('mongoose');
const User = require('../models/User');
const Follow = require('../models/Follow');

// ========================================================================
// دوال مساعدة
// ========================================================================

const getUserId = (req) => {
    return req.user && req.user._id ? req.user._id : null;
};

const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

// ========================================================================
// متابعة مستخدم
// ========================================================================
const followUser = async(req, res) => {
    try {
        const followerId = getUserId(req);
        if (!followerId) {
            return res.status(401).json({
                success: false,
                message: 'المستخدم غير مصادق عليه'
            });
        }

        const followingId = req.params.userId;

        console.log(`👥 [Follow] Follow request: ${followerId} -> ${followingId}`);

        if (!isValidObjectId(followerId) || !isValidObjectId(followingId)) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح'
            });
        }

        if (followerId.toString() === followingId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'لا يمكنك متابعة نفسك'
            });
        }

        const targetUser = await User.findById(followingId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        const follow = await Follow.create({
            follower: followerId,
            following: followingId
        }).catch(err => {
            if (err.code === 11000) {
                return null;
            }
            throw err;
        });

        if (!follow) {
            return res.status(400).json({
                success: false,
                message: 'أنت تتابع هذا المستخدم بالفعل'
            });
        }

        const [followersCount, followingCount] = await Promise.all([
            Follow.countDocuments({ following: followingId }),
            Follow.countDocuments({ follower: followerId })
        ]);

        await Promise.all([
            User.findByIdAndUpdate(
                followingId, { followersCount }, { runValidators: true }
            ),
            User.findByIdAndUpdate(
                followerId, { followingCount }, { runValidators: true }
            )
        ]);

        res.status(201).json({
            success: true,
            message: 'تمت المتابعة بنجاح',
            data: {
                isFollowing: true,
                followersCount,
                followingCount
            }
        });

    } catch (error) {
        console.error('❌ [Follow] Follow error:', error.message);
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'أنت تتابع هذا المستخدم بالفعل'
            });
        }
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في السيرفر'
        });
    }
};

// ========================================================================
// إلغاء متابعة مستخدم
// ========================================================================
const unfollowUser = async(req, res) => {
    try {
        const followerId = getUserId(req);
        if (!followerId) {
            return res.status(401).json({
                success: false,
                message: 'المستخدم غير مصادق عليه'
            });
        }

        const followingId = req.params.userId;

        if (!isValidObjectId(followerId) || !isValidObjectId(followingId)) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح'
            });
        }

        const result = await Follow.findOneAndDelete({
            follower: followerId,
            following: followingId
        });

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'أنت لا تتابع هذا المستخدم'
            });
        }

        const [followersCount, followingCount] = await Promise.all([
            Follow.countDocuments({ following: followingId }),
            Follow.countDocuments({ follower: followerId })
        ]);

        await Promise.all([
            User.findByIdAndUpdate(
                followingId, { followersCount }, { runValidators: true }
            ),
            User.findByIdAndUpdate(
                followerId, { followingCount }, { runValidators: true }
            )
        ]);

        res.json({
            success: true,
            message: 'تم إلغاء المتابعة بنجاح',
            data: {
                isFollowing: false,
                followersCount,
                followingCount
            }
        });

    } catch (error) {
        console.error('❌ [Follow] Unfollow error:', error.message);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في السيرفر'
        });
    }
};

// ========================================================================
// التحقق من حالة المتابعة
// ========================================================================
const getFollowStatus = async(req, res) => {
    try {
        const followerId = getUserId(req);
        if (!followerId) {
            return res.status(401).json({
                success: false,
                message: 'المستخدم غير مصادق عليه'
            });
        }

        const followingId = req.params.userId;

        if (!isValidObjectId(followerId) || !isValidObjectId(followingId)) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح'
            });
        }

        const [follow, targetUser] = await Promise.all([
            Follow.findOne({ follower: followerId, following: followingId }).lean(),
            User.findById(followingId).select('name avatar bio followersCount followingCount').lean()
        ]);

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        res.json({
            success: true,
            data: {
                isFollowing: !!follow,
                followersCount: targetUser.followersCount || 0,
                followingCount: targetUser.followingCount || 0,
                user: {
                    _id: targetUser._id,
                    name: targetUser.name,
                    avatar: targetUser.avatar,
                    bio: targetUser.bio
                }
            }
        });

    } catch (error) {
        console.error('❌ [Follow] Status error:', error.message);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في السيرفر'
        });
    }
};

// ========================================================================
// الحصول على حالة المتابعة لعدة مستخدمين (دفعة واحدة)
// ========================================================================
const getBulkFollowStatus = async(req, res) => {
    try {
        const followerId = getUserId(req);
        if (!followerId) {
            return res.status(401).json({
                success: false,
                message: 'المستخدم غير مصادق عليه'
            });
        }

        const { userIds } = req.body;

        if (!Array.isArray(userIds)) {
            return res.status(400).json({
                success: false,
                message: 'userIds must be an array'
            });
        }

        if (userIds.length > 100) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 100 user IDs allowed'
            });
        }

        for (const id of userIds) {
            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid user ID format: ${id}`
                });
            }
        }

        const follows = await Follow.find({
            follower: followerId,
            following: { $in: userIds }
        }).lean();

        const statusMap = {};
        userIds.forEach(id => statusMap[id] = false);
        follows.forEach(follow => {
            statusMap[follow.following.toString()] = true;
        });

        res.json({
            success: true,
            data: statusMap
        });

    } catch (error) {
        console.error('❌ [Follow] Bulk status error:', error.message);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في السيرفر'
        });
    }
};

// ========================================================================
// جلب قائمة المتابعين
// ========================================================================
const getFollowers = async(req, res) => {
    try {
        const userId = req.params.userId;

        if (!isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: 'معرف مستخدم غير صالح'
            });
        }

        const { page = 1, limit = 20 } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;

        const pipeline = [
            { $match: { following: new mongoose.Types.ObjectId(userId) } },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limitNum },
            {
                $lookup: {
                    from: 'users',
                    localField: 'follower',
                    foreignField: '_id',
                    as: 'followerInfo'
                }
            },
            { $unwind: { path: '$followerInfo', preserveNullAndEmptyArrays: false } },
            {
                $lookup: {
                    from: 'follows',
                    let: { followerId: '$follower' },
                    pipeline: [{
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$follower', '$$followerId'] },
                                        { $eq: ['$following', new mongoose.Types.ObjectId(userId)] }
                                    ]
                                }
                            }
                        },
                        { $limit: 1 }
                    ],
                    as: 'isFollowingBack'
                }
            },
            {
                $addFields: {
                    'followerInfo.isFollowingBack': { $gt: [{ $size: '$isFollowingBack' }, 0] }
                }
            },
            {
                $replaceRoot: { newRoot: '$followerInfo' }
            },
            {
                $project: {
                    password: 0,
                    refreshToken: 0,
                    email: 0,
                    __v: 0
                }
            }
        ];

        const total = await Follow.countDocuments({ following: new mongoose.Types.ObjectId(userId) });
        const followers = await Follow.aggregate(pipeline);

        res.json({
            success: true,
            data: followers,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
                hasMore: (pageNum * limitNum) < total
            }
        });

    } catch (error) {
        console.error('❌ [Follow] Get followers error:', error.message);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في جلب المتابعين'
        });
    }
};

// ========================================================================
// جلب قائمة المستخدمين الذين يتابعهم المستخدم
// ========================================================================
const getFollowing = async(req, res) => {
    try {
        const userId = req.params.userId;

        if (!isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: 'معرف مستخدم غير صالح'
            });
        }

        const { page = 1, limit = 20 } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;

        const pipeline = [
            { $match: { follower: new mongoose.Types.ObjectId(userId) } },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limitNum },
            {
                $lookup: {
                    from: 'users',
                    localField: 'following',
                    foreignField: '_id',
                    as: 'followingInfo'
                }
            },
            { $unwind: { path: '$followingInfo', preserveNullAndEmptyArrays: false } },
            {
                $lookup: {
                    from: 'follows',
                    let: { followingId: '$following' },
                    pipeline: [{
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$follower', new mongoose.Types.ObjectId(userId)] },
                                        { $eq: ['$following', '$$followingId'] }
                                    ]
                                }
                            }
                        },
                        { $limit: 1 }
                    ],
                    as: 'isFollowedByUser'
                }
            },
            {
                $addFields: {
                    'followingInfo.isFollowedByUser': { $gt: [{ $size: '$isFollowedByUser' }, 0] }
                }
            },
            {
                $replaceRoot: { newRoot: '$followingInfo' }
            },
            {
                $project: {
                    password: 0,
                    refreshToken: 0,
                    email: 0,
                    __v: 0
                }
            }
        ];

        const total = await Follow.countDocuments({ follower: new mongoose.Types.ObjectId(userId) });
        const following = await Follow.aggregate(pipeline);

        res.json({
            success: true,
            data: following,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
                hasMore: (pageNum * limitNum) < total
            }
        });

    } catch (error) {
        console.error('❌ [Follow] Get following error:', error.message);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في جلب من يتابعهم المستخدم'
        });
    }
};

// ========================================================================
// جلب اقتراحات المتابعة
// ========================================================================
const getSuggestions = async(req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'المستخدم غير مصادق عليه'
            });
        }

        const { limit = 10 } = req.query;
        const limitNum = Math.min(20, Math.max(1, parseInt(limit) || 10));

        const following = await Follow.find({ follower: userId })
            .distinct('following')
            .lean();

        const excludeIds = [userId, ...following].map(id => new mongoose.Types.ObjectId(id));

        const suggestions = await User.aggregate([{
                $match: {
                    _id: { $nin: excludeIds },
                    isActive: true
                }
            },
            {
                $addFields: {
                    followersCount: { $ifNull: ['$followersCount', 0] }
                }
            },
            { $sort: { followersCount: -1, createdAt: -1 } },
            { $limit: limitNum },
            {
                $project: {
                    password: 0,
                    refreshToken: 0,
                    email: 0,
                    __v: 0
                }
            }
        ]);

        res.json({
            success: true,
            data: suggestions
        });

    } catch (error) {
        console.error('❌ [Follow] Get suggestions error:', error.message);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في جلب الاقتراحات'
        });
    }
};

module.exports = {
    followUser,
    unfollowUser,
    getFollowStatus,
    getBulkFollowStatus,
    getFollowers,
    getFollowing,
    getSuggestions
};