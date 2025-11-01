import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import { requestOtp, confirmOtp } from "../controllers/email.controller.js";
import rateLimit from "express-rate-limit";

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 phút
  max: 3, // 3 lần / 10 phút
  message: { error: "Too many OTP requests, try again later" },
});
const r = Router();
r.post("/request-otp", auth, otpLimiter, requestOtp);
r.post("/confirm-otp", auth, confirmOtp);
export default r;
