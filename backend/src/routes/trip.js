import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
    createTrip,
    getMyTrips,
    getTrip,
    updateTrip,
    deleteTrip
} from "../controllers/tripController.js";

const router = express.Router();

router.post("/", authMiddleware, createTrip);
router.get("/", authMiddleware, getMyTrips);
router.get("/:tripId", authMiddleware, getTrip);
router.put("/:tripId", authMiddleware, updateTrip);
router.delete("/:tripId", authMiddleware, deleteTrip);

export default router;
