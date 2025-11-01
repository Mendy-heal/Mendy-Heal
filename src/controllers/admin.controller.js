import { asyncHandler } from "../utils/asyncHandler.js";
import { success, failure, forbidden, paginated } from "../utils/response.js";
import * as AdminService from "../services/admin.service.js";
import * as AuditService from "../repositories/audit.repo.js";

// Middleware to check if user is admin
export function requireAdmin(req, res, next) {
  if (req.user.role !== "ADMIN") {
    return forbidden(res, "Admin access required");
  }
  next();
}

// Dashboard analytics
export const getDashboard = asyncHandler(async (req, res) => {
  const dashboardData = await AdminService.getDashboardData();
  
  await AuditService.logAction({
    userId: req.user.id,
    action: "DASHBOARD_VIEWED",
    ip: req.ip,
    agent: req.get("User-Agent")
  });

  return success(res, "Dashboard data retrieved successfully", dashboardData);
});

export const getBookingAnalytics = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const analytics = await AdminService.getBookingAnalytics({ days: parseInt(days) });
  
  return success(res, "Booking analytics retrieved successfully", analytics);
});

export const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const analytics = await AdminService.getRevenueAnalytics({ days: parseInt(days) });
  
  return success(res, "Revenue analytics retrieved successfully", analytics);
});

// User management
export const getUsers = asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, status, role } = req.query;
  const filters = {
    limit: parseInt(limit),
    offset: parseInt(offset),
    status,
    role
  };
  
  const users = await AdminService.getUsersList(filters);
  
  await AuditService.logAction({
    userId: req.user.id,
    action: "USERS_LIST_VIEWED",
    meta: { filters },
    ip: req.ip,
    agent: req.get("User-Agent")
  });

  return paginated(res, "Users list retrieved successfully", users, {
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await AdminService.getUserDetails(parseInt(userId));
  
  await AuditService.logAction({
    userId: req.user.id,
    action: "USER_VIEWED",
    resource: "USER",
    resourceId: parseInt(userId),
    ip: req.ip,
    agent: req.get("User-Agent")
  });

  return success(res, "User details retrieved successfully", user);
});

export const suspendUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;
  
  if (!reason) {
    return failure(res, "Reason for suspension is required");
  }
  
  const updatedUser = await AdminService.suspendUser(parseInt(userId), reason, req.user.id);
  
  return success(res, "User suspended successfully", {
    user: {
      id: updatedUser.id,
      status: updatedUser.status,
      updated_at: updatedUser.updated_at
    }
  });
});

export const activateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const updatedUser = await AdminService.activateUser(parseInt(userId), req.user.id);
  
  return success(res, "User activated successfully", {
    user: {
      id: updatedUser.id,
      status: updatedUser.status,
      updated_at: updatedUser.updated_at
    }
  });
});

export const banUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;
  
  if (!reason) {
    return failure(res, "Reason for ban is required");
  }
  
  const action = await AdminService.banUser(parseInt(userId), reason, req.user.id);
  
  return success(res, "User banned successfully", {
    action: {
      id: action.id,
      action: action.action,
      created_at: action.created_at
    }
  });
});

// Content moderation
export const getReportedContent = asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, status, targetType } = req.query;
  const filters = {
    limit: parseInt(limit),
    offset: parseInt(offset),
    status,
    targetType
  };
  
  const reports = await AdminService.getReportedContent(filters);
  
  await AuditService.logAction({
    userId: req.user.id,
    action: "REPORTED_CONTENT_VIEWED",
    meta: { filters },
    ip: req.ip,
    agent: req.get("User-Agent")
  });

  return paginated(res, "Reported content retrieved successfully", reports, {
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
});

export const hideContent = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.params;
  const { reason } = req.body;
  
  if (!reason) {
    return failure(res, "Reason for hiding content is required");
  }
  
  const action = await AdminService.hideContent(targetType, parseInt(targetId), reason, req.user.id);
  
  return success(res, "Content hidden successfully", {
    action: {
      id: action.id,
      action: action.action,
      created_at: action.created_at
    }
  });
});

export const deleteContent = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.params;
  const { reason } = req.body;
  
  if (!reason) {
    return failure(res, "Reason for deletion is required");
  }
  
  const action = await AdminService.deleteContent(targetType, parseInt(targetId), reason, req.user.id);
  
  return success(res, "Content deleted successfully", {
    action: {
      id: action.id,
      action: action.action,
      created_at: action.created_at
    }
  });
});

// Audit logs
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { limit = 50, before, userId, action } = req.query;
  const filters = {
    limit: parseInt(limit),
    before,
    userId: userId ? parseInt(userId) : null,
    action
  };
  
  const logs = await AuditService.getAuditLogs(filters);
  
  return paginated(res, "Audit logs retrieved successfully", logs, {
    limit: parseInt(limit),
    nextCursor: before
  });
});

// Expert management
export const getExperts = asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, status, kycStatus } = req.query;
  const filters = {
    limit: parseInt(limit),
    offset: parseInt(offset),
    status,
    kycStatus
  };
  
  const experts = await AdminService.getExpertsList(filters);
  
  await AuditService.logAction({
    userId: req.user.id,
    action: "EXPERTS_LIST_VIEWED",
    meta: { filters },
    ip: req.ip,
    agent: req.get("User-Agent")
  });

  return paginated(res, "Experts list retrieved successfully", experts, {
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
});

export const approveExpertKYC = asyncHandler(async (req, res) => {
  const { expertId } = req.params;
  const { notes } = req.body;
  
  const updatedExpert = await AdminService.approveExpertKYC(parseInt(expertId), notes, req.user.id);
  
  await AuditService.logAction({
    userId: req.user.id,
    action: "EXPERT_KYC_APPROVED",
    resource: "EXPERT",
    resourceId: parseInt(expertId),
    meta: { notes },
    ip: req.ip,
    agent: req.get("User-Agent")
  });

  return success(res, "Expert KYC approved successfully", {
    expert: {
      id: updatedExpert.id,
      kyc_status: updatedExpert.kyc_status,
      updated_at: updatedExpert.updated_at
    }
  });
});

export const rejectExpertKYC = asyncHandler(async (req, res) => {
  const { expertId } = req.params;
  const { reason, notes } = req.body;
  
  if (!reason) {
    return failure(res, "Reason for rejection is required");
  }
  
  const updatedExpert = await AdminService.rejectExpertKYC(parseInt(expertId), reason, notes, req.user.id);
  
  await AuditService.logAction({
    userId: req.user.id,
    action: "EXPERT_KYC_REJECTED",
    resource: "EXPERT",
    resourceId: parseInt(expertId),
    meta: { reason, notes },
    ip: req.ip,
    agent: req.get("User-Agent")
  });

  return success(res, "Expert KYC rejected successfully", {
    expert: {
      id: updatedExpert.id,
      kyc_status: updatedExpert.kyc_status,
      updated_at: updatedExpert.updated_at
    }
  });
});

// Booking management
export const getAllBookings = asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, status, expertId, userId, dateFrom, dateTo } = req.query;
  const filters = {
    limit: parseInt(limit),
    offset: parseInt(offset),
    status,
    expertId: expertId ? parseInt(expertId) : null,
    userId: userId ? parseInt(userId) : null,
    dateFrom,
    dateTo
  };
  
  const bookings = await AdminService.getAllBookingsList(filters);
  
  await AuditService.logAction({
    userId: req.user.id,
    action: "BOOKINGS_LIST_VIEWED",
    meta: { filters },
    ip: req.ip,
    agent: req.get("User-Agent")
  });

  return paginated(res, "Bookings list retrieved successfully", bookings, {
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
});

export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { status, reason } = req.body;
  
  if (!status) {
    return failure(res, "Status is required");
  }
  
  const updatedBooking = await AdminService.updateBookingStatus(parseInt(bookingId), status, reason, req.user.id);
  
  await AuditService.logAction({
    userId: req.user.id,
    action: "BOOKING_STATUS_UPDATED",
    resource: "BOOKING",
    resourceId: parseInt(bookingId),
    meta: { status, reason },
    ip: req.ip,
    agent: req.get("User-Agent")
  });

  return success(res, "Booking status updated successfully", {
    booking: {
      id: updatedBooking.id,
      status: updatedBooking.status,
      updated_at: updatedBooking.updated_at
    }
  });
});

// System settings
export const getSystemSettings = asyncHandler(async (req, res) => {
  const settings = await AdminService.getSystemSettings();
  
  await AuditService.logAction({
    userId: req.user.id,
    action: "SYSTEM_SETTINGS_VIEWED",
    ip: req.ip,
    agent: req.get("User-Agent")
  });

  return success(res, "System settings retrieved successfully", settings);
});

export const updateSystemSettings = asyncHandler(async (req, res) => {
  const { settings } = req.body;
  
  if (!settings) {
    return failure(res, "Settings object is required");
  }
  
  const updatedSettings = await AdminService.updateSystemSettings(settings, req.user.id);
  
  await AuditService.logAction({
    userId: req.user.id,
    action: "SYSTEM_SETTINGS_UPDATED",
    meta: { settings },
    ip: req.ip,
    agent: req.get("User-Agent")
  });

  return success(res, "System settings updated successfully", updatedSettings);
});