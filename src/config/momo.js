// src/config/momo.js
import crypto from "crypto";
import fetch from "node-fetch";

const {
  MOMO_PARTNER_CODE,
  MOMO_ACCESS_KEY,
  MOMO_SECRET_KEY,
  MOMO_ENDPOINT_CREATE,
  MOMO_ENDPOINT_CONFIRM,
  MOMO_REDIRECT_URL,
  MOMO_IPN_URL,
} = process.env;

export function signCreatePayload(p) {
  // thứ tự a→z đúng tài liệu MoMo:
  // accessKey, amount, extraData, ipnUrl, orderId, orderInfo, partnerCode,
  // redirectUrl, requestId, requestType
  const raw =
    `accessKey=${MOMO_ACCESS_KEY}` +
    `&amount=${p.amount}` +
    `&extraData=${p.extraData}` +
    `&ipnUrl=${MOMO_IPN_URL}` +
    `&orderId=${p.orderId}` +
    `&orderInfo=${p.orderInfo}` +
    `&partnerCode=${MOMO_PARTNER_CODE}` +
    `&redirectUrl=${MOMO_REDIRECT_URL}` +
    `&requestId=${p.requestId}` +
    `&requestType=${p.requestType}`;
  return crypto.createHmac("sha256", MOMO_SECRET_KEY).update(raw).digest("hex");
}

export function signIpnVerify(q) {
  // xác minh chữ ký IPN/redirect theo tài liệu (a→z)
  const raw =
    `accessKey=${MOMO_ACCESS_KEY}` +
    `&amount=${q.amount}` +
    `&extraData=${q.extraData ?? ""}` +
    `&message=${q.message}` +
    `&orderId=${q.orderId}` +
    `&orderInfo=${q.orderInfo}` +
    `&orderType=${q.orderType}` +
    `&partnerCode=${q.partnerCode}` +
    `&payType=${q.payType}` +
    `&requestId=${q.requestId}` +
    `&responseTime=${q.responseTime}`;
  return crypto.createHmac("sha256", MOMO_SECRET_KEY).update(raw).digest("hex");
}

export async function momoCreate(body) {
  const res = await fetch(MOMO_ENDPOINT_CREATE, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return json; // { resultCode, payUrl, deeplink, qrCodeUrl, ... }
}

export async function momoConfirm(body) {
  const res = await fetch(MOMO_ENDPOINT_CONFIRM, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json();
}

export const momoEnv = {
  PARTNER_CODE: MOMO_PARTNER_CODE,
  ACCESS_KEY: MOMO_ACCESS_KEY,
  REDIRECT_URL: MOMO_REDIRECT_URL,
  IPN_URL: MOMO_IPN_URL,
};
