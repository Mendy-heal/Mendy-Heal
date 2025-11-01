import { query } from "../config/db.js";

export async function follow({ me, userId }) {
  await query(
    `INSERT INTO app.user_follows (follower_id, followee_id)
     VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [me, userId]
  );
  return { followed: true };
}

export async function unfollow({ me, userId }) {
  const { rowCount } = await query(
    `DELETE FROM app.user_follows WHERE follower_id=$1 AND followee_id=$2`,
    [me, userId]
  );
  return { removed: rowCount > 0 };
}

export async function isFollower({ followerId, followeeId }) {
  const { rows } = await query(
    `SELECT 1 FROM app.user_follows WHERE follower_id=$1 AND followee_id=$2 LIMIT 1`,
    [followerId, followeeId]
  );
  return !!rows[0];
}

export async function isFriend({ a, b }) {
  const { rows } = await query(
    `SELECT 1
       FROM app.user_follows f1
       JOIN app.user_follows f2
         ON f2.follower_id=f1.followee_id AND f2.followee_id=f1.follower_id
      WHERE f1.follower_id=$1 AND f1.followee_id=$2
      LIMIT 1`,
    [a, b]
  );
  return !!rows[0];
}
