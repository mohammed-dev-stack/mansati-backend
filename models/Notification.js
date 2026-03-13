const mongoose = require("mongoose");

/**
 * 📋 نموذج الإشعارات - نسخة محسنة
 * @version 2.2.3
 */

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    // نسخة احتياطية من بيانات المرسل
    senderInfo: {
        name: {
            type: String,
            required: true,
            default: "مستخدم"
        },
        avatar: {
            type: String,
            default: null
        }
    },

    type: {
        type: String,
        enum: ["message", "reaction", "mention", "friend_request", "system"],
        default: "message"
    },

    title: {
        type: String,
        default: "إشعار جديد"
    },

    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },

    conversationId: {
        type: String,
        index: true
    },

    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    read: {
        type: Boolean,
        default: false,
        index: true
    },

    readAt: {
        type: Date,
        default: null
    },

    priority: {
        type: String,
        enum: ["low", "normal", "high", "urgent"],
        default: "normal"
    },

    actionUrl: {
        type: String,
        default: null
    }

}, {
    timestamps: true
});


// ======================================================================
// INDEXES
// ======================================================================

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
notificationSchema.index({ conversationId: 1, createdAt: -1 });


// حذف الإشعارات المقروءة بعد 7 أيام
notificationSchema.index({ createdAt: 1 }, {
    expireAfterSeconds: 604800,
    partialFilterExpression: { read: true }
});


// ======================================================================
// PRE SAVE (حفظ بيانات المرسل تلقائياً) - النسخة النهائية والمضمونة
// ======================================================================

notificationSchema.pre('save', async function() {
    console.log('🔔 [Notification PreSave] Started for:', this._id);

    if (!this.isNew || (this.senderInfo && this.senderInfo.name)) {
        console.log('✅ [Notification PreSave] No action needed');
        return;
    }

    console.log('🔔 [Notification PreSave] Fetching sender info for:', this.sender);

    const User = mongoose.model('User');
    try {
        const sender = await User.findById(this.sender).select('name avatar');
        if (sender) {
            this.senderInfo = {
                name: sender.name || 'مستخدم',
                avatar: sender.avatar || null
            };
            console.log('✅ [Notification PreSave] Sender info saved:', sender.name);
        } else {
            this.senderInfo = { name: 'مستخدم', avatar: null };
            console.warn('⚠️ [Notification PreSave] Sender not found');
        }
    } catch (error) {
        console.error('❌ [Notification PreSave] Error:', error.message);
        this.senderInfo = { name: 'مستخدم', avatar: null };
    }
});



// ======================================================================
// METHODS
// ======================================================================

notificationSchema.methods.markAsRead = function() {
    this.read = true;
    this.readAt = new Date();
    return this.save();
};


// ======================================================================
// STATICS
// ======================================================================

notificationSchema.statics.getUnreadCount = async function(userId) {
    return this.countDocuments({
        recipient: userId,
        read: false
    });
};


// ======================================================================
// CREATE MESSAGE NOTIFICATION
// ======================================================================

notificationSchema.statics.createMessageNotification = async function(
    senderId,
    recipientId,
    message,
    conversationId
) {
    console.log('🔔 [Notification.createMessageNotification] =========== START ==========');
    console.log('🔔 [Notification.createMessageNotification] Parameters:', {
        senderId,
        recipientId,
        messageId: message ? message._id : null,
        conversationId
    });

    try {
        if (!senderId || !recipientId || !message) {
            throw new Error('Missing required parameters');
        }

        const User = mongoose.model('User');

        console.log('👤 [Notification] Fetching sender data for ID:', senderId);
        const sender = await User.findById(senderId).select('name avatar').lean();

        if (!sender) {
            throw new Error('Sender not found');
        }

        console.log('👤 [Notification] Sender found:', sender.name);

        const notificationData = {
            recipient: recipientId,
            sender: senderId,
            senderInfo: {
                name: sender.name || 'مستخدم',
                avatar: sender.avatar || null
            },
            type: 'message',
            title: 'رسالة جديدة',
            message: `📩 رسالة جديدة من ${sender.name || 'مستخدم'}`,
            conversationId: conversationId,
            data: {
                messageId: message._id,
                preview: message.text ? message.text.substring(0, 50) : '',
                senderName: sender.name
            },
            actionUrl: `/messages?conversation=${conversationId}`,
            priority: 'normal',
            read: false
        };

        console.log('💾 [Notification] Creating notification in DB...');
        const notification = await this.create(notificationData);

        console.log('✅ [Notification] Created in DB SUCCESSFULLY:', {
            id: notification._id,
            recipient: notification.recipient
        });

        console.log('🔔 [Notification.createMessageNotification] =========== END SUCCESS ==========');
        return notification;

    } catch (error) {
        console.error('❌ [Notification] Creation error:', error.message);
        console.log('🔔 [Notification.createMessageNotification] =========== END WITH ERROR ==========');
        throw error;
    }
};


module.exports = mongoose.model('Notification', notificationSchema);