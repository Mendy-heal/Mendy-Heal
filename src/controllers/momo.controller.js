// src/controllers/momo.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { created, apiStatus } from "../utils/response.js";
import * as MomoSvc from "../services/momo.service.js";
import { handleIpnWithIntegration } from "../services/bookingPayment.service.js";

export const createForBooking = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const { booking_id } = req.body;
  const out = await MomoSvc.createForBooking({ me, bookingId: Number(booking_id) });
  return created(res, "MoMo payment created successfully", out);
});

// IPN: MoMo gọi POST JSON tới endpoint này
export const ipn = asyncHandler(async (req, res) => {
  // Use enhanced IPN handler with better integration
  const result = await handleIpnWithIntegration(req.body);
  // theo thông lệ, trả 200 để MoMo không retry (tuỳ theo yêu cầu của MoMo)
  const statusCode = result.ok ? 200 : (result.code || 400);
  return apiStatus(res, result.ok, result.message || "IPN processed", { ok: result.ok }, statusCode);
});
