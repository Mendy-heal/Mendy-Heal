// repositories/chat.repo.js
import { query } from "../config/db.js";


export async function getOrCreateDmThread(userA, userB) {
  if (userA === userB) throw Object.assign(new Error("Cannot DM yourself"), { status: 400 });

  // Tìm thread DM có đúng 2 members này
  const { rows: found } = await query(
    `
    SELECT t.id
    FROM app.chat_threads t
    JOIN app.chat_members m1 ON m1.thread_id = t.id AND m1.user_id = $1
    JOIN app.chat_members m2 ON m2.thread_id = t.id AND m2.user_id = $2
    WHERE t.type = 'DM' LIMIT 1
    `,
    [userA, userB]
  );
  if (found[0]) return found[0];

  // Tạo thread + 2 members (transaction nhẹ nhàng)
  const { rows: t } = await query(
    `INSERT INTO app.chat_threads (type, created_at, last_message_at)
     VALUES ('DM', now(), now()) RETURNING id`
  );
  const threadId = t[0].id;

  await query(
    `INSERT INTO app.chat_members (thread_id, user_id, role_in_thread, joined_at)
     VALUES ($1,$2,'PARTICIPANT', now()), ($1,$3,'PARTICIPANT', now())
     ON CONFLICT DO NOTHING`,
    [threadId, userA, userB]
  );

  return { id: threadId };
}

// Kiểm tra thành viên
export async function isMember(threadId, userId) {
  const { rows } = await query(
    `SELECT 1 FROM app.chat_members WHERE thread_id = $1 AND user_id = $2 LIMIT 1`,
    [threadId, userId]
  );
  return !!rows[0];
}

// Gửi tin nhắn
export async function insertMessage({ threadId, senderId, content }) {
  const { rows } = await query(
    `INSERT INTO app.chat_messages (thread_id, sender_id, content, created_at)
     VALUES ($1,$2,$3, now())
     RETURNING id, thread_id, sender_id, content, created_at`,
    [threadId, senderId, content]
  );
  // cập nhật last_message_at
  await query(`UPDATE app.chat_threads SET last_message_at = now() WHERE id = $1`, [threadId]);
  return rows[0];
}

// Lấy messages phân trang (cursor = created_at ISO hoặc message id)
export async function listMessages({ threadId, limit = 30, before }) {
  if (before) {
    const { rows } = await query(
      `SELECT id, thread_id, sender_id, content, created_at
       FROM app.chat_messages
       WHERE thread_id = $1 AND created_at < $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [threadId, new Date(before), limit]
    );
    return rows;
  }
  const { rows } = await query(
    `SELECT id, thread_id, sender_id, content, created_at
     FROM app.chat_messages
     WHERE thread_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [threadId, limit]
  );
  return rows;
}

// Danh sách thread của user + last message + peer basic info
export async function listThreads(userId, limit = 50, offset = 0) {
  const { rows } = await query(
    `
    WITH my_threads AS (
      SELECT t.id, t.type, t.last_message_at
      FROM app.chat_threads t
      JOIN app.chat_members m ON m.thread_id = t.id
      WHERE m.user_id = $1
    ),
    last_msg AS (
      SELECT DISTINCT ON (thread_id)
             thread_id, id as message_id, content, sender_id, created_at
      FROM app.chat_messages
      ORDER BY thread_id, created_at DESC
    ),
    peers AS (
      SELECT cm.thread_id, u.id AS peer_id, u.handle, up.display_name, up.avatar_url
      FROM app.chat_members cm
      JOIN app.users u ON u.id = cm.user_id
      LEFT JOIN app.user_profiles up ON up.user_id = u.id
      WHERE cm.thread_id IN (SELECT id FROM my_threads) AND cm.user_id <> $1
    )
    SELECT mt.id, mt.type, mt.last_message_at,
           lm.message_id, lm.content as last_message, lm.sender_id, lm.created_at as last_message_at2,
           p.peer_id, p.handle as peer_handle, p.display_name as peer_name, p.avatar_url as peer_avatar
    FROM my_threads mt
    LEFT JOIN last_msg lm ON lm.thread_id = mt.id
    LEFT JOIN peers p ON p.thread_id = mt.id
    ORDER BY mt.last_message_at DESC
    LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset]
  );
  return rows;  
}

// Đánh dấu đã đọc (lưu mức "đọc tới id" theo user & thread)
export async function markRead({ threadId, userId, messageId }) {
  const { rows } = await query(
    `INSERT INTO app.chat_read_state (thread_id, user_id, last_read_message_id, updated_at)
     VALUES ($1,$2,$3, now())
     ON CONFLICT (thread_id, user_id)
     DO UPDATE SET last_read_message_id = GREATEST(EXCLUDED.last_read_message_id, app.chat_read_state.last_read_message_id),
                   updated_at = now()
     RETURNING thread_id, user_id, last_read_message_id, updated_at`,
    [threadId, userId, messageId]
  );
  return rows[0];
}
