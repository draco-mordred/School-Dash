import express from "express";
import {
  getClassLocations,
  upsertClassLocation,
} from "../controllers/classLocations";
import { authorize, protect } from "../middleware/auth";

const classLocationsRouter = express.Router();

// PR B — per-class default lecture locations. Reads for staff, mutations
// admin-only (same policy as the venue registry).
classLocationsRouter.get(
  "/",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  getClassLocations
);
classLocationsRouter.put(
  "/:classId",
  protect,
  authorize(["admin"]),
  upsertClassLocation
);

export default classLocationsRouter;
