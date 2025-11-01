// src/middlewares/requestId.js - Request ID tracking middleware
import { v4 as uuidv4 } from 'uuid';

export const requestIdMiddleware = (req, res, next) => {
  // Generate or use existing request ID
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Add request ID to request object
  req.id = requestId;
  
  // Add request ID to response headers
  res.set('X-Request-ID', requestId);
  
  // Add request ID to logger context
  req.logger = req.logger?.child({ requestId }) || null;
  
  // Log request start
  if (req.logger) {
    req.logger.info({
      type: 'request_start',
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      user: req.user ? { id: req.user.id, role: req.user.role } : null,
    });
  }
  
  // Add cleanup listener
  res.on('finish', () => {
    if (req.logger) {
      req.logger.info({
        type: 'request_end',
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: res.get('X-Response-Time'),
      });
    }
  });
  
  next();
};

// Request duration tracking middleware
export const requestDurationMiddleware = (req, res, next) => {
  const start = Date.now();

  // Ghi lại thời gian phản hồi trước khi gửi
  const setHeaderOnce = () => {
    const duration = Date.now() - start;
    // ✅ Đặt header TRƯỚC khi gửi, chỉ khi chưa gửi header
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration}ms`);
    }
    if (req.logger) {
      req.logger.debug({
        type: 'request_duration',
        duration: `${duration}ms`,
        url: req.originalUrl,
      });
    }
  };

  // Nếu response kết thúc thì chỉ log, KHÔNG set header nữa
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.logger) {
      req.logger.debug({
        type: 'request_duration',
        duration: `${duration}ms`,
        url: req.originalUrl,
      });
    }
  });

  next();

  // ✅ Đảm bảo header được đặt trước khi res.end()
  res.once('close', setHeaderOnce);
};



// Request body size limiting middleware
export const requestBodySizeMiddleware = (req, res, next) => {
  const maxBodySize = 1024 * 1024; // 1MB
  
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxBodySize) {
    return res.status(413).json({
      error: 'Request entity too large',
      message: 'Request body size exceeds the limit of 1MB',
      requestId: req.id
    });
  }
  
  next();
};

// Request timeout middleware
export const requestTimeoutMiddleware = (timeout = 30000) => {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request timeout',
          message: 'Request took too long to process',
          requestId: req.id
        });
      }
    }, timeout);
    
    // Clear timer when response finishes
    res.on('finish', () => {
      clearTimeout(timer);
    });
    
    next();
  };
};

// Request method validation middleware
export const validateRequestMethod = (allowedMethods) => {
  return (req, res, next) => {
    if (!allowedMethods.includes(req.method)) {
      return res.status(405).json({
        error: 'Method not allowed',
        message: `Method ${req.method} is not allowed for this endpoint`,
        allowedMethods,
        requestId: req.id
      });
    }
    next();
  };
};

// Request content type validation middleware
export const validateContentType = (allowedTypes) => {
  return (req, res, next) => {
    const contentType = req.headers['content-type'];
    
    if (req.method !== 'GET' && req.method !== 'HEAD' && contentType) {
      const isValid = allowedTypes.some(type => contentType.startsWith(type));
      
      if (!isValid) {
        return res.status(415).json({
          error: 'Unsupported media type',
          message: `Content type ${contentType} is not supported`,
          allowedTypes,
          requestId: req.id
        });
      }
    }
    
    next();
  };
};

// Request origin validation middleware
export const validateOrigin = (allowedOrigins) => {
  return (req, res, next) => {
    const origin = req.headers.origin;
    
    if (origin && !allowedOrigins.includes(origin)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Origin not allowed',
        requestId: req.id
      });
    }
    
    next();
  };
};

// Request language validation middleware
export const validateLanguage = (allowedLanguages = ['en', 'vi']) => {
  return (req, res, next) => {
    const acceptLanguage = req.headers['accept-language'];
    
    if (acceptLanguage) {
      const requestedLanguages = acceptLanguage
        .split(',')
        .map(lang => lang.split(';')[0].trim().split('-')[0]);
      
      const isValid = requestedLanguages.some(lang => allowedLanguages.includes(lang));
      
      if (!isValid) {
        return res.status(406).json({
          error: 'Not acceptable',
          message: `Language ${requestedLanguages[0]} is not supported`,
          allowedLanguages,
          requestId: req.id
        });
      }
    }
    
    next();
  };
};

// Request compression middleware
export const compressionMiddleware = (req, res, next) => {
  const acceptEncoding = req.headers['accept-encoding'];
  
  if (acceptEncoding && acceptEncoding.includes('gzip')) {
    res.set('Content-Encoding', 'gzip');
  }
  
  next();
};

// Request security headers middleware
export const securityHeadersMiddleware = (req, res, next) => {
  // Security headers
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // CORS headers
  res.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Request-ID');
  res.set('Access-Control-Max-Age', '86400');
  
  next();
};

// Request preflight handling middleware
export const handlePreflight = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
};

// Combine all request middleware
export const requestMiddleware = [
  requestIdMiddleware,
  requestDurationMiddleware,
  requestBodySizeMiddleware,
  requestTimeoutMiddleware(30000),
  validateContentType(['application/json', 'multipart/form-data']),
  securityHeadersMiddleware,
  handlePreflight,
];

// Apply request middleware to routes
export const applyRequestMiddleware = (app) => {
  requestMiddleware.forEach(middleware => {
    app.use(middleware);
  });
};