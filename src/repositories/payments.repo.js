// src/repositories/payments.repo.js
import { query } from "../config/db.js";

export async function createIntent({ bookingId, userId, amount, provider, orderId, requestId, extra }, client = null) {
  if (client) {
    // Use client for transaction
    const { rows } = await client.query(
      `INSERT INTO app.payment_intents
         (booking_id, user_id, provider, amount, currency, status, provider_ref, metadata, created_at)
       VALUES ($1,$2,$3,$4,'VND','REQUIRES_ACTION',$5,$6, now())
       RETURNING id`,
      [bookingId, userId, provider, amount, orderId, extra ?? {}]
    );
    return rows[0];
  } else {
    // Use pool for regular queries
    const { rows } = await query(
      `INSERT INTO app.payment_intents
         (booking_id, user_id, provider, amount, currency, status, provider_ref, metadata, created_at)
       VALUES ($1,$2,$3,$4,'VND','REQUIRES_ACTION',$5,$6, now())
       RETURNING id`,
      [bookingId, userId, provider, amount, orderId, extra ?? {}]
    );
    return rows[0];
  }
}

export async function markIntentSucceeded({ orderId, transId, raw }) {
  const { rows } = await query(
    `UPDATE app.payment_intents
        SET status = 'PAID',
            provider_tx = $2,
            updated_at = now(),
            metadata = COALESCE(metadata,'{}'::jsonb) || $3::jsonb
      WHERE provider_ref = $1
        AND status <> 'PAID'
      RETURNING id, booking_id, status`,
    [orderId, String(transId ?? ""), raw]
  );
  return rows[0];
}


export async function markIntentFailed({ orderId, raw }) {
  await query(
  `UPDATE app.payment_intents
      SET status='FAILED',
          updated_at=now(),
          metadata = COALESCE(metadata,'{}'::jsonb) || $2::jsonb
    WHERE provider_ref=$1`,
  [orderId, JSON.stringify(raw ?? {})]
);

}

export async function getIntentByOrderId(orderId) {
  const { rows } = await query(
    `SELECT id, booking_id, user_id, status FROM app.payment_intents WHERE provider_ref=$1`,
    [orderId]
  );
  return rows[0];
}

// Get payment intent by booking ID
export async function getIntentByBookingId(bookingId) {
  const { rows } = await query(
    `SELECT id, booking_id, user_id, provider, amount, status, provider_ref, metadata FROM app.payment_intents WHERE booking_id=$1 ORDER BY created_at DESC LIMIT 1`,
    [bookingId]
  );
  return rows[0];
}

export async function confirmBooking(bookingId) {
  await query(
    `UPDATE app.bookings SET status='CONFIRMED' WHERE id=$1 AND status IN ('PENDING','CONFIRMED')`,
    [bookingId]
  );
}

// Update payment status by booking ID
export async function updatePaymentStatusByBookingId(bookingId, status) {
  const { rows } = await query(
    `UPDATE app.payment_intents
        SET status = $2
      WHERE booking_id = $1
      RETURNING id, booking_id, user_id, status`,
    [bookingId, status]
  );
  return rows[0];
}

// Update payment status by order ID
export async function updatePaymentStatusByOrderId(orderId, status) {
  const { rows } = await query(
    `UPDATE app.payment_intents
        SET status = $2
      WHERE provider_ref = $1
      RETURNING id, booking_id, user_id, status`,
    [orderId, status]
  );
  return rows[0];
}
