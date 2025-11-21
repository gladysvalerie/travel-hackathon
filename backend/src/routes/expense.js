import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  createExpense,
  getExpenses,
  getExpense,
  updateExpense,
  deleteExpense
} from "../controllers/expenseController.js";
import {
  parseReceipt,
  uploadMiddleware
} from "../controllers/receiptController.js";

const router = express.Router();

router.post("/:tripId", authMiddleware, createExpense);
router.get("/:tripId", authMiddleware, getExpenses);
router.get("/detail/:expenseId", authMiddleware, getExpense);
router.put("/detail/:expenseId", authMiddleware, updateExpense);
router.delete("/detail/:expenseId", authMiddleware, deleteExpense);
router.post("/:tripId/receipts/parse", authMiddleware, uploadMiddleware, parseReceipt);

export default router;
