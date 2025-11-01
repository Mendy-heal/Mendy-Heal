import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import { requireAdmin } from "../controllers/admin.controller.js";
import rateLimit from "express-rate-limit";

// Import admin controllers
import {
  getDashboard,
  getBookingAnalytics,
  getRevenueAnalytics,
  getUsers,
  getUserById,
  suspendUser,
  activateUser,
  banUser,
  getReportedContent,
  hideContent,
  deleteContent,
  getAuditLogs,
  getExperts,
  approveExpertKYC,
  rejectExpertKYC,
  getAllBookings,
  updateBookingStatus,
  getSystemSettings,
  updateSystemSettings
} from "../controllers/admin.controller.js";

const router = Router();

// Apply admin middleware to all routes
router.use(auth);
router.use(requireAdmin);

// Apply rate limiting
const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each admin to 100 requests per minute
  message: "Too many requests from admin, please try again later."
});

router.use(adminLimiter);

// Dashboard analytics routes
router.get("/dashboard", getDashboard);
router.get("/analytics/bookings", getBookingAnalytics);
router.get("/analytics/revenue", getRevenueAnalytics);

// User management routes
router.get("/users", getUsers);
router.get("/users/:userId", getUserById);
router.patch("/users/:userId/suspend", suspendUser);
router.patch("/users/:userId/activate", activateUser);
router.post("/users/:userId/ban", banUser);

// Expert management routes
router.get("/experts", getExperts);
router.patch("/experts/:expertId/kyc/approve", approveExpertKYC);
router.patch("/experts/:expertId/kyc/reject", rejectExpertKYC);

// Booking management routes
router.get("/bookings", getAllBookings);
router.patch("/bookings/:bookingId/status", updateBookingStatus);

// Content moderation routes
router.get("/content/reports", getReportedContent);
router.post("/content/:targetType/:targetId/hide", hideContent);
router.post("/content/:targetType/:targetId/delete", deleteContent);

// System settings routes
router.get("/settings", getSystemSettings);
router.put("/settings", updateSystemSettings);

// Audit logs routes
router.get("/audit/logs", getAuditLogs);

export default router;