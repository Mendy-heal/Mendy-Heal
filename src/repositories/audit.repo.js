import { query } from "../config/db.js";

export async function logAction({ userId, action, meta, ip, agent }) {
  await query(
    `INSERT INTO app.audit_logs (user_id, action, ip_addr, user_agent, meta, created_at)
     VALUES ($1,$2,$3,$4,$5::jsonb,now())`,
    [userId, action, ip ?? null, agent ?? null, meta ? JSON.stringify(meta) : "{}"]
  );
}

export async function getAuditLogs({ limit = 50, before, userId, action } = {}) {
  let whereClause = "WHERE 1=1";
  const params = [];
  let paramIndex = 1;

  if (userId) {
    whereClause += ` AND user_id = $${paramIndex++}`;
    params.push(userId);
  }

  if (action) {
    whereClause += ` AND action = $${paramIndex++}`;
    params.push(action);
  }

  if (before) {
    whereClause += ` AND created_at < $${paramIndex++}`;
    params.push(before);
  }

  const { rows } = await query(
    `SELECT * FROM app.audit_logs
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex}`,
    [...params, limit]
  );

  return rows;
}
