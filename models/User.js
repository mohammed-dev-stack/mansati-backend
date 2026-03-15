const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true, // ✅ هذا يكفي لعمل فهرس فريد
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: null
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user'
    },
    refreshToken: {
        type: String,
        default: null
    },
    followersCount: {
        type: Number,
        default: 0,
        min: 0
    },
    followingCount: {
        type: Number,
        default: 0,
        min: 0
    },
    postsCount: {
        type: Number,
        default: 0,
        min: 0
    },
    bio: {
        type: String,
        default: '',
        maxlength: 500
    },
    location: {
        type: String,
        default: ''
    },
    website: {
        type: String,
        default: ''
    },
    lastLogin: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.refreshToken;
            delete ret.__v;
            return ret;
        }
    }
});

// ✅ تم حذف سطر تكرار فهرس الإيميل لإنهاء التحذير
userSchema.index({ name: 'text' });
userSchema.index({ followersCount: -1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);