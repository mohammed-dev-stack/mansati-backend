const Message = require("../models/Message");
const Notification = require("../models/Notification");
const User = require("../models/User");
const mongoose = require("mongoose");

const CONSTANTS = {
    MAX_MESSAGE_LENGTH: 5000,
    DEFAULT_USER_NAME: "مستخدم"
};

/**
 * تنظيف النص لمنع إدخال ضار
 */
const sanitizeText = (text) => {
    if (!text) return "";
    return text.trim().replace(/\s+/g, " ");
};

/**
 * التحقق من ObjectId
 */
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

/**
 * إرسال رسالة مع إشعار
 */
const sendMessage = async(req, res) => {
    try {
        const sender = req.user._id;
        const { receiver, text } = req.body;

        if (!receiver || !text) {
            return res.status(400).json({
                success: false,
                message: "الرسالة والمستلم مطلوبان"
            });
        }

        if (!isValidObjectId(receiver)) {
            return res.status(400).json({
                success: false,
                message: "معرف المستخدم غير صالح"
            });
        }

        if (receiver.toString() === sender.toString()) {
            return res.status(400).json({
                success: false,
                message: "لا يمكنك إرسال رسالة لنفسك"
            });
        }

        const cleanText = sanitizeText(text);

        if (!cleanText) {
            return res.status(400).json({
                success: false,
                message: "نص الرسالة فارغ"
            });
        }

        if (cleanText.length > CONSTANTS.MAX_MESSAGE_LENGTH) {
            return res.status(400).json({
                success: false,
                message: `الرسالة طويلة جداً (الحد الأقصى ${CONSTANTS.MAX_MESSAGE_LENGTH})`
            });
        }

        const receiverExists = await User.exists({ _id: receiver });

        if (!receiverExists) {
            return res.status(404).json({
                success: false,
                message: "المستخدم المستقبل غير موجود"
            });
        }

        const message = await Message.create({
            sender,
            receiver,
            text: cleanText,
            read: false,
            readAt: null
        });

        const populatedMessage = await Message.findById(message._id)
            .populate("sender", "name avatar")
            .populate("receiver", "name avatar")
            .lean();

        const io = req.app.get("io");

        try {
            const conversationId = `${sender}_${receiver}`;

            const notification = await Notification.createMessageNotification(
                sender,
                receiver,
                message,
                conversationId
            );

            if (io && notification) {
                io.to(`user_${receiver}`).emit("new_notification", {
                    _id: notification._id,
                    recipient: notification.recipient,
                    sender: {
                        _id: sender,
                        name: notification.senderInfo.name,
                        avatar: notification.senderInfo.avatar
                    },
                    senderInfo: notification.senderInfo,
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    conversationId: notification.conversationId,
                    data: notification.data,
                    read: notification.read,
                    createdAt: notification.createdAt
                });
            }

        } catch (notifError) {
            console.error("[Notification Error]", notifError.message);
        }

        if (io) {
            io.to(`user_${receiver}`).emit("new_message", populatedMessage);
            io.to(`user_${sender}`).emit("message_sent", populatedMessage);
        }

        res.status(201).json({
            success: true,
            data: populatedMessage
        });

    } catch (error) {
        console.error("[sendMessage Error]", error.message);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

/**
 * جلب محادثة
 */
const getConversation = async(req, res) => {
    try {
        const currentUserId = req.user._id;
        const { receiverId } = req.params;

        if (!receiverId || !isValidObjectId(receiverId)) {
            return res.status(400).json({
                success: false,
                message: "معرف المستخدم غير صالح"
            });
        }

        const receiverExists = await User.exists({ _id: receiverId });

        if (!receiverExists) {
            return res.status(404).json({
                success: false,
                message: "المستخدم غير موجود"
            });
        }

        const messages = await Message.find({
                $or: [
                    { sender: currentUserId, receiver: receiverId },
                    { sender: receiverId, receiver: currentUserId }
                ]
            })
            .sort({ createdAt: 1 })
            .populate("sender", "name avatar")
            .populate("receiver", "name avatar")
            .lean();

        await Message.updateMany({ sender: receiverId, receiver: currentUserId, read: false }, { read: true, readAt: new Date() });

        res.json({
            success: true,
            data: messages
        });

    } catch (error) {
        console.error("[getConversation Error]", error.message);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

/**
 * جلب كل المحادثات
 */
const getUserConversations = async(req, res) => {
    try {
        const currentUserId = req.user._id;

        const messages = await Message.find({
                $or: [{ sender: currentUserId }, { receiver: currentUserId }]
            })
            .sort({ createdAt: -1 })
            .populate("sender", "name avatar")
            .populate("receiver", "name avatar")
            .lean();

        const conversationsMap = new Map();

        for (const msg of messages) {

            const otherUser =
                msg.sender._id.toString() === currentUserId.toString() ?
                msg.receiver :
                msg.sender;

            const otherUserId = otherUser._id.toString();

            if (!conversationsMap.has(otherUserId)) {

                const unreadCount = await Message.countDocuments({
                    sender: otherUserId,
                    receiver: currentUserId,
                    read: false
                });

                conversationsMap.set(otherUserId, {
                    user: {
                        _id: otherUser._id,
                        name: otherUser.name || CONSTANTS.DEFAULT_USER_NAME,
                        avatar: otherUser.avatar || null
                    },
                    lastMessage: {
                        _id: msg._id,
                        text: msg.text,
                        createdAt: msg.createdAt,
                        sender: {
                            _id: msg.sender._id,
                            name: msg.sender.name
                        }
                    },
                    unreadCount
                });
            }
        }

        res.json({
            success: true,
            data: Array.from(conversationsMap.values())
        });

    } catch (error) {
        console.error("[getUserConversations Error]", error.message);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

/**
 * تعليم الرسائل كمقروءة
 */
const markMessagesAsRead = async(req, res) => {
    try {
        const currentUserId = req.user._id;
        const { senderId } = req.params;

        if (!senderId || !isValidObjectId(senderId)) {
            return res.status(400).json({
                success: false,
                message: "معرف المستخدم غير صالح"
            });
        }

        const result = await Message.updateMany({ sender: senderId, receiver: currentUserId, read: false }, { read: true, readAt: new Date() });

        res.json({
            success: true,
            data: {
                modifiedCount: result.modifiedCount
            }
        });

    } catch (error) {
        console.error("[markMessagesAsRead Error]", error.message);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

/**
 * حذف رسالة
 */
const deleteMessage = async(req, res) => {
    try {
        const userId = req.user._id;
        const { messageId } = req.params;

        if (!messageId || !isValidObjectId(messageId)) {
            return res.status(400).json({
                success: false,
                message: "معرف الرسالة غير صالح"
            });
        }

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: "الرسالة غير موجودة"
            });
        }

        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "غير مصرح بحذف هذه الرسالة"
            });
        }

        await message.deleteOne();

        res.json({
            success: true,
            message: "تم حذف الرسالة بنجاح"
        });

    } catch (error) {
        console.error("[deleteMessage Error]", error.message);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

module.exports = {
    sendMessage,
    getConversation,
    getUserConversations,
    markMessagesAsRead,
    deleteMessage
};