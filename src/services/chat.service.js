// src/services/chat.service.js
import * as UsersRepo from "../repositories/users.repo.js";
import * as ChatRepo from "../repositories/chat.repo.js";
import * as BookingsRepo from "../repositories/bookings.repo.js";

function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }



export async function startDm({ me, role, peerHandle, peerId }) {
  if (!me) throw Object.assign(new Error("Missing current user"), { status: 401 });

  let peer;
  if (peerId) {
    peer = { id: Number(peerId) };
  } else if (peerHandle) {
    const u = await UsersRepo.getByHandle(peerHandle);
    if (!u) throw Object.assign(new Error("Peer not found"), { status: 404 });
    peer = { id: u.id, role: u.role_primary };
  } else {
    throw Object.assign(new Error("peerHandle or peerId is required"), { status: 400 });
  }

  if (me === peer.id) throw Object.assign(new Error("Cannot DM yourself"), { status: 400 });
  const meRole = role || "SEEKER";
  if (meRole === "SEEKER") {
    // nếu chỉ có peerId mà thiếu role, fetch từ DB
    let peerRole = peer.role;
    if (!peerRole && peer.id) {
      const found = await UsersRepo.getProfileByUserId(peer.id);
      peerRole = found?.role_primary || "SEEKER";
    }

    if (peerRole === "EXPERT") {
      const hasBooking = await BookingsRepo.hasActiveBooking(me, peer.id);
      if (!hasBooking) {
        throw new HttpError(
          403,
          "Bạn cần có booking đang hoạt động hoặc sắp tới với chuyên gia để nhắn tin."
        );
      }
    }
  }

  const t = await ChatRepo.getOrCreateDmThread(me, peer.id);
  return t; // { id }
}

export async function sendMessage({ me, threadId, content }) {
  const raw = String(content ?? "");
  const cleaned = escapeHtml(raw.trim()).slice(0, 2000);
  if (!cleaned) {
    const e = new Error("Message content required");
    e.status = 400; throw e;
  }
  const isMem = await ChatRepo.isMember(threadId, me);
  if (!isMem) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  return ChatRepo.insertMessage({ threadId, senderId: me, content: cleaned });
}


export async function listThreadMessages({ me, threadId, limit = 30, before }) {
  const isMem = await ChatRepo.isMember(threadId, me);
  if (!isMem) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  return ChatRepo.listMessages({ threadId, limit, before });
}

export async function listMyThreads({ me, limit = 50, offset = 0 }) {
  return ChatRepo.listThreads(me, limit, offset);
}

export async function markRead({ me, threadId, messageId }) {
  const isMem = await ChatRepo.isMember(threadId, me);
  if (!isMem) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  return ChatRepo.markRead({ threadId, userId: me, messageId });
}
