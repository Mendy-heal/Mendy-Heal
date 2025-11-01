// routes/bookings.routes.js
import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import rateLimit from "express-rate-limit";
import { book, listMine, confirm, cancel, complete, debugAllBookings, getBookingDetails, autoCompleteBookings } from "../controllers/bookings.controller.js";
import { requireRole } from "../middlewares/auth.js";

const createLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many booking attempts" }
});

const r = Router();
r.use(auth);

// Tạo booking (user mới book chuyên gia)
r.post("/", createLimiter, book);

// Danh sách booking của tôi (?as=seeker|expert)
r.get("/mine", listMine);

// Get booking details with payment information
r.get("/:id", getBookingDetails);

// Expert xác nhận lịch (MVP: optional)
r.patch("/:id/confirm", confirm);

// Hủy lịch (cả 2 phía)
r.patch("/:id/cancel", cancel);

// Hoàn thành lịch (cả 2 phía)
r.patch("/:id/complete", complete);

// Admin routes
r.post("/admin/auto-complete", requireRole("ADMIN"), autoCompleteBookings);

// Debug endpoint to check all bookings
r.get("/debug/all", debugAllBookings);

export default r;
