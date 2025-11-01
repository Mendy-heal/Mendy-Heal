import { query } from "../config/db.js";

export async function createInvite({ threadId, callerId, calleeId, kind }) {
  const { rows } = await query(
    `INSERT INTO app.call_sessions (thread_id, caller_id, callee_id, kind, status)
     VALUES ($1,$2,$3,$4,'INIT') RETURNING *`,
    [threadId, callerId, calleeId, kind]
  );
  await insertEvent({ callId: rows[0].id, byUser: callerId, type: "INVITE" });
  return rows[0];
}

export async function getById(callId) {
  const { rows } = await query(
    `SELECT id, thread_id, caller_id, callee_id, kind, status, started_at, connected_at, ended_at
       FROM app.call_sessions
      WHERE id = $1`,
    [callId]
  );
  return rows[0];
}

export async function updateStatus({ callId, status, reason, setConnected }) {
  const cols = [];
  const vals = [];
  let i = 1;

  cols.push(`status = $${i++}`); vals.push(status);

  if (setConnected) { cols.push(`connected_at = now()`); }
  if (reason)       { cols.push(`end_reason = $${i++}`); vals.push(reason); }
  if (["ENDED","REJECTED","FAILED","MISSED","BUSY"].includes(status)) {
    cols.push(`ended_at = now()`);
  }

  vals.push(callId);
  const { rows } = await query(
    `UPDATE app.call_sessions SET ${cols.join(", ")} WHERE id = $${i} RETURNING *`,
    vals
  );
  return rows[0];
}

export async function insertEvent({ callId, byUser, type, payload }) {
  // PATCH: assert callId hợp lệ
  const id = Number(callId);
  if (!Number.isFinite(id) || id <= 0) {
    const e = new Error("Invalid callId");
    e.status = 400;
    throw e;
  }
  await query(
    `INSERT INTO app.call_events (call_id, by_user, type, payload)
     VALUES ($1,$2,$3,$4)`,
    [id, byUser ?? null, type, payload ? JSON.stringify(payload) : null]
  );
}


export async function isSameThreadMembers({ threadId, userA, userB }) {
  const { rows } = await query(
    `SELECT 1
       FROM app.chat_members m1
       JOIN app.chat_members m2 ON m2.thread_id = m1.thread_id
      WHERE m1.thread_id = $1 AND m1.user_id = $2 AND m2.user_id = $3
      LIMIT 1`,
    [threadId, userA, userB]
  );
  return !!rows[0];
}
