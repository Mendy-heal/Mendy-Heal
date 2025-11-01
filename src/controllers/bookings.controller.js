// controllers/bookings.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { created, success, paginated, failure, notFound, forbidden } from "../utils/response.js";
import * as BookingsService from "../services/bookings.service.js";
import { bookWithPayment, getBookingWithPayment, cancelBookingWithPayment } from "../services/bookingPayment.service.js";
import { query } from "../config/db.js";

export const book = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const { expert_id, start_at, end_at, channel, payment_method = "MOMO" } = req.body;
  
  try {
    // Check if payment integration is requested
    if (req.body.initiate_payment !== false) {
      // Use integrated booking and payment flow
      const out = await bookWithPayment({
        me,
        expertId: Number(expert_id),
        startAt: start_at,
        endAt: end_at,
        channel,
        paymentMethod: payment_method
      });
      return created(res, "Booking created and payment initiated", out);
    } else {
      // Use legacy booking flow
      const out = await BookingsService.book({
        me,
        expertId: Number(expert_id),
        startAt: start_at,
        endAt: end_at,
        channel
      });
      return created(res, "Booking created successfully", out);
    }
  } catch (error) {
    // Handle specific booking conflicts
    if (error.code === "TIME_CONFLICT" ||
        (error.message && error.message.includes('conflicting key value violates exclusion constraint "no_overlap_per_expert"'))) {
      return failure(res, "Expert already has a booking during this time slot. Please select a different time.", {
        code: "TIME_CONFLICT",
        suggestion: "Try selecting a different time slot or check the expert's availability"
      });
    }
    throw error;
  }
});

export const listMine = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const { as } = req.query; // seeker|expert
  console.log(`[DEBUG] listMine controller - User ID: ${me}, Role: ${req.user.role}, Query as: ${as}`);
  const rows = await BookingsService.listMine({ me, as });
  console.log(`[DEBUG] listMine controller - Returning ${rows.length} rows`);
  return success(res, `Bookings retrieved successfully for ${as || 'all roles'}`, { bookings: rows });
});

export const confirm = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const { id } = req.params;
  console.log(`[DEBUG] confirm controller - User ID: ${me}, Role: ${req.user.role}, Booking ID: ${id}`);
  const bk = await BookingsService.confirm({ me, id: Number(id) });
  console.log(`[DEBUG] confirm controller - Result:`, bk);
  return success(res, "Booking confirmed successfully", { booking: bk });
});

export const cancel = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const { id } = req.params;
  const { reason } = req.body;
  
  try {
    const result = await cancelBookingWithPayment(Number(id), Number(me), reason);
    return success(res, "Booking cancelled successfully", { booking: result });
  } catch (error) {
    if (error.status === 404) {
      return notFound(res, error.message);
    } else if (error.status === 403) {
      return forbidden(res, error.message);
    } else if (error.status === 400) {
      return failure(res, error.message);
    }
    throw error;
  }
});

// Get booking details with payment information
export const getBookingDetails = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const { id } = req.params;
  
  try {
    const result = await getBookingWithPayment(Number(id), Number(me));
    return success(res, "Booking details retrieved successfully", result);
  } catch (error) {
    if (error.status === 404) {
      return notFound(res, error.message);
    } else if (error.status === 403) {
      return forbidden(res, error.message);
    }
    throw error;
  }
});

export const complete = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const { id } = req.params;
  
  try {
    const booking = await BookingsService.complete({ me, id: Number(id) });
    return success(res, "Booking completed successfully", { booking });
  } catch (error) {
    if (error.status === 404) {
      return notFound(res, error.message);
    } else if (error.status === 403) {
      return forbidden(res, error.message);
    } else if (error.status === 400) {
      return failure(res, error.message);
    }
    throw error;
  }
});

// Admin endpoint to auto-complete expired bookings
export const autoCompleteBookings = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return forbidden(res, "Admin access required");
  }
  
  const completedBookings = await BookingsService.autoCompleteExpiredBookings();
  return success(res, "Auto-completed expired bookings", {
    count: completedBookings.length,
    bookings: completedBookings
  });
});

// Debug endpoint to check all bookings in database
export const debugAllBookings = asyncHandler(async (req, res) => {
  const { rows } = await query(`SELECT id, user_id, expert_id, status, start_at, end_at FROM app.bookings ORDER BY id LIMIT 20`);
  return success(res, "Debug: All bookings retrieved", { bookings: rows });
});
