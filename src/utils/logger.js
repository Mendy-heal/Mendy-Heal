// src/utils/logger.js - Centralized logging system using Winston
import winston from 'winston';
import { env } from './envValidator.js';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston about the colors
winston.addColors(colors);

// Define which log level to use based on the environment
const level = () => {
  const envLevel = env.NODE_ENV === 'development' ? 'debug' : 'warn';
  return envLevel;
};

// Define the different formats for logging
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${
      info.splat !== undefined ? `${info.splat}` : ' '
    }`
  )
);

// Define which transports to use
const transports = [
  // Write all logs with importance level of `error` or less to `error.log`
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  // Write all logs with importance level of `http` or less to `combined.log`
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// If we're not in production, log to the console as well
if (env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: format,
    })
  );
}

// Create the logger
export const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP request logging
export const loggerStream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log incoming request
  logger.info({
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.id,
    user: req.user ? { id: req.user.id, role: req.user.role } : null,
    body: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
    query: req.query && Object.keys(req.query).length > 0 ? req.query : undefined,
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    logger.info({
      method: req.method,
      url: req.originalUrl,
      statusCode,
      duration: `${duration}ms`,
      requestId: req.id,
      contentLength: res.get('Content-Length'),
    });
  });

  next();
};

// Error logging helper
export const logError = (error, context = {}) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    ...context,
    timestamp: new Date().toISOString(),
  });
};

// Performance logging helper
export const logPerformance = (operation, duration, context = {}) => {
  logger.info({
    operation,
    duration: `${duration}ms`,
    ...context,
    timestamp: new Date().toISOString(),
  });
};

// Security logging helper
export const logSecurity = (event, details, context = {}) => {
  logger.warn({
    event,
    details,
    ...context,
    timestamp: new Date().toISOString(),
  });
};

// Audit logging helper
export const logAudit = (action, user, resource, details = {}) => {
  logger.info({
    action,
    user: user ? { id: user.id, role: user.role } : null,
    resource,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Database query logging helper
export const logQuery = (query, duration, rowCount = 0) => {
  logger.debug({
    type: 'database_query',
    query: query.text,
    duration: `${duration}ms`,
    rowCount,
    params: query.params,
    timestamp: new Date().toISOString(),
  });
};

// Cache logging helper
export const logCache = (operation, key, hit = false, duration = 0) => {
  logger.debug({
    type: 'cache_operation',
    operation,
    key,
    hit,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
  });
};

// Health check logging helper
export const logHealthCheck = (status, checks = {}) => {
  logger.info({
    type: 'health_check',
    status,
    checks,
    timestamp: new Date().toISOString(),
  });
};

// Create a child logger with additional context
export const createChildLogger = (context) => {
  return logger.child(context);
};

// Unhandled exception logging
process.on('uncaughtException', (error) => {
  logger.error({
    type: 'uncaught_exception',
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
  process.exit(1);
});

// Unhandled rejection logging
process.on('unhandledRejection', (reason, promise) => {
  logger.error({
    type: 'unhandled_rejection',
    reason,
    promise: promise.toString(),
    timestamp: new Date().toISOString(),
  });
});

// Export global error handlers
export const handleUncaughtExceptions = () => {
  process.on('uncaughtException', (error) => {
    logger.error({
      type: 'uncaught_exception',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    // In a real application, you might want to gracefully shutdown the server
    process.exit(1);
  });
};

export const handleUnhandledRejections = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({
      type: 'unhandled_rejection',
      reason,
      promise: promise.toString(),
      timestamp: new Date().toISOString(),
    });
    // In a real application, you might want to gracefully shutdown the server
    process.exit(1);
  });
};