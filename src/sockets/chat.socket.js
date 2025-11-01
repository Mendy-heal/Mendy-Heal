// sockets/chat.socket.js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import * as ChatRepo from "../repositories/chat.repo.js";
import { verifyJwt } from "../utils/verifyJwt.js";


// PATCH: rate limit & sanitize
const buckets = new Map();
function allow(key, rate = 20, windowMs = 60_000) { // 20 msg/phút mặc định
  const now = Date.now();
  let b = buckets.get(key) || { tokens: rate, ts: now };
  const refill = ((now - b.ts) / windowMs) * rate;
  b.tokens = Math.min(rate, b.tokens + refill);
  b.ts = now;
  if (b.tokens < 1) { buckets.set(key, b); return false; }
  b.tokens -= 1; buckets.set(key, b); return true;
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }




export function initChatSocket(server) {
  const io = new Server(server, {
    cors: { origin: true, credentials: true }
  });

  // Xác thực JWT ở handshake
  io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");
    const payload = verifyJwt(token);        // ✅ dùng chung
    socket.userId = Number(payload.sub);
    socket.role = payload.role || "SEEKER";
    next();
  } catch (err) {
    next(new Error("Unauthorized"));
  }
});


  io.on("connection", (socket) => {
    // join vào thread room
    socket.on("thread:join", async (threadId) => {
      const isMem = await ChatRepo.isMember(threadId, socket.userId);
      if (!isMem) return; // im lặng
      socket.join(`thread:${threadId}`);
      io.to(`thread:${threadId}`).emit("presence:joined", { threadId, userId: socket.userId });
    });

    socket.on("thread:leave", (threadId) => {
      socket.leave(`thread:${threadId}`);
      io.to(`thread:${threadId}`).emit("presence:left", { threadId, userId: socket.userId });
    });

    // gửi tin nhắn realtime + lưu DB
    socket.on("message:send", async ({ threadId, content }, cb) => {
      try {
        const key = `msg:${socket.userId}:${threadId}`;
        if (!allow(key, 20, 60_000)) return cb?.({ error: "rate_limited" });

        const member = await ChatRepo.isMember(threadId, socket.userId);
        if (!member) return cb?.({ error: "forbidden" });

        const raw = String(content || "");
        const cleaned = escapeHtml(raw.trim()).slice(0, 2000);
        if (!cleaned) return cb?.({ error: "empty_message" });

        const msg = await ChatRepo.insertMessage({ threadId, senderId: socket.userId, content: cleaned });
        // broadcast
        io.to(`thread:${threadId}`).emit("message:new", msg);
        cb?.({ ok: true, message: msg });
      } catch (e) {
        cb?.({ error: e.message });
      }
    });


    socket.on("typing", ({ threadId, isTyping }) => {
      io.to(`thread:${threadId}`).emit("typing", { threadId, userId: socket.userId, isTyping: !!isTyping });
    });

    socket.on("read", async ({ threadId, last_read_message_id }) => {
      try {
        const r = await ChatRepo.markRead({ threadId, userId: socket.userId, messageId: Number(last_read_message_id) });
        io.to(`thread:${threadId}`).emit("read:updated", { userId: r.user_id, threadId: r.thread_id, last_read_message_id: r.last_read_message_id });
      } catch { /* ignore */ }
    });
  });
}
