// repositories/processedEvents.repo.js
import { query } from "../config/db.js";

export async function isProcessed(orderId) {
  const { rows } = await query(
    `SELECT 1 FROM app.processed_events WHERE idempotency_key = $1`,
    [orderId]
  );
  return rows.length > 0;
}

export async function markProcessed(orderId) {
  await query(
    `INSERT INTO app.processed_events (idempotency_key, occurred_at) VALUES ($1, now())
     ON CONFLICT (idempotency_key) DO NOTHING`,
    [orderId]
  );
}