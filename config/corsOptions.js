// backend/config/corsOptions.js
const allowedOrigins = require("./allowedOrigins");

const corsOptions = {
    origin: (origin, callback) => {
        // ✅ الحل الآمن: التمييز بين بيئة التطوير والإنتاج
        if (process.env.NODE_ENV === 'development') {
            // في التطوير: نسمح بالأدوات المحلية (Postman, etc.)
            return callback(null, true);
        }

        // في الإنتاج: نسمح فقط بالأصول المحددة
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            // !origin مسموح بها للطلبات الداخلية من نفس السيرفر (اختياري، يمكن إزالته)
            callback(null, true);
        } else {
            callback(new Error("❌ Not allowed by CORS"));
        }
    },
    credentials: true, // ✅ السماح بالكوكيز (مهم لتخزين التوكن)
    optionsSuccessStatus: 200,
};

module.exports = corsOptions;