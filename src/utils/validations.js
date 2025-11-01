// src/utils/validations.js - Centralized input validation schemas using Zod
import { z } from "zod";

// User validation schemas
export const userSchemas = {
  register: z.object({
    handle: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Handle can only contain letters, numbers, and underscores"),
    password: z.string().min(8).max(100, "Password must be less than 100 characters"),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().regex(/^[0-9+]{10,15}$/).optional().or(z.literal(""))
  }).refine(data => data.email || data.phone, {
    message: "Either email or phone is required",
    path: ["email"]
  }),

  login: z.object({
    handle: z.string().min(1, "Handle is required"),
    password: z.string().min(1, "Password is required")
  }),

  refresh: z.object({
    token: z.string().min(1, "Refresh token is required")
  })
};

// Profile validation schemas
export const profileSchemas = {
  complete: z.object({
    display_name: z.string().min(1).max(50).optional(),
    bio: z.string().max(500).optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER", "UNSPECIFIED"]).optional(),
    year_of_birth: z.number().min(1900).max(new Date().getFullYear()).optional(),
    specialties: z.array(z.string()).optional(),
    price_per_session: z.number().min(0).optional(),
    intro: z.string().max(2000).optional()
  })
};

// Booking validation schemas
export const bookingSchemas = {
  create: z.object({
    expert_id: z.number().positive("Expert ID must be a positive number"),
    start_at: z.string().datetime("Invalid start date format"),
    end_at: z.string().datetime("Invalid end date format"),
    channel: z.enum(["CHAT", "VIDEO", "AUDIO"], {
      errorMap: () => ({ message: "Channel must be one of: CHAT, VIDEO, AUDIO" })
    })
  }).refine(data => new Date(data.end_at) > new Date(data.start_at), {
    message: "End time must be after start time",
    path: ["end_at"]
  }),

  confirm: z.object({
    id: z.number().positive("Booking ID must be a positive number")
  }),

  cancel: z.object({
    id: z.number().positive("Booking ID must be a positive number")
  })
};

// Post validation schemas
export const postSchemas = {
  create: z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).max(5000, "Content must be less than 5000 characters"),
    tags: z.array(z.string()).max(10, "Maximum 10 tags allowed").optional(),
    privacy: z.enum(["PUBLIC", "FRIENDS", "ONLY_ME", "CUSTOM"]).optional(),
    file_ids: z.array(z.number()).optional()
  }),

  update: z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).max(5000, "Content must be less than 5000 characters").optional(),
    tags: z.array(z.string()).max(10, "Maximum 10 tags allowed").optional(),
    privacy: z.enum(["PUBLIC", "FRIENDS", "ONLY_ME", "CUSTOM"]).optional()
  }),

  react: z.object({
    kind: z.enum(["LIKE", "SUPPORT", "HUG"], {
      errorMap: () => ({ message: "Reaction must be one of: LIKE, SUPPORT, HUG" })
    })
  }),

  save: z.object({}).strict() // No body required
};

// Comment validation schemas
export const commentSchemas = {
  create: z.object({
    post_id: z.number().positive("Post ID must be a positive number"),
    content: z.string().min(1).max(2000, "Comment must be less than 2000 characters"),
    parent_id: z.number().positive("Parent ID must be a positive number").optional()
  }),

  update: z.object({
    content: z.string().min(1).max(2000, "Comment must be less than 2000 characters")
  })
};

// Follow validation schemas
export const followSchemas = {
  follow: z.object({
    user_id: z.number().positive("User ID must be a positive number")
  }),

  unfollow: z.object({
    user_id: z.number().positive("User ID must be a positive number")
  })
};

// Email validation schemas
export const emailSchemas = {
  requestOtp: z.object({
    email: z.string().email("Invalid email format")
  }),

  confirmOtp: z.object({
    otp_code: z.string().length(6, "OTP must be exactly 6 digits"),
    email: z.string().email("Invalid email format")
  })
};

// Payment validation schemas
export const paymentSchemas = {
  createForBooking: z.object({
    booking_id: z.number().positive("Booking ID must be a positive number")
  })
};

// Chat validation schemas
export const chatSchemas = {
  startDm: z.object({
    user_id: z.number().positive("User ID must be a positive number")
  }),

  sendMessage: z.object({
    content: z.string().min(1).max(2000, "Message must be less than 2000 characters")
  }),

  markRead: z.object({
    last_read_message_id: z.number().positive("Message ID must be a positive number")
  })
};

// Review validation schemas
export const reviewSchemas = {
  create: z.object({
    booking_id: z.number().positive("Booking ID must be a positive number"),
    rating: z.number().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
    comment: z.string().max(1000, "Comment must be less than 1000 characters").optional()
  }),

  update: z.object({
    rating: z.number().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5").optional(),
    comment: z.string().max(1000, "Comment must be less than 1000 characters").optional()
  }).refine(data => data.rating !== undefined || data.comment !== undefined, {
    message: "At least one field (rating or comment) must be provided"
  }),

  adminQuery: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).default("50"),
    offset: z.string().regex(/^\d+$/).transform(Number).default("0"),
    expertId: z.string().regex(/^\d+$/).transform(Number).optional(),
    rating: z.string().regex(/^\d+$/).transform(Number).optional()
  })
};

// Pagination validation schema
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default("1"),
  limit: z.string().regex(/^\d+$/).transform(Number).default("20"),
  before: z.string().datetime().optional(),
  after: z.string().datetime().optional()
}).refine(data => !data.before || !data.after, {
  message: "Cannot use both 'before' and 'after' parameters",
  path: ["after"]
});

// Generic ID validation schema
export const idSchema = z.object({
  id: z.number().positive("ID must be a positive number")
});

// File upload validation schema
export const fileUploadSchema = z.object({
  fieldname: z.enum(["avatar", "attachment"]),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string(),
  size: z.number(),
  destination: z.string(),
  filename: z.string(),
  path: z.string()
}).refine(data => {
  if (data.fieldname === "avatar") {
    return /^image\/(png|jpe?g|gif|webp)$/i.test(data.mimetype);
  }
  if (data.fieldname === "attachment") {
    return /(pdf|msword|officedocument\.wordprocessingml\.document|plain)/i.test(data.mimetype);
  }
  return false;
}, {
  message: "Invalid file type",
  path: ["mimetype"]
});

// Utility function to validate and parse request data
export const validateRequest = (schema) => (req, res, next) => {
  try {
    const validatedData = schema.parse(req.body);
    req.body = validatedData;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return res.status(400).json({
        error: "Validation failed",
        details: errorMessages
      });
    }
    next(error);
  }
};

// Utility function to validate query parameters
export const validateQuery = (schema) => (req, res, next) => {
  try {
    const validatedQuery = schema.parse(req.query);
    req.query = validatedQuery;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return res.status(400).json({
        error: "Query validation failed",
        details: errorMessages
      });
    }
    next(error);
  }
};