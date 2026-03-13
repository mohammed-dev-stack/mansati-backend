// backend/controllers/userController.js
// 👤 متحكم المستخدمين
// @version 6.0.1 - إضافة success: true لجميع الاستجابات الناجحة

const User = require("../models/User");
const mongoose = require("mongoose");

// ============================================================================
// Helpers
// ============================================================================

const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

const escapeRegex = (text) => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const buildFullImageUrl = (path, req) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
};

const formatUser = (userDoc, req = null) => {
    if (!userDoc) return null;

    const userObj = userDoc.toObject ? userDoc.toObject() : userDoc;

    delete userObj.password;

    userObj.followersCount = userObj.followersCount || 0;
    userObj.followingCount = userObj.followingCount || 0;
    userObj.postsCount = userObj.postsCount || 0;

    if (req && userObj.avatar) {
        userObj.avatar = buildFullImageUrl(userObj.avatar, req);
    }

    return userObj;
};

// ============================================================================
// Controllers
// ============================================================================

const getAllUsers = async(req, res) => {
    try {
        const users = await User.find({ isActive: { $ne: false } })
            .select("-password -__v")
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const formattedUsers = users.map(user =>
            formatUser({ toObject: () => user }, req)
        );

        res.json({
            success: true,
            count: formattedUsers.length,
            data: formattedUsers
        });

    } catch (err) {
        console.error("GET ALL USERS ERROR:", err.message);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const getUser = async(req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user id"
            });
        }

        const user = await User.findById(id).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const formattedUser = formatUser(user, req);

        res.json({
            success: true,
            data: formattedUser
        });

    } catch (err) {
        console.error("GET USER ERROR:", err.message);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const updateUser = async(req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user id"
            });
        }

        if (currentUser._id.toString() !== id && currentUser.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Not authorized"
            });
        }

        const updates = {...req.body };

        delete updates.password;
        delete updates._id;
        delete updates.role;
        delete updates.followersCount;
        delete updates.followingCount;
        delete updates.postsCount;
        delete updates.emailVerified;

        const user = await User.findByIdAndUpdate(
            id,
            updates, { new: true, runValidators: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const formattedUser = formatUser(user, req);

        res.json({
            success: true,
            message: "User updated successfully",
            data: formattedUser
        });

    } catch (err) {
        console.error("UPDATE USER ERROR:", err.message);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const updateAvatar = async(req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user id"
            });
        }

        if (currentUser._id.toString() !== id && currentUser.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Not authorized"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp"
        ];

        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: "Invalid file type"
            });
        }

        const maxSize = 5 * 1024 * 1024;
        if (req.file.size > maxSize) {
            return res.status(400).json({
                success: false,
                message: "File too large"
            });
        }

        const avatarPath = `/uploads/${req.file.filename}`;

        const user = await User.findByIdAndUpdate(
            id, { avatar: avatarPath }, { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const formattedUser = formatUser(user, req);

        res.json({
            success: true,
            message: "Avatar updated successfully",
            data: formattedUser
        });

    } catch (err) {
        console.error("UPDATE AVATAR ERROR:", err.message);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const deleteUser = async(req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user id"
            });
        }

        if (currentUser._id.toString() !== id && currentUser.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Not authorized"
            });
        }

        const user = await User.findByIdAndDelete(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            message: "User deleted successfully"
        });

    } catch (err) {
        console.error("DELETE USER ERROR:", err.message);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const searchUsers = async(req, res) => {
    try {
        let { q } = req.query;

        if (!q || !q.trim()) {
            return res.json({
                success: true,
                data: []
            });
        }

        q = escapeRegex(q.trim());

        const query = {
            name: { $regex: q, $options: "i" }
        };

        const users = await User.find(query)
            .select("_id name avatar followersCount followingCount postsCount")
            .limit(50)
            .sort({ name: 1 })
            .lean();

        const processedUsers = users.map(user => ({
            _id: user._id,
            name: user.name,
            avatar: buildFullImageUrl(user.avatar, req),
            followersCount: user.followersCount || 0,
            followingCount: user.followingCount || 0,
            postsCount: user.postsCount || 0
        }));

        res.json({
            success: true,
            data: processedUsers
        });

    } catch (err) {
        console.error("SEARCH USERS ERROR:", err.message);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

module.exports = {
    getAllUsers,
    getUser,
    updateUser,
    updateAvatar,
    deleteUser,
    searchUsers
};