// backend/controllers/adminController.js
// 👑 مسؤول: عمليات لوحة التحكم
// @version 3.2.1 - تم إصلاح req.user.id -> req.user._id وإضافة success: true في جميع الاستجابات
// @lastUpdated 2026

const User = require("../models/User");
const Post = require("../models/Post");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const mongoose = require('mongoose');

// ============================================================================
// دوال مساعدة (Utils)
// ============================================================================

async function calculateGrowth(Model) {
    try {
        const thisMonth = new Date();
        thisMonth.setMonth(thisMonth.getMonth());
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        const lastMonth = new Date(thisMonth);
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const thisMonthCount = await Model.countDocuments({ createdAt: { $gte: thisMonth } });
        const lastMonthCount = await Model.countDocuments({ createdAt: { $gte: lastMonth, $lt: thisMonth } });

        if (lastMonthCount === 0) return 100;
        return Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100);
    } catch (error) {
        return 0;
    }
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days} يوم`);
    if (hours > 0) parts.push(`${hours} ساعة`);
    if (minutes > 0) parts.push(`${minutes} دقيقة`);
    if (secs > 0) parts.push(`${secs} ثانية`);

    return parts.join('، ');
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================================
// دوال التشخيص والإحصائيات المتقدمة
// ============================================================================

const getStats = async(req, res) => {
    try {
        console.log('📊 [Admin] Fetching stats...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const [totalUsers, totalPosts, totalMessages, totalNotifications, activeUsersToday, newUsersThisWeek, newPostsToday, adminsCount] = await Promise.all([
            User.countDocuments(),
            Post.countDocuments(),
            Message.countDocuments(),
            Notification.countDocuments(),
            User.countDocuments({ lastLogin: { $gte: today } }),
            User.countDocuments({ createdAt: { $gte: weekAgo } }),
            Post.countDocuments({ createdAt: { $gte: today } }),
            User.countDocuments({ role: 'admin' })
        ]);

        const stats = {
            totalUsers,
            totalPosts,
            totalMessages,
            totalNotifications,
            activeUsersToday,
            newUsersThisWeek,
            newPostsToday,
            adminsCount,
            usersGrowth: await calculateGrowth(User),
            postsGrowth: await calculateGrowth(Post)
        };

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error("❌ Get stats error:", error);
        res.status(500).json({ success: false, message: "خطأ في جلب الإحصائيات" });
    }
};

const getAnalytics = async(req, res) => {
    try {
        console.log('📈 [Admin] Fetching full analytics...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalUsers, totalPosts, totalMessages, totalNotifications, activeUsersToday, newUsersToday, newPostsToday] = await Promise.all([
            User.countDocuments(),
            Post.countDocuments(),
            Message.countDocuments(),
            Notification.countDocuments(),
            User.countDocuments({ lastLogin: { $gte: today } }),
            User.countDocuments({ createdAt: { $gte: today } }),
            Post.countDocuments({ createdAt: { $gte: today } })
        ]);

        const usersGrowth = await calculateGrowth(User);
        const postsGrowth = await calculateGrowth(Post);

        const analyticsData = {
            overview: { totalUsers, totalPosts, totalMessages, totalNotifications, activeUsersToday, newUsersToday, newPostsToday },
            trends: { usersGrowth, postsGrowth, messagesGrowth: 0 },
            charts: {
                contentDistribution: [
                    { name: 'المنشورات', value: totalPosts },
                    { name: 'الرسائل', value: totalMessages },
                    { name: 'الإشعارات', value: totalNotifications }
                ],
                dailyActiveUsers: [{ date: 'اليوم', count: activeUsersToday }]
            },
            systemHealth: { status: 'healthy', responseTime: 120, cpuUsage: 35, memoryUsage: 55 }
        };

        res.json({ success: true, data: analyticsData });
    } catch (error) {
        console.error("❌ Analytics error:", error);
        res.status(500).json({ success: false, message: "خطأ في جلب التحليلات" });
    }
};

// ============================================================================
// دوال المستخدمين
// ============================================================================

const getRecentUsers = async(req, res) => {
    try {
        const { limit = 5 } = req.query;
        const limitNum = parseInt(limit);

        console.log(`👥 [Admin] Fetching recent ${limitNum} users...`);

        const users = await User.aggregate([
            { $sort: { createdAt: -1 } },
            { $limit: limitNum },
            {
                $lookup: {
                    from: 'posts',
                    localField: '_id',
                    foreignField: 'author',
                    as: 'posts'
                }
            },
            {
                $addFields: {
                    postsCount: { $size: '$posts' }
                }
            },
            {
                $project: {
                    password: 0,
                    posts: 0,
                    refreshToken: 0
                }
            }
        ]);

        res.json({ success: true, data: users });
    } catch (error) {
        console.error("❌ Get recent users error:", error);
        res.status(500).json({ success: false, message: "خطأ في جلب المستخدمين" });
    }
};

const getUsers = async(req, res) => {
    try {
        const { page = 1, limit = 20, search = '', role, isActive } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        let matchStage = {};

        if (search) {
            matchStage.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (role) matchStage.role = role;
        if (isActive !== undefined) matchStage.isActive = isActive === 'true';

        const pipeline = [
            { $match: matchStage },
            {
                $facet: {
                    metadata: [{ $count: 'total' }],
                    data: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limitNum },
                        {
                            $lookup: {
                                from: 'posts',
                                localField: '_id',
                                foreignField: 'author',
                                as: 'posts'
                            }
                        },
                        {
                            $addFields: {
                                postsCount: { $size: '$posts' }
                            }
                        },
                        {
                            $project: {
                                password: 0,
                                posts: 0,
                                refreshToken: 0
                            }
                        }
                    ]
                }
            }
        ];

        const result = await User.aggregate(pipeline);
        const total = result[0] && result[0].metadata && result[0].metadata[0] ?
            result[0].metadata[0].total :
            0;

        const users = result[0] && result[0].data ? result[0].data : [];


        res.json({
            success: true,
            data: users,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error("❌ Get users error:", error);
        res.status(500).json({ success: false, message: "خطأ في جلب المستخدمين" });
    }
};

const updateUser = async(req, res) => {
    try {
        const { userId } = req.params;
        const { role, isActive } = req.body;

        const user = await User.findByIdAndUpdate(
            userId, {
                ...(role && { role }),
                ...(isActive !== undefined && { isActive })
            }, { new: true, runValidators: true }
        ).select('-password -refreshToken');

        if (!user) {
            return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
        }

        console.log(`👑 [Admin] User ${userId} updated by admin`);
        res.json({ success: true, message: "تم تحديث المستخدم بنجاح", data: user });
    } catch (error) {
        console.error("❌ Update user error:", error);
        res.status(500).json({ success: false, message: "خطأ في تحديث المستخدم" });
    }
};

// ============================================================================
// ✅ دالة حذف المستخدم (محسنة بالكامل)
// ============================================================================
const deleteUser = async(req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "معرف المستخدم غير صالح" });
        }

        // ✅ تعديل هنا: استخدم req.user._id بدلاً من req.user.id
        if (req.user && req.user._id && req.user._id.toString() === userId) {
            return res.status(403).json({ success: false, message: "لا يمكنك حذف حسابك الخاص" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
        }

        // حذف المنشورات المرتبطة
        await Post.deleteMany({ author: userId });
        // حذف الرسائل المرتبطة
        await Message.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] });
        // حذف الإشعارات المرتبطة
        await Notification.deleteMany({ $or: [{ userId: userId }, { sender: userId }] });
        // حذف المستخدم
        await User.findByIdAndDelete(userId);

        res.json({ success: true, message: "تم حذف المستخدم وجميع بياناته المرتبطة بنجاح" });
    } catch (error) {
        console.error("❌ Delete user error:", error);
        res.status(500).json({ success: false, message: "خطأ في حذف المستخدم: " + error.message });
    }
};

// ============================================================================
// دوال المنشورات
// ============================================================================

const getRecentPosts = async(req, res) => {
    try {
        const { limit = 5 } = req.query;
        const limitNum = parseInt(limit);

        console.log(`📝 [Admin] Fetching recent ${limitNum} posts...`);

        const posts = await Post.find()
            .populate('author', 'name email avatar')
            .sort('-createdAt')
            .limit(limitNum)
            .lean();

        res.json({ success: true, data: posts });
    } catch (error) {
        console.error("❌ Get recent posts error:", error);
        res.status(500).json({ success: false, message: "خطأ في جلب المنشورات" });
    }
};

const getPosts = async(req, res) => {
    try {
        const { page = 1, limit = 20, search = '', userId } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        let query = {};
        if (userId) query.author = userId;
        if (search) {
            query.content = { $regex: search, $options: 'i' };
        }

        const posts = await Post.find(query)
            .populate('author', 'name email avatar')
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean();

        const total = await Post.countDocuments(query);

        res.json({
            success: true,
            data: posts,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error("❌ Get posts error:", error);
        res.status(500).json({ success: false, message: "خطأ في جلب المنشورات" });
    }
};

const deletePost = async(req, res) => {
    try {
        const { postId } = req.params;

        const post = await Post.findByIdAndDelete(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: "المنشور غير موجود" });
        }

        res.json({ success: true, message: "تم حذف المنشور بنجاح" });
    } catch (error) {
        console.error("❌ Delete post error:", error);
        res.status(500).json({ success: false, message: "خطأ في حذف المنشور" });
    }
};

// ============================================================================
// دوال حالة النظام
// ============================================================================

const getSystemHealth = async(req, res) => {
    try {
        console.log('💻 [Admin] Fetching system health...');

        const health = {
            status: 'healthy',
            uptime: process.uptime(),
            uptimeFormatted: formatUptime(process.uptime()),
            timestamp: new Date().toISOString(),
            database: 'connected',
            memory: {
                rss: formatBytes(process.memoryUsage().rss),
                heapTotal: formatBytes(process.memoryUsage().heapTotal),
                heapUsed: formatBytes(process.memoryUsage().heapUsed),
                external: formatBytes(process.memoryUsage().external)
            },
            cpu: process.cpuUsage(),
            nodeVersion: process.version,
            platform: process.platform
        };

        res.json({ success: true, data: health });
    } catch (error) {
        console.error("❌ System health error:", error);
        res.status(500).json({ success: false, message: "خطأ في جلب حالة النظام" });
    }
};

// ============================================================================
// دوال الرسائل
// ============================================================================

const getMessagesStats = async(req, res) => {
    try {
        console.log('📊 [Admin] Fetching messages stats...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalMessages, totalConversations, unreadMessages, messagesToday] = await Promise.all([
            Message.countDocuments(),
            Message.distinct('conversationId').then(ids => ids.length),
            Message.countDocuments({ read: false }),
            Message.countDocuments({ createdAt: { $gte: today } })
        ]);

        res.json({
            success: true,
            data: {
                totalMessages,
                totalConversations,
                unreadMessages,
                messagesToday,
                activeConversations: totalConversations
            }
        });
    } catch (error) {
        console.error("❌ Get messages stats error:", error);
        res.status(500).json({ success: false, message: "خطأ في جلب إحصائيات الرسائل" });
    }
};

const getAllConversations = async(req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        console.log('💬 [Admin] Fetching all conversations efficiently...');

        const pipeline = [{
                $group: {
                    _id: null,
                    allUsers: { $addToSet: "$sender" },
                    allReceivers: { $addToSet: "$receiver" }
                }
            },
            {
                $project: {
                    userIds: { $setUnion: ["$allUsers", "$allReceivers"] }
                }
            },
            { $unwind: "$userIds" },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userIds',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: "$userInfo" },
            {
                $match: search ? {
                    $or: [
                        { "userInfo.name": { $regex: search, $options: 'i' } },
                        { "userInfo.email": { $regex: search, $options: 'i' } }
                    ]
                } : {}
            },
            {
                $group: {
                    _id: "$userInfo._id",
                    name: { $first: "$userInfo.name" },
                    email: { $first: "$userInfo.email" },
                    avatar: { $first: "$userInfo.avatar" },
                    role: { $first: "$userInfo.role" }
                }
            },
            {
                $lookup: {
                    from: 'messages',
                    let: { userId: "$_id" },
                    pipeline: [{
                            $match: {
                                $expr: {
                                    $or: [
                                        { $eq: ["$sender", "$$userId"] },
                                        { $eq: ["$receiver", "$$userId"] }
                                    ]
                                }
                            }
                        },
                        { $sort: { createdAt: -1 } },
                        { $limit: 1 },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'sender',
                                foreignField: '_id',
                                as: 'senderInfo'
                            }
                        },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'receiver',
                                foreignField: '_id',
                                as: 'receiverInfo'
                            }
                        },
                        {
                            $addFields: {
                                sender: { $arrayElemAt: ["$senderInfo", 0] },
                                receiver: { $arrayElemAt: ["$receiverInfo", 0] }
                            }
                        },
                        {
                            $project: {
                                senderInfo: 0,
                                receiverInfo: 0
                            }
                        }
                    ],
                    as: 'lastMessage'
                }
            },
            {
                $lookup: {
                    from: 'messages',
                    let: { userId: "$_id" },
                    pipeline: [{
                            $match: {
                                $expr: {
                                    $or: [
                                        { $eq: ["$sender", "$$userId"] },
                                        { $eq: ["$receiver", "$$userId"] }
                                    ]
                                }
                            }
                        },
                        { $count: 'messagesCount' }
                    ],
                    as: 'messagesCount'
                }
            },
            {
                $lookup: {
                    from: 'messages',
                    let: { userId: "$_id" },
                    pipeline: [{
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$receiver", "$$userId"] },
                                        { $eq: ["$read", false] }
                                    ]
                                }
                            }
                        },
                        { $count: 'unreadCount' }
                    ],
                    as: 'unreadCount'
                }
            },
            {
                $addFields: {
                    lastMessage: { $arrayElemAt: ["$lastMessage", 0] },
                    messagesCount: { $ifNull: [{ $arrayElemAt: ["$messagesCount.messagesCount", 0] }, 0] },
                    unreadCount: { $ifNull: [{ $arrayElemAt: ["$unreadCount.unreadCount", 0] }, 0] }
                }
            },
            {
                $match: {
                    lastMessage: { $ne: null }
                }
            },
            {
                $sort: { "lastMessage.createdAt": -1 }
            },
            {
                $facet: {
                    metadata: [{ $count: 'total' }],
                    data: [
                        { $skip: skip },
                        { $limit: limitNum },
                        {
                            $project: {
                                _id: { $concat: ["conv_", { $toString: "$_id" }] },
                                participants: [{
                                    _id: "$_id",
                                    name: "$name",
                                    email: "$email",
                                    avatar: "$avatar",
                                    role: "$role"
                                }],
                                lastMessage: 1,
                                unreadCount: 1,
                                messagesCount: 1,
                                updatedAt: "$lastMessage.createdAt"
                            }
                        }
                    ]
                }
            }
        ];

        const result = await Message.aggregate(pipeline);
        const total = result[0] ?
            (result[0].metadata && result[0].metadata[0] ? result[0].metadata[0].total : 0) :
            0;

        const conversations = result[0] ? result[0].data : [];


        res.json({
            success: true,
            data: conversations,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error("❌ Get all conversations error:", error);
        res.status(500).json({ success: false, message: "خطأ في جلب المحادثات" });
    }
};

const getConversationMessages = async(req, res) => {
    try {
        const { conversationId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const userId = conversationId.replace('conv_', '');

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "معرف محادثة غير صالح" });
        }

        const messages = await Message.find({
                $or: [{ sender: userId }, { receiver: userId }]
            })
            .sort({ createdAt: -1 })
            .populate('sender', 'name avatar role')
            .populate('receiver', 'name avatar role')
            .skip(skip)
            .limit(limitNum)
            .lean();

        const total = await Message.countDocuments({
            $or: [{ sender: userId }, { receiver: userId }]
        });

        res.json({
            success: true,
            data: messages.reverse(),
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error("❌ Get conversation messages error:", error);
        res.status(500).json({ success: false, message: "خطأ في جلب رسائل المحادثة" });
    }
};

const adminDeleteMessage = async(req, res) => {
    try {
        const { messageId } = req.params;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ success: false, message: "الرسالة غير موجودة" });
        }

        await message.deleteOne();

        res.json({ success: true, message: "تم حذف الرسالة بنجاح" });
    } catch (error) {
        console.error("❌ Admin delete message error:", error);
        res.status(500).json({ success: false, message: "خطأ في حذف الرسالة" });
    }
};

const deleteConversation = async(req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = conversationId.replace('conv_', '');

        const result = await Message.deleteMany({
            $or: [{ sender: userId }, { receiver: userId }]
        });

        res.json({
            success: true,
            message: `تم حذف ${result.deletedCount} رسالة بنجاح`
        });
    } catch (error) {
        console.error("❌ Delete conversation error:", error);
        res.status(500).json({ success: false, message: "خطأ في حذف المحادثة" });
    }
};


// ============================================================================
// ✅ جلب بيانات المدير الحالي
// ============================================================================
const getCurrentAdmin = async(req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ success: false, message: "غير مصرح به - بيانات المستخدم غير موجودة" });
        }

        const admin = await User.findById(req.user._id).select('-password -refreshToken');
        if (!admin) {
            return res.status(404).json({ success: false, message: "المدير غير موجود" });
        }

        if (admin.role !== 'admin') {
            return res.status(403).json({ success: false, message: "غير مصرح به - ليس لديك صلاحية أدمن" });
        }

        // بناء الرابط الكامل للصورة
        const adminObj = admin.toObject();
        if (adminObj.avatar) {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            adminObj.avatar = adminObj.avatar.startsWith('http') ? adminObj.avatar : `${baseUrl}${adminObj.avatar}`;
        }

        res.json({ success: true, data: adminObj });
    } catch (error) {
        console.error("❌ Get current admin error:", error);
        res.status(500).json({ success: false, message: "خطأ في جلب بيانات المدير" });
    }
};

// ============================================================================
// تصدير جميع الدوال
// ============================================================================
module.exports = {
    getStats,
    getAnalytics,
    getRecentUsers,
    getUsers,
    updateUser,
    deleteUser,
    getRecentPosts,
    getPosts,
    deletePost,
    getSystemHealth,
    getMessagesStats,
    getAllConversations,
    getConversationMessages,
    adminDeleteMessage,
    deleteConversation,
    getCurrentAdmin
};