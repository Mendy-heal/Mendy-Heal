// routes/payoutAccounts.routes.js
import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/auth.js";
import {
  createOrUpdatePayoutAccount,
  getPayoutAccount,
  updatePayoutAccount,
  deletePayoutAccount,
  adminVerifyPayoutAccount,
  adminGetFullPayoutAccount,
  adminListAllPayoutAccounts
} from "../controllers/payoutAccounts.controller.js";

const router = Router();

// User routes
router.post("/bank-account", auth, createOrUpdatePayoutAccount);
router.get("/bank-account", auth, getPayoutAccount);
router.get("/bank-account/:userId", auth, getPayoutAccount);
router.put("/bank-account", auth, updatePayoutAccount);
router.put("/bank-account/:userId", auth, updatePayoutAccount);
router.delete("/bank-account", auth, deletePayoutAccount);
router.delete("/bank-account/:userId", auth, deletePayoutAccount);

// Admin routes
router.post("/admin/bank-account/:userId/verify", auth, requireRole('ADMIN'), adminVerifyPayoutAccount);
router.get("/admin/bank-account/:userId", auth, requireRole('ADMIN'), adminGetFullPayoutAccount);
router.get("/admin/bank-accounts", auth, requireRole('ADMIN'), adminListAllPayoutAccounts);

export default router;