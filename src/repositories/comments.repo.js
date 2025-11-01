import { query } from "../config/db.js";

export async function addComment({ postId, authorId, parentId, content }) {
  const { rows } = await query(
    `INSERT INTO app.comments (post_id, author_id, parent_id, content)
     VALUES ($1,$2,$3,$4)
     RETURNING id, post_id, author_id, parent_id, content, created_at`,
    [postId, authorId, parentId ?? null, String(content || "").trim()]
  );
  return rows[0];
}

export async function updateComment({ id, authorId, content }) {
  console.log(`[DEBUG] updateComment repository - Comment ID: ${id}, Author ID: ${authorId}, Content: ${content}`);
  const { rows } = await query(
    `UPDATE app.comments
        SET content=$3, edited=TRUE, updated_at=now()
      WHERE id=$1 AND author_id=$2
      RETURNING id, post_id, author_id, parent_id, content, updated_at, edited`,
    [id, authorId, String(content || "").trim()]
  );
  console.log(`[DEBUG] updateComment repository - Query returned ${rows.length} rows`);
  if (rows.length > 0) {
    console.log(`[DEBUG] updateComment repository - First row:`, rows[0]);
  } else {
    // Debug: Check if comment exists and who is the author
    const { rows: commentInfo } = await query(
      `SELECT id, author_id FROM app.comments WHERE id = $1`,
      [id]
    );
    console.log(`[DEBUG] updateComment repository - Comment info:`, commentInfo);
  }
  return rows[0];
}

export async function deleteComment({ id, authorId }) {
  const { rowCount } = await query(
    `DELETE FROM app.comments WHERE id=$1 AND author_id=$2`,
    [id, authorId]
  );
  return rowCount > 0;
}

export async function listComments({ postId, limit = 50, before }) {
  const params = [postId];
  let cursor = "";
  if (before) { params.push(new Date(before)); cursor = `AND c.created_at < $${params.length}`; }
  const { rows } = await query(
    `SELECT c.*, u.handle, up.display_name
       FROM app.comments c
       JOIN app.users u ON u.id=c.author_id
       LEFT JOIN app.user_profiles up ON up.user_id=u.id
      WHERE c.post_id=$1
        ${cursor}
      ORDER BY c.created_at DESC
      LIMIT $${params.length+1}`,
    [...params, limit]
  );
  return rows;
}
