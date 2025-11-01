// src/utils/rateLimiter.js - Centralized rate limiting configuration
import rateLimit from "express-rate-limit";

export const createRateLimiter = (options = {}) => {
    const defaultOptions = {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: { error: "Too many requests from this IP, please try again later" },
        standardHeaders: true,
        legacyHeaders: false,
        ...options
    };

    return rateLimit(defaultOptions);
};

// Pre-configured rate limiters for different endpoints
export const rateLimiters = {
    // Auth endpoints - more restrictive
    auth: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 login attempts per 15 minutes
        message: { error: "Too many authentication attempts, please try again later" }
    }),

    // Email OTP - very restrictive
    emailOtp: createRateLimiter({
        windowMs: 10 * 60 * 1000, // 10 minutes
        max: 3, // 3 OTP requests per 10 minutes
        message: { error: "Too many OTP requests, try again later" }
    }),

    // Booking creation - restrictive
    booking: createRateLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10, // 10 booking attempts per hour
        message: { error: "Too many booking attempts, please try again later" }
    }),

    // Message sending - moderate
    message: createRateLimiter({
        windowMs: 60 * 1000, // 1 minute
        max: 20, // 20 messages per minute
        message: { error: "Too many messages, please slow down" }
    }),

    // Post creation - moderate
    post: createRateLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 20, // 20 posts per hour
        message: { error: "Too many posts, please slow down" }
    }),

    // Comment creation - moderate
    comment: createRateLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 40, // 40 comments per hour
        message: { error: "Too many comments, please slow down" }
    }),

    // Follow actions - moderate
    follow: createRateLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 30, // 30 follow/unfollow actions per hour
        message: { error: "Too many follow actions, please slow down" }
    }),

    // Payment creation - restrictive
    payment: createRateLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10, // 10 payment attempts per hour
        message: { error: "Too many payment attempts, please try again later" }
    }),

    // Profile updates - moderate
    profile: createRateLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 15, // 15 profile updates per hour
        message: { error: "Too many profile updates, please slow down" }
    }),

    // General API - less restrictive
    api: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 200, // 200 requests per 15 minutes
        message: { error: "Too many API requests, please try again later" }
    })
};

// Apply rate limiter based on user role
export const createRoleBasedRateLimiter = (options = {}) => {
    const defaultOptions = {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // default limit
        message: { error: "Too many requests from this IP, please try again later" },
        ...options
    };

    return rateLimit({
        ...defaultOptions,
        skip: (req) => {
            // Skip rate limiting for certain user roles if needed
            if (req.user && req.user.role === 'ADMIN') {
                return true;
            }
            return false;
        }
    });
};