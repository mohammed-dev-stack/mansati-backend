// backend/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { register, login, refresh, logout } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh); // ✅ إضافة هذا السطر (كان مفقوداً)
router.post("/logout", logout);

module.exports = router;