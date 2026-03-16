// backend/controllers/authController.js
// 🔐 متحكم المصادقة - نسخة محسنة لدعم البيئات المتقاطعة (Cross-Origin)
// @version 2.3.0
// @lastUpdated 2026

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");
const User = require("../models/User");

/**
 * @desc Register new user
 * @route POST /api/auth/register
 * @access Public
 */
const register = async(req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            password: hashedPassword
        });

        const accessToken = generateAccessToken({ _id: user._id, email: user.email });
        const refreshToken = generateRefreshToken({ _id: user._id, email: user.email });

        user.refreshToken = refreshToken;
        await user.save();

        // ✅ إعدادات الكوكيز المتوافقة مع البيئات المتقاطعة (Cross-Origin)
        const isProduction = process.env.NODE_ENV === "production";

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: isProduction, // في الإنتاج يجب أن تكون true
            sameSite: isProduction ? "none" : "lax", // none يسمح بالعبور بين النطاقات
            maxAge: 15 * 60 * 1000, // 15 دقيقة
            path: "/",
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 أيام
            path: "/",
        });

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    avatar: user.avatar,
                    role: user.role
                }
            }
        });

    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};

/**
 * @desc Login user
 * @route POST /api/auth/login
 * @access Public
 */
const login = async(req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ success: false, message: "Invalid credentials" });

        const accessToken = generateAccessToken({ _id: user._id, email: user.email });
        const refreshToken = generateRefreshToken({ _id: user._id, email: user.email });

        user.refreshToken = refreshToken;
        user.lastLogin = new Date();
        await user.save();

        const isProduction = process.env.NODE_ENV === "production";

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 15 * 60 * 1000,
            path: "/",
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
        });

        res.json({
            success: true,
            message: "Login successful",
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    avatar: user.avatar,
                    role: user.role
                }
            }
        });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};

/**
 * @desc Refresh access token using refresh token
 * @route POST /api/auth/refresh
 * @access Public
 */
const refresh = async(req, res) => {
    try {
        const cookies = req.cookies;
        if (!cookies || !cookies.refreshToken) {
            return res.status(401).json({ success: false, message: "Unauthorized: No refresh token" });
        }

        const refreshToken = cookies.refreshToken;

        const user = await User.findOne({ refreshToken });
        if (!user) {
            return res.status(403).json({ success: false, message: "Forbidden: Invalid refresh token" });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        if (user._id.toString() !== decoded._id.toString()) {
            return res.status(403).json({ success: false, message: "Forbidden: Token mismatch" });
        }

        const accessToken = generateAccessToken({ _id: user._id, email: user.email });

        const isProduction = process.env.NODE_ENV === "production";

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 15 * 60 * 1000,
            path: "/",
        });

        res.json({ success: true, message: "Token refreshed successfully" });

    } catch (err) {
        console.error("Refresh error:", err);
        res.status(403).json({ success: false, message: "Forbidden: Invalid refresh token" });
    }
};

/**
 * @desc Logout user
 * @route POST /api/auth/logout
 * @access Public
 */
const logout = async(req, res) => {
    try {
        const cookies = req.cookies;
        if (cookies && cookies.refreshToken) {
            await User.findOneAndUpdate({ refreshToken: cookies.refreshToken }, { $unset: { refreshToken: 1 } });
        }

        const isProduction = process.env.NODE_ENV === "production";

        res.clearCookie("accessToken", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/",
        });

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/",
        });

        res.json({ success: true, message: "Logout successful" });

    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};

module.exports = { register, login, refresh, logout };