import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import * as Calls from "../repositories/calls.repo.js";
import { verifyJwt } from "../utils/verifyJwt.js";

function ok(cb, data) { cb && cb({ ok: true, ...data }); }
function err(cb, msg) { cb && cb({ error: msg || "error" }); }
function toValidId(x) { const n = Number(x); return Number.isFinite(n) && n > 0 ? n : null; }

export function initRtcSocket(server) {
  const io = new Server(server, { cors: { origin: true, credentials: true } });
  const rtc = io.of("/rtc");

  const buckets = new Map(); // key -> { tokens, ts }
  function allow(key, rate = 40, windowMs = 60_000) { // 40 events/phút mặc định
    const now = Date.now();
    let b = buckets.get(key) || { tokens: rate, ts: now };
    const refill = ((now - b.ts) / windowMs) * rate;
    b.tokens = Math.min(rate, b.tokens + refill);
    b.ts = now;
    if (b.tokens < 1) { buckets.set(key, b); return false; }
    b.tokens -= 1; buckets.set(key, b); return true;
  }

  rtc.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");
      const payload = verifyJwt(token);         // ✅ dùng chung
      socket.userId = Number(payload.sub);
      socket.role = payload.role || "SEEKER";
      socket.join(`u:${socket.userId}`);
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  rtc.on("connection", (socket) => {


    socket.on("call:invite", async ({ threadId, peerId, kind = "AUDIO" }, cb) => {
      try {
        kind = String(kind || "AUDIO").toUpperCase();
        if (!["AUDIO", "VIDEO"].includes(kind)) return err(cb, "kind must be AUDIO or VIDEO");

        const tId = toValidId(threadId);
        const pId = toValidId(peerId);
        if (!tId || !pId) return err(cb, "invalid threadId/peerId");

        const okMembers = await Calls.isSameThreadMembers({ threadId: tId, userA: socket.userId, userB: pId });
        if (!okMembers) return err(cb, "not in same thread");

        const call = await Calls.createInvite({ threadId: tId, callerId: socket.userId, calleeId: pId, kind });
        socket.join(`call:${call.id}`);


        rtc.to(`u:${pId}`).emit("call:incoming", { callId: call.id, from: socket.userId, threadId: tId, kind });
        ok(cb, { callId: call.id });
      } catch (e) { err(cb, e.message); }
    });

    socket.on("call:ringing", async ({ callId }, cb) => {
      const id = toValidId(callId);
      if (!id) return err(cb, "invalid callId");
      await Calls.updateStatus({ callId: id, status: "RINGING" });
      await Calls.insertEvent({ callId: id, byUser: socket.userId, type: "RINGING" });
      rtc.to(`call:${id}`).emit("call:ringing", { callId: id, by: socket.userId });
      ok(cb);
    });

    socket.on("call:accept", async ({ callId }, cb) => {
      const id = toValidId(callId);
      if (!id) return err(cb, "invalid callId");
      socket.join(`call:${id}`);
      await Calls.updateStatus({ callId: id, status: "CONNECTED", setConnected: true });
      await Calls.insertEvent({ callId: id, byUser: socket.userId, type: "ACCEPT" });
      rtc.to(`call:${id}`).emit("call:accepted", { callId: id, by: socket.userId });
      ok(cb);
    });

    socket.on("call:reject", async ({ callId, reason = "rejected" }, cb) => {
      const id = toValidId(callId);
      if (!id) return err(cb, "invalid callId");
      await Calls.updateStatus({ callId: id, status: "REJECTED", reason });
      await Calls.insertEvent({ callId: id, byUser: socket.userId, type: "REJECT" });
      rtc.to(`call:${id}`).emit("call:ended", { callId: id, reason: "rejected" });
      ok(cb);
    });

    socket.on("call:busy", async ({ callId }, cb) => {
      const id = toValidId(callId);
      if (!id) return err(cb, "invalid callId");
      await Calls.updateStatus({ callId: id, status: "BUSY", reason: "busy" });
      await Calls.insertEvent({ callId: id, byUser: socket.userId, type: "BUSY" });
      rtc.to(`call:${id}`).emit("call:ended", { callId: id, reason: "busy" });
      ok(cb);
    });

    socket.on("call:hangup", async ({ callId, reason = "hangup" }, cb) => {
      const id = toValidId(callId);
      if (!id) return err(cb, "invalid callId");
      await Calls.updateStatus({ callId: id, status: "ENDED", reason });
      await Calls.insertEvent({ callId: id, byUser: socket.userId, type: "HANGUP" });
      rtc.to(`call:${id}`).emit("call:ended", { callId: id, reason });
      ok(cb);
    });

    // Signaling — thêm validate + rate limit cho ICE (rtc:candidate)
    socket.on("rtc:offer", ({ callId, sdp }) => {
      const id = toValidId(callId);
      if (!id) return; // im lặng hoặc emit lỗi tùy bạn
      rtc.to(`call:${id}`).emit("rtc:offer", { sdp, from: socket.userId });
    });

    socket.on("rtc:answer", ({ callId, sdp }) => {
      const id = toValidId(callId);
      if (!id) return;
      rtc.to(`call:${id}`).emit("rtc:answer", { sdp, from: socket.userId });
    });

    socket.on("rtc:candidate", ({ callId, candidate }) => {
      const id = toValidId(callId);
      if (!id) return;
      const key = `ice:${socket.userId}:${id}`;
      if (!allow(key, 120, 60_000)) return; // 120 ICE/phút/người/cuộc gọi
      rtc.to(`call:${id}`).emit("rtc:candidate", { candidate, from: socket.userId });
    });

    // TURN token giữ nguyên (có thể nâng cấp sau)
  });

}
