// backend/controllers/postController.js
const Post = require("../models/Post");
const User = require("../models/User");
const mongoose = require("mongoose");

const CONSTANTS = {
    MAX_POST_LENGTH: 5000,
    MAX_COMMENT_LENGTH: 1000,
    MAX_LIMIT: 50
};

const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

const sanitizeText = (text) => {
    if (!text) return "";
    return text.trim().replace(/\s+/g, " ");
};

const formatPost = (postDoc, currentUserId) => {
    if (!postDoc) return null;

    const postObj = postDoc.toObject ? postDoc.toObject() : postDoc;

    postObj._id = postObj._id.toString();

    if (currentUserId && postObj.reactions) {
        const myReaction = postObj.reactions.find(
            r => r.user && r.user._id &&
            r.user._id.toString() === currentUserId.toString()
        );

        postObj.userReaction = myReaction ? myReaction.type : null;
    }

    if (!postObj.author) {
        postObj.author = { name: "مستخدم", avatar: null };
    }

    return postObj;
};

const createPost = async(req, res) => {
    try {

        const { title, content } = req.body;

        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: "Title and content are required"
            });
        }

        const cleanTitle = sanitizeText(title);
        const cleanContent = sanitizeText(content);

        if (cleanContent.length > CONSTANTS.MAX_POST_LENGTH) {
            return res.status(400).json({
                success: false,
                message: "Post content too long"
            });
        }

        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const mediaFiles = req.files ?
            req.files.map(file => `/uploads/${file.filename}`) : [];

        const post = await Post.create({
            title: cleanTitle,
            content: cleanContent,
            media: mediaFiles,
            author: req.user._id
        });

        const populatedPost = await Post.findById(post._id)
            .populate("author", "name avatar email")
            .lean();

        res.status(201).json({
            success: true,
            message: "Post created successfully",
            data: formatPost(populatedPost, req.user._id)
        });

    } catch (err) {

        console.error("[createPost] Error:", err.message);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// backend/controllers/postController.js
// تعديل دالة getPosts لإرسال التفاعلات والمشاركات كاملة

const getPosts = async(req, res) => {
    try {
        let { page = 1, limit = 10 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        if (page < 1) page = 1;
        if (limit > CONSTANTS.MAX_LIMIT) limit = CONSTANTS.MAX_LIMIT;
        const skip = (page - 1) * limit;

        const posts = await Post.find()
            .populate('author', 'name avatar email')
            .populate('comments.user', 'name avatar') // ✅ تأكد من جلب بيانات المستخدمين للتعليقات
            .populate('reactions.user', 'name avatar') // ✅ جلب بيانات المستخدمين للتفاعلات
            .populate('shares.user', 'name avatar') // ✅ جلب بيانات المستخدمين للمشاركات
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // لا تحذف الحقول الأصلية، فقط أضف العدادات كمساعدة
        const postsWithStats = posts.map(post => ({
            ...post,
            commentsCount: post.comments ? post.comments.length : 0,
            sharesCount: post.shares ? post.shares.length : 0,
            reactionsCount: post.reactions ? post.reactions.length : 0,
            // تم إزالة الأسطر التي كانت تحذف comments, shares, reactions
        }));

        const total = await Post.countDocuments();

        res.json({
            success: true,
            data: postsWithStats.map(p => formatPost(p, req.user ? req.user._id : null)),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (err) {
        console.error("[getPosts] Error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const getPostsByUser = async(req, res) => {
    try {
        const { userId } = req.params;

        if (!isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user id"
            });
        }

        const posts = await Post.find({ author: userId })
            .populate("author", "name avatar email")
            .populate("comments.user", "name avatar")
            .populate("reactions.user", "name avatar")
            .populate("shares.user", "name avatar") // ✅ إضافة هذا
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: posts.map(p => formatPost(p, req.user ? req.user._id : null))
        });

    } catch (err) {
        console.error("[getPostsByUser] Error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const updatePost = async(req, res) => {
    try {

        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid post id"
            });
        }

        const post = await Post.findOne({
            _id: id,
            author: req.user._id
        });

        if (!post) {
            return res.status(403).json({
                success: false,
                message: "Not allowed"
            });
        }

        const updates = {
            title: sanitizeText(req.body.title),
            content: sanitizeText(req.body.content)
        };

        const updatedPost = await Post.findByIdAndUpdate(
                id,
                updates, { new: true }
            )
            .populate("author", "name avatar email")
            .lean();

        res.json({
            success: true,
            message: "Post updated",
            data: formatPost(updatedPost, req.user._id)
        });

    } catch (err) {

        console.error("[updatePost] Error:", err.message);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const deletePost = async(req, res) => {
    try {

        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid post id"
            });
        }

        const post = await Post.findById(id);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        if (post.author.toString() !== req.user._id) {

            const user = await User.findById(req.user._id);

            if (!user || user.role !== "admin") {
                return res.status(403).json({
                    success: false,
                    message: "Not allowed"
                });
            }
        }

        await post.deleteOne();

        res.json({
            success: true,
            message: "Post deleted"
        });

    } catch (err) {

        console.error("[deletePost] Error:", err.message);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const addComment = async(req, res) => {
    try {

        const { id } = req.params;
        const { text } = req.body;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid post id"
            });
        }

        const cleanText = sanitizeText(text);

        if (!cleanText || cleanText.length > CONSTANTS.MAX_COMMENT_LENGTH) {
            return res.status(400).json({
                success: false,
                message: "Invalid comment"
            });
        }

        const post = await Post.findById(id);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        post.comments.push({
            user: req.user._id,
            text: cleanText,
            createdAt: new Date()
        });

        await post.save();

        const updatedPost = await Post.findById(id)
            .populate("author", "name avatar")
            .populate("comments.user", "name avatar")
            .lean();

        res.json({
            success: true,
            message: "Comment added",
            data: formatPost(updatedPost, req.user._id)
        });

    } catch (err) {

        console.error("[addComment] Error:", err.message);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// backend/controllers/postController.js

const addShare = async(req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid post id" });
        }

        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        // إضافة المشاركة (بدون التحقق من التكرار، يمكن للمستخدم مشاركة المنشور أكثر من مرة إذا أردنا)
        // إذا أردنا منع التكرار، نستخدم الشرط التالي:
        // const alreadyShared = post.shares.some(s => s.user.toString() === userId.toString());
        // if (!alreadyShared) {
        //     post.shares.push({ user: userId, createdAt: new Date() });
        // }

        // السماح بمشاركات متعددة:
        post.shares.push({ user: userId, createdAt: new Date() });

        await post.save();

        const updatedPost = await Post.findById(id)
            .populate("author", "name avatar email")
            .populate("shares.user", "name avatar")
            .lean();

        res.json({
            success: true,
            message: "Post shared",
            data: formatPost(updatedPost, req.user._id)
        });
    } catch (err) {
        console.error("[addShare] Error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const addReaction = async(req, res) => {
    try {

        const { id } = req.params;
        const { type } = req.body;

        const validTypes = [
            "like", "love", "care", "haha", "wow", "sad", "angry"
        ];

        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid reaction type"
            });
        }

        const post = await Post.findById(id);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        const index = post.reactions.findIndex(
            r => r.user && r.user.toString() === req.user._id.toString()
        );

        if (index !== -1) {
            post.reactions[index].type = type;
        } else {
            post.reactions.push({
                user: req.user._id,
                type,
                createdAt: new Date()
            });
        }

        await post.save();

        const updatedPost = await Post.findById(id)
            .populate("author", "name avatar email")
            .populate("reactions.user", "name avatar")
            .lean();

        res.json({
            success: true,
            message: "Reaction added",
            data: formatPost(updatedPost, req.user._id)
        });

    } catch (err) {

        console.error("[addReaction] Error:", err.message);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

module.exports = {
    createPost,
    getPosts,
    getPostsByUser,
    updatePost,
    deletePost,
    addComment,
    addShare,
    addReaction
};