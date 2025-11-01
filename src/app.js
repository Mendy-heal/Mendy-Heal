import express from "express";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { env } from "./utils/envValidator.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { applyRequestMiddleware } from "./middlewares/requestId.js";
import { logger, requestLogger } from "./utils/logger.js";
import { rateLimiters } from "./utils/rateLimiter.js";
import { cacheMiddleware, checkCacheHealth } from "./utils/cache.js";
import routes from "./routes/index.js";

const app = express();

// Apply request middleware
applyRequestMiddleware(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID']
}));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use(requestLogger);

// Rate limiting
app.use(rateLimiters.api);

// Static files
app.use("/uploads", express.static(path.resolve("uploads")));
app.use("/uploads/avatar", express.static(path.resolve("uploads/avatar")));

// Cache middleware for static assets
app.use("/uploads", cacheMiddleware(3600000)); // 1 hour cache for uploads

// Health check endpoint
app.get("/health", (req, res) => {
  const cacheHealth = checkCacheHealth();
  res.json({
    ok: true,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    cache: cacheHealth,
    uptime: process.uptime(),
  });
});

// Database test endpoint
app.get("/dbtest", async (req, res) => {
  try {
    const { query } = await import("./config/db.js");
    const result = await query("SELECT NOW() as now");
    res.json({
      db_time: result.rows[0].now,
      status: "connected"
    });
  } catch (err) {
    logger.error("Database connection failed", { error: err.message });
    res.status(500).json({
      error: "DB connection failed",
      status: "disconnected",
      requestId: req.id
    });
  }
});

// API routes
app.use("/api/v1", routes);

// Cache warming endpoint
app.get("/api/v1/cache/stats", (req, res) => {
  import("./utils/cache.js").then(({ cache }) => {
    const stats = {
      cache: cache.getStats(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
    res.json(stats);
  }).catch(err => {
    res.status(500).json({ error: "Failed to get cache stats", message: err.message });
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
