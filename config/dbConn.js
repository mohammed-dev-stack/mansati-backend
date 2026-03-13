const mongoose = require("mongoose");

const connectDB = async() => {
    try {
        await mongoose.connect(process.env.DATABASE_URI, {
            // لم يعد هناك حاجة لـ useNewUrlParser أو useUnifiedTopology
            serverSelectionTimeoutMS: 5000,
            maxPoolSize: 10,
        });
        console.log("✅ MongoDB Connected Successfully");
    } catch (err) {
        console.error("❌ Database connection error:", err.message);
        process.exit(1);
    }
};

module.exports = connectDB;