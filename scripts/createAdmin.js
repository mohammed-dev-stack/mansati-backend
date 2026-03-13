// scripts/createAdmin.js
// 🚀 مسؤول: إنشاء حساب أدمن أول

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const connectDB = require('../config/dbConn');

const createAdmin = async() => {
    try {
        // اتصال بقاعدة البيانات
        await connectDB();

        const adminEmail = 'admin@example.com';
        const adminPassword = 'Admin@123456';

        // التحقق من وجود الأدمن
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            // تحديث المستخدم الموجود إلى أدمن
            existingAdmin.role = 'admin';
            await existingAdmin.save();
            console.log('✅ تم تحديث المستخدم إلى أدمن:', existingAdmin.email);
        } else {
            // إنشاء أدمن جديد
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            const admin = await User.create({
                name: 'مدير النظام',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                isActive: true
            });

            console.log('✅ تم إنشاء أدمن جديد:', admin.email);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ في إنشاء الأدمن:', error);
        process.exit(1);
    }
};

createAdmin();