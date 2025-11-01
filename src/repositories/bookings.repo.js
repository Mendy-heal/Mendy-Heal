// repositories/bookings.repo.js
import { query } from "../config/db.js";

export async function getExpertPrice(expertId) {
  const { rows } = await query(
    `SELECT price_per_session
       FROM app.expert_profiles
      WHERE user_id = $1`,
    [expertId]
  );
  return rows[0]?.price_per_session ?? 0;
}

// If expert has availabilities -> require booking to fall inside at least one window.
// If expert has no row in expert_availabilities -> allow (MVP-friendly).
export async function isWithinAvailability(expertId, startAt, endAt) {
  const { rows: anyAvail } = await query(
    `SELECT 1 FROM app.expert_availabilities WHERE expert_id = $1 LIMIT 1`,
    [expertId]
  );
  if (!anyAvail[0]) return true; // no availability set -> allow

  const { rows } = await query(
    `SELECT 1
       FROM app.expert_availabilities
      WHERE expert_id = $1
        AND is_recurring = FALSE
        AND start_at <= $2 AND end_at >= $3
      LIMIT 1`,
    [expertId, startAt, endAt]
  );
  return !!rows[0];
}

// Check overlap with existing bookings of this expert (PENDING/CONFIRMED)
export async function hasOverlap(expertId, startAt, endAt) {
  const { rows } = await query(
    `SELECT 1
       FROM app.bookings b
      WHERE b.expert_id = $1
        AND b.status IN ('PENDING','CONFIRMED')
        AND NOT (b.end_at <= $2 OR b.start_at >= $3)
      LIMIT 1`,
    [expertId, startAt, endAt]
  );
  return !!rows[0];
}

export async function createBooking({ userId, expertId, startAt, endAt, channel, price, status = 'PENDING' }, client = null) {
  if (client) {
    // Use client for transaction
    const { rows } = await client.query(
      `INSERT INTO app.bookings (user_id, expert_id, start_at, end_at, channel, price, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now())
       RETURNING id, user_id, expert_id, start_at, end_at, channel, price, status, created_at`,
      [userId, expertId, startAt, endAt, channel, price, status]
    );
    return rows[0];
  } else {
    // Use pool for regular queries
    const { rows } = await query(
      `INSERT INTO app.bookings (user_id, expert_id, start_at, end_at, channel, price, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now())
       RETURNING id, user_id, expert_id, start_at, end_at, channel, price, status, created_at`,
      [userId, expertId, startAt, endAt, channel, price, status]
    );
    return rows[0];
  }
}


export async function getBookingById(id) {
  console.log(`[DEBUG] getBookingById repository - Querying for booking ID: ${id}`);
  const { rows } = await query(
    `SELECT id, user_id, expert_id, start_at, end_at, channel, price, status, created_at
       FROM app.bookings WHERE id = $1`,
    [id]
  );
  console.log(`[DEBUG] getBookingById repository - Query returned ${rows.length} rows`);
  if (rows.length > 0) {
    console.log(`[DEBUG] getBookingById repository - First row:`, rows[0]);
  } else {
    // Debug: Check if there are any bookings at all
    const { rows: allBookings } = await query(`SELECT id, status FROM app.bookings ORDER BY id LIMIT 10`);
    console.log(`[DEBUG] getBookingById repository - All bookings in DB (first 10):`, allBookings);
  }
  return rows[0];
}

export async function listMine({ me, as = 'seeker' }) {
  console.log(`[DEBUG] listMine repository called with me=${me}, as=${as}`);

  if (as === 'expert') {
    const { rows } = await query(
      `SELECT b.*, up.display_name as seeker_name
         FROM app.bookings b
         LEFT JOIN app.user_profiles up ON up.user_id = b.user_id
        WHERE b.expert_id = $1
        ORDER BY b.start_at DESC`,
      [me]
    );
    console.log(`[DEBUG] Expert query returned ${rows.length} rows`);
    return rows;
  } else {
    const { rows } = await query(
      `SELECT b.*, up.display_name as expert_name
         FROM app.bookings b
         LEFT JOIN app.user_profiles up ON up.user_id = b.expert_id
        WHERE b.user_id = $1
        ORDER BY b.start_at DESC`,
      [me]
    );
    console.log(`[DEBUG] Seeker query returned ${rows.length} rows`);
    return rows;
  }
}

export async function updateStatus({ id, status, byUser }) {
  // Fix status value to match database enum
  let fixedStatus = status;
  if (status === 'CANCELED') {
    fixedStatus = 'CANCELLED'; // Use correct enum value from app.booking_status
  }

  const { rows } = await query(
    `UPDATE app.bookings
        SET status = $2
      WHERE id = $1
      RETURNING id, user_id, expert_id, start_at, end_at, channel, price, status`,
    [id, fixedStatus]
  );
  return rows[0];
}

// Create a dedicated chat thread linked to booking_id (type = 'BOOKING')
export async function createThreadForBooking({ bookingId, seekerId, expertId }) {
  const { rows: t } = await query(
    `INSERT INTO app.chat_threads (type, booking_id, created_at, last_message_at)
     VALUES ('BOOKING', $1, now(), now())
     RETURNING id`,
    [bookingId]
  );
  const threadId = t[0].id;
  await query(
    `INSERT INTO app.chat_members (thread_id, user_id, role_in_thread, joined_at)
     VALUES ($1,$2,'PARTICIPANT', now()),
            ($1,$3,'PARTICIPANT', now())
     ON CONFLICT DO NOTHING`,
    [threadId, seekerId, expertId]
  );
  return { id: threadId };
}


// Kiểm tra seeker có booking hợp lệ với expert không
export async function hasActiveBooking(seekerId, expertId) {
  const { rows } = await query(
    `SELECT 1
       FROM app.bookings
      WHERE user_id = $1
        AND expert_id = $2
        AND status IN ('CONFIRMED', 'ONGOING')
        AND end_at > now()
      LIMIT 1`,
    [seekerId, expertId]
  );
  return !!rows[0];
}

// Get bookings with PENDING status that are older than 15 minutes
export async function getExpiredPendingBookings() {
  const { rows } = await query(
    `SELECT id, user_id, expert_id, status, created_at
       FROM app.bookings
      WHERE status = 'PENDING'
        AND created_at < now() - interval '15 minutes'`,
    []
  );
  return rows;
}

// Get upcoming bookings within specified time window
export async function getUpcomingBookings(timeWindowMs) {
  const { rows } = await query(
    `SELECT b.*, up.display_name as seeker_name, ep.display_name as expert_name
       FROM app.bookings b
       LEFT JOIN app.user_profiles up ON up.user_id = b.user_id
       LEFT JOIN app.user_profiles ep ON ep.user_id = b.expert_id
      WHERE b.status = 'CONFIRMED'
        AND b.start_at > now()
        AND b.start_at <= now() + $1 * interval '1 millisecond'
      ORDER BY b.start_at`,
    [timeWindowMs]
  );
  return rows;
}

// Update booking status with client for transaction support
export async function updateStatusWithClient({ id, status, client }) {
  // Fix status value to match database enum
  let fixedStatus = status;
  if (status === 'CANCELED') {
    fixedStatus = 'CANCELLED'; // Use correct enum value from app.booking_status
  }

  const { rows } = await client.query(
    `UPDATE app.bookings
        SET status = $2
      WHERE id = $1
      RETURNING id, user_id, expert_id, start_at, end_at, channel, price, status`,
    [id, fixedStatus]
  );
  return rows[0];
}

// Update expert profile (price and other info)
export async function updateExpertProfile({ userId, specialties, pricePerSession, intro }) {
  const { rows } = await query(
    `UPDATE app.expert_profiles
       SET specialties = $1, price_per_session = $2, intro = $3
     WHERE user_id = $4
     RETURNING id, user_id, specialties, price_per_session, intro, rating_avg, kyc_status`,
    [specialties, pricePerSession, intro, userId]
  );
  return rows[0];
}

// Get confirmed bookings that have passed their end time
export async function getExpiredConfirmedBookings() {
  const { rows } = await query(
    `SELECT id, user_id, expert_id, status, end_at
       FROM app.bookings
      WHERE status = 'CONFIRMED'
        AND end_at < now()`,
    []
  );
  return rows;
}
