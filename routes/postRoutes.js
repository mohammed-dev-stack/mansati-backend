// backend/routes/postRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const {
    createPost,
    getPosts,
    getPostsByUser,
    updatePost,
    deletePost,
    addComment,
    addShare,
    addReaction,
} = require("../controllers/postController");
const verifyJWT = require("../middleware/verifyJWT");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../uploads"));
    },
    filename: (req, file, cb) => {
        const safeName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
        cb(null, safeName);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "video/mp4"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only images and mp4 videos are allowed."), false);
    }
};

const upload = multer({ storage, fileFilter });

// جميع المسارات محمية
router.use(verifyJWT);

// إنشاء منشور مع رفع وسائط (حد أقصى 5 ملفات)
router.post("/", upload.array("media", 5), createPost);

// جلب المنشورات مع pagination
router.get("/", getPosts);

// جلب منشورات مستخدم معين
router.get("/user/:userId", getPostsByUser);

// تحديث منشور
router.put("/:id", updatePost);

// حذف منشور
router.delete("/:id", deletePost);

// إضافة تعليق
router.post("/:id/comment", addComment);

// إضافة تفاعل
router.post("/:id/react", addReaction);

// مشاركة منشور
router.post("/:id/share", addShare);

module.exports = router;