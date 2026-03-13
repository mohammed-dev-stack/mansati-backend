// backend/middleware/verifyJWT.js
// 🛡️ Middleware للتحقق من صحة التوكن
// @version 1.1.0 - توحيد تنسيق الأخطاء مع success: false

const jwt = require("jsonwebtoken");

const verifyJWT = (req, res, next) => {
    // محاولة جلب التوكن من الكوكيز أولاً ثم من الهيدر كخيار احتياطي
    const token = req.cookies ?
        req.cookies.accessToken :
        (req.headers.authorization && req.headers.authorization.startsWith("Bearer ") ?
            req.headers.authorization.split(" ")[1] :
            null);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "جلسة العمل انتهت، يرجى تسجيل الدخول مجدداً"
        });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: "التوكن غير صالح أو منتهي الصلاحية"
            });
        }

        // تخزين بيانات المستخدم بالكامل في الطلب لسهولة الوصول إليها
        req.user = {
            _id: decoded._id,
            role: decoded.role,
            email: decoded.email
        };

        if (!req.user._id) {
            return res.status(401).json({
                success: false,
                message: "معرف المستخدم مفقود في التوكن"
            });
        }

        next();
    });
};

module.exports = verifyJWT;