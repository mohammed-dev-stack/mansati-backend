// backend/utils/fileUtils.js
// 📁 دوال مساعدة للتعامل مع الملفات
// @version 1.0.0

const fs = require('fs').promises;
const path = require('path');

/**
 * حذف ملف من السيرفر
 */
const deleteFile = async(filePath) => {
    try {
        if (!filePath) return;

        // استخراج اسم الملف فقط من المسار
        const filename = path.basename(filePath);
        const fullPath = path.join(__dirname, '..', 'uploads', filename);

        await fs.access(fullPath); // التحقق من وجود الملف
        await fs.unlink(fullPath); // حذف الملف
        console.log(`✅ تم حذف الملف: ${filename}`);

    } catch (error) {
        // تجاهل الخطأ إذا كان الملف غير موجود
        if (error.code !== 'ENOENT') {
            console.error(`❌ خطأ في حذف الملف: ${filePath}`, error);
        }
    }
};

/**
 * حذف عدة ملفات
 */
const deleteMultipleFiles = async(filePaths) => {
    if (!Array.isArray(filePaths)) return;

    const promises = filePaths.map(filePath => deleteFile(filePath));
    await Promise.all(promises);
};

module.exports = {
    deleteFile,
    deleteMultipleFiles
};