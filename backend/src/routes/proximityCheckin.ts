import express from "express";
import { protect, authorize } from "../middleware/auth";
import {
  createProximityCheckin,
  createQrProximityCheckin,
  validateCheckinProximity,
  getCheckinHistory,
  getTodaysCheckins,
  manualMarkPresent,
} from "../controllers/proximityCheckin";

const proximityCheckinRouter = express.Router();

// Create a proximity checkin
proximityCheckinRouter.post(
  "/",
  protect,
  authorize(["student", "admin", "teacher", "unitconsultant", "unitresident"]),
  createProximityCheckin
);

// Create checkin with QR code
proximityCheckinRouter.post(
  "/qr",
  protect,
  authorize(["student", "admin", "teacher", "unitconsultant", "unitresident"]),
  createQrProximityCheckin
);

// Validate checkin proximity
proximityCheckinRouter.post(
  "/validate",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  validateCheckinProximity
);

// Get student's checkin history
proximityCheckinRouter.get(
  "/history",
  protect,
  authorize(["student", "admin", "teacher", "parent"]),
  getCheckinHistory
);

// Get today's checkins for a class (supervisor view)
proximityCheckinRouter.get(
  "/today/:classId",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident", "student"]),
  getTodaysCheckins
);

// Manually mark a student as present (for network issues)
proximityCheckinRouter.post(
  "/manual-mark",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  manualMarkPresent
);

export default proximityCheckinRouter;
