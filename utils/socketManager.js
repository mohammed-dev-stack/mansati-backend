// backend/utils/socketManager.js
const jwt = require("jsonwebtoken");

class SocketManager {
    constructor(io) {
        this.io = io;
        this.onlineUsers = new Map();
    }

    initialize() {
        this.io.use(async(socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    return next(new Error("No token provided"));
                }

                const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
                socket.userId = decoded._id || decoded.id;
                socket.userName = decoded.name || "مستخدم";

                if (!socket.userId) {
                    return next(new Error("Invalid token data"));
                }

                next();
            } catch (err) {
                console.error("Socket auth error:", err.message);
                next(new Error("Authentication error"));
            }
        });

        this.io.on("connection", (socket) => {
            this.handleConnection(socket);
        });

        // بث قائمة المتصلين كل 30 ثانية
        setInterval(() => {
            this.broadcastOnlineUsers();
        }, 30000);
    }

    handleConnection(socket) {
        const userId = socket.userId.toString();

        socket.join(`user_${userId}`);

        this.onlineUsers.set(userId, {
            socketId: socket.id,
            name: socket.userName,
            lastSeen: new Date()
        });

        this.broadcastOnlineUsers();

        console.log(`✅ User ${socket.userName} (${userId}) connected. Online users: ${this.onlineUsers.size}`);

        socket.on("typing", ({ receiverId, isTyping }) => {
            socket.to(`user_${receiverId}`).emit("user_typing", {
                userId,
                isTyping
            });
        });

        socket.on("send_message", async(messageData) => {
            try {
                const { receiverId, message } = messageData;

                socket.to(`user_${receiverId}`).emit("new_message", {
                    ...message,
                    sender: { _id: userId, name: socket.userName }
                });

                socket.emit("message_sent", {
                    ...message,
                    sender: { _id: userId, name: socket.userName }
                });

            } catch (error) {
                console.error("Error sending message via socket:", error);
            }
        });

        socket.on("messages_read", async({ senderId }) => {
            try {
                const Message = require("../models/Message");
                await Message.updateMany({ sender: senderId, receiver: userId, read: false }, { read: true, readAt: new Date() });

                socket.to(`user_${senderId}`).emit("messages_read_status", {
                    readerId: userId,
                    conversationId: `${senderId}_${userId}`
                });
            } catch (error) {
                console.error("Messages read error:", error);
            }
        });

        socket.on("get_online_users", () => {
            socket.emit("online_users", this.getOnlineUsersList());
        });

        socket.on("disconnect", () => {
            this.onlineUsers.delete(userId);
            this.broadcastOnlineUsers();
            console.log(`❌ User ${socket.userName} disconnected. Online users: ${this.onlineUsers.size}`);
        });
    }

    getOnlineUsersList() {
        return Array.from(this.onlineUsers.entries()).map(
            ([id, data]) => ({
                id,
                name: data.name,
                lastSeen: data.lastSeen
            })
        );
    }

    broadcastOnlineUsers() {
        const onlineUsersList = this.getOnlineUsersList();
        this.io.emit("online_users", onlineUsersList);
    }

    // ✅ دالة إرسال الإشعارات (تستخدمها الـ controllers)
    sendNotification(userId, notification) {
        try {
            console.log(`📨 Sending notification to user ${userId}:`, notification);
            this.io.to(`user_${userId}`).emit("new_notification", notification);
        } catch (error) {
            console.error("❌ Error sending notification:", error);
        }
    }

    isUserOnline(userId) {
        return this.onlineUsers.has(userId.toString());
    }

    sendMessage(userId, message) {
        this.io.to(`user_${userId}`).emit("new_message", message);
    }
}

module.exports = SocketManager;