import "dotenv/config";
import http from "http";
import { env } from "./utils/envValidator.js";
import { logger, handleUncaughtExceptions, handleUnhandledRejections } from "./utils/logger.js";
import { handleUnhandledRejections as errorHandlerUnhandledRejections } from "./middlewares/errorHandler.js";
import app from "./app.js";
import { initChatSocket } from "./sockets/chat.socket.js";
import { initRtcSocket } from "./sockets/rtc.socket.js";
import * as BookingsService from "./services/bookings.service.js";

// Validate environment variables
const validatedEnv = env;

// Set up global error handlers
handleUncaughtExceptions();
handleUnhandledRejections();
errorHandlerUnhandledRejections();

const PORT = validatedEnv.PORT || 4000;
const server = http.createServer(app);

// Socket.io setup
initChatSocket(server);
initRtcSocket(server);

// Start server
server.listen(PORT, () => {
  logger.info(`✅ API running: http://localhost:${PORT}`, {
    environment: validatedEnv.NODE_ENV,
    port: PORT,
    nodeVersion: process.version,
  });
});

// Schedule job to auto-complete expired bookings every 5 minutes
setInterval(async () => {
  try {
    const completedBookings = await BookingsService.autoCompleteExpiredBookings();
    if (completedBookings.length > 0) {
      logger.info(`Auto-completed ${completedBookings.length} expired bookings`);
    }
  } catch (error) {
    logger.error('Error in auto-complete job', { error: error.message, stack: error.stack });
  }
}, 5 * 60 * 1000); // Run every 5 minutes

// Handle server errors
server.on('error', (error) => {
  logger.error('Server error', { error: error.message, stack: error.stack });
  
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? `Pipe ${PORT}` : `Port ${PORT}`;

  // Handle specific listen errors
  switch (error.code) {
    case 'EACCES':
      logger.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Note: Error handlers are already set up above (lines 14-16)
// These are kept for reference but are redundant
