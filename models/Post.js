const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const shareSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now }
});

// ✅ مخطط للتفاعلات
const reactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
        type: String,
        enum: ["like", "love", "care", "haha", "wow", "sad", "angry"], // أضفنا "care"
        required: true
    },
    createdAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
    title: String,
    content: String,
    media: [String],
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    comments: [commentSchema],
    shares: [shareSchema],
    reactions: [reactionSchema], // ✅ إضافة التفاعلات هنا
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Post", postSchema);