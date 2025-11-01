// routes/banks.routes.js
import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import { getBankList, refreshBanks } from "../controllers/banks.controller.js";

const router = Router();

// Public endpoint - no authentication required for bank list
router.get("/list", getBankList);

// Admin endpoint - refresh bank list cache
router.post("/refresh", auth, refreshBanks);

export default router;