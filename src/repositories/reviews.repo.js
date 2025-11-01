// src/repositories/reviews.repo.js
import { query } from "../config/db.js";

export async function createReview({ userId, expertId, bookingId, rating, comment }) {
  const { rows } = await query(
    `INSERT INTO app.reviews (user_id, expert_id, booking_id, rating, comment, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, now(), now())
     RETURNING id, user_id, expert_id, booking_id, rating, comment, created_at, updated_at`,
    [userId, expertId, bookingId, rating, comment]
  );
  
  // Update expert rating average
  await updateExpertRating(expertId);
  
  return rows[0];
}

export async function getReviewById(reviewId) {
  const { rows } = await query(
    `SELECT r.id, r.user_id, r.expert_id, r.booking_id, r.rating, r.comment, r.created_at, r.updated_at,
            u.handle as user_handle, up.display_name as user_display_name, up.avatar_url as user_avatar,
            e.handle as expert_handle, ep.display_name as expert_display_name, ep.avatar_url as expert_avatar
     FROM app.reviews r
     JOIN app.users u ON r.user_id = u.id
     LEFT JOIN app.user_profiles up ON u.id = up.user_id
     JOIN app.users e ON r.expert_id = e.id
     LEFT JOIN app.expert_profiles ep ON r.expert_id = ep.user_id
     WHERE r.id = $1`,
    [reviewId]
  );
  return rows[0];
}

export async function getReviewsByExpertId(expertId, { limit = 20, offset = 0 } = {}) {
  const { rows } = await query(
    `SELECT r.id, r.user_id, r.expert_id, r.booking_id, r.rating, r.comment, r.created_at, r.updated_at,
            u.handle as user_handle, up.display_name as user_display_name, up.avatar_url as user_avatar,
            b.channel, b.start_at, b.end_at
     FROM app.reviews r
     JOIN app.users u ON r.user_id = u.id
     LEFT JOIN app.user_profiles up ON u.id = up.user_id
     LEFT JOIN app.bookings b ON r.booking_id = b.id
     WHERE r.expert_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [expertId, limit, offset]
  );
  return rows;
}

export async function getReviewsByUserId(userId, { limit = 20, offset = 0 } = {}) {
  const { rows } = await query(
    `SELECT r.id, r.user_id, r.expert_id, r.booking_id, r.rating, r.comment, r.created_at, r.updated_at,
            e.handle as expert_handle, ep.display_name as expert_display_name, ep.avatar_url as expert_avatar,
            b.channel, b.start_at, b.end_at
     FROM app.reviews r
     JOIN app.users e ON r.expert_id = e.id
     LEFT JOIN app.expert_profiles ep ON r.expert_id = ep.user_id
     LEFT JOIN app.bookings b ON r.booking_id = b.id
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return rows;
}

export async function updateReview(reviewId, { rating, comment }) {
  const updateFields = [];
  const values = [];
  let paramIndex = 1;
  
  if (rating !== undefined) {
    updateFields.push(`rating = $${paramIndex++}`);
    values.push(rating);
  }
  
  if (comment !== undefined) {
    updateFields.push(`comment = $${paramIndex++}`);
    values.push(comment);
  }
  
  if (updateFields.length === 0) {
    throw new Error("No fields to update");
  }
  
  values.push(reviewId);
  
  const { rows } = await query(
    `UPDATE app.reviews
     SET ${updateFields.join(', ')}, updated_at = now()
     WHERE id = $${paramIndex}
     RETURNING id, user_id, expert_id, booking_id, rating, comment, created_at, updated_at`,
    values
  );
  
  if (rows[0]) {
    // Update expert rating average
    await updateExpertRating(rows[0].expert_id);
  }
  
  return rows[0];
}

export async function deleteReview(reviewId) {
  const { rows } = await query(
    `DELETE FROM app.reviews 
     WHERE id = $1
     RETURNING id, user_id, expert_id, booking_id`,
    [reviewId]
  );
  
  if (rows[0]) {
    // Update expert rating average
    await updateExpertRating(rows[0].expert_id);
  }
  
  return rows[0];
}

export async function checkExistingReview(userId, expertId, bookingId) {
  const { rows } = await query(
    `SELECT id FROM app.reviews 
     WHERE user_id = $1 AND expert_id = $2 AND booking_id = $3
     LIMIT 1`,
    [userId, expertId, bookingId]
  );
  return rows[0];
}

export async function getExpertRatingSummary(expertId) {
  const { rows } = await query(
    `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
     FROM app.reviews 
     WHERE expert_id = $1`,
    [expertId]
  );
  return rows[0];
}

async function updateExpertRating(expertId) {
  const { rows } = await query(
    `UPDATE app.expert_profiles 
     SET rating_avg = (
       SELECT COALESCE(AVG(rating), 0) 
       FROM app.reviews 
       WHERE expert_id = $1
     )
     WHERE user_id = $1
     RETURNING rating_avg`,
    [expertId]
  );
  return rows[0];
}

export async function canReviewBooking(userId, bookingId) {
  const { rows } = await query(
    `SELECT b.id, b.expert_id, b.status, b.end_at,
            EXISTS(SELECT 1 FROM app.reviews r WHERE r.user_id = $1 AND r.booking_id = b.id) as has_reviewed
     FROM app.bookings b
     WHERE b.id = $2 AND b.user_id = $1`,
    [userId, bookingId]
  );
  
  if (!rows[0]) {
    return { canReview: false, reason: "Booking not found or access denied" };
  }
  
  const booking = rows[0];
  
  // Check if booking is completed
  if (booking.status !== 'COMPLETED') {
    return { canReview: false, reason: "Booking must be completed to review", booking };
  }
  
  // Check if already reviewed
  if (booking.has_reviewed) {
    return { canReview: false, reason: "Booking already reviewed" };
  }
  
  return {
    canReview: true,
    expertId: booking.expert_id,
    reason: "Booking can be reviewed"
  };
}

export async function getReviewStats() {
  const { rows } = await query(
    `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as overall_rating,
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) FILTER (WHERE rating >= 4) as positive_reviews,
        COUNT(*) FILTER (WHERE rating <= 2) as negative_reviews
     FROM app.reviews
     WHERE created_at >= NOW() - INTERVAL '12 months'
     GROUP BY DATE_TRUNC('month', created_at)
     ORDER BY month DESC
     LIMIT 12`
  );
  return rows;
}