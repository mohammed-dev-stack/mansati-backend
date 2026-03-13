const fs = require("fs");
const path = require("path");

// ✅ Middleware لتسجيل الطلبات والأنشطة
const logger = (req, res, next) => {
    const logItem = `${new Date().toISOString()} | ${req.method} ${req.url} | ${req.ip}\n`;

    fs.appendFile(path.join(__dirname, "../logs", "reqLog.txt"), logItem, (err) => {
        if (err) console.error("❌ Logging error:", err);
    });

    console.log("📌 Request:", logItem.trim());
    next();
};

module.exports = logger;