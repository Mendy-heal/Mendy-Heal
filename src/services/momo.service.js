// src/services/momo.service.js
import { momoEnv, momoCreate, signCreatePayload, signIpnVerify } from "../config/momo.js";
import * as Payments from "../repositories/payments.repo.js";
import * as Bookings from "../repositories/bookings.repo.js"; // để lấy giá/validate

function base64Json(obj) { return Buffer.from(JSON.stringify(obj ?? {})).toString("base64"); }

export async function createForBooking({ me, bookingId }) {
  console.log("🔎 Debug momo.createForBooking", { me, bookingId });

  const bk = await Bookings.getBookingById(Number(bookingId));
  console.log("🔎 Booking loaded:", bk);
  if (!bk) { const e = new Error("Booking not found"); e.status = 404; throw e; }
  if (![Number(bk.user_id), Number(bk.expert_id)].includes(Number(me))) {
    const e = new Error("Forbidden");
    e.status = 403;
    throw e;
  }
  
  // Get existing payment intent
  const intent = await Payments.getIntentByBookingId(bookingId);
  if (!intent) {
    const e = new Error("Payment intent not found");
    e.status = 404;
    throw e;
  }
  
  // Khuyến nghị: yêu cầu booking đang ở PENDING; nếu code cũ auto-CONFIRMED, bạn vẫn có thể cho phép thanh toán tip/donation…
  const amount = Math.max(1000, Math.round(Number(bk.price || 0)));

  // Use existing orderId and requestId from payment intent
  const orderId = intent.provider_ref;
  const requestId = intent.metadata?.requestId || `REQ_${Date.now()}_${me}`;

  const extraData = base64Json({ booking_id: bk.id, user_id: me });

  // body tạo giao dịch
  const body = {
    partnerCode: momoEnv.PARTNER_CODE,
    requestType: "captureWallet",
    ipnUrl: momoEnv.IPN_URL,
    redirectUrl: momoEnv.REDIRECT_URL,
    orderId,
    amount: String(amount),
    orderInfo: `Booking #${bk.id} on Healing`,
    requestId,
    extraData,
    lang: "vi"
  };
  body.signature = signCreatePayload({
    amount: body.amount,
    extraData: body.extraData,
    ipnUrl: body.ipnUrl,
    orderId: body.orderId,
    orderInfo: body.orderInfo,
    requestId: body.requestId,
    requestType: body.requestType,
  });

  // Gọi MoMo
  const resp = await momoCreate({
    ...body,
    partnerCode: momoEnv.PARTNER_CODE,
  });

  // Trả về link/qr cho FE
  return {
    intent_id: intent.id,
    orderId,
    requestId,
    resultCode: resp.resultCode,
    message: resp.message,
    payUrl: resp.payUrl,
    deeplink: resp.deeplink,
    qrCodeUrl: resp.qrCodeUrl,
  };
}

// IPN handler
export async function handleIpn(payload) {
  // Xác thực chữ ký
  const serverSig = signIpnVerify(payload);
  if (serverSig !== payload.signature) {
    await Payments.markIntentFailed({ orderId: payload.orderId, raw: JSON.stringify ({ ipn: payload, reason: "bad_signature" }) });
    return { ok: false, code: 403 };
  }

  const intent = await Payments.getIntentByOrderId(payload.orderId);
  if (!intent) return { ok: false, code: 404 };

  if (Number(payload.resultCode) === 0) {
    const updated = await Payments.markIntentSucceeded({
      orderId: payload.orderId,
      transId: payload.transId,
      raw:JSON.stringify({ ipn: payload }) 
    });

    if (updated && updated.booking_id) {
      await Payments.confirmBooking(updated.booking_id);
      const bk = await Bookings.getBookingById(updated.booking_id);
      await Bookings.createThreadForBooking({
        bookingId: bk.id,
        seekerId: bk.user_id,
        expertId: bk.expert_id
      });
    }
    return { ok: true };
  }

}
