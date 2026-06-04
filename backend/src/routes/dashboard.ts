import express from "express";
import { getDashboradStats } from "../controllers/dashboard";
// import { getDashboradInsights } from "../controllers/aiController";
import { protect } from "../middleware/auth";

const dashBoardRouter = express.Router();

//Get Stats (Role is determined by token)
dashBoardRouter.get(
  "/stats", protect, getDashboradStats
);

// Get AI insights
// dashboradRouter.post(
// "insight", protect, getDashboradInsights)

export default dashBoardRouter;
