// src/controllers/chat.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { created, success, paginated } from "../utils/response.js";
import * as ChatService from "../services/chat.service.js";

export const startDm = asyncHandler(async (req, res) => {
  const me = req.user.id;           // <-- lấy từ JWT middleware
  const role = req.user.role || "SEEKER";      // <-- nếu bạn có set role trong token
  const { peer_handle, peer_id } = req.body;

  const t = await ChatService.startDm({
    me,
    role,
    peerHandle: peer_handle,
    peerId: peer_id
  });

  return created(res, "Direct message thread created", { thread_id: t.id });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const { id } = req.params;
  const { content } = req.body;
  const msg = await ChatService.sendMessage({ me, threadId: Number(id), content });
  return created(res, "Message sent successfully", { message: msg });
});

export const listMessages = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const { id } = req.params;
  const { limit = 30, before } = req.query;
  const rows = await ChatService.listThreadMessages({ me, threadId: Number(id), limit: Number(limit), before });
  return paginated(res, "Messages retrieved successfully", rows, {
    limit: Number(limit),
    nextCursor: rows.at(-1)?.created_at
  });
});

export const listThreads = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const { limit = 50, offset = 0 } = req.query;
  const rows = await ChatService.listMyThreads({ me, limit: Number(limit), offset: Number(offset) });
  return paginated(res, "Threads retrieved successfully", rows, {
    limit: Number(limit),
    offset: Number(offset)
  });
});

export const markRead = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const { id } = req.params;
  const { last_read_message_id } = req.body;
  const r = await ChatService.markRead({ me, threadId: Number(id), messageId: Number(last_read_message_id) });
  return success(res, "Messages marked as read", r);
});
