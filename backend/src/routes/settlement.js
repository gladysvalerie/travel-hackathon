import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getSettlement } from "../controllers/settlementController.js";

const router = express.Router()

router.get("/:tripId", authMiddleware, getSettlement);

export default router;
