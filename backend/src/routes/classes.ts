import express from "express"
import {
  createClass,
  deleteClass,
  getAllClasses,
  getClassById,
  updateClass,
  getStudentsForClass,
  removeCourseFromClass,
  saveClassCloudStorage,
  getClassCourseMaterials,
  getClassOverview,
  getClassImportantDates,
} from "../controllers/classes";
import { authorize, protect } from "../middleware/auth";

const classRouter = express.Router();

classRouter.post("/create", protect, authorize(["admin"]), createClass);
classRouter.post(
  "/:id/cloud-storage",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  saveClassCloudStorage
);
classRouter.get(
  "/:id/course-materials",
  protect,
  authorize(["admin", "teacher", "student", "parent", "unitconsultant", "unitresident"]),
  getClassCourseMaterials
);
classRouter.get(
  "/",
  protect,
  authorize(["admin", "teacher", "parent", "student", "unitconsultant", "unitresident"]),
  getAllClasses
);
classRouter.get("/:id", protect, authorize(["admin", "teacher", "student", "parent", "unitconsultant", "unitresident"]), getClassById);
classRouter.get("/:id/students", protect, authorize(["admin", "teacher", "student", "parent", "unitconsultant", "unitresident"]), getStudentsForClass);

const allRoles = ["admin", "teacher", "student", "parent", "unitconsultant", "unitresident"];

classRouter.get("/:id/overview", protect, authorize(allRoles), getClassOverview);
classRouter.get("/:id/important-dates", protect, authorize(allRoles), getClassImportantDates);
classRouter.patch("/update/:id", protect, authorize(["admin", "teacher", "unitconsultant", "unitresident"]), updateClass);
classRouter.delete("/delete/:id", protect, authorize(["admin"]), deleteClass);

classRouter.delete(
  "/:classId/courses/:courseId",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  removeCourseFromClass
);

export default classRouter;
