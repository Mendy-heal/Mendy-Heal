// src/routes/reviews.routes.js
import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import { 
  createReview, 
  getReview, 
  getExpertReviews, 
  getUserReviews, 
  updateReview, 
  deleteReview, 
  getExpertRatingSummary,
  getReviewableBookings,
  getAllReviews,
  adminDeleteReview,
  getReviewStats
} from "../controllers/reviews.controller.js";
import { validateRequest, validateQuery, paginationSchema, reviewSchemas } from "../utils/validations.js";
import { requireRole } from "../middlewares/auth.js";
import rateLimit from "express-rate-limit";

const router = Router();

// Apply authentication to all routes
router.use(auth);

// Rate limiting for review creation
const createReviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each user to 5 reviews per hour
  message: { error: "Too many review attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes (authenticated users)
router.post("/", createReviewLimiter, validateRequest(reviewSchemas.create), createReview);
router.get("/my-reviews", validateQuery(paginationSchema), getUserReviews);
router.get("/reviewable-bookings", getReviewableBookings);

// Expert-specific routes
router.get("/expert/:expertId", validateQuery(paginationSchema), getExpertReviews);
router.get("/expert/:expertId/summary", getExpertRatingSummary);

// Specific review routes
router.get("/:id", getReview);
router.put("/:id", validateRequest(reviewSchemas.update), updateReview);
router.delete("/:id", deleteReview);

// Admin routes (require admin role)
router.get("/admin/all",
  requireRole("ADMIN"),
  validateQuery(reviewSchemas.adminQuery),
  getAllReviews
);

router.delete("/admin/:id", requireRole("ADMIN"), adminDeleteReview);
router.get("/admin/stats", requireRole("ADMIN"), getReviewStats);

export default router;