// ✅ Middleware لمعالجة الأخطاء بشكل موحد
const errorHandler = (err, req, res, next) => {
    console.error("❌ Error:", err.stack);

    const statusCode = res.statusCode ? res.statusCode : 500;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === "production" ? "🥷 Hidden" : err.stack,
    });
};

module.exports = errorHandler;