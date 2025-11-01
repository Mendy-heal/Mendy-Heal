// src/controllers/reviews.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { created, success, notFound, failure, forbidden } from "../utils/response.js";
import * as ReviewsService from "../services/reviews.service.js";

// Create a new review for a completed booking
export const createReview = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { booking_id, rating, comment } = req.body;

  const review = await ReviewsService.createReview({
    userId,
    bookingId: booking_id,
    rating,
    comment
  });

  return created(res, "Review created successfully", review);
});

// Get a specific review by ID
export const getReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const review = await ReviewsService.getReviewById(id, userId);
  
  if (!review) {
    return notFound(res, "Review not found");
  }

  return success(res, "Review retrieved successfully", review);
});

// Get reviews for a specific expert
export const getExpertReviews = asyncHandler(async (req, res) => {
  const { expertId } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  const result = await ReviewsService.getReviewsByExpertId(expertId, {
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  return success(res, "Expert reviews retrieved successfully", result);
});

// Get reviews written by the current user
export const getUserReviews = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 20, offset = 0 } = req.query;

  const reviews = await ReviewsService.getReviewsByUserId(userId, {
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  return success(res, "User reviews retrieved successfully", reviews);
});

// Update a review (only by the review author)
export const updateReview = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { rating, comment } = req.body;

  const review = await ReviewsService.updateReview(id, userId, {
    rating,
    comment
  });

  return success(res, "Review updated successfully", review);
});

// Delete a review (only by the review author)
export const deleteReview = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const deletedReview = await ReviewsService.deleteReview(id, userId);

  return success(res, "Review deleted successfully", deletedReview);
});

// Get rating summary for an expert
export const getExpertRatingSummary = asyncHandler(async (req, res) => {
  const { expertId } = req.params;

  const summary = await ReviewsService.getExpertRatingSummary(expertId);

  return success(res, "Expert rating summary retrieved successfully", summary);
});

// Get bookings that can be reviewed by the current user
export const getReviewableBookings = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const bookings = await ReviewsService.getReviewableBookings(userId);

  return success(res, "Reviewable bookings retrieved successfully", bookings);
});

// Admin functions

// Get all reviews (admin only)
export const getAllReviews = asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, expertId, rating } = req.query;

  const reviews = await ReviewsService.getAllReviews({
    limit: parseInt(limit),
    offset: parseInt(offset),
    expertId: expertId ? parseInt(expertId) : null,
    rating: rating ? parseInt(rating) : null
  });

  return success(res, "All reviews retrieved successfully", reviews);
});

// Delete any review (admin only)
export const adminDeleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deletedReview = await ReviewsService.adminDeleteReview(id);

  return success(res, "Review deleted successfully", deletedReview);
});

// Get review statistics (admin only)
export const getReviewStats = asyncHandler(async (req, res) => {
  const stats = await ReviewsService.getReviewStats();

  return success(res, "Review statistics retrieved successfully", stats);
});