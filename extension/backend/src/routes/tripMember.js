import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { addMember } from "../controllers/tripMemberController.js";

const router = express.Router();

router.post("/:tripId/members", authMiddleware, addMember);

export default router;