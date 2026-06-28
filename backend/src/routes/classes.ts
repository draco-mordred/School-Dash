import express from "express"
import { createClass, deleteClass, getAllClasses, getClassById, updateClass, getStudentsForClass } from "../controllers/classes";
import { authorize, protect } from "../middleware/auth";

const classRouter = express.Router();

classRouter.post("/create", protect, authorize(["admin"]), createClass);
classRouter.get("/", protect, authorize(["admin", "teacher", "parent"]), getAllClasses);
classRouter.get("/:id", protect, authorize(["admin", "teacher", "student", "parent", "unitconsultant", "unitresident"]), getClassById);
classRouter.get("/:id/students", protect, authorize(["admin", "teacher", "student", "parent", "unitconsultant", "unitresident"]), getStudentsForClass);
classRouter.patch("/update/:id", protect, authorize(["admin", "teacher", "unitconsultant", "unitresident"]), updateClass);
classRouter.delete("/delete/:id", protect, authorize(["admin"]), deleteClass);

export default classRouter;