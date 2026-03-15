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

const upload = multer({ storage });

router.use(verifyJWT);


router.route("/")
    .get(getPosts)
    .post(upload.array("media", 5), createPost);


router.get("/user/:userId", getPostsByUser);

router.route("/:id")
    .put(updatePost)
    .delete(deletePost);

router.post("/:id/comment", addComment);
router.post("/:id/react", addReaction);
router.post("/:id/share", addShare);

module.exports = router;