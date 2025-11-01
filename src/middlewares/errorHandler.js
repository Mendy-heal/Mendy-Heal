// src/middlewares/errorHandler.js - Centralized error handling middleware
import { v4 as uuidv4 } from 'uuid';

export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.timestamp = new Date().toISOString();
    this.requestId = uuidv4();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, next) => {
  const requestId = req.id || uuidv4();
  
  // Log error details
  console.error({
    requestId,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      isOperational: err.isOperational
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params,
      user: req.user
    },
    timestamp: new Date().toISOString()
  });

  // Default error
  let error = { ...err };
  error.message = err.message;
  error.requestId = requestId;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `Duplicate field value: ${field}. Please use another value.`;
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token. Please log in again.';
    error = new AppError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Your token has expired. Please log in again.';
    error = new AppError(message, 401);
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    const message = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    error = new AppError(message, 400);
  }

  // PostgreSQL constraint violation errors
  if (err.message && err.message.includes('conflicting key value violates exclusion constraint "no_overlap_per_expert"')) {
    const message = "Expert already has a booking during this time slot. Please select a different time.";
    error = new AppError(message, 409);
  }

  // PostgreSQL foreign key violation errors
  if (err.message && err.message.includes('violates foreign key constraint')) {
    const message = "Referenced resource not found or invalid.";
    error = new AppError(message, 400);
  }

  // PostgreSQL unique violation errors
  if (err.message && err.message.includes('violates unique constraint')) {
    const message = "Resource already exists or duplicate entry.";
    error = new AppError(message, 409);
  }

  // Send error response
  res.status(error.statusCode || 500).json({
    success: false,
    requestId,
    timestamp: error.timestamp,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err
    })
  });
};

// Async error handler wrapper
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 404 handler
export const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(error);
};

// Global error handler for unhandled promise rejections
export const handleUnhandledRejections = () => {
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥', err);
    // In a real application, you might want to gracefully shutdown the server
    process.exit(1);
  });
};

// Global error handler for uncaught exceptions
export const handleUncaughtExceptions = () => {
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥', err);
    // In a real application, you might want to gracefully shutdown the server
    process.exit(1);
  });
};

// Wrap async errors
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Create custom error types
export const createError = (message, statusCode = 500, details = {}) => {
  const error = new AppError(message, statusCode);
  Object.assign(error, details);
  return error;
};

// Validation error helper
export const ValidationError = (message, field) => {
  const error = new AppError(message, 400);
  error.field = field;
  return error;
};

// Authorization error helper
export const AuthorizationError = (message = 'Unauthorized access') => {
  return new AppError(message, 401);
};

// Forbidden error helper
export const ForbiddenError = (message = 'Access forbidden') => {
  return new AppError(message, 403);
};

// Not found error helper
export const NotFoundError = (message = 'Resource not found') => {
  return new AppError(message, 404);
};

// Conflict error helper
export const ConflictError = (message = 'Resource conflict') => {
  return new AppError(message, 409);
};

// Too many requests error helper
export const TooManyRequestsError = (message = 'Too many requests') => {
  return new AppError(message, 429);
};