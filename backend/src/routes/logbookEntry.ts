import express from "express";
import { protect, authorize } from "../middleware/auth";
import {
  createLogbookEntry,
  getAllLogbookEntries,
  getLogbookEntryById,
  updateLogbookEntry,
  deleteLogbookEntry,
} from "../controllers/logbookEntry";

const logbookEntryRouter = express.Router();

logbookEntryRouter.post(
  "/",
  protect,
  authorize(["admin", "teacher", "student", "unit_consultant", "unit_resident"]),
  createLogbookEntry
);

logbookEntryRouter.get(
  "/",
  protect,
  getAllLogbookEntries
);

logbookEntryRouter.get(
  "/:id",
  protect,
  getLogbookEntryById
);

logbookEntryRouter.put(
  "/:id",
  protect,
  authorize(["admin", "teacher", "student", "unit_consultant", "unit_resident"]),
  updateLogbookEntry
);

logbookEntryRouter.delete(
  "/:id",
  protect,
  authorize(["admin", "teacher", "unit_consultant", "unit_resident"]),
  deleteLogbookEntry
);

export default logbookEntryRouter;
