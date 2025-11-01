// src/controllers/payments.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiStatus } from "../utils/response.js";
import { query } from "../config/db.js";
import { signIpnVerify } from "../config/momo.js";
import * as PaymentsRepo from "../repositories/payments.repo.js";
import * as BookingsRepo from "../repositories/bookings.repo.js";
import * as AuditRepo from "../repositories/audit.repo.js";

/**
 * MoMo IPN webhook: xác thực HMAC, xử lý idempotent, transaction-safe.
 * Endpoint: POST /api/payments/momo/ipn
 */
export const momoIpn = asyncHandler(async (req, res) => {
  const payload = req.body;
  const { orderId, transId, resultCode } = payload;

  // 1️⃣ Verify chữ ký
  const computedSig = signIpnVerify(payload);
  if (computedSig !== payload.signature) {
    await PaymentsRepo.markIntentFailed({
      orderId,
      raw: JSON.stringify({ ipn: payload, reason: "bad_signature" })
    });

    // luôn trả 200 để MoMo không retry
    return apiStatus(res, false, "Invalid signature", { ok: false });
  }

  await query("BEGIN");
  try {
    // 2️⃣ Idempotency check
    const { rows: existed } = await query(
      `INSERT INTO app.processed_events (idempotency_key)
       VALUES ($1)
       ON CONFLICT DO NOTHING
       RETURNING 1`,
      [orderId]
    );
    if (!existed[0]) {
      await query("ROLLBACK");
      return apiStatus(res, true, "Already processed", { ok: true });
    }

    // 3️⃣ Lấy intent
    const intent = await PaymentsRepo.getIntentByOrderId(orderId);
    if (!intent) throw new Error("Intent not found");

    if (Number(resultCode) === 0) {
      // ✅ Thanh toán thành công
      const updated = await PaymentsRepo.markIntentSucceeded({
        orderId,
        transId,
        raw: JSON.stringify({ ipn: payload })
      });

      if (updated?.booking_id) {
        // Xác nhận booking & tạo chat thread trong transaction
        await PaymentsRepo.confirmBooking(updated.booking_id);
        const bk = await BookingsRepo.getBookingById(updated.booking_id);
        await BookingsRepo.createThreadForBooking({
          bookingId: bk.id,
          seekerId: bk.user_id,
          expertId: bk.expert_id
        });

        await AuditRepo.logAction({
          userId: bk.user_id,
          action: "BOOKING_PAID",
          meta: { booking_id: bk.id, price: bk.price, orderId, transId }
        });
      }

      await query("COMMIT");
      return apiStatus(res, true, "Payment success", { ok: true });
    }

    // ❌ Thanh toán thất bại
    await PaymentsRepo.markIntentFailed({
      orderId,
      raw: { ipn: payload, reason: payload.message || "Payment failed" }
    });

    await query("COMMIT");
    return apiStatus(res, false, "Payment failed", { ok: false });
  } catch (err) {
    await query("ROLLBACK");
    console.error("❌ MoMo IPN Error:", err);
    // luôn trả 200 để không retry vô hạn
    return apiStatus(res, false, err.message, { ok: false });
  }
});
