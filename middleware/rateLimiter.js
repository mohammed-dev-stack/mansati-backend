// backend/middleware/rateLimiter.js
// 🛡️ مسؤول: تحديد معدل الطلبات (Rate Limiting) لحماية API من الإساءة
// @version 3.0.0 (متكامل مع البيئة والتخزين الموزع)
// @lastUpdated 2026

const rateLimit = require('express-rate-limit');
// دعم التخزين الموزع باستخدام MongoDB (اختياري، يُفعل في الإنتاج إذا وُجد)
let MongoStore;
if (process.env.NODE_ENV === 'production' && process.env.MONGO_STORE === 'true') {
    try {
        MongoStore = require('rate-limit-mongo');
    } catch (err) {
        console.warn('⚠️ rate-limit-mongo غير مثبت، سيتم استخدام التخزين الافتراضي (الذاكرة).');
    }
}

// ============================================================================
// إعدادات مشتركة
// ============================================================================

const isDevelopment = process.env.NODE_ENV === 'development';

// قراءة الحدود القصوى من متغيرات البيئة أو استخدام القيم الافتراضية
const getMax = (devDefault, prodDefault) => {
    return isDevelopment ? devDefault : (process.env.RATE_LIMIT_MAX || prodDefault);
};

// رسائل الخطأ متعددة اللغات (يمكن توسيعها بسهولة)
const messages = {
    ar: {
        default: 'محاولات كثيرة جداً. الرجاء المحاولة بعد {{time}} {{unit}}.',
        minutes: 'دقيقة',
        hour: 'ساعة',
    },
    en: {
        default: 'Too many attempts. Please try again after {{time}} {{unit}}.',
        minutes: 'minutes',
        hour: 'hour',
    }
};

/**
 * توليد رسالة الخطأ باللغة المطلوبة
 * @param {string} lang - 'ar' أو 'en'
 * @param {number} time - الوقت
 * @param {string} unit - 'minutes' أو 'hour'
 * @returns {string}
 */
const getMessage = (lang = 'ar', time, unit = 'minutes') => {
    // استخدام اللغة العربية كافتراضي إذا لم تكن اللغة موجودة
    const msg = messages[lang] ? .default || messages.ar.default;
    const unitWord = messages[lang] ? .[unit] || messages.ar[unit];
    return msg.replace('{{time}}', time).replace('{{unit}}', unitWord);
};

// دالة لتوليد المفتاح (key) لكل طلب – يمكن تخصيصها حسب الحاجة
const defaultKeyGenerator = (req) => {
    // استخدم معرف المستخدم إذا كان مسجلاً، وإلا استخدم IP
    return req.user ? ._id || req.ip;
};

// دالة المعالج الافتراضي (تُستدعى عند تجاوز الحد)
const defaultHandler = (req, res, message) => {
    res.status(429).json({
        success: false,
        message: message || getMessage('ar', 1, 'minutes'),
        retryAfter: Math.ceil(req.rateLimit.resetTime / 1000) || undefined
    });
};

// ============================================================================
// إنشاء محدد مع خيارات موحدة
// ============================================================================

const createLimiter = ({
    windowMs,
    max,
    message,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    store = null,
    handler = null
}) => {
    const options = {
        windowMs,
        max: parseInt(max),
        standardHeaders: true, // إرجاع معلومات RateLimit في الـ headers (رسمي)
        legacyHeaders: false, // عدم استخدام الـ headers القديمة (X-RateLimit-*)
        skipSuccessfulRequests,
        keyGenerator,
        message: message || getMessage('ar', Math.ceil(windowMs / 60000), 'minutes'),
        handler: handler || ((req, res) => defaultHandler(req, res, message)),
    };

    if (store) {
        options.store = store;
    }

    return rateLimit(options);
};

// ============================================================================
// تعريف المحددات المختلفة
// ============================================================================

/**
 * محدد عام لجميع المسارات – يُطبق على مستوى التطبيق ككل (اختياري)
 * مناسب للحد العام لحماية الخادم.
 */
const globalLimiter = createLimiter({
    windowMs: 60 * 1000, // دقيقة واحدة
    max: getMax(1000, 200),
    message: getMessage('ar', 1, 'minutes'),
    keyGenerator: defaultKeyGenerator,
});

/**
 * محدد خاص بمسارات المصادقة (تسجيل الدخول، إنشاء حساب، refresh)
 * يسمح بعدد محدود جداً من المحاولات لمنع هجمات القوة الغاشمة.
 */
const authLimiter = createLimiter({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: getMax(100, 10),
    skipSuccessfulRequests: true, // لا تحسب الطلبات الناجحة (مثل تسجيل الدخول الناجح)
    message: getMessage('ar', 15, 'minutes'),
    keyGenerator: (req) => req.ip, // استخدم IP فقط لأن المستخدم غير مسجل بعد
});

/**
 * محدد للمسارات الحساسة (مثل تغيير كلمة المرور، رفع الصور، تحديث البريد)
 * يطبق حداً ساعياً لمنع إساءة الاستخدام.
 */
const sensitiveLimiter = createLimiter({
    windowMs: 60 * 60 * 1000, // ساعة واحدة
    max: getMax(100, 30),
    message: getMessage('ar', 1, 'hour'),
    keyGenerator: defaultKeyGenerator,
});

/**
 * محدد لواجهات API العامة (مثل جلب المنشورات، عرض المستخدمين)
 * يسمح بعدد معقول من الطلبات لحماية الخادم مع الحفاظ على الأداء.
 */
const publicApiLimiter = createLimiter({
    windowMs: 60 * 1000, // دقيقة
    max: getMax(200, 60),
    message: getMessage('ar', 1, 'minutes'),
    keyGenerator: (req) => req.ip,
});

/**
 * محدد لمسارات الأدمن (لوحة التحكم)
 * قد يكون أقل صرامة أو أعلى حسب الحاجة.
 */
const adminLimiter = createLimiter({
    windowMs: 60 * 1000, // دقيقة
    max: getMax(500, 100),
    message: getMessage('ar', 1, 'minutes'),
    keyGenerator: defaultKeyGenerator,
});

/**
 * محدد صارم لإنشاء المحتوى (منشورات، رسائل)
 * يحد من عدد المنشورات أو الرسائل التي يمكن للمستخدم إنشاؤها في الساعة.
 */
const createContentLimiter = createLimiter({
    windowMs: 60 * 60 * 1000, // ساعة
    max: getMax(200, 50),
    message: getMessage('ar', 1, 'hour'),
    keyGenerator: defaultKeyGenerator,
});

/**
 * محدد لمسارات المتابعة / إلغاء المتابعة
 * يمنع عمليات المتابعة المتكررة بشكل غير طبيعي.
 */
const followLimiter = createLimiter({
    windowMs: 10 * 60 * 1000, // 10 دقائق
    max: getMax(200, 30),
    message: getMessage('ar', 10, 'minutes'),
    keyGenerator: defaultKeyGenerator,
});

/**
 * محدد لمسارات البحث
 * يمنع استنزاف الموارد بالبحث المتكرر.
 */
const searchLimiter = createLimiter({
    windowMs: 60 * 1000, // دقيقة
    max: getMax(100, 20),
    message: getMessage('ar', 1, 'minutes'),
    keyGenerator: defaultKeyGenerator,
});

// ============================================================================
// دالة مساعدة لإنشاء متجر MongoDB (إذا كان مطلوباً)
// ============================================================================

const createMongoStore = () => {
    if (process.env.NODE_ENV === 'production' && MongoStore && process.env.DATABASE_URI) {
        return new MongoStore({
            uri: process.env.DATABASE_URI,
            collectionName: 'rateLimitRecords',
            expireTimeMs: 15 * 60 * 1000, // مدة الاحتفاظ بالسجلات (تتناسب مع أكبر windowMs)
            errorHandler: (err) => console.error('❌ MongoDB rate-limit store error:', err),
        });
    }
    return null;
};

// محاولة إنشاء متجر موزع لاستخدامه في بعض المحددات إذا رغبت
const mongoStore = createMongoStore();

// إذا توفر متجر MongoDB، يمكننا تعيينه لبعض المحددات لتحقيق التخزين الموزع
// على سبيل المثال، يمكن إضافته إلى authLimiter إذا كان لدينا عدة نسخ من الخادم
if (mongoStore) {
    // يمكننا إعادة تعريف المحددات باستخدام المتجر، لكننا نفضل ترك هذا للمستخدم
    // حتى لا نفرض شيئاً دون حاجة.
    // مثال: authLimiter.options.store = mongoStore; (لكن store للقراءة فقط)
    console.log('✅ MongoDB rate-limit store جاهز للاستخدام، قم بتعيينه يدوياً في المحددات إذا أردت.');
}

// ============================================================================
// تصدير جميع المحددات
// ============================================================================

module.exports = {
    globalLimiter,
    authLimiter,
    sensitiveLimiter,
    publicApiLimiter,
    adminLimiter,
    createContentLimiter,
    followLimiter,
    searchLimiter,
    // تصدير الدوال المساعدة لاستخدامها خارجياً إذا لزم الأمر
    createLimiter,
    getMessage,
    createMongoStore,
};