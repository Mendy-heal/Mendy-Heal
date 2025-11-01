import { asyncHandler } from "../utils/asyncHandler.js";
import { success, failure } from "../utils/response.js";
import * as EmailService from "../services/email.service.js";

export const requestOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return failure(res, "Email required");
  await EmailService.createAndSendOtp(req.user.id, email);
  return success(res, "OTP sent successfully");
});

export const confirmOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return failure(res, "Email & OTP required");
  const r = await EmailService.verifyOtp(req.user.id, email, otp);
  return success(res, "OTP verified successfully", r);
});
