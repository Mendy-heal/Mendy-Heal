import * as AdminRepo from "../repositories/admin.repo.js";
import * as AuditRepo from "../repositories/audit.repo.js";
import * as PostsRepo from "../repositories/posts.repo.js";
import * as CommentsRepo from "../repositories/comments.repo.js";

// User management
export async function getUsersList(filters = {}) {
  const { limit = 50, offset = 0, status, role } = filters;
  
  const users = await AdminRepo.getAllUsers({ limit, offset, status, role });
  
  // Format user data for response
  return users.map(user => ({
    id: user.id,
    handle: user.handle,
    email: user.email,
    phone: user.phone,
    role: user.role_primary,
    status: user.status,
    created_at: user.created_at,
    updated_at: user.updated_at,
    profile: {
      display_name: user.display_name,
      avatar_url: user.avatar_url
    },
    stats: {
      booking_count: parseInt(user.booking_count),
      post_count: parseInt(user.post_count)
    }
  }));
}

export async function getUserDetails(userId) {
  const user = await AdminRepo.getUserById(userId);
  
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  // Format user details
  return {
    id: user.id,
    handle: user.handle,
    email: user.email,
    phone: user.phone,
    role: user.role_primary,
    status: user.status,
    created_at: user.created_at,
    updated_at: user.updated_at,
    profile: {
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      bio: user.bio,
      gender: user.gender,
      year_of_birth: user.year_of_birth
    },
    expert_profile: user.specialties ? {
      specialties: user.specialties,
      price_per_session: user.price_per_session,
      rating_avg: user.rating_avg,
      kyc_status: user.kyc_status
    } : null,
    listener_profile: user.listener_intro ? {
      intro: user.listener_intro,
      verified: user.listener_verified
    } : null,
    wallet_balance: user.wallet_balance ? parseFloat(user.wallet_balance) : 0
  };
}

export async function suspendUser(userId, reason, adminId) {
  // Check if user exists
  const user = await AdminRepo.getUserById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  // Update user status
  const updatedUser = await AdminRepo.updateUserStatus(userId, "SUSPENDED", adminId);
  
  // Log the suspension with reason
  await AuditRepo.logAction({
    userId: adminId,
    action: "USER_SUSPENDED",
    resource: "USER",
    resourceId: userId,
    meta: { reason, previous_status: user.status }
  });

  return updatedUser;
}

export async function activateUser(userId, adminId) {
  // Check if user exists
  const user = await AdminRepo.getUserById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  // Update user status
  const updatedUser = await AdminRepo.updateUserStatus(userId, "ACTIVE", adminId);
  
  // Log the activation
  await AuditRepo.logAction({
    userId: adminId,
    action: "USER_ACTIVATED",
    resource: "USER",
    resourceId: userId,
    meta: { previous_status: user.status }
  });

  return updatedUser;
}

// Content moderation
export async function getReportedContent(filters = {}) {
  const { limit = 50, offset = 0, status, targetType } = filters;
  
  const reports = await AdminRepo.getReportedContent({ limit, offset, status, targetType });
  
  // Format reports for response
  return reports.map(report => ({
    id: report.id,
    target_type: report.target_type,
    target_id: report.target_id,
    reason: report.reason,
    details: report.details,
    created_at: report.created_at,
    reporter: {
      id: report.reporter_id,
      handle: report.reporter_handle,
      display_name: report.reporter_name
    },
    content: report.target_type === 'POST' ? {
      title: report.post_title,
      content: report.post_content
    } : report.target_type === 'COMMENT' ? {
      content: report.comment_content
    } : report.target_type === 'USER' ? {
      handle: report.reported_user_handle
    } : null
  }));
}

export async function hideContent(targetType, targetId, reason, adminId) {
  // Create moderation action
  const action = await AdminRepo.createModerationAction({
    adminId,
    targetType,
    targetId,
    action: "HIDE",
    reason
  });

  // Actually hide the content based on type
  if (targetType === "POST") {
    await PostsRepo.updatePost(targetId, { privacy: "ONLY_ME" });
  } else if (targetType === "COMMENT") {
    await CommentsRepo.deleteComment(targetId);
  }

  return action;
}

export async function deleteContent(targetType, targetId, reason, adminId) {
  // Create moderation action
  const action = await AdminRepo.createModerationAction({
    adminId,
    targetType,
    targetId,
    action: "DELETE",
    reason
  });

  // Actually delete the content based on type
  if (targetType === "POST") {
    await PostsRepo.deletePost(targetId);
  } else if (targetType === "COMMENT") {
    await CommentsRepo.deleteComment(targetId);
  }

  return action;
}

export async function banUser(userId, reason, adminId) {
  // Create moderation action
  const action = await AdminRepo.createModerationAction({
    adminId,
    targetType: "USER",
    targetId: userId,
    action: "BAN",
    reason
  });

  // Update user status
  await AdminRepo.updateUserStatus(userId, "SUSPENDED", adminId);

  return action;
}

// Analytics
export async function getDashboardData() {
  const stats = await AdminRepo.getDashboardStats();
  
  return {
    users: {
      active_count: parseInt(stats.active_users),
      new_today: parseInt(stats.new_users_today)
    },
    bookings: {
      today: parseInt(stats.bookings_today),
      week: parseInt(stats.bookings_week)
    },
    content: {
      posts_today: parseInt(stats.posts_today)
    },
    moderation: {
      reports_today: parseInt(stats.reports_today)
    },
    revenue: {
      today: parseFloat(stats.revenue_today),
      transactions_today: parseInt(stats.payments_today)
    }
  };
}

export async function getBookingAnalytics({ days = 30 } = {}) {
  const stats = await AdminRepo.getBookingStats({ days });
  
  return stats.map(stat => ({
    date: stat.date,
    total_bookings: parseInt(stat.total_bookings),
    confirmed_bookings: parseInt(stat.confirmed_bookings),
    cancelled_bookings: parseInt(stat.cancelled_bookings),
    completed_bookings: parseInt(stat.completed_bookings)
  }));
}

export async function getRevenueAnalytics({ days = 30 } = {}) {
  const stats = await AdminRepo.getRevenueStats({ days });
  
  return stats.map(stat => ({
    date: stat.date,
    transaction_count: parseInt(stat.transaction_count),
    total_revenue: parseFloat(stat.total_revenue)
  }));
}

// Expert management services
export async function getExpertsList({ limit, offset, status, kycStatus }) {
  const { query } = await import("../config/db.js");
  
  let whereClause = "WHERE u.role_primary = 'EXPERT'";
  const queryParams = [];
  let paramIndex = 1;
  
  if (status) {
    whereClause += ` AND u.status = $${paramIndex++}`;
    queryParams.push(status);
  }
  
  if (kycStatus) {
    whereClause += ` AND ep.kyc_status = $${paramIndex++}`;
    queryParams.push(kycStatus);
  }
  
  const { rows } = await query(
    `SELECT u.id, u.handle, u.status, u.created_at,
            up.display_name, up.avatar_url,
            ep.specialties, ep.price_per_session, ep.rating_avg, ep.kyc_status, ep.intro
     FROM app.users u
     LEFT JOIN app.user_profiles up ON up.user_id = u.id
     LEFT JOIN app.expert_profiles ep ON ep.user_id = u.id
     ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...queryParams, limit, offset]
  );
  
  return rows;
}

export async function approveExpertKYC(expertId, notes, adminId) {
  const { query } = await import("../config/db.js");
  
  const { rows } = await query(
    `UPDATE app.expert_profiles
       SET kyc_status = 'VERIFIED', updated_at = now()
     WHERE user_id = $1
     RETURNING id, user_id, kyc_status`,
    [expertId]
  );
  
  // Log the action
  await AuditRepo.logAction({
    userId: adminId,
    action: "EXPERT_KYC_APPROVED",
    resource: "EXPERT",
    resourceId: expertId,
    meta: { notes }
  });
  
  return rows[0];
}

export async function rejectExpertKYC(expertId, reason, notes, adminId) {
  const { query } = await import("../config/db.js");
  
  const { rows } = await query(
    `UPDATE app.expert_profiles
       SET kyc_status = 'REJECTED', updated_at = now()
     WHERE user_id = $1
     RETURNING id, user_id, kyc_status`,
    [expertId]
  );
  
  // Log the action
  await AuditRepo.logAction({
    userId: adminId,
    action: "EXPERT_KYC_REJECTED",
    resource: "EXPERT",
    resourceId: expertId,
    meta: { reason, notes }
  });
  
  return rows[0];
}

// Booking management services
export async function getAllBookingsList({ limit, offset, status, expertId, userId, dateFrom, dateTo }) {
  const { query } = await import("../config/db.js");
  
  let whereClause = "WHERE 1=1";
  const queryParams = [];
  let paramIndex = 1;
  
  if (status) {
    whereClause += ` AND b.status = $${paramIndex++}`;
    queryParams.push(status);
  }
  
  if (expertId) {
    whereClause += ` AND b.expert_id = $${paramIndex++}`;
    queryParams.push(expertId);
  }
  
  if (userId) {
    whereClause += ` AND b.user_id = $${paramIndex++}`;
    queryParams.push(userId);
  }
  
  if (dateFrom) {
    whereClause += ` AND b.start_at >= $${paramIndex++}`;
    queryParams.push(dateFrom);
  }
  
  if (dateTo) {
    whereClause += ` AND b.start_at <= $${paramIndex++}`;
    queryParams.push(dateTo);
  }
  
  const { rows } = await query(
    `SELECT b.*,
            seeker.display_name as seeker_name,
            expert.display_name as expert_name,
            expert.price_per_session
     FROM app.bookings b
     LEFT JOIN app.user_profiles seeker ON seeker.user_id = b.user_id
     LEFT JOIN app.user_profiles expert ON expert.user_id = b.expert_id
     ${whereClause}
     ORDER BY b.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...queryParams, limit, offset]
  );
  
  return rows;
}

export async function updateBookingStatus(bookingId, status, reason, adminId) {
  const { query } = await import("../config/db.js");
  
  const { rows } = await query(
    `UPDATE app.bookings
       SET status = $1, updated_at = now()
     WHERE id = $2
     RETURNING id, user_id, expert_id, status, start_at, end_at`,
    [status, bookingId]
  );
  
  // Log the action
  await AuditRepo.logAction({
    userId: adminId,
    action: "BOOKING_STATUS_UPDATED",
    resource: "BOOKING",
    resourceId: bookingId,
    meta: { status, reason }
  });
  
  return rows[0];
}

// System settings services
export async function getSystemSettings() {
  const { query } = await import("../config/db.js");
  
  // For now, return some basic system info
  // In a real implementation, you might have a separate settings table
  const { rows: userStats } = await query(
    `SELECT
       COUNT(*) as total_users,
       COUNT(CASE WHEN role_primary = 'EXPERT' THEN 1 END) as total_experts,
       COUNT(CASE WHEN role_primary = 'LISTENER' THEN 1 END) as total_listeners,
       COUNT(CASE WHEN role_primary = 'SEEKER' THEN 1 END) as total_seekers,
       COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_users,
       COUNT(CASE WHEN status = 'SUSPENDED' THEN 1 END) as suspended_users
     FROM app.users`
  );
  
  const { rows: bookingStats } = await query(
    `SELECT
       COUNT(*) as total_bookings,
       COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_bookings,
       COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) as confirmed_bookings,
       COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_bookings,
       COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_bookings,
       COALESCE(SUM(price), 0) as total_revenue
     FROM app.bookings`
  );
  
  const { rows: expertStats } = await query(
    `SELECT
       COUNT(*) as total_experts,
       COUNT(CASE WHEN kyc_status = 'VERIFIED' THEN 1 END) as verified_experts,
       COUNT(CASE WHEN kyc_status = 'PENDING' THEN 1 END) as pending_experts,
       COUNT(CASE WHEN kyc_status = 'REJECTED' THEN 1 END) as rejected_experts,
       COALESCE(AVG(price_per_session), 0) as avg_price_per_session
     FROM app.expert_profiles`
  );
  
  return {
    users: userStats[0],
    bookings: bookingStats[0],
    experts: expertStats[0],
    system: {
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime()
    }
  };
}

export async function updateSystemSettings(settings, adminId) {
  // For now, this is a placeholder
  // In a real implementation, you would update a settings table
  // For demonstration, we'll just log the action
  
  // Log the action
  await AuditRepo.logAction({
    userId: adminId,
    action: "SYSTEM_SETTINGS_UPDATED",
    meta: { settings }
  });
  
  return { updated: true, settings };
}