// services/bookingPayment.service.js
import * as Bookings from "../repositories/bookings.repo.js";
import * as Payments from "../repositories/payments.repo.js";
import * as Chats from "../repositories/chat.repo.js";
import * as ProcessedEvents from "../repositories/processedEvents.repo.js";
import { getClient } from "../config/db.js";
import { EventEmitter } from "events";

// Utility functions for price calculation and time validation
function calculateBookingPrice(expertPricePerSession, startTime, endTime) {
  const durationInMs = endTime - startTime;
  const durationInMinutes = durationInMs / (1000 * 60);
  const durationInHours = durationInMinutes / 60;
  
  // Làm tròn đến 15 phút gần nhất
  const roundedHours = Math.ceil(durationInMinutes / 15) / 4;
  
  return Math.round(expertPricePerSession * roundedHours);
}

function validateBookingTime(startTime, endTime) {
  const now = new Date();
  const minStartTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 phút từ now
  const minDuration = 1 * 60 * 60 * 1000; // 1 giờ
  const maxDuration = 3 * 60 * 60 * 1000; // 3 giờ
  
  if (startTime < minStartTime) {
    throw Object.assign(new Error("Booking must be at least 15 minutes from now"), { status: 400, code: "INVALID_TIME" });
  }
  
  if (endTime <= startTime) {
    throw Object.assign(new Error("End time must be after start time"), { status: 400, code: "INVALID_TIME" });
  }
  
  const duration = endTime - startTime;
  if (duration < minDuration) {
    throw Object.assign(new Error("Booking duration must be at least 1 hour"), { status: 400, code: "INVALID_DURATION" });
  }
  
  if (duration > maxDuration) {
    throw Object.assign(new Error("Booking duration cannot exceed 3 hours"), { status: 400, code: "INVALID_DURATION" });
  }
  
  return true;
}

async function checkExpertAvailability(expertId, startTime, endTime) {
  // Check against expert_availabilities table
  const isAvailable = await Bookings.isWithinAvailability(expertId, startTime, endTime);
  
  if (!isAvailable) {
    throw Object.assign(new Error("Expert is not available during this time slot"), { status: 409, code: "EXPERT_UNAVAILABLE" });
  }
  
  // Check for existing bookings (database constraint handles this)
  const hasConflict = await Bookings.hasOverlap(expertId, startTime, endTime);
  
  if (hasConflict) {
    throw Object.assign(new Error("Expert already has a booking during this time"), { status: 409, code: "TIME_CONFLICT" });
  }
  
  return true;
}

// Booking State Machine
export class BookingStateMachine {
  static transitions = {
    'PENDING': ['CONFIRMED', 'CANCELLED', 'PAYMENT_FAILED'],
    'CONFIRMED': ['COMPLETED', 'CANCELLED'],
    'CANCELLED': [], // Terminal state
    'COMPLETED': [], // Terminal state
    'PAYMENT_FAILED': ['CANCELLED', 'PENDING'] // Can retry payment
  };
  
  static canTransition(from, to) {
    return this.transitions[from]?.includes(to) || false;
  }
  
  static async transition(bookingId, to, metadata = {}) {
    const booking = await Bookings.getBookingById(bookingId);
    
    if (!this.canTransition(booking.status, to)) {
      throw new Error(`Invalid transition from ${booking.status} to ${to}`);
    }
    
    // Update booking status
    return await Bookings.updateStatus({ id: bookingId, status: to });
  }
  
  // New method to complete a booking
  static async completeBooking(bookingId, userId) {
    const booking = await Bookings.getBookingById(bookingId);
    
    if (!booking) {
      throw Object.assign(new Error("Booking not found"), { status: 404 });
    }
    
    // Check if user has access to this booking
    if (![Number(booking.user_id), Number(booking.expert_id)].includes(Number(userId))) {
      throw Object.assign(new Error("Access denied"), { status: 403 });
    }
    
    // Check if booking can be completed
    if (booking.status !== "CONFIRMED") {
      throw Object.assign(new Error("Only confirmed bookings can be completed"), { status: 400 });
    }
    
    // Transition to COMPLETED
    return await this.transition(bookingId, 'COMPLETED');
  }
}

// Event Eitter for booking events
export class BookingEventEmitter extends EventEmitter {
  static _instance = null;
  
  static getInstance() {
    if (!BookingEventEmitter._instance) {
      BookingEventEmitter._instance = new BookingEventEmitter();
    }
    return BookingEventEmitter._instance;
  }
  
  async emitBookingCreated(booking) {
    this.emit('booking.created', booking);
    return this;
  }
  
  async emitPaymentCompleted(payment) {
    this.emit('payment.completed', payment);
    return this;
  }
  
  async emitPaymentFailed(payment) {
    this.emit('payment.failed', payment);
    return this;
  }
}

// Initialize event listeners
const eventEmitter = BookingEventEmitter.getInstance();

// Event handlers
eventEmitter.on('booking.created', async (booking) => {
  console.log(`Booking created: ${booking.id}, scheduling payment reminder`);
  // Schedule payment reminder if not paid within timeframe
  setTimeout(async () => {
    const updatedBooking = await Bookings.getBookingById(booking.id);
    if (updatedBooking.status === 'PENDING') {
      console.log(`Payment reminder for booking: ${booking.id}`);
      // Here you would send a notification to the user
    }
  }, 30 * 60 * 1000); // 30 minutes
});

eventEmitter.on('payment.completed', async (payment) => {
  console.log(`Payment completed for booking: ${payment.booking_id}`);
  await UnifiedBookingService.handlePaymentSuccess(payment);
});

eventEmitter.on('payment.failed', async (payment) => {
  console.log(`Payment failed for booking: ${payment.booking_id}`);
  await UnifiedBookingService.handlePaymentFailure(payment);
});

// Unified Booking Service
export class UnifiedBookingService {
  static async createAndPay({ userId, expertId, startAt, endAt, channel, paymentMethod }) {
    // Validate input parameters first (before transaction)
    if (!expertId) throw Object.assign(new Error("expert_id is required"), { status: 400, code: "MISSING_EXPERT_ID" });
    if (!startAt || !endAt) throw Object.assign(new Error("start_at and end_at are required"), { status: 400, code: "MISSING_TIME" });
    
    const ALLOWED_CHANNELS = new Set(["CHAT", "AUDIO", "VIDEO"]);
    channel = String(channel || "CHAT").toUpperCase();
    if (!ALLOWED_CHANNELS.has(channel)) throw Object.assign(new Error("channel must be CHAT/AUDIO/VIDEO"), { status: 400, code: "INVALID_CHANNEL" });
    if (Number(expertId) === Number(userId)) throw Object.assign(new Error("Cannot book yourself"), { status: 400, code: "SELF_BOOKING" });

    // Convert to Date objects
    const startTime = new Date(startAt);
    const endTime = new Date(endAt);
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) throw Object.assign(new Error("Invalid datetime"), { status: 400, code: "INVALID_DATETIME" });
    
    // Validate booking time
    validateBookingTime(startTime, endTime);
    
    // Check expert availability
    await checkExpertAvailability(expertId, startTime, endTime);
    
    // Get price from expert
    const expertPricePerSession = await Bookings.getExpertPrice(expertId);
    
    // Calculate total price based on duration
    const totalPrice = calculateBookingPrice(expertPricePerSession, startTime, endTime);
    
    // Use transaction for database operations only
    const client = await getClient();
    let booking;
    
    try {
      await client.query('BEGIN');
      
      // Create booking with PENDING status (compatible with database enum)
      booking = await Bookings.createBooking({
        userId,
        expertId,
        startAt: startTime,
        endAt: endTime,
        channel,
        price: totalPrice,
        status: 'PENDING'
      }, client);
      
      // Create payment intent (but don't call external API yet)
      let paymentIntent;
      if (paymentMethod === 'MOMO') {
        // Create payment intent in database first
        const now = Date.now();
        const orderId = `BK${booking.id}_${now}`;
        const requestId = `REQ_${now}_${userId}`;
        
        paymentIntent = await Payments.createIntent({
          bookingId: booking.id,
          userId,
          provider: "MOMO",
          amount: totalPrice,
          orderId,
          requestId,
          extra: { requestType: "captureWallet" }
        }, client);
      } else {
        throw Object.assign(new Error(`Payment method ${paymentMethod} not supported`), { status: 400, code: "UNSUPPORTED_PAYMENT_METHOD" });
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Handle specific database constraint violation for overlapping bookings
      if (error.message && error.message.includes('conflicting key value violates exclusion constraint "no_overlap_per_expert"')) {
        throw Object.assign(new Error("Expert already has a booking during this time slot"), {
          status: 409,
          code: "TIME_CONFLICT",
          message: "The expert is already booked during this time period. Please select a different time."
        });
      }
      
      throw error;
    } finally {
      // Release the client back to the pool
      client.release();
    }
    
    // Now call external API outside of transaction
    let payment;
    if (paymentMethod === 'MOMO') {
      const { createForBooking } = await import('./momo.service.js');
      payment = await createForBooking({ me: userId, bookingId: booking.id });
    }
    
    // Emit booking created event
    await eventEmitter.emitBookingCreated(booking);
    
    // Schedule payment expiry check (15 minutes)
    schedulePaymentExpiryCheck(booking.id, 15 * 60 * 1000);
    
    return {
      booking,
      payment,
      nextAction: 'COMPLETE_PAYMENT'
    };
  }
  
  static async handlePaymentSuccess(paymentIntent) {
    // Use transaction for atomic updates
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      // Update payment status
      await Payments.markIntentSucceeded({
        orderId: paymentIntent.orderId,
        transId: paymentIntent.transId,
        raw: paymentIntent.raw
      });
      
      // Update booking status using state machine
      await BookingStateMachine.transition(
        paymentIntent.booking_id,
        'CONFIRMED'
      );
      
      // Create chat thread
      const booking = await Bookings.getBookingById(paymentIntent.booking_id);
      await Bookings.createThreadForBooking({
        bookingId: booking.id,
        seekerId: booking.user_id,
        expertId: booking.expert_id
      });
      
      await client.query('COMMIT');
      
      // Cancel payment expiry job
      cancelPaymentExpiryCheck(paymentIntent.booking_id);
      
      // Schedule booking reminders
      scheduleBookingReminders(booking.id, booking.start_at);
      
      // Emit payment completed event
      await eventEmitter.emitPaymentCompleted(paymentIntent);
      
      return { success: true, bookingId: paymentIntent.booking_id };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  }
  
  static async handlePaymentFailure(paymentIntent) {
    // Update payment status
    await Payments.markIntentFailed({ 
      orderId: paymentIntent.orderId, 
      raw: paymentIntent.raw 
    });
    
    // Update booking status
    await BookingStateMachine.transition(
      paymentIntent.booking_id,
      'PAYMENT_FAILED'
    );
    
    // Schedule cleanup job to cancel booking if not paid within timeframe
    setTimeout(async () => {
      const booking = await Bookings.getBookingById(paymentIntent.booking_id);
      if (booking.status === 'PAYMENT_FAILED') {
        await BookingStateMachine.transition(booking.id, 'CANCELLED');
        console.log(`Booking ${booking.id} cancelled due to payment failure`);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    // Emit payment failed event
    await eventEmitter.emitPaymentFailed(paymentIntent);
    
    return { success: false, reason: 'Payment failed' };
  }
}

// Background job scheduler for payment expiry
const paymentExpiryJobs = new Map(); // Map<bookingId, timeoutId>

function schedulePaymentExpiryCheck(bookingId, delayMs) {
  // Clear existing job if any
  if (paymentExpiryJobs.has(bookingId)) {
    clearTimeout(paymentExpiryJobs.get(bookingId));
  }
  
  // Schedule new job
  const timeoutId = setTimeout(async () => {
    try {
      const booking = await Bookings.getBookingById(bookingId);
      if (booking && booking.status === 'PENDING') {
        // Update booking status to CANCELLED
        await BookingStateMachine.transition(bookingId, 'CANCELLED');
        
        // Update payment intent status to EXPIRED
        await Payments.updatePaymentStatusByBookingId(bookingId, 'EXPIRED');
        
        console.log(`Booking ${bookingId} cancelled due to payment expiry`);
        
        // Emit payment failed event
        await eventEmitter.emitPaymentFailed({
          booking_id: bookingId,
          reason: 'Payment expired'
        });
      }
    } catch (error) {
      console.error(`Error in payment expiry check for booking ${bookingId}:`, error);
    } finally {
      // Clean up job from map
      paymentExpiryJobs.delete(bookingId);
    }
  }, delayMs);
  
  // Store job reference
  paymentExpiryJobs.set(bookingId, timeoutId);
}

// Cancel payment expiry job (e.g., when payment is completed)
function cancelPaymentExpiryCheck(bookingId) {
  if (paymentExpiryJobs.has(bookingId)) {
    clearTimeout(paymentExpiryJobs.get(bookingId));
    paymentExpiryJobs.delete(bookingId);
    return true;
  }
  return false;
}

// Background job for checking expired bookings
export async function checkPaymentExpiry() {
  const expiredBookings = await Bookings.getExpiredPendingBookings();
  
  for (const booking of expiredBookings) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      // Update booking status
      await BookingStateMachine.transition(booking.id, 'CANCELLED');
      
      // Update payment intent status
      await Payments.updatePaymentStatusByBookingId(booking.id, 'EXPIRED');
      
      await client.query('COMMIT');
      
      // Cancel scheduled job if exists
      cancelPaymentExpiryCheck(booking.id);
      
      // Send notification to user
      // Here you would send a notification to the user
      console.log(`Booking ${booking.id} cancelled due to payment expiry`);
      
      // Emit payment failed event
      await eventEmitter.emitPaymentFailed({
        booking_id: booking.id,
        reason: 'Payment expired'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Failed to process expired booking ${booking.id}:`, error);
    } finally {
      // Release the client back to the pool
      client.release();
    }
  }
}

// Background job for sending booking reminders
export async function sendBookingReminders() {
  // Send reminders for bookings in next 24 hours
  const upcomingBookings = await Bookings.getUpcomingBookings(24 * 60 * 60 * 1000);
  
  for (const booking of upcomingBookings) {
    // Send reminder to seeker
    // Here you would send a notification to the user
    console.log(`Sending 24h reminder for booking ${booking.id} to seeker ${booking.user_id}`);
    
    // Send reminder to expert
    // Here you would send a notification to the expert
    console.log(`Sending 24h reminder for booking ${booking.id} to expert ${booking.expert_id}`);
  }
  
  // Send reminders for bookings in next 2 hours
  const soonBookings = await Bookings.getUpcomingBookings(2 * 60 * 60 * 1000);
  
  for (const booking of soonBookings) {
    // Send reminder to seeker
    // Here you would send a notification to the user
    console.log(`Sending 2h reminder for booking ${booking.id} to seeker ${booking.user_id}`);
    
    // Send reminder to expert
    // Here you would send a notification to the expert
    console.log(`Sending 2h reminder for booking ${booking.id} to expert ${booking.expert_id}`);
  }
}

// Schedule booking reminders
function scheduleBookingReminders(bookingId, startTime) {
  const now = new Date();
  const bookingTime = new Date(startTime);
  
  // Calculate time differences
  const timeUntil24h = bookingTime.getTime() - now.getTime() - (24 * 60 * 60 * 1000);
  const timeUntil2h = bookingTime.getTime() - now.getTime() - (2 * 60 * 60 * 1000);
  
  // Schedule 24h reminder if in the future
  if (timeUntil24h > 0) {
    setTimeout(async () => {
      const booking = await Bookings.getBookingById(bookingId);
      if (booking && booking.status === 'CONFIRMED') {
        console.log(`Sending 24h reminder for booking ${bookingId}`);
        // Here you would send a notification to the user
      }
    }, timeUntil24h);
  }
  
  // Schedule 2h reminder if in the future
  if (timeUntil2h > 0) {
    setTimeout(async () => {
      const booking = await Bookings.getBookingById(bookingId);
      if (booking && booking.status === 'CONFIRMED') {
        console.log(`Sending 2h reminder for booking ${bookingId}`);
        // Here you would send a notification to the user
      }
    }, timeUntil2h);
  }
}

// Enhanced booking service with payment integration
export async function bookWithPayment({ me, expertId, startAt, endAt, channel = "CHAT", paymentMethod = "MOMO" }) {
  // Use the enhanced UnifiedBookingService
  return await UnifiedBookingService.createAndPay({
    userId: Number(me),
    expertId: Number(expertId),
    startAt,
    endAt,
    channel,
    paymentMethod
  });
}

// Get booking with payment details
export async function getBookingWithPayment(bookingId, userId) {
  const booking = await Bookings.getBookingById(bookingId);
  
  if (!booking) {
    throw Object.assign(new Error("Booking not found"), { status: 404, code: "BOOKING_NOT_FOUND" });
  }
  
  // Check if user has access to this booking
  if (![Number(booking.user_id), Number(booking.expert_id)].includes(Number(userId))) {
    throw Object.assign(new Error("Access denied"), { status: 403, code: "ACCESS_DENIED" });
  }
  
  // Get payment intent if exists
  const paymentIntent = booking.status === 'PENDING' || booking.status === 'PAYMENT_FAILED'
    ? await Payments.getIntentByBookingId(bookingId)
    : null;
  
  return {
    booking,
    payment: paymentIntent ? {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      provider: paymentIntent.provider
    } : null
  };
}

// Cancel booking with payment refund if applicable
export async function cancelBookingWithPayment(bookingId, userId, reason) {
  const booking = await Bookings.getBookingById(bookingId);
  
  if (!booking) {
    throw Object.assign(new Error("Booking not found"), { status: 404, code: "BOOKING_NOT_FOUND" });
  }
  
  // Check if user has access to this booking
  if (![Number(booking.user_id), Number(booking.expert_id)].includes(Number(userId))) {
    throw Object.assign(new Error("Access denied"), { status: 403, code: "ACCESS_DENIED" });
  }
  
  // Check if booking can be cancelled
  if (['CANCELLED', 'COMPLETED'].includes(booking.status)) {
    throw Object.assign(new Error("Booking cannot be cancelled"), { status: 400, code: "INVALID_STATUS_TRANSITION" });
  }
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Update booking status
    await BookingStateMachine.transition(bookingId, 'CANCELLED');
    
    // Cancel payment expiry job if exists
    cancelPaymentExpiryCheck(bookingId);
    
    // If payment was made, initiate refund
    if (booking.status === 'CONFIRMED') {
      // Here you would initiate refund process
      console.log(`Initiating refund for booking ${bookingId}`);
    }
    
    // Update payment intent status if exists
    if (booking.status === 'PENDING') {
      await Payments.updatePaymentStatusByBookingId(bookingId, 'CANCELLED');
    }
    
    await client.query('COMMIT');
    
    // Emit booking cancelled event
    await eventEmitter.emitPaymentFailed({
      booking_id: bookingId,
      reason: reason || 'User cancelled'
    });
    
    return { success: true, bookingId, status: 'CANCELLED' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Enhanced momo service with better integration
export async function handleIpnWithIntegration(payload) {
  // Verify signature
  const { signIpnVerify } = await import("../config/momo.js");
  const serverSig = signIpnVerify(payload);
  
  if (serverSig !== payload.signature) {
    await Payments.markIntentFailed({ 
      orderId: payload.orderId, 
      raw: { ipn: payload, reason: "bad_signature" } 
    });
    return { ok: false, code: 403 };
  }

  // Check for idempotency
  const { processedEvents } = await import("../repositories/processedEvents.repo.js");
  const isProcessed = await processedEvents.isProcessed(payload.orderId);
  if (isProcessed) {
    return { ok: true, message: "Already processed" };
  }
  
  // Mark as processed
  await processedEvents.markProcessed(payload.orderId);

  const intent = await Payments.getIntentByOrderId(payload.orderId);
  if (!intent) return { ok: false, code: 404 };

  // Process payment result
  if (Number(payload.resultCode) === 0) {
    // Payment successful
    const updated = await Payments.markIntentSucceeded({
      orderId: payload.orderId,
      transId: payload.transId,
      raw: JSON.stringify({ ipn: payload })
    });

    if (updated && updated.booking_id) {
      // Handle payment success with unified service
      return await UnifiedBookingService.handlePaymentSuccess({
        booking_id: updated.booking_id,
        orderId: payload.orderId,
        transId: payload.transId,
        raw: JSON.stringify({ ipn: payload })
      });
    }
    return { ok: true };
  } else {
    // Payment failed
    const paymentIntent = {
      booking_id: intent.booking_id,
      orderId: payload.orderId,
      raw: { ipn: payload, resultCode: payload.resultCode }
    };
    
    return await UnifiedBookingService.handlePaymentFailure(paymentIntent);
  }
}

// Repository for processed events (for idempotency)
export const processedEvents = {
  async isProcessed(orderId) {
    const { query } = await import("../config/db.js");
    const { rows } = await query(
      `SELECT 1 FROM app.processed_events WHERE idempotency_key = $1`,
      [orderId]
    );
    return rows.length > 0;
  },
  
  async markProcessed(orderId) {
    const { query } = await import("../config/db.js");
    await query(
      `INSERT INTO app.processed_events (idempotency_key, occurred_at) VALUES ($1, now())
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [orderId]
    );
  }
};