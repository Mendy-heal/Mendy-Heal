// controllers/payoutAccounts.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { success, failure, notFound, forbidden } from "../utils/response.js";
import * as PayoutAccountsService from "../services/payoutAccounts.service.js";
import { requireRole } from "../middlewares/auth.js";
import {
  createPayoutAccountSchema,
  updatePayoutAccountSchema,
  adminListPayoutAccountsSchema
} from "../utils/payoutValidations.js";

export const createOrUpdatePayoutAccount = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  // Validate request body
  const validationResult = createPayoutAccountSchema.safeParse(req.body);
  if (!validationResult.success) {
    const errors = validationResult.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    return failure(res, "Validation failed", { errors });
  }
  
  const { bank_name, account_number, account_holder } = validationResult.data;
  
  try {
    const account = await PayoutAccountsService.createOrUpdatePayoutAccount({
      userId,
      bankName: bank_name,
      accountNumber: account_number,
      accountHolder: account_holder
    });
    
    return success(res, "Payout account saved successfully", account);
  } catch (error) {
    if (error.status === 400) {
      return failure(res, error.message);
    } else if (error.status === 403) {
      return forbidden(res, error.message);
    } else if (error.status === 404) {
      return notFound(res, error.message);
    }
    throw error;
  }
});

export const getPayoutAccount = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId) || req.user.id;
  const requestUserId = req.user.id;
  
  try {
    const account = await PayoutAccountsService.getPayoutAccount(userId, requestUserId);
    
    if (!account) {
      return success(res, "No payout account found", { account: null });
    }
    
    return success(res, "Payout account retrieved successfully", { account });
  } catch (error) {
    if (error.status === 403) {
      return forbidden(res, error.message);
    }
    throw error;
  }
});

export const updatePayoutAccount = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId) || req.user.id;
  const requestUserId = req.user.id;
  
  // Validate request body
  const validationResult = updatePayoutAccountSchema.safeParse(req.body);
  if (!validationResult.success) {
    const errors = validationResult.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    return failure(res, "Validation failed", { errors });
  }
  
  const { bank_name, account_number, account_holder } = validationResult.data;
  
  try {
    const account = await PayoutAccountsService.updatePayoutAccount({
      userId,
      bankName: bank_name,
      accountNumber: account_number,
      accountHolder: account_holder
    }, requestUserId);
    
    return success(res, "Payout account updated successfully", account);
  } catch (error) {
    if (error.status === 400) {
      return failure(res, error.message);
    } else if (error.status === 403) {
      return forbidden(res, error.message);
    } else if (error.status === 404) {
      return notFound(res, error.message);
    }
    throw error;
  }
});

export const deletePayoutAccount = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId) || req.user.id;
  const requestUserId = req.user.id;
  
  try {
    const account = await PayoutAccountsService.deletePayoutAccount(userId, requestUserId);
    return success(res, "Payout account deleted successfully", account);
  } catch (error) {
    if (error.status === 400) {
      return failure(res, error.message);
    } else if (error.status === 403) {
      return forbidden(res, error.message);
    } else if (error.status === 404) {
      return notFound(res, error.message);
    }
    throw error;
  }
});

// Admin endpoints
export const adminVerifyPayoutAccount = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  
  try {
    const account = await PayoutAccountsService.verifyPayoutAccount(userId);
    return success(res, "Payout account verified successfully", account);
  } catch (error) {
    if (error.status === 400) {
      return failure(res, error.message);
    } else if (error.status === 404) {
      return notFound(res, error.message);
    }
    throw error;
  }
});

export const adminGetFullPayoutAccount = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  
  try {
    const account = await PayoutAccountsService.getFullPayoutAccount(userId);
    return success(res, "Payout account retrieved successfully", { account });
  } catch (error) {
    if (error.status === 404) {
      return notFound(res, error.message);
    }
    throw error;
  }
});

export const adminListAllPayoutAccounts = asyncHandler(async (req, res) => {
  // Validate query parameters
  const validationResult = adminListPayoutAccountsSchema.safeParse(req.query);
  if (!validationResult.success) {
    const errors = validationResult.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    return failure(res, "Validation failed", { errors });
  }
  
  const { verified, page = 1, limit = 20 } = validationResult.data;
  const offset = (page - 1) * limit;
  
  try {
    const { query } = await import("../config/db.js");
    
    let whereClause = "WHERE 1=1";
    const params = [];
    let paramIndex = 1;
    
    if (verified !== undefined) {
      whereClause += ` AND pa.verified = $${paramIndex++}`;
      params.push(verified === 'true');
    }
    
    const { rows } = await query(
      `SELECT 
        pa.id,
        pa.user_id,
        pa.bank_name,
        pa.account_number,
        pa.account_holder,
        pa.verified,
        pa.verified_at,
        pa.created_at,
        u.handle,
        up.display_name,
        u.role_primary
       FROM app.payout_accounts pa
       JOIN app.users u ON u.id = pa.user_id
       LEFT JOIN app.user_profiles up ON up.user_id = u.id
       ${whereClause}
       ORDER BY pa.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );
    
    const { rows: countResult } = await query(
      `SELECT COUNT(*) as total FROM app.payout_accounts pa ${whereClause}`,
      params
    );
    
    const total = parseInt(countResult[0].total);
    const totalPages = Math.ceil(total / limit);
    
    return success(res, "Payout accounts retrieved successfully", {
      accounts: rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_items: total,
        items_per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Error listing payout accounts:", error);
    return failure(res, "Failed to retrieve payout accounts");
  }
});