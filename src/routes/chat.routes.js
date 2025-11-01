// routes/chat.routes.js
import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import { startDm, sendMessage, listMessages, listThreads, markRead } from "../controllers/chat.controller.js";
import rateLimit from "express-rate-limit";
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // tối đa 20 msg/phút
  message: { error: "Too many messages" },
});
const r = Router();
// Bắt buộc đăng nhập
r.use(auth);

// Bắt đầu DM với người khác (role nào cũng được, miễn 2 user khác nhau)
r.post("/dm/start", startDm);

// Liệt kê threads của mình
r.get("/threads", listThreads);

// Lấy messages 1 thread (cursor-based: ?before=ISO)
r.get("/threads/:id/messages", listMessages);

// Gửi message vào thread
r.post("/threads/:id/messages", messageLimiter, sendMessage);

// Đánh dấu đã đọc tới message id
r.post("/threads/:id/read", markRead);

export default r;
