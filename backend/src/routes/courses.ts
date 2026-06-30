import express from "express";
import { authorize, protect } from "../middleware/auth";
import {
  addCourseSubject,
  deleteEmbeddedSubject,
  createCourse,
  createCourseSubject,
  createDepartment,
  deleteCourseSubjects,
  deduplicateClassCourses,
  getAllCourseSubjects,
  getCourseById,
  updateCourseSubjects,
  updateDepartment,
  deleteDepartment,
  bulkUploadCourses,
  bulkUploadDepartments,
  getCourseMeta,
  seedDepartments,
  getAvailableDepartments,
  getDepartmentConstants,
} from "../controllers/courses";

const courseRouter = express.Router();

courseRouter
  .route("/")
  .post(
    protect,
    authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
    createCourse
  );

courseRouter
  .route("/meta")
  .get(protect, authorize(["admin", "teacher", "unitconsultant", "unitresident"]), getCourseMeta);

courseRouter
  .route("/create")
  .post(
    protect,
    authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
    createCourseSubject
  );

courseRouter
  .route("/departments")
  .get(getAvailableDepartments)
  .post(protect, authorize(["admin"]), createDepartment);

courseRouter
  .route("/department-constants")
  .get(protect, getDepartmentConstants);

courseRouter
  .route("/:courseId/subjects")
  .post(
    protect,
    authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
    addCourseSubject
  );

// Delete a single embedded subject by its subdocument _id or subjectID
courseRouter
  .route("/:courseId/subjects/:subjectId")
  .delete(
    protect,
    authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
    deleteEmbeddedSubject
  );

courseRouter
  .route("/:courseId")
  .get(
    protect,
    authorize(["admin", "teacher", "student", "unitconsultant", "unitresident"]),
    getCourseById
  );

courseRouter
  .route("/deduplicate-classes")
  .post(protect, authorize(["admin"]), deduplicateClassCourses);

courseRouter
  .route("/departments/bulk-upload")
  .post(protect, authorize(["admin"]), bulkUploadDepartments);

courseRouter
  .route("/departments/:id")
  .patch(protect, authorize(["admin"]), updateDepartment)
  .delete(protect, authorize(["admin"]), deleteDepartment);

courseRouter
  .route("/seed/departments")
  .post(protect, authorize(["admin"]), seedDepartments);

courseRouter
  .route("/department-constants")
  .get(protect, getDepartmentConstants);

courseRouter
  .route("/bulk-upload")
  .post(
    protect,
    authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
    bulkUploadCourses
  );

// backend/src/routes/courses.ts
courseRouter
  .route("/")
  .get(
    protect,
    authorize(["admin", "teacher", "student", "unitconsultant", "unitresident"]), // Add "student"
    getAllCourseSubjects
  );

courseRouter
  .route("/delete/:id")
  .delete(protect, authorize(["admin"]), deleteCourseSubjects);

courseRouter
  .route("/update/:id")
  .patch(
    protect,
    authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
    updateCourseSubjects
  );

export default courseRouter;

