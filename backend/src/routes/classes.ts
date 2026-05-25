import express from "express"
import { createClass, deleteClass, getAllClasses, updateClass } from "../controllers/classes";
import { authorize, protect } from "../middleware/auth";

const classRouter = express.Router();

classRouter.post("/create", protect, authorize(["admin"]), createClass);
classRouter.get("/", protect, authorize(["admin"]), getAllClasses);
classRouter.patch("/update/:id", protect, authorize(["admin"]), updateClass);
classRouter.delete("/delete/:id", protect, authorize(["admin"]), deleteClass);

export default classRouter;