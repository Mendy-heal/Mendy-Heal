import { query } from "../config/db.js";

export async function createPost({ authorId, title, content, privacy }) {
    const { rows } = await query(
        `INSERT INTO app.posts (author_id, title, content, privacy)
     VALUES ($1,$2,$3,$4)
     RETURNING id, author_id, title, content, privacy, created_at`,
        [authorId, title, content ?? null, privacy]
    );
    return rows[0];
}

export async function updatePost({ postId, authorId, title, content, privacy }) {
    const setTitle = title === undefined ? "" : `title=$3,`;
    const params = [postId, authorId];
    if (title !== undefined) params.push(title);
    params.push(content ?? null, privacy);
    const { rows } = await query(
        `UPDATE app.posts
        SET ${setTitle}
            content=$${title === undefined ? 3 : 4},
            privacy=$${title === undefined ? 4 : 5},
            updated_at=now()
      WHERE id=$1 AND author_id=$2
      RETURNING id, author_id, title, content, privacy, updated_at`,
        params
    );
    return rows[0];
}

export async function deletePost({ postId, authorId }) {
    const { rowCount } = await query(
        `DELETE FROM app.posts WHERE id=$1 AND author_id=$2`,
        [postId, authorId]
    );
    return rowCount > 0;
}

export async function attachFiles(postId, fileIds = []) {
    if (!fileIds.length) return;
    const vals = [];
    const params = [];
    let i = 1;
    for (const fid of fileIds) {
        vals.push(`($${i++},$${i++})`);
        params.push(postId, Number(fid));
    }
    await query(
        `INSERT INTO app.post_files (post_id, file_id)
     VALUES ${vals.join(",")}
     ON CONFLICT DO NOTHING`,
        params
    );
}

export async function listPostFiles(postId) {
    const { rows } = await query(
        `SELECT pf.file_id, uf.url, uf.mime_type, uf.size_bytes
       FROM app.post_files pf
       JOIN app.user_files uf ON uf.id=pf.file_id
      WHERE pf.post_id=$1
      ORDER BY pf.created_at ASC`,
        [postId]
    );
    return rows;
}

export async function reactPost({ postId, userId, reaction }) {
  const { rows } = await query(
    `INSERT INTO app.post_reactions (post_id, user_id, reaction)
     VALUES ($1,$2,$3::app.reaction_kind)
     ON CONFLICT (post_id, user_id)
     DO UPDATE SET reaction=EXCLUDED.reaction, created_at=now()
     RETURNING post_id, user_id, reaction, created_at`,
    [postId, userId, reaction]
  );
  return rows[0];
}


export async function unreactPost({ postId, userId }) {
    const { rowCount } = await query(
        `DELETE FROM app.post_reactions WHERE post_id=$1 AND user_id=$2`,
        [postId, userId]
    );
    return rowCount > 0;
}

export async function savePost({ postId, userId }) {
    const { rows } = await query(
        `INSERT INTO app.post_saves (user_id, post_id)
     VALUES ($1,$2)
     ON CONFLICT DO NOTHING
     RETURNING user_id, post_id, created_at`,
        [userId, postId]
    );
    return rows[0];
}

export async function unsavePost({ postId, userId }) {
    const { rowCount } = await query(
        `DELETE FROM app.post_saves WHERE user_id=$1 AND post_id=$2`,
        [userId, postId]
    );
    return rowCount > 0;
}

export async function getPostDetail(postId) {
    const { rows } = await query(
        `SELECT p.*, u.handle, up.display_name
       FROM app.posts p
       JOIN app.users u ON u.id=p.author_id
       LEFT JOIN app.user_profiles up ON up.user_id=u.id
      WHERE p.id=$1`,
        [postId]
    );
    return rows[0];
}

export async function listTimeline({ ownerId, limit = 20, before }) {
    const params = [ownerId];
    let cursor = "";
    if (before) { params.push(new Date(before)); cursor = `AND p.created_at < $${params.length}`; }
    const { rows } = await query(
        `SELECT p.*, u.handle, up.display_name
       FROM app.posts p
       JOIN app.users u ON u.id=p.author_id
       LEFT JOIN app.user_profiles up ON up.user_id=u.id
      WHERE p.author_id=$1
        ${cursor}
      ORDER BY p.created_at DESC
      LIMIT $${params.length + 1}`,
        [...params, limit]
    );
    return rows;
}

export async function listHomeFeed({ me, limit = 20, before }) {
    const params = [me, me];
    let cursor = "";
    if (before) { params.push(new Date(before)); cursor = `AND p.created_at < $${params.length}`; }
    const { rows } = await query(
        `WITH my_follows AS (
       SELECT followee_id FROM app.user_follows WHERE follower_id=$1
     )
     SELECT p.*, u.handle, up.display_name
       FROM app.posts p
       JOIN app.users u ON u.id=p.author_id
       LEFT JOIN app.user_profiles up ON up.user_id=u.id
      WHERE (
        p.privacy='PUBLIC'
        OR (p.privacy='FRIENDS' AND (
            p.author_id=$2 OR p.author_id IN (SELECT followee_id FROM my_follows)
        ))
        OR (p.privacy='ONLY_ME'   AND p.author_id=$2)
      )
      ${cursor}
      ORDER BY p.created_at DESC
      LIMIT $${params.length + 1}`,
        [...params, limit]
    );
    return rows;
}
