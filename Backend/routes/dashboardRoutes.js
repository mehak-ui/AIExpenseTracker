import express from "express";
import {
    getSummary,
    getCategoryBreakdown,
    getMonthlyTrend,
} from "../controllers/dashboardController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect); // Apply the protect middleware to all routes in this router

router.get("/summary", getSummary);
router.get("/category-breakdown", getCategoryBreakdown);
router.get("/monthly-trend", getMonthlyTrend);

export default router;