// src/routes/payments.routes.js
import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import rateLimit from "express-rate-limit";
import { createForBooking } from "../controllers/momo.controller.js";
import { momoIpn } from "../controllers/payments.controller.js"; // 👈 mới

const r = Router();
const createLimiter = rateLimit({ windowMs: 60_000, max: 10 });

r.post("/momo/create", auth, createLimiter, createForBooking);
// IPN không cần auth
r.post("/momo/ipn", momoIpn);

export default r;
