const jwt = require("jsonwebtoken");

// ✅ توليد Access Token باستخدام ACCESS_TOKEN_SECRET من .env
const generateAccessToken = (payload) => {
    return jwt.sign({ _id: payload._id, email: payload.email },
        process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" }
    );
};

// ✅ توليد Refresh Token باستخدام JWT_REFRESH_SECRET من .env
const generateRefreshToken = (payload) => {
    return jwt.sign({ _id: payload._id, email: payload.email },
        process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" }
    );
};

module.exports = { generateAccessToken, generateRefreshToken };