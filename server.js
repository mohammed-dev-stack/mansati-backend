// backend/server.js
// 🚀 الخادم الرئيسي - النسخة الذهبية (Gold Edition)
// @version 5.2.0 | 2026

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet"); // 🛡️ أمان إضافي للـ HTTP Headers
const cookieParser = require("cookie-parser");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");

const connectDB = require("./config/dbConn");
const corsOptions = require("./config/corsOptions");
const logger = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");
const SocketManager = require("./utils/socketManager");

// ============================================================================
// 🚨 نظام التشخيص الذكي (Smart Diagnostics)
// ============================================================================
console.clear();
console.log("--------------------------------------------------");
console.log("  M A N S A T I   B A C K E N D   S E R V E R  ");
console.log("--------------------------------------------------");

const validateEnv = () => {
    const required = ['SUPER_ADMIN_USERNAME', 'SUPER_ADMIN_PASSWORD', 'DATABASE_URI'];
    let missing = false;
    required.forEach(v => {
        if (!process.env[v]) {
            console.log(`❌ Missing: ${v}`);
            missing = true;
        } else {
            console.log(`✅ Loaded: ${v}`);
        }
    });
    return !missing;
};

const isEnvReady = validateEnv();

// ============================================================================
// إعداد التطبيق
// ============================================================================
const app = express();
const server = http.createServer(app);

// 🛡️ تعزيز الأمان بمكتبة Helmet
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" } // للسماح بتحميل الصور من السيرفر للفرونت
}));

// إعداد Socket.IO
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        credentials: true
    },
    transports: ["websocket", "polling"]
});

const PORT = process.env.PORT || 5000;

// الاتصال بقاعدة البيانات
connectDB();

// Middleware
app.use(logger);
app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// الملفات الثابتة
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// حقن Socket.IO في الطلبات
app.set("io", io);

// ============================================================================
// تسجيل المسارات (Routes)
// ============================================================================
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/users", require("./routes/followRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/super-admin", require("./routes/superAdminRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// المسار الرئيسي (Health Check)
app.get("/", (req, res) => {
    res.status(200).json({
        status: "active",
        version: "5.2.0",
        admin_system: isEnvReady ? "Operational" : "Degraded"
    });
});

// تهيئة Socket Manager
new SocketManager(io).initialize();

// معالج الأخطاء (يجب أن يكون الأخير)
app.use(errorHandler);

// ============================================================================
// تشغيل الخادم
// ============================================================================
server.listen(PORT, () => {
    console.log(`\n🚀 Server live on: http://localhost:${PORT}`);
    console.log(`📡 Real-time Engine: Socket.IO initialized`);
    if (!isEnvReady) {
        console.warn("\n⚠️ WARNING: Super Admin variables are incomplete!");
    }
});

// التعامل مع الكوارث (Graceful Shutdown)
process.on("unhandledRejection", (err) => {
    console.error("Critical Rejection:", err);
    server.close(() => process.exit(1));
});