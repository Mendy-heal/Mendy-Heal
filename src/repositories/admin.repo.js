import { query } from "../config/db.js";

// User management
export async function getAllUsers({ limit = 50, offset = 0, status, role } = {}) {
  let whereClause = "WHERE 1=1";
  const params = [];
  let paramIndex = 1;

  if (status) {
    whereClause += ` AND u.status = $${paramIndex++}`;
    params.push(status);
  }

  if (role) {
    whereClause += ` AND u.role_primary = $${paramIndex++}`;
    params.push(role);
  }

  const { rows } = await query(
    `SELECT u.id, u.handle, u.email, u.phone, u.role_primary, u.status, 
            u.created_at, u.updated_at,
            up.display_name, up.avatar_url,
            COUNT(DISTINCT b.id) as booking_count,
            COUNT(DISTINCT p.id) as post_count
     FROM app.users u
     LEFT JOIN app.user_profiles up ON u.id = up.user_id
     LEFT JOIN app.bookings b ON u.id = b.user_id
     LEFT JOIN app.posts p ON u.id = p.author_id
     ${whereClause}
     GROUP BY u.id, up.display_name, up.avatar_url
     ORDER BY u.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset]
  );

  return rows;
}

export async function getUserById(userId) {
  const { rows } = await query(
    `SELECT u.*, up.display_name, up.avatar_url, up.bio, up.gender, up.year_of_birth,
            ep.specialties, ep.price_per_session, ep.rating_avg, ep.kyc_status,
            lp.intro as listener_intro, lp.verified as listener_verified,
            w.balance as wallet_balance
     FROM app.users u
     LEFT JOIN app.user_profiles up ON u.id = up.user_id
     LEFT JOIN app.expert_profiles ep ON u.id = ep.user_id
     LEFT JOIN app.listener_profiles lp ON u.id = lp.user_id
     LEFT JOIN app.wallets w ON u.id = w.owner_user_id
     WHERE u.id = $1`,
    [userId]
  );

  return rows[0];
}

export async function updateUserStatus(userId, status, adminId) {
  const { rows } = await query(
    `UPDATE app.users 
     SET status = $1, updated_at = now()
     WHERE id = $2
     RETURNING id, status, updated_at`,
    [status, userId]
  );

  // Log the action
  await query(
    `INSERT INTO app.audit_logs (user_id, action, resource, resource_id, meta, created_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, now())`,
    [adminId, "USER_STATUS_UPDATE", "USER", userId, JSON.stringify({ new_status: status })]
  );

  return rows[0];
}

// Content moderation
export async function getReportedContent({ limit = 50, offset = 0, status, targetType } = {}) {
  let whereClause = "WHERE 1=1";
  const params = [];
  let paramIndex = 1;

  if (status) {
    whereClause += ` AND r.status = $${paramIndex++}`;
    params.push(status);
  }

  if (targetType) {
    whereClause += ` AND r.target_type = $${paramIndex++}`;
    params.push(targetType);
  }

  const { rows } = await query(
    `SELECT r.*, 
            reporter.handle as reporter_handle,
            reporter.display_name as reporter_name,
            target_post.title as post_title,
            target_post.content as post_content,
            target_comment.content as comment_content,
            target_user.handle as reported_user_handle
     FROM app.reports r
     LEFT JOIN app.users reporter ON r.reporter_id = reporter.id
     LEFT JOIN app.posts target_post ON r.target_type = 'POST' AND r.target_id = target_post.id
     LEFT JOIN app.comments target_comment ON r.target_type = 'COMMENT' AND r.target_id = target_comment.id
     LEFT JOIN app.users target_user ON r.target_type = 'USER' AND r.target_id = target_user.id
     ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset]
  );

  return rows;
}

export async function createModerationAction({ adminId, targetType, targetId, action, reason }) {
  const { rows } = await query(
    `INSERT INTO app.moderation_actions (admin_id, target_type, target_id, action, reason, created_at)
     VALUES ($1, $2, $3, $4, $5, now())
     RETURNING *`,
    [adminId, targetType, targetId, action, reason]
  );

  // Log the action
  await query(
    `INSERT INTO app.audit_logs (user_id, action, resource, resource_id, meta, created_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, now())`,
    [adminId, "MODERATION_ACTION", targetType, targetId, JSON.stringify({ action, reason })]
  );

  return rows[0];
}

// Analytics
export async function getDashboardStats() {
  const { rows } = await query(
    `SELECT 
        (SELECT COUNT(*) FROM app.users WHERE status = 'ACTIVE') as active_users,
        (SELECT COUNT(*) FROM app.users WHERE created_at >= CURRENT_DATE) as new_users_today,
        (SELECT COUNT(*) FROM app.bookings WHERE status = 'CONFIRMED' AND start_at >= CURRENT_DATE) as bookings_today,
        (SELECT COUNT(*) FROM app.bookings WHERE status = 'CONFIRMED' AND start_at >= CURRENT_DATE - INTERVAL '7 days') as bookings_week,
        (SELECT COUNT(*) FROM app.posts WHERE created_at >= CURRENT_DATE) as posts_today,
        (SELECT COUNT(*) FROM app.reports WHERE created_at >= CURRENT_DATE) as reports_today,
        (SELECT COUNT(*) FROM app.payment_intents WHERE status = 'PAID' AND created_at >= CURRENT_DATE) as payments_today,
        (SELECT COALESCE(SUM(amount), 0) FROM app.payment_intents WHERE status = 'PAID' AND created_at >= CURRENT_DATE) as revenue_today`
  );

  return rows[0];
}

export async function getBookingStats({ days = 30 } = {}) {
  const { rows } = await query(
    `SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) as confirmed_bookings,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_bookings,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_bookings
     FROM app.bookings
     WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
     GROUP BY DATE(created_at)
     ORDER BY date DESC`
  );

  return rows;
}

export async function getRevenueStats({ days = 30 } = {}) {
  const { rows } = await query(
    `SELECT 
        DATE(created_at) as date,
        COUNT(*) as transaction_count,
        COALESCE(SUM(amount), 0) as total_revenue
     FROM app.payment_intents
     WHERE status = 'PAID' AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
     GROUP BY DATE(created_at)
     ORDER BY date DESC`
  );

  return rows;
}