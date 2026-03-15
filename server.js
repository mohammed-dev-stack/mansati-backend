// 🚀 Mansati Backend - النسخة الذهبية المستقرة
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const connectDB = require("./config/dbConn");
const corsOptions = require("./config/corsOptions");
const logger = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");
const SocketManager = require("./utils/socketManager");

console.clear();
console.log("--------------------------------------------------");
console.log("   M A N S A T I   B A C K E N D   S E R V E R   ");
console.log("--------------------------------------------------");

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Mansati API Documentation",
            version: "5.2.0",
            description: "التوثيق الرسمي لمحرك منصتي",
            contact: { name: "Mohammed Al-Qannan" }
        },
        tags: [
            { name: "Authentication", description: "عمليات الدخول" },
            { name: "Posts", description: "إدارة المنشورات" },
            { name: "Notifications", description: "التنبيهات" },
            { name: "Admin", description: "لوحة التحكم" },
            { name: "Social", description: "المتابعات" },
            { name: "Messages", description: "الدردشة" }
        ],
        servers: [{ url: `http://localhost:${process.env.PORT || 5000}` }],
    },
    apis: ["./routes/*.js"],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

const validateEnv = () => {
    const required = ['SUPER_ADMIN_USERNAME', 'SUPER_ADMIN_PASSWORD', 'DATABASE_URI'];
    return required.every(v => !!process.env[v]);
};

const isEnvReady = validateEnv();
const app = express();
const server = http.createServer(app);

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false
}));
app.use(logger);
app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

const io = new Server(server, {
    cors: { origin: "*", credentials: true },
    transports: ["websocket", "polling"]
});
app.set("io", io);

connectDB();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// تسجيل المسارات - ✅ التأكد من عدم التكرار
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes")); // يشمل المتابعات أيضاً
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/super-admin", require("./routes/superAdminRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

app.get("/", (req, res) => {
    res.status(200).json({ status: "active", version: "5.2.0" });
});

new SocketManager(io).initialize();
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server live on: http://localhost:${PORT}`);
});