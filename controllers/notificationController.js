// backend/controllers/notificationController.js
// 🔔 متحكم الإشعارات
// @version 3.0.1 - التأكد من وجود io عند إرسال الإشعارات

const Notification = require("../models/Notification");
const mongoose = require("mongoose");

// ============================================================================
// Helpers
// ============================================================================

const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

const processNotifications = (notifications) => {
    return notifications.map((notif) => {
        const senderInfo = notif.senderInfo ? notif.senderInfo : {};

        return {
            ...notif,
            sender: {
                _id: notif.sender ?
                    notif.sender._id ?
                    notif.sender._id :
                    notif.sender : null,

                name: notif.sender ?
                    notif.sender.name ?
                    notif.sender.name :
                    senderInfo.name ?
                    senderInfo.name :
                    "مستخدم" : senderInfo.name ?
                    senderInfo.name : "مستخدم",

                avatar: notif.sender ?
                    notif.sender.avatar ?
                    notif.sender.avatar :
                    senderInfo.avatar ?
                    senderInfo.avatar :
                    null : senderInfo.avatar ?
                    senderInfo.avatar : null
            },

            senderInfo: senderInfo
        };
    });
};

// ============================================================================
// Controller
// ============================================================================

const notificationController = {

    /**
     * إنشاء إشعار
     */
    async createNotification(req, res) {
        try {
            const {
                recipient,
                type,
                title,
                message
            } = req.body;

            if (!recipient || !isValidObjectId(recipient)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid recipient id"
                });
            }

            const notificationData = {
                recipient,
                type: type || "system",
                title: title || "إشعار جديد",
                message: message || "",
                senderInfo: {
                    name: req.body.senderName ?
                        req.body.senderName : "النظام",

                    avatar: req.body.senderAvatar ?
                        req.body.senderAvatar : null
                }
            };

            const notification = await Notification.create(notificationData);

            // ✅ التأكد من وجود io وإرسال الإشعار عبر Socket
            const io = req.app.get("io");
            if (io) {
                const populatedNotification =
                    await Notification.findById(notification._id)
                    .populate("sender", "name avatar")
                    .lean();

                const processed =
                    processNotifications([populatedNotification])[0];

                io.to(`user_${notification.recipient}`)
                    .emit("new_notification", processed);
            }

            res.status(201).json({
                success: true,
                message: "تم إنشاء الإشعار بنجاح",
                data: notification
            });

        } catch (error) {
            console.error("CREATE NOTIFICATION ERROR:", error.message);
            res.status(500).json({
                success: false,
                message: "خطأ في إنشاء الإشعار"
            });
        }
    },

    /**
     * جلب إشعارات المستخدم
     */
    async getUserNotifications(req, res) {
        try {
            const userId = req.user._id;

            let { page = 1, limit = 20, type, read } = req.query;

            page = parseInt(page);
            limit = parseInt(limit);

            if (page < 1) page = 1;
            if (limit < 1) limit = 20;
            if (limit > 50) limit = 50;

            const query = { recipient: userId };

            if (type) query.type = type;
            if (read !== undefined) query.read = read === "true";

            const notifications = await Notification.find(query)
                .populate("sender", "name avatar")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean();

            const processed = processNotifications(notifications);

            const unreadCount =
                await Notification.countDocuments({
                    recipient: userId,
                    read: false
                });

            const total =
                await Notification.countDocuments({
                    recipient: userId
                });

            res.json({
                success: true,
                data: {
                    notifications: processed,
                    stats: {
                        unreadCount,
                        total
                    }
                },
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                    hasMore: page * limit < total
                }
            });

        } catch (error) {
            console.error("GET NOTIFICATIONS ERROR:", error.message);
            res.status(500).json({
                success: false,
                message: "خطأ في جلب الإشعارات"
            });
        }
    },

    /**
     * قراءة إشعار واحد
     */
    async markAsRead(req, res) {
        try {
            const { notificationId } = req.params;
            const userId = req.user._id;

            if (!isValidObjectId(notificationId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid notification id"
                });
            }

            const notification =
                await Notification.findOneAndUpdate({
                    _id: notificationId,
                    recipient: userId
                }, {
                    read: true,
                    readAt: new Date()
                }, { new: true })
                .populate("sender", "name avatar")
                .lean();

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message: "الإشعار غير موجود"
                });
            }

            const processed = processNotifications([notification])[0];

            res.json({
                success: true,
                message: "تم تحديث حالة الإشعار",
                data: processed
            });

        } catch (error) {
            console.error("MARK READ ERROR:", error.message);
            res.status(500).json({
                success: false,
                message: "خطأ في تحديث الإشعار"
            });
        }
    },

    /**
     * قراءة كل الإشعارات
     */
    async markAllAsRead(req, res) {
        try {
            const userId = req.user._id;

            const result =
                await Notification.updateMany({
                    recipient: userId,
                    read: false
                }, {
                    read: true,
                    readAt: new Date()
                });

            res.json({
                success: true,
                message: "تم تحديث جميع الإشعارات",
                data: {
                    modifiedCount: result.modifiedCount
                }
            });

        } catch (error) {
            console.error("MARK ALL ERROR:", error.message);
            res.status(500).json({
                success: false,
                message: "خطأ في تحديث الإشعارات"
            });
        }
    },

    /**
     * حذف إشعار
     */
    async deleteNotification(req, res) {
        try {
            const { notificationId } = req.params;
            const userId = req.user._id;

            if (!isValidObjectId(notificationId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid notification id"
                });
            }

            const result =
                await Notification.findOneAndDelete({
                    _id: notificationId,
                    recipient: userId
                });

            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: "الإشعار غير موجود"
                });
            }

            res.json({
                success: true,
                message: "تم حذف الإشعار بنجاح"
            });

        } catch (error) {
            console.error("DELETE NOTIFICATION ERROR:", error.message);
            res.status(500).json({
                success: false,
                message: "خطأ في حذف الإشعار"
            });
        }
    },

    /**
     * عدد الإشعارات غير المقروءة
     */
    async getUnreadCount(req, res) {
        try {
            const userId = req.user._id;

            const count =
                await Notification.countDocuments({
                    recipient: userId,
                    read: false
                });

            res.json({
                success: true,
                data: { count }
            });

        } catch (error) {
            console.error("UNREAD COUNT ERROR:", error.message);
            res.status(500).json({
                success: false,
                message: "خطأ في جلب عدد الإشعارات"
            });
        }
    }
};

module.exports = notificationController;