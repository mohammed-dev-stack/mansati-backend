// backend/scripts/setupAdmin.js
// 🚀 سكريبت تهيئة الأدمن (يشغل مرة واحدة)

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const connectDB = require('../config/dbConn');

const setupAdmin = async() => {
    try {
        // اتصال بقاعدة البيانات
        await connectDB();

        console.log('📦 Connected to database');

        // التحقق من وجود أدمن
        const existingAdmin = await User.findOne({ role: 'admin' });

        if (existingAdmin) {
            console.log('⚠️ Admin already exists:');
            console.log(`   Name: ${existingAdmin.name}`);
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Role: ${existingAdmin.role}`);

            // تحديث كلمة المرور إذا أردت
            if (process.env.UPDATE_ADMIN_PASSWORD === 'true') {
                const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
                existingAdmin.password = hashedPassword;
                await existingAdmin.save();
                console.log('✅ Admin password updated');
            }

            process.exit(0);
        }

        // إنشاء أدمن جديد
        const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

        if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
            console.error('❌ Admin credentials not found in .env');
            console.log('Please add to .env:');
            console.log('ADMIN_NAME=مدير النظام');
            console.log('ADMIN_EMAIL=admin@example.com');
            console.log('ADMIN_PASSWORD=YourSecurePassword123!');
            process.exit(1);
        }

        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

        const admin = await User.create({
            name: ADMIN_NAME,
            email: ADMIN_EMAIL,
            password: hashedPassword,
            role: 'admin',
            isActive: true
        });

        console.log('✅ First admin created successfully:');
        console.log(`   Name: ${admin.name}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Role: ${admin.role}`);

        process.exit(0);

    } catch (error) {
        console.error('❌ Setup error:', error);
        process.exit(1);
    }
};

setupAdmin();