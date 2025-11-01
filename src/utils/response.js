// utils/response.js - Standardized response utilities for API consistency

/**
 * Standard success response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Object} data - Response data
 * @param {number} status - HTTP status code (default: 200)
 */
export const success = (res, message, data = {}, status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Standard failure response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} error - Error details
 * @param {number} status - HTTP status code (default: 400)
 */
export const failure = (res, message, error = {}, status = 400) => {
  return res.status(status).json({
    success: false,
    message,
    error,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Response for created resources (201)
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Object} data - Created resource data
 */
export const created = (res, message, data = {}) => {
  return res.status(201).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Response for no content (204)
 * @param {Object} res - Express response object
 */
export const noContent = (res) => {
  return res.status(204).send();
};

/**
 * Response for paginated data
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Array} data - Array of data
 * @param {Object} pagination - Pagination metadata
 * @param {number} status - HTTP status code (default: 200)
 */
export const paginated = (res, message, data = [], pagination = {}, status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data,
    pagination: {
      total: pagination.total || data.length,
      limit: pagination.limit || 20,
      offset: pagination.offset || 0,
      hasMore: pagination.hasMore !== undefined ? pagination.hasMore : (pagination.total > (pagination.offset || 0) + data.length),
      nextCursor: pagination.nextCursor || pagination.next_before,
      ...pagination
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * Response for validation errors
 * @param {Object} res - Express response object
 * @param {string} message - Validation error message
 * @param {Array|Object} errors - Validation error details
 */
export const validationError = (res, message = "Validation failed", errors = {}) => {
  return res.status(422).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Response for unauthorized access (401)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
export const unauthorized = (res, message = "Unauthorized") => {
  return res.status(401).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Response for forbidden access (403)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
export const forbidden = (res, message = "Forbidden") => {
  return res.status(403).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Response for not found resources (404)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
export const notFound = (res, message = "Resource not found") => {
  return res.status(404).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Response for server errors (500)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} error - Error details
 */
export const serverError = (res, message = "Internal server error", error = {}) => {
  return res.status(500).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'production' ? {} : error,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Response for API specific status (like MoMo payment responses)
 * @param {Object} res - Express response object
 * @param {boolean} ok - Status flag
 * @param {string} message - Response message
 * @param {Object} data - Additional data
 * @param {number} status - HTTP status code
 */
export const apiStatus = (res, ok, message, data = {}, status = 200) => {
  return res.status(status).json({
    ok,
    message,
    ...data,
    timestamp: new Date().toISOString(),
  });
};
