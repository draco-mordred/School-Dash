import express from "express";
import {
  createVenue,
  deleteVenue,
  getAllVenues,
  getVenueById,
  updateVenue,
} from "../controllers/venues";
import { authorize, protect } from "../middleware/auth";

const venueRouter = express.Router();

// Venue registry: read for staff, mutations admin-only (D7: admins
// configure lecture locations and their acceptance radius globally).
venueRouter.get(
  "/",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  getAllVenues
);
venueRouter.get(
  "/:id",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  getVenueById
);
venueRouter.post("/create", protect, authorize(["admin"]), createVenue);
venueRouter.patch("/update/:id", protect, authorize(["admin"]), updateVenue);
venueRouter.delete("/delete/:id", protect, authorize(["admin"]), deleteVenue);

export default venueRouter;
