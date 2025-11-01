// src/tests/bookingPayment.test.js
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { calculateBookingPrice, validateBookingTime } from '../services/bookingPayment.service.js';

// Mock the database modules
jest.mock('../repositories/bookings.repo.js', () => ({
  getExpertPrice: jest.fn(),
  isWithinAvailability: jest.fn(),
  hasOverlap: jest.fn(),
  createBooking: jest.fn(),
  getBookingById: jest.fn(),
  updateStatus: jest.fn(),
  getExpiredPendingBookings: jest.fn(),
  getUpcomingBookings: jest.fn()
}));

jest.mock('../repositories/payments.repo.js', () => ({
  createIntent: jest.fn(),
  markIntentSucceeded: jest.fn(),
  markIntentFailed: jest.fn(),
  getIntentByOrderId: jest.fn(),
  updatePaymentStatusByBookingId: jest.fn()
}));

jest.mock('../config/db.js', () => ({
  getClient: jest.fn()
}));

describe('Booking Payment Service', () => {
  describe('calculateBookingPrice', () => {
    it('should calculate price correctly for 1 hour session', () => {
      const expertPricePerSession = 300000; // 300k VND per hour
      const startTime = new Date('2025-10-15T09:00:00Z');
      const endTime = new Date('2025-10-15T10:00:00Z');
      
      const price = calculateBookingPrice(expertPricePerSession, startTime, endTime);
      
      expect(price).toBe(300000);
    });
    
    it('should calculate price correctly for 1.5 hour session', () => {
      const expertPricePerSession = 300000; // 300k VND per hour
      const startTime = new Date('2025-10-15T09:00:00Z');
      const endTime = new Date('2025-10-15T10:30:00Z');
      
      const price = calculateBookingPrice(expertPricePerSession, startTime, endTime);
      
      expect(price).toBe(450000); // 1.5 hours * 300k
    });
    
    it('should round up to nearest 15 minutes', () => {
      const expertPricePerSession = 300000; // 300k VND per hour
      const startTime = new Date('2025-10-15T09:00:00Z');
      const endTime = new Date('2025-10-15T10:10:00Z'); // 1 hour 10 minutes
      
      const price = calculateBookingPrice(expertPricePerSession, startTime, endTime);
      
      expect(price).toBe(375000); // 1.25 hours (rounded up to 1h 15m) * 300k
    });
  });
  
  describe('validateBookingTime', () => {
    beforeEach(() => {
      // Mock current time
      jest.useFakeTimers().setSystemTime(new Date('2025-10-13T10:00:00Z'));
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });
    
    it('should validate a valid booking time', () => {
      const startTime = new Date('2025-10-13T10:30:00Z'); // 30 minutes from now
      const endTime = new Date('2025-10-13T11:30:00Z'); // 1 hour duration
      
      expect(() => validateBookingTime(startTime, endTime)).not.toThrow();
    });
    
    it('should throw error for booking too soon', () => {
      const startTime = new Date('2025-10-13T10:10:00Z'); // 10 minutes from now
      const endTime = new Date('2025-10-13T11:10:00Z'); // 1 hour duration
      
      expect(() => validateBookingTime(startTime, endTime)).toThrow(
        expect.objectContaining({
          message: 'Booking must be at least 15 minutes from now',
          status: 400,
          code: 'INVALID_TIME'
        })
      );
    });
    
    it('should throw error for end time before start time', () => {
      const startTime = new Date('2025-10-13T11:00:00Z');
      const endTime = new Date('2025-10-13T10:00:00Z'); // Before start time
      
      expect(() => validateBookingTime(startTime, endTime)).toThrow(
        expect.objectContaining({
          message: 'End time must be after start time',
          status: 400,
          code: 'INVALID_TIME'
        })
      );
    });
    
    it('should throw error for booking duration too short', () => {
      const startTime = new Date('2025-10-13T11:00:00Z');
      const endTime = new Date('2025-10-13T11:30:00Z'); // 30 minutes duration
      
      expect(() => validateBookingTime(startTime, endTime)).toThrow(
        expect.objectContaining({
          message: 'Booking duration must be at least 1 hour',
          status: 400,
          code: 'INVALID_DURATION'
        })
      );
    });
    
    it('should throw error for booking duration too long', () => {
      const startTime = new Date('2025-10-13T11:00:00Z');
      const endTime = new Date('2025-10-13T15:00:00Z'); // 4 hours duration
      
      expect(() => validateBookingTime(startTime, endTime)).toThrow(
        expect.objectContaining({
          message: 'Booking duration cannot exceed 3 hours',
          status: 400,
          code: 'INVALID_DURATION'
        })
      );
    });
    
    it('should validate exactly 1 hour booking', () => {
      const startTime = new Date('2025-10-13T11:00:00Z');
      const endTime = new Date('2025-10-13T12:00:00Z'); // 1 hour duration
      
      expect(() => validateBookingTime(startTime, endTime)).not.toThrow();
    });
  });
  
  describe('UnifiedBookingService', () => {
    const { UnifiedBookingService } = require('../services/bookingPayment.service.js');
    const mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    beforeEach(() => {
      jest.clearAllMocks();
      // Mock getClient to return our mock client
      const { getClient } = require('../config/db.js');
      getClient.mockResolvedValue(mockClient);
      
      // Mock transaction methods
      mockClient.query.mockImplementation((query) => {
        if (query === 'BEGIN') {
          return Promise.resolve();
        } else if (query === 'COMMIT') {
          return Promise.resolve();
        } else if (query === 'ROLLBACK') {
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [] });
      });
    });
    
    it('should create booking and initiate payment successfully', async () => {
      const { Bookings } = require('../repositories/bookings.repo.js');
      const { Payments } = require('../repositories/payments.repo.js');
      
      // Mock repository methods
      Bookings.getExpertPrice.mockResolvedValue(300000);
      Bookings.isWithinAvailability.mockResolvedValue(true);
      Bookings.hasOverlap.mockResolvedValue(false);
      Bookings.createBooking.mockResolvedValue({
        id: 123,
        user_id: 1,
        expert_id: 2,
        start_at: '2025-10-15T09:00:00Z',
        end_at: '2025-10-15T10:00:00Z',
        channel: 'VIDEO',
        price: 300000,
        status: 'PENDING_PAYMENT'
      });
      
      // Mock MoMo service
      const mockCreateForBooking = jest.fn().mockResolvedValue({
        intent_id: 456,
        orderId: 'BK123_1234567890',
        resultCode: 0,
        payUrl: 'https://test-payment.momo.vn/pay/123'
      });
      
      jest.doMock('../services/momo.service.js', () => ({
        createForBooking: mockCreateForBooking
      }), { virtual: true });
      
      const result = await UnifiedBookingService.createAndPay({
        userId: 1,
        expertId: 2,
        startAt: '2025-10-15T09:00:00Z',
        endAt: '2025-10-15T10:00:00Z',
        channel: 'VIDEO',
        paymentMethod: 'MOMO'
      });
      
      expect(result).toHaveProperty('booking');
      expect(result).toHaveProperty('payment');
      expect(result).toHaveProperty('nextAction', 'COMPLETE_PAYMENT');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
    
    it('should handle validation errors', async () => {
      const { Bookings } = require('../repositories/bookings.repo.js');
      
      // Mock repository methods
      Bookings.getExpertPrice.mockResolvedValue(300000);
      Bookings.isWithinAvailability.mockResolvedValue(false); // Expert not available
      
      await expect(UnifiedBookingService.createAndPay({
        userId: 1,
        expertId: 2,
        startAt: '2025-10-15T09:00:00Z',
        endAt: '2025-10-15T10:00:00Z',
        channel: 'VIDEO',
        paymentMethod: 'MOMO'
      })).rejects.toThrow(
        expect.objectContaining({
          message: 'Expert is not available during this time slot',
          status: 409,
          code: 'EXPERT_UNAVAILABLE'
        })
      );
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});