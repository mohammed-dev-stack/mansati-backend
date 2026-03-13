// قائمة الـ origins المسموح بها
const allowedOrigins = [
    "http://localhost:3000", // Frontend Dev
    "http://127.0.0.1:3000", // بديل للـ localhost
    "https://yourdomain.com", // Production
];

module.exports = allowedOrigins;