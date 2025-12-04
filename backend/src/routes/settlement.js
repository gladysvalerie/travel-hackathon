import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getSettlement, settleTransactionHandler } from "../controllers/settlementController.js";

const router = express.Router()

router.get("/:tripId", authMiddleware, getSettlement);
router.post("/:tripId/settle", authMiddleware, settleTransactionHandler);

export default router;
