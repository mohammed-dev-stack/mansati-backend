// backend/middleware/superAdminAuth.js
// 🛡️ Middleware للمصادقة الخاصة بالأدمن الخارق

const superAdminAuth = (req, res, next) => {
    try {
        console.log('🔐 [SuperAdminAuth] ========== AUTH CHECK ==========');

        const adminUsername = process.env.SUPER_ADMIN_USERNAME;
        const adminPassword = process.env.SUPER_ADMIN_PASSWORD;

        console.log('🔐 [SuperAdminAuth] Checking .env variables:');
        console.log('   - SUPER_ADMIN_USERNAME:', adminUsername ? '✅ موجود' : '❌ غير موجود');
        console.log('   - SUPER_ADMIN_PASSWORD:', adminPassword ? '✅ موجود' : '❌ غير موجود');

        if (!adminUsername || !adminPassword) {
            console.error('❌ [SuperAdminAuth] Missing environment variables');
            return res.status(500).json({
                success: false,
                message: 'بيانات الأدمن غير موجودة في ملف .env'
            });
        }

        const authHeader = req.headers.authorization;
        console.log('🔐 [SuperAdminAuth] Auth header present:', !!authHeader);

        if (!authHeader || !authHeader.startsWith('Basic ')) {
            console.log('🔐 [SuperAdminAuth] No Basic auth header');
            return res.status(401).json({
                success: false,
                message: 'مصادقة مطلوبة'
            });
        }

        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const [username, password] = credentials.split(':');

        console.log('🔐 [SuperAdminAuth] Login attempt:', {
            providedUsername: username,
            expectedUsername: adminUsername,
            match: username === adminUsername
        });

        if (username === adminUsername && password === adminPassword) {
            console.log('✅ [SuperAdminAuth] Authentication successful');
            req.superAdmin = {
                username,
                isSuperAdmin: true
            };
            next();
        } else {
            console.log('❌ [SuperAdminAuth] Invalid credentials');
            return res.status(401).json({
                success: false,
                message: 'اسم المستخدم أو كلمة المرور غير صحيحة'
            });
        }

    } catch (error) {
        console.error('❌ [SuperAdminAuth] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في المصادقة'
        });
    }
};

module.exports = superAdminAuth;