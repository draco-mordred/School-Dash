var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/models/user.ts
var user_exports = {};
__export(user_exports, {
  UserAcademicStatus: () => UserAcademicStatus,
  UserDepartmentName: () => UserDepartmentName,
  UserDepartmentRole: () => UserDepartmentRole,
  UserDepartments: () => UserDepartments,
  UserIDs: () => UserIDs,
  UserRole: () => UserRole,
  default: () => user_default,
  roleDisplayName: () => roleDisplayName
});
import mongoose2, { Schema } from "mongoose";
import * as bcrypt from "bcryptjs";
var UserRole, UserIDs, UserDepartments, roleDisplayName, UserDepartmentName, UserAcademicStatus, UserDepartmentRole, UserSchema, User, user_default;
var init_user = __esm({
  "src/models/user.ts"() {
    UserRole = {
      ADMIN: "admin",
      TEACHER: "teacher",
      STUDENT: "student",
      PARENT: "parent",
      UNITCONSULTANT: "unitconsultant",
      UNITRESIDENT: "unitresident"
    };
    UserIDs = {
      ADMINID: "UJMBBSAD0000",
      STUDENTID: "UJMBBSST0000",
      TEACHERID: "UJMBBSTE0000",
      PARENTID: "UJMBBSPA0000",
      UNITCONSULTANTID: "UJMBBSUC0000",
      UNITRESIDENTID: "UJMBBSUR0000"
    };
    UserDepartments = {
      OBG: {
        id: "og",
        name: "Obstetrics & Gynaecology",
        rotationDurationWeeks: 4,
        units: {
          active: [
            "Antenatal Clinic",
            "Labour Ward",
            "Postnatal Ward",
            "Gynaecology Ward",
            "Emergency O&G",
            "Family Planning",
            "Fertility / Endocrine Unit",
            "Reproductive Medicine Unit",
            "Gynaecologic Oncology Unit"
          ],
          reserve: [
            "Family Medicine / Reproductive Health Unit"
          ]
        }
      },
      Pediatrics: {
        id: "peds",
        name: "Pediatrics",
        rotationDurationWeeks: 2,
        units: {
          active: [
            "Neonatology / SCBU",
            "Paediatric Nephrology",
            "Paediatric Infectious Diseases",
            "Emergency Paediatrics",
            "Nutrition Unit",
            "Paediatric Neurology",
            "Paediatric Cardiology",
            "Paediatric Endocrinology",
            "Paediatric Hemato-Oncology"
          ],
          reserve: [
            "General Paediatrics"
          ]
        }
      }
    };
    roleDisplayName = {
      admin: "Admin",
      teacher: "Teacher",
      student: "Student",
      parent: "Parent",
      unitconsultant: "Unit Consultant",
      unitresident: "Unit Resident"
    };
    UserDepartmentName = {
      OBG: "Obstetrics & Gynaecology",
      Pediatrics: "Pediatrics",
      Medicine: "Medicine",
      Surgery: "Surgery",
      Psychiatry: "Psychiatry",
      earNoseAndThroat: "ENT" || "Otolaryngology" || "Otorhinolaryngology",
      Anaesthesiology: "Anaesthesiology",
      Radiology: "Radiology",
      Ophthalmology: "Ophthalmology",
      Dermatology: "Dermatology",
      Hematology: "Hematology",
      anatomicPathology: "Anatomic Pathology",
      chemicalPathology: "Chemical Pathology",
      Microbiology: "Microbiology"
    };
    UserAcademicStatus = {
      professor: "professor",
      associateProfessor: "associate professor",
      lecturerI: "lecturer i",
      lecturerII: "lecturer ii",
      assistantLecturer: "assistant lecturer",
      resident: "resident",
      student: "student"
    };
    UserDepartmentRole = {
      headOfDepartment: "head of department",
      deanOfFaculty: "dean of faculty",
      examOfficer: "exam officer",
      financeOfficer: "finance officer",
      levelCordinator: "level coordinator"
    };
    UserSchema = new Schema({
      name: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: false,
        sparse: true
      },
      idNumber: {
        type: String,
        // unique: false,
        //enum: Object.values(UserIDs), // Ensure the idNumber can only be one of the specified values in UserIDs
        default: UserIDs.STUDENTID
        // Default to STUDENTID if not provided, but can be overridden..
      },
      password: {
        type: String,
        required: true
        // minlength: 6
      },
      role: {
        type: String,
        enum: Object.values(UserRole),
        required: true,
        default: UserRole.STUDENT
      },
      department: {
        type: String,
        default: null
      },
      departmentId: {
        type: mongoose2.Schema.Types.ObjectId,
        ref: "Department",
        default: null
      },
      isActive: {
        type: Boolean,
        default: true
      },
      approvalStatus: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "approved"
      },
      approvedAt: {
        type: Date,
        default: null
      },
      approvedBy: {
        type: mongoose2.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      profileImage: {
        type: String,
        default: null
      },
      studentClasses: {
        type: mongoose2.Schema.Types.ObjectId,
        ref: "Class"
        // default: null
      },
      teacherSubject: [{
        type: mongoose2.Schema.Types.ObjectId,
        // This field points to Course (your “subjets” implementation lives under courses.ts)
        ref: "Course",
        default: null
      }],
      parentStudents: [{
        type: mongoose2.Schema.Types.ObjectId,
        ref: "User",
        default: null
      }],
      academicStatus: {
        type: String,
        enum: Object.values(UserAcademicStatus),
        default: null
      },
      departmentRole: {
        type: String,
        enum: Object.values(UserDepartmentRole),
        default: null
      },
      // Optional contact phone for supervisors
      phone: {
        type: String,
        default: null
      },
      isSupervisor: {
        type: Boolean,
        default: false
      },
      supervisorRank: {
        //should return a number value based on the User's academicStatus value, let's do a little something to make that happen here: 
        type: Number,
        default: null
      },
      supervisorStudents: [{
        type: mongoose2.Schema.Types.ObjectId,
        ref: "User",
        default: []
      }],
      specialties: [{
        type: String,
        default: []
      }],
      attendance: [{
        type: mongoose2.Schema.Types.ObjectId,
        ref: "Attendance",
        default: []
      }],
      // Add these fields to your existing UserSchema definition before "timestamps: true"
      mordred_rules: {
        max_ticket_capacity: { type: Number, default: 5 },
        current_active_load: { type: Number, default: 0 },
        can_approve_logbooks: { type: Boolean, default: false },
        can_edit_timetables: { type: Boolean, default: false }
      },
      mordred_assigned_tasks: [{
        task_type: { type: String, uppercase: true },
        // e.g., "LOGBOOK_REVIEW", "TICKET"
        reference_id: { type: mongoose2.Schema.Types.ObjectId },
        assigned_at: { type: Date, default: Date.now }
      }]
    }, {
      timestamps: true
    });
    UserSchema.pre("save", async function() {
      if (!this.isModified("password")) return;
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    });
    UserSchema.methods.matchPassword = async function(enteredPassword) {
      return await bcrypt.compare(enteredPassword, this.password);
    };
    User = mongoose2.model("User", UserSchema);
    user_default = User;
  }
});

// src/models/notification.ts
var notification_exports = {};
__export(notification_exports, {
  Notification: () => Notification
});
import mongoose4, { Schema as Schema3 } from "mongoose";
var NotificationSchema, Notification;
var init_notification = __esm({
  "src/models/notification.ts"() {
    NotificationSchema = new Schema3(
      {
        userId: { type: Schema3.Types.ObjectId, ref: "User", required: true, index: true },
        role: {
          type: String,
          enum: ["admin", "teacher", "student", "parent", "unitconsultant", "unitresident"],
          required: true,
          index: true
        },
        title: { type: String, required: true },
        message: { type: String, required: true },
        type: {
          type: String,
          enum: ["info", "warning", "success", "error", "attendance", "timetable", "system"],
          default: "info"
        },
        actorName: { type: String, index: true },
        actorRole: {
          type: String,
          enum: ["admin", "teacher", "student", "parent", "unitconsultant", "unitresident"],
          index: true
        },
        isRead: { type: Boolean, default: false, index: true },
        link: { type: String },
        metadata: { type: Schema3.Types.Mixed }
      },
      { timestamps: true }
    );
    NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
    Notification = mongoose4.model("Notification", NotificationSchema);
  }
});

// src/models/activitieslog.ts
import mongoose5, { Schema as Schema4 } from "mongoose";
var ActivityLogSchema, activitieslog_default;
var init_activitieslog = __esm({
  "src/models/activitieslog.ts"() {
    ActivityLogSchema = new Schema4(
      {
        user: { type: Schema4.Types.ObjectId, required: true, ref: "User" },
        action: { type: String, required: true },
        details: { type: String }
      },
      {
        timestamps: true
      }
    );
    activitieslog_default = mongoose5.model(
      "ActivitiesLog",
      ActivityLogSchema
    );
  }
});

// src/utils/activitieslog.ts
import mongoose6 from "mongoose";
var logActivity;
var init_activitieslog2 = __esm({
  "src/utils/activitieslog.ts"() {
    init_activitieslog();
    logActivity = async ({
      userId,
      action,
      details
    }) => {
      if (!mongoose6.Types.ObjectId.isValid(userId)) {
        console.warn(`Invalid userId: ${userId}`);
        return;
      }
      try {
        await activitieslog_default.create({
          user: typeof userId === "string" ? new mongoose6.Types.ObjectId(userId) : userId,
          action,
          details
        });
      } catch (error) {
        console.error(`${error} disrupted activity log.`);
      }
    };
  }
});

// src/models/classes.ts
var classes_exports = {};
__export(classes_exports, {
  default: () => classes_default
});
import mongoose7, { Schema as Schema5 } from "mongoose";
var classSchema, classes_default;
var init_classes = __esm({
  "src/models/classes.ts"() {
    classSchema = new Schema5(
      {
        name: {
          type: String,
          required: [true, "Class name required"],
          trim: true
        },
        // Reference to the Academic Year model
        academicYear: {
          type: Schema5.Types.ObjectId,
          required: true,
          ref: "AcademicYear"
        },
        // Reference to the User model (Teacher role)
        classTeacher: {
          type: Schema5.Types.ObjectId,
          ref: "User",
          default: null
        },
        // Arrays of References to Course model
        courses: [
          {
            type: Schema5.Types.ObjectId,
            ref: "Course"
          }
        ],
        // Arrays of Refernces to User model (Student role)
        students: [
          {
            type: Schema5.Types.ObjectId,
            ref: "User"
          }
        ],
        capacity: {
          type: Number,
          default: 200
        }
      },
      {
        timestamps: true
        // Automatically manages createdAt and updatedAt
      }
    );
    classSchema.index(
      { name: 1, academicYear: 1 },
      { unique: true }
    );
    classes_default = mongoose7.model("Class", classSchema);
  }
});

// src/models/hospitalStaff.ts
var hospitalStaff_exports = {};
__export(hospitalStaff_exports, {
  default: () => hospitalStaff_default
});
import mongoose8, { Schema as Schema6 } from "mongoose";
var HospitalStaffSchema, HospitalStaffModel, hospitalStaff_default;
var init_hospitalStaff = __esm({
  "src/models/hospitalStaff.ts"() {
    HospitalStaffSchema = new Schema6(
      {
        fileNumber: { type: String, required: true, unique: true, trim: true },
        name: { type: String, required: true, trim: true },
        qualification: { type: String, required: true },
        designation: {
          type: String,
          enum: ["Professor", "Reader", "Associate Prof.", "Senior Lecturer", "Lecturer I", "Lecturer II"],
          required: true
        },
        systemRole: {
          type: String,
          enum: ["CONSULTANT", "RESIDENT"],
          default: "CONSULTANT"
        },
        department: { type: String, required: true, trim: true },
        assignedUnits: [
          {
            type: mongoose8.Types.ObjectId,
            ref: "HospitalUnit"
          }
        ],
        email: { type: String, trim: true },
        phone: { type: String, trim: true },
        isActive: { type: Boolean, default: true },
        canApproveLogbooks: { type: Boolean, default: true }
      },
      {
        timestamps: true
      }
    );
    HospitalStaffSchema.index({ department: 1, isActive: 1 });
    HospitalStaffSchema.index({ assignedUnits: 1 });
    HospitalStaffSchema.index({ systemRole: 1, canApproveLogbooks: 1 });
    HospitalStaffModel = mongoose8.model(
      "HospitalStaff",
      HospitalStaffSchema,
      "hospital_staff"
    );
    hospitalStaff_default = HospitalStaffModel;
  }
});

// src/inngest/client.ts
import { Inngest } from "inngest";
var inngest;
var init_client = __esm({
  "src/inngest/client.ts"() {
    inngest = new Inngest({ id: "medlog-lms", isDev: true });
  }
});

// src/models/timetable.ts
var timetable_exports = {};
__export(timetable_exports, {
  default: () => timetable_default
});
import mongoose9, { Schema as Schema7 } from "mongoose";
var timetableSchema, timetable_default;
var init_timetable = __esm({
  "src/models/timetable.ts"() {
    timetableSchema = new Schema7(
      {
        class: {
          type: mongoose9.Types.ObjectId,
          ref: "Class",
          required: true
        },
        academicYear: {
          type: mongoose9.Types.ObjectId,
          ref: "AcademicYear",
          required: true
        },
        schedule: [
          {
            day: { type: String, required: true },
            periods: [
              {
                // Timetable periods now point to embedded subjects inside Course
                subject: { type: mongoose9.Types.ObjectId, ref: "Course", default: null },
                lecturer: { type: mongoose9.Types.ObjectId, ref: "User", default: null },
                startTime: String,
                endTime: String,
                isClinical: { type: Boolean, default: false },
                isOptional: { type: Boolean, default: false },
                displayLabel: { type: String, default: null }
              }
            ]
          }
        ]
      },
      { timestamps: true }
    );
    timetableSchema.index(
      {
        class: 1,
        academicYear: 1
      },
      { unique: true }
    );
    timetable_default = mongoose9.model("Timetable", timetableSchema);
  }
});

// src/models/exam.ts
import mongoose10, { Schema as Schema8 } from "mongoose";
var examSchema, exam_default;
var init_exam = __esm({
  "src/models/exam.ts"() {
    examSchema = new Schema8(
      {
        title: { type: String, required: true },
        course: { type: Schema8.Types.ObjectId, ref: "Course", required: true },
        class: { type: Schema8.Types.ObjectId, ref: "Class", required: true },
        lecturer: { type: Schema8.Types.ObjectId, ref: "User", required: true },
        duration: { type: Number, required: true },
        dueDate: { type: Date, required: true },
        isActive: { type: Boolean, default: true },
        questions: [
          {
            questionText: { type: String, required: true },
            type: { type: String, enum: ["MCQ", "SHORT_ANSWER", "ESSAY"], default: "MCQ" },
            options: [{ type: String }],
            correctAnswer: { type: String, select: false },
            points: { type: Number, default: 1 }
          }
        ],
        courseSubjects: [{ type: Schema8.Types.ObjectId, ref: "Subject" }]
      },
      { timestamps: true }
    );
    exam_default = mongoose10.model("Exam", examSchema);
  }
});

// src/models/attendance.ts
import mongoose11, { Schema as Schema9 } from "mongoose";
var AttendanceSchema, attendance_default;
var init_attendance = __esm({
  "src/models/attendance.ts"() {
    AttendanceSchema = new Schema9(
      {
        student: {
          type: mongoose11.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        lecturer: {
          type: mongoose11.Schema.Types.ObjectId,
          ref: "User",
          default: null
        },
        course: {
          type: mongoose11.Schema.Types.ObjectId,
          ref: "Course",
          required: true
        },
        class: {
          type: mongoose11.Schema.Types.ObjectId,
          ref: "Class",
          required: true
        },
        academicYear: {
          type: mongoose11.Schema.Types.ObjectId,
          ref: "AcademicYear",
          required: true
        },
        date: {
          type: Date,
          required: true,
          default: Date.now
        },
        dayOfWeek: {
          type: String,
          enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          required: true
        },
        status: {
          type: String,
          enum: ["present", "absent", "late", "excused"],
          required: true,
          default: "present"
        },
        notes: {
          type: String,
          default: ""
        },
        approvedBy: {
          type: mongoose11.Schema.Types.ObjectId,
          ref: "User",
          default: null
        },
        lecturerApproval: {
          type: String,
          enum: ["approved", "not-approved", null],
          default: null
        },
        lecturerApprovalDate: {
          type: Date,
          default: null
        },
        hodApproval: {
          type: String,
          enum: ["approved", "not-approved", null],
          default: null
        },
        hodApprovalDate: {
          type: Date,
          default: null
        }
      },
      {
        timestamps: true
      }
    );
    attendance_default = mongoose11.model("Attendance", AttendanceSchema);
  }
});

// src/utils/500LevelTimetable.ts
function normalize(value) {
  return String(value ?? "").trim().toUpperCase();
}
function findCourseForCode(courses, code) {
  const target = normalize(code);
  return courses.find((course) => normalize(course.code) === target) ?? null;
}
function findCourseForName(courses, keywords) {
  const normalizedKeywords = keywords.map(normalize);
  return courses.find((course) => {
    const name = normalize(course.name);
    return normalizedKeywords.some((keyword) => name.includes(keyword));
  }) ?? null;
}
function resolve500LevelCourse(courses, code) {
  const exact = findCourseForCode(courses, code);
  if (exact) return exact;
  const fallback = findCourseForName(courses, COURSE_TOKEN_MAP[code] ?? []);
  return fallback ?? null;
}
function makePeriod(kind, startTime, endTime, courseCode = null, options = {}) {
  return {
    kind,
    startTime,
    endTime,
    courseCode,
    ...options
  };
}
function build500LevelTimetablePlan(clockPhase, courses = []) {
  const phase = (clockPhase || "phase1").toLowerCase();
  const buildPhase1 = () => DAYS.map((day) => {
    if (day === "Friday") {
      return {
        day,
        periods: [
          makePeriod("course", "08:00", "10:00", "COM"),
          // 8am - 10am: COM
          makePeriod("empty", "10:00", "12:00"),
          // 10am - 12pm: Break
          makePeriod("empty", "12:00", "13:00"),
          // 12pm - 1pm: Blank
          makePeriod("course", "13:00", "15:00", "OBG")
          // 1pm - 3pm: OBG
        ]
      };
    }
    return {
      day,
      periods: [
        makePeriod("course", "08:00", "10:00", "PAE"),
        // 8am - 10am: PAE
        makePeriod("clinical", "10:00", "13:00"),
        // 10am - 1pm: CLINICAL
        makePeriod("empty", "13:00", "13:30"),
        // 1pm - 1:30pm: Break
        makePeriod("course", "13:30", "15:00", "OBG")
        // 1:30pm - 3pm: OBG
      ]
    };
  });
  const buildPhase2 = () => DAYS.map((day, index) => {
    const specialtyCode = ["OPH", "ANE", "ORL", "RAD", "PSY"][index] ?? "OPH";
    return {
      day,
      periods: [
        makePeriod("course", "08:00", "10:00", specialtyCode),
        // 8am - 10am: Specialty rotating
        makePeriod("clinical", "10:00", "12:00"),
        // 10am - 12pm: CLINICAL
        makePeriod("optional", "12:00", "15:00", null, { isOptional: true, displayLabel: "Tutorials/Presentations" }),
        makePeriod("optional", "15:00", "18:00", null, { isOptional: true, displayLabel: "Call Duty/Tutorials" })
      ]
    };
  });
  const buildPhase3 = () => DAYS.map((day) => {
    if (day === "Friday") {
      return {
        day,
        periods: [
          makePeriod("course", "08:00", "10:00", "COM"),
          // 8am - 10am: COM
          makePeriod("empty", "10:00", "12:00"),
          // 10am - 12pm: Break
          makePeriod("empty", "12:00", "13:00"),
          // 12pm - 1pm: Blank
          makePeriod("course", "13:00", "15:00", "OBG")
          // 1pm - 3pm: OBG
        ]
      };
    }
    return {
      day,
      periods: [
        makePeriod("empty", "08:00", "10:00"),
        // 8am - 10am: Morning meetings (empty period)
        makePeriod("clinical", "10:00", "13:00"),
        // 10am - 1pm: CLINICAL
        makePeriod("empty", "13:00", "13:30"),
        // 1pm - 1:30pm: Break
        makePeriod("course", "13:30", "15:00", "OBG")
        // 1:30pm - 3pm: OBG
      ]
    };
  });
  const buildPhase4 = () => DAYS.map((day) => ({
    day,
    periods: [
      makePeriod("empty", "08:00", "10:00"),
      makePeriod("empty", "10:00", "12:00"),
      makePeriod("empty", "12:00", "15:00")
    ]
  }));
  if (phase === "phase2") return buildPhase2();
  if (phase === "phase3") return buildPhase3();
  if (phase === "phase4") return buildPhase4();
  return buildPhase1();
}
var DAYS, COURSE_TOKEN_MAP;
var init_LevelTimetable = __esm({
  "src/utils/500LevelTimetable.ts"() {
    DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    COURSE_TOKEN_MAP = {
      PAE: ["PAE", "PEDIATRICS"],
      OBG: ["OBG", "OBSTETRICS", "OBSTETRICSANDGYNECOLOGY"],
      COM: ["COM", "COMMUNITY MEDICINE"],
      OPH: ["OPH", "OPHTHALMOLOGY"],
      ANE: ["ANE", "ANAESTHESIOLOGY", "ANAESTHESIA"],
      ORL: ["ORL", "ENT", "EAR NOSE AND THROAT"],
      RAD: ["RAD", "RADIOLOGY"],
      PSY: ["PSY", "PSYCHIATRY"]
    };
  }
});

// src/services/mordredEngine.ts
import mongoose12 from "mongoose";
async function routeTaskToStaff(departmentName, taskType, referenceId) {
  try {
    const permissionKey = `mordred_rules.${taskType}`;
    const queryFilter = {
      // 1. Target only active personnel roles from your UserRole enum
      role: { $in: ["teacher", "unitconsultant", "unitresident"] },
      // 2. Match the exact string name from your UserDepartmentName mapping
      department: departmentName,
      isActive: true,
      // 3. Ensure the individual is permitted for this type of task
      [permissionKey]: true,
      // 4. Load checking logic
      $expr: {
        $lt: ["$mordred_rules.current_active_load", "$mordred_rules.max_ticket_capacity"]
      }
    };
    const assignedStaff = await user_default.findOneAndUpdate(
      queryFilter,
      {
        $inc: { "mordred_rules.current_active_load": 1 },
        $push: {
          mordred_assigned_tasks: {
            task_type: taskType.toUpperCase(),
            reference_id: new mongoose12.Types.ObjectId(referenceId),
            assigned_at: /* @__PURE__ */ new Date()
          }
        }
      },
      { returnDocument: "after" }
    );
    return assignedStaff;
  } catch (error) {
    console.error("MORDRED Automation Core Error:", error);
    throw error;
  }
}
var init_mordredEngine = __esm({
  "src/services/mordredEngine.ts"() {
    init_user();
  }
});

// src/inngest/functions.ts
import mongoose13 from "mongoose";
import { NonRetriableError } from "inngest";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
var generateTimeTable, generateExam, generateAttendance, bulkCreateUsers, rotationNotify, automaticPostingNotification, mordredTicketSentry, whatsappLectureAlert;
var init_functions = __esm({
  "src/inngest/functions.ts"() {
    init_client();
    init_classes();
    init_user();
    init_timetable();
    init_exam();
    init_attendance();
    init_activitieslog2();
    init_LevelTimetable();
    init_mordredEngine();
    generateTimeTable = inngest.createFunction(
      {
        id: "Generate-Timetable",
        triggers: {
          event: "generate/timetable"
        }
      },
      async ({ event, step }) => {
        const { classId, academicYearId, academicYear: academicYear2, settings } = event.data;
        const classIdValue = typeof classId === "object" ? classId._id ?? classId.id : classId;
        const academicYearIdValue = academicYearId ?? (typeof academicYear2 === "object" ? academicYear2._id ?? academicYear2.id : academicYear2);
        if (!classIdValue || !academicYearIdValue) {
          throw new NonRetriableError("classId and academicYearId are required");
        }
        const contextData = await step.run("fetch-class-context", async () => {
          const classData = await classes_default.findById(classIdValue).populate("courses");
          if (!classData) throw new NonRetriableError(`Class not found`);
          const allTeachersAndLecturers = await user_default.find({ role: "teacher" });
          const topLevelCourses = classData.courses ?? [];
          const embeddedSubjects = topLevelCourses.flatMap(
            (c) => (c?.subjects ?? []).map((s) => ({
              id: String(s?.subjectID ?? s?._id),
              name: s?.name,
              code: s?.code,
              // lecturer ids assigned for this subject
              lecturerIds: Array.isArray(s?.lecturer) ? s.lecturer.map((x) => String(x)) : []
            }))
          );
          const qualifiedTeachers = allTeachersAndLecturers.filter((lecturer) => {
            if (!lecturer?.teacherSubject) return false;
            return topLevelCourses.some((tc) => lecturer?.teacherSubject.some((subId) => String(subId) === String(tc._id)));
          }).map((tea) => ({
            id: String(tea._id),
            idNumber: tea.idNumber,
            name: tea.name,
            // AI needs to know which subject ids this teacher can teach.
            // Since we can't reliably derive subject-level permissions here without joining,
            // we provide an empty list and rely on the prompt rules + aiSchedule output.
            courses: []
          }));
          return {
            className: classData.name,
            // expose embedded subjects as courses for AI naming consistency
            courses: embeddedSubjects.map((s) => ({ id: s.id, name: s.name, code: s.code })),
            lecturers: qualifiedTeachers
          };
        });
        const is400Level = /^400\s*level/i.test(contextData.className);
        const is500Level = /^500\s*level/i.test(contextData.className);
        const isClinicalLevel = is400Level || is500Level;
        const clinicalEndTime = is500Level ? "13:00" : "12:00";
        const aiSchedule = await step.run("generate-timetable-logic", async () => {
          if (is500Level) {
            const plan = build500LevelTimetablePlan(settings?.clockPhase, contextData.courses);
            return {
              schedule: plan.map(({ day, periods }) => ({
                day,
                periods: periods.map((period) => {
                  const course = period.courseCode ? resolve500LevelCourse(contextData.courses, period.courseCode) : null;
                  return {
                    courseId: course?.id ?? null,
                    lecturer: null,
                    startTime: period.startTime,
                    endTime: period.endTime,
                    isClinical: period.kind === "clinical",
                    isOptional: period.kind === "optional" || period.isOptional,
                    displayLabel: period.displayLabel ?? (period.kind === "optional" ? "Optional Activity" : void 0)
                  };
                })
              }))
            };
          }
          const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
          if (!apiKey) {
            throw new NonRetriableError("GOOGLE_GENERATIVE_AI_API_KEY is missing! (!-_-)");
          }
          const allTimeTables = await timetable_default.find({
            academicYear: academicYearIdValue
          });
          let prompt = "";
          if (is400Level) {
            prompt = `
        You are a University Timetable Scheduler.
        Generate a FIXED weekly timetable for 400 Level Class (Monday to Friday).

        CONTEXT:
        - Class: ${contextData.className}
        - Hours: 08:00 to 17:00 (8am to 5pm)

        RESOURCES:
        - Courses: ${JSON.stringify(contextData.courses)}
        - Lecturers: ${JSON.stringify(contextData.lecturers)}

        MANDATORY FIXED SCHEDULE FOR 400 LEVEL CLASS:

        MONDAY TO THURSDAY (8am-10am - FIXED):
        - Monday & Wednesday: 
          * 08:00-09:00: Medicine Course
          * 09:00-10:00: Surgery Course
        - Tuesday & Thursday:
          * 08:00-09:00: Surgery Course
          * 09:00-10:00: Medicine Course

        CLINICAL ACTIVITIES (Monday to Friday):
        - 10:00-12:00: Clinical Activities (use courseId: "CLINICAL_ACTIVITIES", lecturer: null)

        AFTER CLINICAL (12pm-5pm):
        - Monday: Chemical Pathology Course (12:00-14:00) + Practicals (14:00-17:00)
        - Tuesday: Medical Microbiology Course (12:00-14:00) + Practicals (14:00-17:00)
        - Wednesday: Hematology Course (12:00-14:00) + Practicals (14:00-17:00)
        - Thursday: Histopathology Course (12:00-14:00) + Practicals (14:00-17:00)

        FRIDAY (8am-5pm):
        - 08:00-10:00: Community Medicine Course
        - 10:00-14:00: Pharmacology Course
        - 14:00-17:00: Pharmacology Practicals

        IMPORTANT RULES:
        1. STRICTLY follow the above schedule - do not deviate.
        2. Find matching courses from the RESOURCES list (e.g., "Medicine", "Surgery", "Chemical Pathology", etc.).
        3. For Practicals periods: use the corresponding course but mark as practical (same courseId).
        4. Clinical Activities periods: use courseId "CLINICAL_ACTIVITIES" with lecturer null.
        5. Match lecturer IDs from the lecturer list who teach these courses.
        6. OUTPUT strict JSON only. Schema:
        {
          "schedule": [
            {
              "day": "Monday",
              "periods": [
              { "courseId": "COURSE_ID", "lecturer": "LECTURER_ID", "startTime": "HH:MM", "endTime": "HH:MM" }
              ]
            }
          ]
        }
        Use the lecturer's id from the lecturer list. Match the courseId with the id from the courses list.
        `;
          } else {
            const clinicalSlotInstruction = isClinicalLevel ? `

        CLINICAL ACTIVITIES SLOT (REQUIRED):
        - For ${contextData.className}, you MUST add a "Clinical Activities" period on EACH weekday (Monday to Friday).
        - The clinical slot must be from 10:00 AM to ${clinicalEndTime} (${is500Level ? "3 hours" : "2 hours"}).
        - Use courseId: "CLINICAL_ACTIVITIES" for this special entry (it is not a real course, just a placeholder for clinical activities).
        - Lecturer field can be null or "CLINICAL_SUPERVISOR" for this slot.
        - This slot should be the THIRD period of the day (after 2 regular periods).
        - Example period: { "courseId": "CLINICAL_ACTIVITIES", "lecturer": null, "startTime": "10:00", "endTime": "${clinicalEndTime}" }
        ` : "";
            prompt = `
        You are a University Timetable Scheduler.
        Generate a weekly timetable (Monday to Friday).

        CONTEXT:
        - Class: ${contextData.className}
        - Hours: ${settings.startTime} to ${settings.endTime} (Total ${settings.periods} periods per day).

        RESOURCES:
        - Courses: ${JSON.stringify(contextData.courses)}
        - Lecturers: ${JSON.stringify(contextData.lecturers)}
        - Other Timetables: ${JSON.stringify(allTimeTables)}
        ${clinicalSlotInstruction}

        STRICT RULES:

        1. Assign a Lecturer to every Course period.
        2. Lecturer MUST have the course ID in their courses list.
        3. Break Time/free period after every 2 periods (10 minutes), Lunch time after 5 periods (at 12:00) (30 minutes).
        4. Avoid clashes with other classes (lecturer cannot be in two classes at the same time).
        5. OUTPUT strict JSON only. Schema:
        {
          "schedule": [
            {
              "day": "Monday",
              "periods": [
              { "courseId": "COURSE_ID", "lecturer": "LECTURER_ID", "startTime": "HH:MM", "endTime": "HH:MM" }
              ]
            }
          ]
        }
        Use the lecturer's id from the lecturer list in the response. Not the lecturer's idNumber or name. Match the courseId with the id from the courses list in the response.
        `;
          }
          const google2 = createGoogleGenerativeAI({
            apiKey
          });
          const activeModel = google2("gemini-3-flash-preview");
          const { text } = await generateText({
            prompt,
            model: activeModel
          });
          const cleanJSON = text.replace(/```json/g, "").replace(/```/g, "").replace(/'''json/g, "").replace(/'''/g, "").replace(/`/g, "").trim();
          return JSON.parse(cleanJSON);
        });
        const savedTimetable = await step.run("save-timetable", async () => {
          await timetable_default.findOneAndDelete({
            class: classIdValue,
            academicYear: academicYearIdValue
          });
          const mappedSchedule = (aiSchedule.schedule ?? []).map((day) => ({
            day: day.day,
            periods: (day.periods ?? []).map((period) => {
              const courseIdRaw = period?.courseId;
              const courseIdNormalized = typeof courseIdRaw === "string" ? courseIdRaw.trim().toUpperCase() : courseIdRaw;
              if (courseIdNormalized === "CLINICAL_ACTIVITIES") {
                return {
                  subject: null,
                  lecturer: null,
                  startTime: period.startTime,
                  endTime: period.endTime,
                  isClinical: true
                };
              }
              const isValidObjectId = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
              if (!isValidObjectId(String(courseIdRaw))) {
                throw new NonRetriableError(`Invalid subject id returned by AI: ${String(courseIdRaw)}`);
              }
              const lecturerRaw = period?.lecturer;
              const lecturerObjId = isValidObjectId(lecturerRaw) ? new mongoose13.Types.ObjectId(String(lecturerRaw)) : null;
              return {
                subject: new mongoose13.Types.ObjectId(String(courseIdRaw)),
                lecturer: lecturerObjId,
                startTime: period.startTime,
                endTime: period.endTime
              };
            })
          }));
          await timetable_default.create({
            class: classIdValue,
            academicYear: academicYearIdValue,
            schedule: mappedSchedule
          });
          const timetable = await timetable_default.findOne({
            class: classIdValue,
            academicYear: academicYearIdValue
          }).populate("schedule.periods.subject", "name code subjects.subjectID").populate("schedule.periods.lecturer", "name email idNumber");
          if (!timetable) {
            throw new NonRetriableError("Failed to save timetable");
          }
          return { success: true, classId };
        });
        return {
          success: true,
          message: "Timetable generated successfully"
          // timetable: savedTimetable.timetable,
        };
      }
    );
    generateExam = inngest.createFunction(
      {
        id: "Generate-Exam",
        triggers: {
          event: "exam/generate"
        }
      },
      async ({ event, step }) => {
        const { examId, topic, subjectName, difficulty, count } = event.data;
        const aiExam = await step.run("generate-exam-logic", async () => {
          const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
          if (!apiKey) {
            throw new NonRetriableError("GOOGLE_GENERATIVE_AI_API_KEY is missing! (!-_-)");
          }
          const prompt = `
    You are a strict medical Teacher. Create a JSON array of ${count} multiple-choice questions for a Medical School Exam.

      CONTEXT:
    - Subject: ${subjectName}
    - Topic: ${topic}
    - Hours: ${difficulty}

    STRICT JSON SCHEMA (Array of Objects):
    [
      {
        "questionText": "Question string",
        "type": "MCQ",
        "options": [ "Option A", "Option B", "Option C", "Option D", "Option E" ],
        "correctAnswer": "The exact string of the correct option",
        "points": 1
      }
    ]
    RULES:
    1. Output ONLY raw JSON. No Markdown.
    2. Ensure correct answer matches one of the options exactly.
      `;
          const google2 = createGoogleGenerativeAI({
            apiKey
          });
          const activeModel = google2("gemini-3-flash-preview");
          const { text } = await generateText({
            prompt,
            model: activeModel
          });
          const cleanJSON = text.replace(/```json/g, "").replace(/```/g, "").trim();
          return JSON.parse(cleanJSON);
        });
        await step.run("save-exam", async () => {
          const exam = await exam_default.findById(examId);
          if (!exam) {
            throw new NonRetriableError(`Exam ${examId} not found!`);
          }
          exam.questions = aiExam;
          exam.isActive = false;
          await exam.save();
          return { success: true, count: aiExam.length };
        });
        return {
          success: true,
          message: "Exam generated successfully"
        };
      }
    );
    generateAttendance = inngest.createFunction(
      {
        id: "Generate-Attendance",
        triggers: {
          event: "attendance/generate"
        }
      },
      async ({ event, step }) => {
        const { courseId, classId, academicYearId, date } = event.data;
        if (!courseId || !classId || !academicYearId || !date) {
          throw new NonRetriableError("courseId, classId, academicYearId, and date are required");
        }
        const dayMap = {
          0: "Sunday",
          1: "Monday",
          2: "Tuesday",
          3: "Wednesday",
          4: "Thursday",
          5: "Friday",
          6: "Saturday"
        };
        const dateObj = new Date(date);
        if (Number.isNaN(dateObj.getTime())) {
          throw new NonRetriableError("Invalid date format");
        }
        const dayName = dayMap[dateObj.getDay()];
        if (dayName === "Saturday" || dayName === "Sunday") {
          throw new NonRetriableError("Attendance cannot be generated on weekends (Saturday/Sunday)");
        }
        const classData = await step.run("fetch-class-students", async () => {
          const cls = await classes_default.findById(classId).populate("students", "_id name");
          if (!cls) throw new NonRetriableError(`Class not found: ${classId}`);
          return cls;
        });
        const studentIds = classData.students.map((s) => s._id);
        const timetableData = await step.run("fetch-timetable-schedule", async () => {
          const timetable = await timetable_default.findOne({
            class: classId,
            academicYear: academicYearId
          }).populate("schedule.periods.subject", "_id name code").populate("schedule.periods.lecturer", "_id name");
          if (!timetable) {
            throw new NonRetriableError(`NO_TIMETABLE: No timetable found for this class. Please generate a timetable first.`);
          }
          const daySchedule = timetable.schedule.find(
            (d) => d.day?.toLowerCase() === dayName?.toLowerCase()
          );
          if (!daySchedule) {
            throw new NonRetriableError(`NO_SCHEDULE: No schedule found for ${dayName}. The timetable exists but has no periods on this day.`);
          }
          const courseStr = courseId.toString();
          const matchingPeriods2 = daySchedule.periods.filter(
            (p) => p.subject?._id?.toString() === courseStr
          );
          if (matchingPeriods2.length === 0) {
            const availableSubjects = daySchedule.periods.map((p) => p.subject?.name ?? p.subject?.code ?? "Unknown").filter(Boolean);
            const hint = availableSubjects.length > 0 ? ` Available courses on ${dayName}: ${[...new Set(availableSubjects)].join(", ")}.` : "";
            throw new NonRetriableError(
              `NO_PERIOD: No period found for the selected course on ${dayName}. Please verify the course was added to the ${dayName} schedule in the timetable.${hint}`
            );
          }
          return { daySchedule, matchingPeriods: matchingPeriods2 };
        });
        const { matchingPeriods } = timetableData;
        const duplicateCheck = await step.run("check-duplicate", async () => {
          const startOfDay = new Date(dateObj);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(startOfDay);
          endOfDay.setDate(endOfDay.getDate() + 1);
          const deleted = await attendance_default.deleteMany({
            class: classId,
            course: courseId,
            date: { $gte: startOfDay, $lt: endOfDay }
          });
          return { deletedCount: deleted.deletedCount };
        });
        const createdRecords = await step.run("create-attendance-records", async () => {
          const lecturer = matchingPeriods[0]?.lecturer?._id ?? null;
          const records = await Promise.all(
            studentIds.map(
              (studentId) => attendance_default.create({
                student: studentId,
                lecturer,
                course: courseId,
                class: classId,
                academicYear: academicYearId,
                date: dateObj,
                dayOfWeek: dayName,
                status: "present"
              })
            )
          );
          return records;
        });
        await step.run("log-activity", async () => {
          await logActivity({
            userId: event.data.userId ?? "system",
            action: "Generated attendance list",
            details: `Attendance list generated for ${classData.name} on ${new Date(date).toDateString()}, course ${courseId}. ${studentIds.length} student(s).`
          });
        });
        return {
          success: true,
          message: `Attendance list generated for ${classData.name} on ${dayName}`,
          count: studentIds.length
        };
      }
    );
    bulkCreateUsers = inngest.createFunction(
      { id: "Bulk-Create-Users", triggers: { event: "users/bulk-create" } },
      async ({ event, step }) => {
        const { users, classId, courseIds, userId } = event.data;
        if (!users || users.length === 0) {
          throw new NonRetriableError("No users provided.");
        }
        const results = await step.run("bulk-create-users", async () => {
          const created = [];
          const skipped = [];
          const errors = [];
          const rolePrefixes = {
            teacher: "UJ0000TE",
            parent: "UJ0000PA",
            admin: "UJ0000AD",
            student: "UJ0000ST"
          };
          const fallbackIdNumbers = {};
          for (const [r, prefix] of Object.entries(rolePrefixes)) {
            const lastUser = await user_default.findOne({ idNumber: { $regex: `^${prefix}` } }).sort({ createdAt: -1 }).lean();
            if (lastUser && lastUser.idNumber) {
              const num = parseInt(lastUser.idNumber.slice(-4)) + 1;
              fallbackIdNumbers[r] = `${prefix}${num.toString().padStart(4, "0")}`;
            } else {
              fallbackIdNumbers[r] = `${prefix}0001`;
            }
          }
          for (const u of users) {
            try {
              const idNumber = u.idNumber?.trim() || (() => {
                const prefixMap = { student: "UJ0000ST", teacher: "UJ0000TE", parent: "UJ0000PA", admin: "UJ0000AD" };
                const prefix = prefixMap[u.role] ?? "UJ0000ST";
                const currentNum = parseInt(fallbackIdNumbers[u.role]?.slice(-4) || "0");
                const nextNum = (currentNum + 1).toString().padStart(4, "0");
                fallbackIdNumbers[u.role] = `${prefix}${nextNum}`;
                return fallbackIdNumbers[u.role];
              })();
              const email = u.email?.trim() || u.name.toLowerCase().replace(/\s+/g, ".") + "@school.edu";
              const studentClasses = u.role === "student" && classId ? classId : void 0;
              const teacherSubject = u.role === "teacher" && courseIds ? courseIds : void 0;
              if (u.idNumber?.trim()) {
                await user_default.findOneAndDelete({ idNumber: u.idNumber.trim() });
              }
              await user_default.findOneAndDelete({ email });
              const newUser = await user_default.create({
                name: u.name,
                email,
                idNumber,
                role: u.role,
                password: "password",
                studentClasses,
                teacherSubject
              });
              if (!newUser) {
                throw new Error("Failed to create user");
              }
              if (u.role === "student" && classId) {
                await classes_default.findByIdAndUpdate(classId, { $addToSet: { students: new mongoose13.Types.ObjectId(newUser._id) } }, { returnDocument: "after" });
              }
              created.push(newUser.email);
            } catch (err) {
              errors.push(`'${u.name}': ${err.message}`);
            }
          }
          return { created, skipped, errors };
        });
        await step.run("log-activity", async () => {
          await logActivity({
            userId: userId ?? "system",
            action: "Bulk uploaded users",
            details: `Bulk upload: ${results.created.length} created, ${results.skipped.length} skipped, ${results.errors.length} errors.`
          });
        });
        return {
          success: true,
          created: results.created.length,
          skipped: results.skipped,
          errors: results.errors
        };
      }
    );
    rotationNotify = inngest.createFunction(
      {
        id: "Rotation-Notify",
        triggers: {
          event: "rotation/notify"
        }
      },
      async ({ event, step }) => {
        const payload = event.data;
        if (!payload?.userId || !payload?.title || !payload?.message) {
          throw new NonRetriableError("Invalid notification payload");
        }
        await step.run("create-notification", async () => {
          const { Notification: Notification2 } = await Promise.resolve().then(() => (init_notification(), notification_exports));
          await Notification2.create({
            userId: new mongoose13.Types.ObjectId(payload.userId),
            role: "student",
            title: payload.title,
            message: payload.message,
            type: "timetable",
            isRead: false,
            link: payload.metadata?.link || null,
            metadata: payload.metadata || {}
          });
          return { ok: true };
        });
        return { success: true };
      }
    );
    automaticPostingNotification = inngest.createFunction(
      {
        id: "Mordred-Auto-Posting-Assignment",
        triggers: {
          event: "mordred/auto-posting-assignment"
        }
      },
      async ({ event, step }) => {
        const { studentId, departmentName, hospitalUnitId } = event.data;
        const student = await step.run("fetch-student-profile", async () => {
          return await user_default.findById(studentId).select("name email deviceToken");
        });
        if (!student) return { success: false, error: "Student not found" };
        const assignedStaff = await step.run("mordred-assign-supervisor", async () => {
          return await routeTaskToStaff(departmentName, "can_approve_logbooks", hospitalUnitId);
        });
        await step.run("send-push-notifications", async () => {
          console.log(`\u{1F916} MORDRED: Posting established. Notified ${student.name}. Supervisor assigned: ${assignedStaff?.name || "None"}`);
        });
        return { success: true, supervisorId: assignedStaff?._id };
      }
    );
    mordredTicketSentry = inngest.createFunction(
      {
        id: "Mordred-Ticket-Escalation-Sentry",
        triggers: {
          event: "mordred/ticket-escalation-sentry"
        }
      },
      async ({ event, step }) => {
        const { ticketId, departmentName } = event.data;
        await step.sleep("wait-twelve-hours", "12h");
        const structuralAlertNeeded = await step.run("check-ticket-status", async () => {
          const mongoose37 = __require("mongoose");
          const Ticket = mongoose37.model("mordred_tickets");
          const ticket = await Ticket.findById(ticketId);
          return ticket && ticket.status === "OPEN" && !ticket.assigned_staff_id;
        });
        if (structuralAlertNeeded) {
          await step.run("escalate-to-super-admin", async () => {
            console.log(`\u{1F6A8} MORDRED Sentry: Ticket ${ticketId} remained unresolved for 12 hours. Escalaning to Super Admin.`);
          });
        }
        return { evaluated: true, escalated: structuralAlertNeeded };
      }
    );
    whatsappLectureAlert = inngest.createFunction(
      {
        id: "mordred-whatsapp-lecture-alert",
        triggers: {
          event: "medlog/lecture.updated"
        }
      },
      async ({ event, step }) => {
        const { className, lectureTitle, status, materialUrl, whatsappGroupId } = event.data;
        const compiledAlertString = `\u{1F916} *M.O.R.D.R.E.D. System Update* \u{1F916}

\u{1F4DA} *Class:* ${className}
\u{1F4DD} *Lecture:* ${lectureTitle}
\u26A0\uFE0F *Status Change:* ${status.toUpperCase()}
${materialUrl ? `\u{1F4CE} *Materials:* ${materialUrl}` : ""}`;
        await step.run("dispatch-whatsapp-payload", async () => {
          console.log(`\u{1F4E1} MORDRED broadcasted update directly to WhatsApp Group: ${whatsappGroupId}`);
        });
        return { dispatched: true };
      }
    );
  }
});

// src/inngest/index.ts
var inngest_exports = {};
__export(inngest_exports, {
  automaticPostingNotification: () => automaticPostingNotification,
  bulkCreateUsers: () => bulkCreateUsers,
  generateAttendance: () => generateAttendance,
  generateExam: () => generateExam,
  generateTimeTable: () => generateTimeTable,
  inngest: () => inngest,
  mordredTicketSentry: () => mordredTicketSentry
});
import "inngest";
var init_inngest = __esm({
  "src/inngest/index.ts"() {
    init_client();
    init_functions();
  }
});

// src/models/academicYear.ts
var academicYear_exports = {};
__export(academicYear_exports, {
  default: () => academicYear_default
});
import mongoose15, { Schema as Schema10 } from "mongoose";
var academicYearSchema, academicYear_default;
var init_academicYear = __esm({
  "src/models/academicYear.ts"() {
    academicYearSchema = new Schema10(
      {
        name: { type: String, required: true },
        fromYear: { type: Date, required: true },
        toYear: { type: Date, required: true },
        isCurrent: { type: Boolean, default: false },
        clockStartDate: { type: Date, default: null },
        clockIsPaused: { type: Boolean, default: false },
        clockPausedAt: { type: Date, default: null },
        clockPhase: {
          type: String,
          default: null
        },
        classClockData: {
          type: Schema10.Types.Mixed,
          default: {}
        }
      },
      { timestamps: true }
    );
    academicYearSchema.index({ name: 1 }, { unique: true });
    academicYear_default = mongoose15.model(
      "AcademicYear",
      academicYearSchema
    );
  }
});

// src/models/clinicalRotation.ts
import mongoose23, { Schema as Schema16 } from "mongoose";
var RotationActivitiesSchema, PatientClerkedSchema, procredureAction, ProceduresWatchedAssistedOrPerformedSchema, PracticalsPerformedSchema, UnitActivitiesSchema, ClinicalRotationsSchema, clinicalRotation_default;
var init_clinicalRotation = __esm({
  "src/models/clinicalRotation.ts"() {
    RotationActivitiesSchema = new Schema16(
      {
        numberOfWeeks: { type: Number, default: 0 },
        numberOfConsultantWardRound: { type: Number, default: 0 },
        numberOfClinics: { type: Number, default: 0 },
        numberOfResidentWardRound: { type: Number, default: 0 },
        numberOfCallDuty: { type: Number, default: 0 },
        numberOfTheatreDays: { type: Number, default: 0 }
      },
      { _id: false }
    );
    PatientClerkedSchema = new Schema16(
      {
        patientName: { type: String },
        diagnosis: { type: String },
        clerkedAt: { type: Date, default: () => /* @__PURE__ */ new Date() },
        notes: { type: String }
      },
      { _id: false }
    );
    procredureAction = {
      performed: "performed",
      assisted: "assisted",
      watched: "watched"
    };
    ProceduresWatchedAssistedOrPerformedSchema = new Schema16(
      {
        procedureName: { type: String, required: true, default: "" },
        action: {
          type: String,
          enum: Object.values(procredureAction),
          required: true,
          default: procredureAction.watched
        },
        date: { type: Date, default: () => /* @__PURE__ */ new Date(), required: true },
        notes: { type: String, default: "" }
      },
      { _id: false }
    );
    PracticalsPerformedSchema = new Schema16(
      {
        practicalName: { type: String, required: true, default: "" },
        coursseId: { type: mongoose23.Schema.Types.ObjectId, ref: "Course", required: true },
        performedAt: { type: Date, default: () => /* @__PURE__ */ new Date(), required: true },
        notes: { type: String, default: "" }
      },
      { _id: false }
    );
    UnitActivitiesSchema = new Schema16(
      {
        unitId: { type: mongoose23.Schema.Types.ObjectId, ref: "Unit", required: true },
        activities: { type: RotationActivitiesSchema, default: () => ({}) },
        patientsClerked: { type: [PatientClerkedSchema], default: [] },
        proceduresWatchedAssistedOrPerformed: { type: [ProceduresWatchedAssistedOrPerformedSchema], default: [] }
      },
      { _id: false }
    );
    ClinicalRotationsSchema = new Schema16({
      name: { type: String, required: true },
      description: { type: String, default: "" },
      department: { type: mongoose23.Schema.Types.ObjectId, ref: "Department", required: true },
      supervisor: { type: mongoose23.Schema.Types.ObjectId, ref: "User", default: null },
      currentPosting: { type: String, required: true },
      postingType: { type: String, required: true },
      postingPhase: { type: String, required: true },
      isActive: { type: Boolean, default: true },
      practicalActivities: { type: [PracticalsPerformedSchema], default: [] },
      unitActivities: { type: [UnitActivitiesSchema], default: [] },
      class: { type: mongoose23.Schema.Types.ObjectId, ref: "Class", required: true },
      unit: { type: mongoose23.Schema.Types.ObjectId, ref: "Unit", required: true },
      totalPoints: { type: Number, default: 320 },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true }
    });
    clinicalRotation_default = mongoose23.model("ClinicalRotations", ClinicalRotationsSchema);
  }
});

// api/index.ts
import serverless from "serverless-http";

// src/server.ts
import cookieParser from "cookie-parser";
import express15 from "express";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import cors from "cors";
import console2 from "node:console";
import * as dns from "node:dns";

// src/config/db.ts
import mongoose from "mongoose";
var connectDB = async () => {
  try {
    const link = process.env.MEDLOG_MONGO_URL || process.env.MONGO_URI;
    if (!link) {
      throw new Error("Missing MongoDB connection string. Set MEDLOG_MONGO_URL or MONGO_URI.");
    }
    const conn = await mongoose.connect(link, {
      serverSelectionTimeoutMS: 1e4,
      socketTimeoutMS: 45e3
    });
    console.log(`MongoDB Connected ONLINE @: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

// src/routes/user.ts
import express from "express";

// src/controllers/user.ts
init_user();
import "express";
import mongoose14 from "mongoose";

// src/models/departments.ts
import mongoose3, { Schema as Schema2 } from "mongoose";
var DepartmentSchema = new Schema2(
  {
    name: {
      type: String,
      required: [true, "Department name required"],
      trim: true
    },
    code: {
      type: String,
      required: [true, "Department code required"],
      trim: true
    },
    departmentID: {
      type: String,
      required: [true, "Department ID required"],
      trim: true
    },
    // Reference to the User model (Teacher/Admin role) � Department head
    head: {
      type: Schema2.Types.ObjectId,
      ref: "User",
      default: null
    },
    // Arrays of References to Unit model
    units: [
      {
        type: Schema2.Types.ObjectId,
        ref: "Unit"
      }
    ],
    // Arrays of References to Course model
    courses: [
      {
        type: Schema2.Types.ObjectId,
        ref: "Course"
      }
    ]
  },
  {
    timestamps: true
    // Automatically manages createdAt and updatedAt
  }
);
DepartmentSchema.index(
  { name: 1, departmentID: 1 },
  { unique: true }
);
var departments_default = mongoose3.model("Department", DepartmentSchema);

// src/constants/departments.ts
var DepartmentName = /* @__PURE__ */ ((DepartmentName2) => {
  DepartmentName2["medicine"] = "Medicine";
  DepartmentName2["pediatrics"] = "Pediatrics";
  DepartmentName2["obstetricsAndGynecology"] = "Obstetrics and Gynecology";
  DepartmentName2["surgery"] = "Surgery";
  DepartmentName2["psychiatry"] = "Psychiatry";
  DepartmentName2["earNoseAndThroat"] = "ENT" || "Otolaryngology" || "Otorhinolaryngology";
  DepartmentName2["anaesthesiology"] = "Anaesthesiology";
  DepartmentName2["radiology"] = "Radiology";
  DepartmentName2["ophthalmology"] = "Ophthalmology";
  DepartmentName2["dermatology"] = "Dermatology";
  DepartmentName2["communityMedicine"] = "Community Medicine";
  DepartmentName2["hematologyAndBloodTransfusion"] = "Hematology and Blood Transfusion";
  DepartmentName2["anatomicPathology"] = "Anatomic Pathology";
  DepartmentName2["microbiology"] = "Microbiology";
  DepartmentName2["chemicalPathology"] = "Chemical Pathology";
  DepartmentName2["clinicalParmacologyAndTherapeutics"] = "Clinical Pharmacology and Therapeutics";
  DepartmentName2["familyMedicine"] = "Family Medicine";
  DepartmentName2["orthopaedics"] = "Orthopaedics";
  DepartmentName2["forensicMedicine"] = "Forensic Medicine";
  return DepartmentName2;
})(DepartmentName || {});
var DepartmentCode = /* @__PURE__ */ ((DepartmentCode2) => {
  DepartmentCode2["medicine"] = "MED";
  DepartmentCode2["pediatrics"] = "PAE";
  DepartmentCode2["obstetricsAndGynecology"] = "OBG";
  DepartmentCode2["surgery"] = "SUR";
  DepartmentCode2["psychiatry"] = "PSY";
  DepartmentCode2["earNoseAndThroat"] = "ORL";
  DepartmentCode2["anaesthesiology"] = "ANE";
  DepartmentCode2["radiology"] = "RAD";
  DepartmentCode2["ophthalmology"] = "OPH";
  DepartmentCode2["dermatology"] = "DER";
  DepartmentCode2["communityMedicine"] = "COM";
  DepartmentCode2["hematologyAndBloodTransfusion"] = "HEM";
  DepartmentCode2["microbiology"] = "MIC";
  DepartmentCode2["chemicalPathology"] = "CHP";
  DepartmentCode2["clinicalParmacologyAndTherapeutics"] = "PHA";
  DepartmentCode2["anatomicPathology"] = "PAT";
  DepartmentCode2["familyMedicine"] = "FAM";
  DepartmentCode2["orthopaedics"] = "ORT";
  DepartmentCode2["forensicMedicine"] = "FOR";
  return DepartmentCode2;
})(DepartmentCode || {});
var DEPARTMENTS_METADATA = {
  ["Medicine" /* medicine */]: {
    name: "Department of Medicine",
    code: "MED" /* medicine */,
    departmentID: `${"MED" /* medicine */}MBBS001`
  },
  ["Pediatrics" /* pediatrics */]: {
    name: "Department of Pediatrics",
    code: "PAE" /* pediatrics */,
    departmentID: `${"PAE" /* pediatrics */}MBBS001`
  },
  ["Obstetrics and Gynecology" /* obstetricsAndGynecology */]: {
    name: "Department of Obstetrics and Gynecology",
    code: "OBG" /* obstetricsAndGynecology */,
    departmentID: `${"OBG" /* obstetricsAndGynecology */}MBBS001`
  },
  ["Surgery" /* surgery */]: {
    name: "Department of Surgery",
    code: "SUR" /* surgery */,
    departmentID: `${"SUR" /* surgery */}MBBS001`
  },
  ["Psychiatry" /* psychiatry */]: {
    name: "Department of Psychiatry",
    code: "PSY" /* psychiatry */,
    departmentID: `${"PSY" /* psychiatry */}MBBS001`
  },
  ["ENT" || "Otolaryngology" || "Otorhinolaryngology" /* earNoseAndThroat */]: {
    name: "Department of ENT",
    code: "ORL" /* earNoseAndThroat */,
    departmentID: `${"ORL" /* earNoseAndThroat */}MBBS001`
  },
  ["Anaesthesiology" /* anaesthesiology */]: {
    name: "Department of Anaesthesiology",
    code: "ANE" /* anaesthesiology */,
    departmentID: `${"ANE" /* anaesthesiology */}MBBS001`
  },
  ["Radiology" /* radiology */]: {
    name: "Department of Radiology",
    code: "RAD" /* radiology */,
    departmentID: `${"RAD" /* radiology */}MBBS001`
  },
  ["Ophthalmology" /* ophthalmology */]: {
    name: "Department of Ophthalmology",
    code: "OPH" /* ophthalmology */,
    departmentID: `${"OPH" /* ophthalmology */}MBBS001`
  },
  ["Dermatology" /* dermatology */]: {
    name: "Department of Dermatology",
    code: "DER" /* dermatology */,
    departmentID: `${"DER" /* dermatology */}MBBS001`
  },
  ["Community Medicine" /* communityMedicine */]: {
    name: "Department of Community Medicine",
    code: "COM" /* communityMedicine */,
    departmentID: `${"COM" /* communityMedicine */}MBBS001`
  },
  ["Hematology and Blood Transfusion" /* hematologyAndBloodTransfusion */]: {
    name: "Department of Hematology and Blood Transfusion",
    code: "HEM" /* hematologyAndBloodTransfusion */,
    departmentID: `${"HEM" /* hematologyAndBloodTransfusion */}MBBS001`
  },
  ["Microbiology" /* microbiology */]: {
    name: "Department of Microbiology",
    code: "MIC" /* microbiology */,
    departmentID: `${"MIC" /* microbiology */}MBBS001`
  },
  ["Chemical Pathology" /* chemicalPathology */]: {
    name: "Department of Chemical Pathology",
    code: "CHP" /* chemicalPathology */,
    departmentID: `${"CHP" /* chemicalPathology */}MBBS001`
  },
  ["Clinical Pharmacology and Therapeutics" /* clinicalParmacologyAndTherapeutics */]: {
    name: "Department of Clinical Pharmacology and Therapeutics",
    code: "PHA" /* clinicalParmacologyAndTherapeutics */,
    departmentID: `${"PHA" /* clinicalParmacologyAndTherapeutics */}MBBS001`
  },
  ["Anatomic Pathology" /* anatomicPathology */]: {
    name: "Department of Anatomic Pathology",
    code: "PAT" /* anatomicPathology */,
    departmentID: `${"PAT" /* anatomicPathology */}MBBS001`
  },
  ["Family Medicine" /* familyMedicine */]: {
    name: "Department of Family Medicine",
    code: "FAM" /* familyMedicine */,
    departmentID: `${"FAM" /* familyMedicine */}MBBS001`
  },
  ["Orthopaedics" /* orthopaedics */]: {
    name: "Department of Orthopaedics",
    code: "ORT" /* orthopaedics */,
    departmentID: `${"ORT" /* orthopaedics */}MBBS001`
  },
  ["Forensic Medicine" /* forensicMedicine */]: {
    name: "Department of Forensic Medicine",
    code: "FOR" /* forensicMedicine */,
    departmentID: `${"FOR" /* forensicMedicine */}MBBS001`
  }
};
var DEPARTMENT_UNITS = {
  ["Obstetrics and Gynecology" /* obstetricsAndGynecology */]: {
    id: DEPARTMENTS_METADATA["Obstetrics and Gynecology" /* obstetricsAndGynecology */].code,
    name: DEPARTMENTS_METADATA["Obstetrics and Gynecology" /* obstetricsAndGynecology */].name,
    postingType: "OG_PEDS",
    rotationDurationWeeks: 4,
    currentUnit: [],
    units: {
      active: [
        { id: "OBG01", name: "Antenatal Clinic" },
        { id: "OBG02", name: "Labour Ward" },
        { id: "OBG03", name: "Postnatal Ward" },
        { id: "OBG04", name: "Gynaecology Ward" },
        { id: "OBG05", name: "Emergency O&G" },
        { id: "OBG06", name: "Family Planning" },
        { id: "OBG07", name: "Fertility / Endocrine Unit" },
        { id: "OBG08", name: "Reproductive Medicine Unit" },
        { id: "OBG09", name: "Gynaecologic Oncology Unit" }
      ],
      reserve: [{ id: "OBGR01", name: "Family Medicine / Reproductive Health Unit" }],
      history: []
    }
  },
  ["Pediatrics" /* pediatrics */]: {
    id: DEPARTMENTS_METADATA["Pediatrics" /* pediatrics */].code,
    name: DEPARTMENTS_METADATA["Pediatrics" /* pediatrics */].name,
    postingType: "OG_PEDS",
    rotationDurationWeeks: 2,
    currentUnit: [],
    units: {
      active: [
        { id: "PAE01", name: "Neonatology / SCBU" },
        { id: "PAE02", name: "Paediatric Nephrology" },
        { id: "PAE03", name: "Paediatric Infectious Diseases" },
        { id: "PAE04", name: "Emergency Paediatrics" },
        { id: "PAE05", name: "Nutrition Unit" },
        { id: "PAE06", name: "Paediatric Neurology" },
        { id: "PAE07", name: "Paediatric Cardiology" },
        { id: "PAE08", name: "Paediatric Endocrinology" },
        { id: "PAE09", name: "Paediatric Hemato-Oncology" }
      ],
      reserve: [
        {
          id: "PAER01",
          name: "General Paediatrics"
        }
      ],
      history: []
    }
  },
  ["Medicine" /* medicine */]: {
    id: DEPARTMENTS_METADATA["Medicine" /* medicine */].code,
    name: DEPARTMENTS_METADATA["Medicine" /* medicine */].name,
    postingType: "MED_SURG",
    rotationDurationWeeks: 2,
    currentUnit: [],
    units: {
      active: [
        { id: "MED01", name: "Cardiology" },
        { id: "MED02", name: "Gastroenterology / Hepatology" },
        { id: "MED03", name: "Nephrology" },
        { id: "MED04", name: "Pulmonology" },
        { id: "MED05", name: "Infectious Diseases" },
        { id: "MED06", name: "Endocrinology" },
        { id: "MED07", name: "Neurology" },
        { id: "MED08", name: "Rheumatology" },
        { id: "MED09", name: "General Internal Medicine" }
      ],
      reserve: [
        { id: "MEDR01", name: "Geriatric Medicine" },
        { id: "MEDR02", name: "Clinical Pharmacology" }
      ],
      history: []
    }
  },
  ["Surgery" /* surgery */]: {
    id: DEPARTMENTS_METADATA["Surgery" /* surgery */].code,
    name: DEPARTMENTS_METADATA["Surgery" /* surgery */].name,
    postingType: "MED_SURG",
    rotationDurationWeeks: 2,
    currentUnit: [],
    units: {
      active: [
        { id: "SUR01", name: "General Surgery" },
        { id: "SUR02", name: "Urology" },
        { id: "SUR03", name: "Paediatric Surgery" },
        { id: "SUR04", name: "Cardiothoracic Surgery" },
        { id: "SUR05", name: "Orthopaedic Surgery" },
        { id: "SUR06", name: "Trauma Surgery" },
        { id: "SUR07", name: "Neurosurgery" },
        { id: "SUR08", name: "Surgical Oncology" },
        { id: "SUR09", name: "Plastic & Reconstructive Surgery" }
      ],
      reserve: [
        { id: "SURR01", name: "Burns Unit" },
        { id: "SURR02", name: "Vascular Surgery" }
      ],
      history: []
    }
  },
  ["Psychiatry" /* psychiatry */]: {
    id: DEPARTMENTS_METADATA["Psychiatry" /* psychiatry */].code,
    name: DEPARTMENTS_METADATA["Psychiatry" /* psychiatry */].name,
    postingType: "SPECIALTY",
    rotationDurationWeeks: 2,
    currentUnit: [],
    units: {
      active: [
        { id: "PSY01", name: "Adult Psychiatry" },
        { id: "PSY02", name: "Child & Adolescent Psychiatry" },
        { id: "PSY03", name: "Community Psychiatry" },
        { id: "PSY04", name: "Consultation-Liaison Psychiatry" },
        { id: "PSY05", name: "Addiction Psychiatry" },
        { id: "PSY06", name: "Emergency Psychiatry" }
      ],
      reserve: [{ id: "PSYR01", name: "Forensic Psychiatry" }],
      history: []
    }
  },
  ["ENT" || "Otolaryngology" || "Otorhinolaryngology" /* earNoseAndThroat */]: {
    id: DEPARTMENTS_METADATA["ENT" || "Otolaryngology" || "Otorhinolaryngology" /* earNoseAndThroat */].code,
    name: DEPARTMENTS_METADATA["ENT" || "Otolaryngology" || "Otorhinolaryngology" /* earNoseAndThroat */].name,
    postingType: "SPECIALTY",
    rotationDurationWeeks: 2,
    currentUnit: [],
    units: {
      active: [
        { id: "ORL01", name: "Otology" },
        { id: "ORL02", name: "Rhinology" },
        { id: "ORL03", name: "Laryngology" },
        { id: "ORL04", name: "Head & Neck Surgery" },
        { id: "ORL05", name: "Audiology" },
        { id: "ORL06", name: "Cochlear Implant Unit" }
      ],
      reserve: [{ id: "ORLR01", name: "Maxillofacial Interface Unit" }],
      history: []
    }
  },
  ["Anaesthesiology" /* anaesthesiology */]: {
    id: DEPARTMENTS_METADATA["Anaesthesiology" /* anaesthesiology */].code,
    name: DEPARTMENTS_METADATA["Anaesthesiology" /* anaesthesiology */].name,
    postingType: "SPECIALTY",
    rotationDurationWeeks: 2,
    currentUnit: [],
    units: {
      active: [
        { id: "ANE01", name: "General Anaesthesia" },
        { id: "ANE02", name: "Obstetric Anaesthesia" },
        { id: "ANE03", name: "Paediatric Anaesthesia" },
        { id: "ANE04", name: "ICU / Critical Care" },
        { id: "ANE05", name: "Pain Management" },
        { id: "ANE06", name: "Resuscitation Unit" }
      ],
      reserve: [
        { id: "ANER01", name: "Neuroanaesthesia" },
        { id: "ANER02", name: "Cardiothoracic Anaesthesia" }
      ],
      history: []
    }
  },
  ["Radiology" /* radiology */]: {
    id: DEPARTMENTS_METADATA["Radiology" /* radiology */].code,
    name: DEPARTMENTS_METADATA["Radiology" /* radiology */].name,
    postingType: "SPECIALTY",
    rotationDurationWeeks: 2,
    currentUnit: [],
    units: {
      active: [
        { id: "RAD01", name: "Conventional Radiography" },
        { id: "RAD02", name: "Ultrasound" },
        { id: "RAD03", name: "CT Imaging" },
        { id: "RAD04", name: "MRI Imaging" },
        { id: "RAD05", name: "Fluoroscopy" },
        { id: "RAD06", name: "Interventional Radiology" }
      ],
      reserve: [{ id: "RADR01", name: "Nuclear Medicine" }],
      history: []
    }
  },
  ["Ophthalmology" /* ophthalmology */]: {
    id: DEPARTMENTS_METADATA["Ophthalmology" /* ophthalmology */].code,
    name: DEPARTMENTS_METADATA["Ophthalmology" /* ophthalmology */].name,
    postingType: "SPECIALTY",
    rotationDurationWeeks: 2,
    currentUnit: [],
    units: {
      active: [
        { id: "OPH01", name: "General Ophthalmology" },
        { id: "OPH02", name: "Cataract Unit" },
        { id: "OPH03", name: "Glaucoma Unit" },
        { id: "OPH04", name: "Retina / Vitreoretinal Unit" },
        { id: "OPH05", name: "Oculoplasty Unit" },
        { id: "OPH06", name: "Paediatric Ophthalmology" },
        { id: "OPH07", name: "Cornea Unit" }
      ],
      reserve: [{ id: "OPHR01", name: "Neuro-Ophthalmology" }],
      history: []
    }
  },
  ["Dermatology" /* dermatology */]: {
    id: DEPARTMENTS_METADATA["Dermatology" /* dermatology */].code,
    name: DEPARTMENTS_METADATA["Dermatology" /* dermatology */].name,
    postingType: "SPECIALTY",
    rotationDurationWeeks: 2,
    currentUnit: [],
    units: {
      active: [
        { id: "DER01", name: "General Dermatology" },
        { id: "DER02", name: "Venereology / STI Clinic" },
        { id: "DER03", name: "Paediatric Dermatology" },
        { id: "DER04", name: "Procedural Dermatology" },
        { id: "DER05", name: "Dermatopathology" }
      ],
      reserve: [{ id: "DERR01", name: "Cosmetic Dermatology" }],
      history: []
    }
  }
};
var DEPARTMENT_NAMES = Object.values(DepartmentName);
var DEPARTMENT_CODES = Object.values(DepartmentCode);
var getDepartmentUnitsByCode = (code) => {
  const departmentName = DEPARTMENT_NAMES.find(
    (name) => DEPARTMENTS_METADATA[name].code === code
  );
  return departmentName ? DEPARTMENT_UNITS[departmentName] ?? null : null;
};
var DEPARTMENT_COURSES = {
  ["Pediatrics" /* pediatrics */]: [
    {
      title: "Paediatric Cardiology",
      units: 5,
      courseID: "PAE" /* pediatrics */,
      code: "PAE 501",
      departmentName: DEPARTMENTS_METADATA["Pediatrics" /* pediatrics */].name,
      departmentCode: "PAE" /* pediatrics */,
      semester: "First"
    },
    {
      title: "Emergency Paediatrics",
      units: 4,
      courseID: "PAE" /* pediatrics */,
      code: "PAE 502",
      departmentName: DEPARTMENTS_METADATA["Pediatrics" /* pediatrics */].name,
      departmentCode: "PAE" /* pediatrics */,
      semester: "Second"
    }
  ],
  ["Obstetrics and Gynecology" /* obstetricsAndGynecology */]: [
    {
      title: "Antenatal Care",
      units: 4,
      courseID: "OBG" /* obstetricsAndGynecology */,
      code: "OBG 501",
      departmentName: DEPARTMENTS_METADATA["Obstetrics and Gynecology" /* obstetricsAndGynecology */].name,
      departmentCode: "OBG" /* obstetricsAndGynecology */,
      semester: "First"
    },
    {
      title: "Family Planning",
      units: 3,
      courseID: "OBG" /* obstetricsAndGynecology */,
      code: "OBG 502",
      departmentName: DEPARTMENTS_METADATA["Obstetrics and Gynecology" /* obstetricsAndGynecology */].name,
      departmentCode: "OBG" /* obstetricsAndGynecology */,
      semester: "Second"
    }
  ],
  ["Medicine" /* medicine */]: [
    {
      title: "Internal Medicine I",
      units: 5,
      courseID: "MED" /* medicine */,
      code: "MED 501",
      departmentName: DEPARTMENTS_METADATA["Medicine" /* medicine */].name,
      departmentCode: "MED" /* medicine */,
      semester: "First"
    }
  ]
};
var getAllDepartments = () => DEPARTMENT_NAMES.map((name) => ({
  ...DEPARTMENTS_METADATA[name]
}));

// src/controllers/user.ts
init_notification();

// src/utils/sse.ts
import "express";
var clients = /* @__PURE__ */ new Map();
var heartbeats = /* @__PURE__ */ new WeakMap();
function addSSEClient(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.write(`event: hello
data: ${JSON.stringify({ now: (/* @__PURE__ */ new Date()).toISOString() })}

`);
  const userId = req?.user?._id?.toString?.();
  if (!userId) {
    const set2 = clients.get("_anon") || /* @__PURE__ */ new Set();
    set2.add(res);
    clients.set("_anon", set2);
    reqOnClose(res, () => set2.delete(res));
    return;
  }
  const set = clients.get(userId) || /* @__PURE__ */ new Set();
  set.add(res);
  clients.set(userId, set);
  const interval = setInterval(() => {
    try {
      res.write(`: ping ${(/* @__PURE__ */ new Date()).toISOString()}

`);
    } catch (err) {
    }
  }, 15e3);
  heartbeats.set(res, interval);
  reqOnClose(res, () => {
    const s = clients.get(userId);
    if (s) {
      s.delete(res);
      if (s.size === 0) clients.delete(userId);
    }
    const iv = heartbeats.get(res);
    if (iv) clearInterval(iv);
    heartbeats.delete(res);
  });
}
function reqOnClose(res, cb) {
  try {
    res.on && res.on("close", cb);
    res.on && res.on("finish", cb);
  } catch {
  }
}
function sendSSE(event, data, userId) {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  const targets = [];
  if (userId) {
    const set = clients.get(userId);
    if (set) targets.push(...Array.from(set));
  } else {
    for (const set of clients.values()) targets.push(...Array.from(set));
  }
  for (const res of targets) {
    try {
      res.write(`event: ${event}
data: ${payload}

`);
    } catch (err) {
      try {
        res.end();
      } catch {
      }
      for (const [k, set] of clients.entries()) {
        if (set.has(res)) {
          set.delete(res);
          if (set.size === 0) clients.delete(k);
        }
      }
    }
  }
}

// src/utils/generateToken.ts
import jwt from "jsonwebtoken";
import "express";
var generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
    algorithm: "HS512"
  });
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1e3,
    //30 days
    path: "/"
    //cookie valid for entire site
  });
  return token;
};

// src/controllers/user.ts
init_activitieslog2();

// src/utils/registrationApproval.ts
var requiresAdminApproval = (role) => {
  const normalizedRole = String(role ?? "").trim().toLowerCase();
  return ["teacher", "unitconsultant", "unitresident"].includes(normalizedRole);
};
var getRegistrationApprovalState = (role) => {
  if (requiresAdminApproval(role)) {
    return {
      approvalStatus: "pending",
      isActive: false,
      canLogin: false
    };
  }
  return {
    approvalStatus: "approved",
    isActive: true,
    canLogin: true
  };
};

// src/utils/accountApprovalEmail.ts
var sendAccountApprovalEmail = async ({
  to,
  name,
  loginUrl,
  message: message2
}) => {
  const recipient = to || "unknown";
  const targetUrl = loginUrl || process.env.FRONTEND_URL || "http://localhost:5173/login";
  const body = message2 || `Hi ${name}, your account has been approved. Please sign in using the password you set during registration.`;
  console.log(`[account-approval-email] to=${recipient} loginUrl=${targetUrl} message=${body}`);
  return {
    sent: false,
    reason: "smtp-not-configured",
    recipient
  };
};

// src/controllers/user.ts
var normalizeRole = (role) => {
  if (!role) return void 0;
  const value = String(role).trim().toLowerCase();
  if (value === "unitconsultant" || value === "unitconsultant") return "unitconsultant";
  if (value === "unitresident" || value === "unitresident") return "unitresident";
  if (value === "admin") return "admin";
  if (value === "teacher") return "teacher";
  if (value === "student") return "student";
  if (value === "parent") return "parent";
  return void 0;
};
var findDepartment = async (departmentInput) => {
  if (!departmentInput) return null;
  const identifier = String(departmentInput).trim();
  if (mongoose14.isValidObjectId(identifier)) {
    const doc2 = await departments_default.findById(identifier);
    if (doc2) return doc2;
  }
  let doc = await departments_default.findOne({
    $or: [{ code: identifier }, { departmentID: identifier }, { name: identifier }]
  });
  if (doc) return doc;
  const constantDept = getAllDepartments().find(
    (d) => d.code === identifier || d.departmentID === identifier || d.name === identifier
  );
  if (!constantDept) return null;
  doc = await departments_default.findOneAndUpdate(
    { code: constantDept.code },
    {
      name: constantDept.name,
      code: constantDept.code,
      departmentID: constantDept.departmentID
    },
    { upsert: true, returnDocument: "after" }
  );
  return doc;
};
var registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      idNumber,
      role,
      departmentId,
      department,
      studentClasses,
      teacherSubject,
      parentStudents,
      isActive,
      isSupervisor,
      supervisorRank,
      specialties
    } = req.body;
    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) {
      res.status(400).json({ status: "Error!", message: "Invalid user role" });
      return;
    }
    const departmentDoc = await findDepartment(
      departmentId || department || req.body?.departmentCode || req.body?.departmentID
    );
    const isStaffRole = ["teacher", "unitconsultant", "unitresident"].includes(normalizedRole);
    if (isStaffRole && !departmentDoc) {
      res.status(400).json({ status: "Error!", message: "Staff users must be assigned a valid department" });
      return;
    }
    const studentClassesNormalized = Array.isArray(studentClasses) ? studentClasses.length ? studentClasses[0] : void 0 : studentClasses || void 0;
    const studentClassIdFromClassId = req.body?.classId || void 0;
    const finalStudentClass = studentClassesNormalized ?? studentClassIdFromClassId;
    const teacherSubjectNormalized = Array.isArray(teacherSubject) ? teacherSubject : teacherSubject ? [teacherSubject] : [];
    const parentStudentsNormalized = Array.isArray(parentStudents) ? parentStudents : parentStudents ? [parentStudents] : [];
    const existingUser = await user_default.findOne({ email });
    if (existingUser) {
      res.status(400).json({ status: "Error!", message: "User already exists" });
      return;
    }
    const existingID = await user_default.findOne({ idNumber });
    let newIDNumber = idNumber;
    const updateUserIdIfExists = async () => {
      if (existingID) {
        const lastUserWithID = await user_default.findOne({ idNumber: { $regex: `^${idNumber.slice(0, -4)}` } }).sort({ createdAt: -1 });
        if (lastUserWithID) {
          const lastIDNumber = lastUserWithID.idNumber;
          const prefix = lastIDNumber.slice(0, -4);
          const lastNumericPart = parseInt(lastIDNumber.slice(-4));
          const newNumericPart = (lastNumericPart + 1).toString().padStart(4, "0");
          newIDNumber = `${prefix}${newNumericPart}`;
        }
      } else {
        if (!idNumber) {
          const rolePrefix = role === "admin" ? "UJMBBSAD" : role === "teacher" ? "UJMBBSTE" : role === "student" ? "UJMBBSST" : role === "parent" ? "UJMBBSPA" : role === "unitconsultant" ? "UJMBBSUC" : role === "unitresident" ? "UJMBBSUR" : "UJMBBSST";
          const lastUserWithRolePrefix = await user_default.findOne({ idNumber: { $regex: `^${rolePrefix}` } }).sort({ createdAt: -1 });
          if (lastUserWithRolePrefix) {
            const lastIDNumber = lastUserWithRolePrefix.idNumber;
            const prefix = lastIDNumber.slice(0, -4);
            const lastNumericPart = parseInt(lastIDNumber.slice(-4));
            const newNumericPart = (lastNumericPart + 1).toString().padStart(4, "0");
            newIDNumber = `${prefix}${newNumericPart}`;
          } else {
            const rolePrefix2 = role === "admin" ? "UJ0000AD" : role === "teacher" ? "UJ0000TE" : role === "student" ? "UJ0000ST" : role === "parent" ? "UJ0000PA" : role === "unitconsultant" ? "UJ0000UC" : role === "unitresident" ? "UJ0000UR" : "UJ0000ST";
            newIDNumber = `${rolePrefix2}0001`;
          }
        }
      }
      return;
    };
    await updateUserIdIfExists();
    if (existingID) {
    }
    const newUser = await user_default.create({
      name,
      email,
      password,
      idNumber: newIDNumber,
      // Use the newIDNumber which is now the updated sequential ID number we've updated
      role: normalizedRole,
      department: departmentDoc ? departmentDoc.name : typeof department === "string" ? department.trim() : void 0,
      departmentId: departmentDoc ? departmentDoc._id : void 0,
      studentClasses: finalStudentClass,
      teacherSubject: teacherSubjectNormalized,
      parentStudents: parentStudentsNormalized,
      isActive,
      isSupervisor: isSupervisor || false,
      supervisorRank: supervisorRank || 0,
      specialties: Array.isArray(specialties) ? specialties : specialties ? [specialties] : []
    });
    if (newUser) {
      await newUser.populate("studentClasses", "name academicYear");
      await newUser.populate("teacherSubject", "name code");
      if (role === "student" && finalStudentClass) {
        const ClassModel = (init_classes(), __toCommonJS(classes_exports)).default;
        await ClassModel.findByIdAndUpdate(
          finalStudentClass,
          { $addToSet: { students: newUser._id } },
          { returnDocument: "after" }
        );
      }
      if (role === "supervisor") {
        const ClassModel = (init_classes(), __toCommonJS(classes_exports)).default;
        await ClassModel.findByIdAndUpdate(
          finalStudentClass,
          { $addToSet: { supervisors: newUser._id } },
          { returnDocument: "after" }
        );
      }
      if (req.user) {
        await logActivity({
          userId: req.user._id.toString(),
          action: "Created user",
          details: `${newUser.name} (${newUser.email}) with role ${newUser.role}, and assigned ID number ${newUser.idNumber}`
        });
      }
      res.status(201).json({
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        idNumber: newUser.idNumber,
        role: newUser.role,
        studentClasses: newUser.studentClasses,
        teacherSubject: newUser.teacherSubject,
        parentStudents: newUser.parentStudents,
        isActive: newUser.isActive,
        isSupervisor: newUser.isSupervisor,
        supervisorRank: newUser.supervisorRank,
        specialties: newUser.specialties,
        message: `User '${newUser.name}' created successfully`
      });
    } else {
      res.status(400).json({ status: "Error!", message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ status: "Error!", message: "Internal server error", error: `${error}` });
  }
};
var registerPublic = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      idNumber,
      role,
      departmentId,
      department,
      studentClasses,
      teacherSubject,
      parentStudents,
      isActive
    } = req.body;
    const normalizedRole = normalizeRole(role);
    const usersCount = await user_default.countDocuments();
    const isFirst = usersCount === 0;
    const allowedRoles = isFirst ? ["admin", "teacher", "unitconsultant", "unitresident"] : ["student", "teacher", "parent", "unitconsultant", "unitresident"];
    if (!normalizedRole || !allowedRoles.includes(normalizedRole)) {
      res.status(400).json({ message: "Invalid role for public registration" });
      return;
    }
    const departmentDoc = await findDepartment(
      departmentId || department || req.body?.departmentCode || req.body?.departmentID
    );
    const isStaffUmbrella = ["teacher", "unitconsultant", "unitresident"].includes(normalizedRole);
    if (isStaffUmbrella && !departmentDoc) {
      res.status(400).json({ message: "Staff users must select a valid department" });
      return;
    }
    const approvalState = getRegistrationApprovalState(normalizedRole);
    const needsAdminApproval = requiresAdminApproval(normalizedRole);
    const requestedActiveState = typeof isActive === "boolean" ? isActive : approvalState.isActive;
    const studentClassName = req.body?.studentClassName || void 0;
    const normalizedName = typeof name === "string" ? name.trim() : "";
    if (isStaffUmbrella) {
      const staffTokens = normalizedName.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
      await (async () => {
        const staffQuery = { isActive: true };
        const matches = await (init_hospitalStaff(), __toCommonJS(hospitalStaff_exports)).default.find(staffQuery).select("name");
        for (const s of matches) {
          const sTokens = String(s.name || "").toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
          const shared = new Set(sTokens.filter((t) => staffTokens.includes(t)));
          if (shared.size >= 2) return true;
        }
        return false;
      })();
    }
    const studentClassNameRaw = studentClassName;
    let studentClassId = Array.isArray(studentClasses) ? studentClasses[0] : studentClasses || req.body?.classId || void 0;
    if (role === "student") {
      const candidate = (studentClassNameRaw || "").trim();
      if (candidate) {
        const ClassModel = (init_classes(), __toCommonJS(classes_exports)).default;
        const normalizedCandidate = String(candidate).toLowerCase().replace(/\s+/g, " ").trim();
        const classDoc = await ClassModel.findOne({ name: { $exists: true } }).lean();
        const allowedNames = ["400 level", "500 level", "600 level", "final year"];
        const mappedAllowed = allowedNames.find((n) => n === normalizedCandidate) || null;
        if (mappedAllowed) {
          const classMatch = await ClassModel.findOne({
            name: { $in: ["400 level", "500 level", "600 level", "Final year"] }
          });
          const classMatch2 = classMatch || await ClassModel.findOne({ name: { $regex: `^${mappedAllowed}$`, $options: "i" } });
          if (classMatch2?._id) {
            studentClassId = classMatch2._id;
          }
        }
      }
    }
    const existingUser = await user_default.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }
    const teacherSubjectNormalized = Array.isArray(teacherSubject) ? teacherSubject : teacherSubject ? [teacherSubject] : [];
    const parentStudentsNormalized = Array.isArray(parentStudents) ? parentStudents : parentStudents ? [parentStudents] : [];
    let newIDNumber = idNumber;
    if (!newIDNumber) {
      const rolePrefix = role === "admin" ? "UJ0000AD" : role === "teacher" ? "UJ0000TE" : role === "student" ? "UJ0000ST" : role === "parent" ? "UJ0000PA" : "UJ0000ST";
      const lastUserWithRolePrefix = await user_default.findOne({ idNumber: { $regex: `^${rolePrefix}` } }).sort({ createdAt: -1 });
      if (lastUserWithRolePrefix) {
        const lastIDNumber = lastUserWithRolePrefix.idNumber;
        const prefix = lastIDNumber.slice(0, -4);
        const lastNumericPart = parseInt(lastIDNumber.slice(-4));
        const newNumericPart = (lastNumericPart + 1).toString().padStart(4, "0");
        newIDNumber = `${prefix}${newNumericPart}`;
      } else {
        newIDNumber = `${rolePrefix}0001`;
      }
    }
    const newUser = await user_default.create({
      name,
      email,
      password,
      idNumber: newIDNumber,
      role: normalizedRole,
      department: departmentDoc ? departmentDoc.name : typeof department === "string" ? department.trim() : void 0,
      departmentId: departmentDoc ? departmentDoc._id : void 0,
      studentClasses: studentClassId,
      teacherSubject: teacherSubjectNormalized,
      parentStudents: parentStudentsNormalized,
      isActive: requestedActiveState,
      approvalStatus: approvalState.approvalStatus
    });
    if (newUser) {
      await newUser.populate("studentClasses", "name academicYear");
      await newUser.populate("teacherSubject", "name code");
      if (role === "student" && studentClassId) {
        const ClassModel = (init_classes(), __toCommonJS(classes_exports)).default;
        await ClassModel.findByIdAndUpdate(studentClassId, { $addToSet: { students: newUser._id } });
      }
      if (role === "student" && !studentClassId) {
        try {
          const admins = await user_default.find({ role: "admin" }).select("_id");
          const notifications = admins.map((a) => ({
            userId: a._id,
            role: "admin",
            title: "New student requires class assignment",
            message: `${newUser.name} (${newUser.email}) registered and needs to be assigned to a class.`,
            type: "system",
            isRead: false,
            metadata: { newUserId: newUser._id }
          }));
          if (notifications.length) {
            const inserted = await Notification.insertMany(notifications);
            try {
              for (const doc of inserted) {
                try {
                  sendSSE("notification", doc, String(doc.userId));
                } catch (err) {
                  console.error("Failed to send SSE for inserted notifications", err);
                }
              }
            } catch (err) {
              console.error("Failed to send SSE for inserted notifications", err);
            }
          }
        } catch (err) {
          console.error("Failed to notify admins about new student:", err);
        }
      }
      if (needsAdminApproval) {
        try {
          const admins = await user_default.find({ role: "admin" }).select("_id");
          const notifications = admins.map((a) => ({
            userId: a._id,
            role: "admin",
            title: "Pending staff registration",
            message: `${newUser.name} (${newUser.email}) submitted a ${normalizedRole} registration and is waiting for admin approval.`,
            type: "system",
            isRead: false,
            metadata: {
              pendingUserId: newUser._id,
              pendingUserEmail: newUser.email,
              pendingUserName: newUser.name,
              requestedRole: normalizedRole,
              approvalStatus: newUser.approvalStatus
            }
          }));
          if (notifications.length) {
            const inserted = await Notification.insertMany(notifications);
            for (const doc of inserted) {
              try {
                sendSSE("notification", doc, String(doc.userId));
              } catch (err) {
                console.error("Failed to send SSE for pending staff notification", err);
              }
            }
          }
        } catch (err) {
          console.error("Failed to notify admins about pending staff registration:", err);
        }
      }
      res.status(201).json({
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        idNumber: newUser.idNumber,
        role: newUser.role,
        studentClasses: newUser.studentClasses,
        teacherSubject: newUser.teacherSubject,
        parentStudents: newUser.parentStudents,
        isActive: newUser.isActive,
        approvalStatus: newUser.approvalStatus,
        requiresApproval: needsAdminApproval,
        message: needsAdminApproval ? `User '${newUser.name}' created successfully and is pending admin approval.` : `User '${newUser.name}' created successfully`
      });
      return;
    }
    res.status(400).json({ message: "Invalid user data" });
  } catch (error) {
    console.error("updateUser error:", error);
    const err = error;
    res.status(500).json({ message: "Server error", error: err?.message ?? String(err), stack: err?.stack });
  }
};
var isFirstUser = async (req, res) => {
  try {
    const count = await user_default.countDocuments();
    res.status(200).json({ count, isFirst: count === 0 });
  } catch (error) {
    res.status(500).json({ message: `Server error: ${error}` });
  }
};
var login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await user_default.findOne({ email });
    if (user && await user.matchPassword(password)) {
      if (user.approvalStatus !== "approved") {
        const message2 = user.approvalStatus === "pending" ? "Your account is pending admin approval." : user.approvalStatus === "rejected" ? "Your account has been rejected." : "Your account is not approved.";
        res.status(403).json({ message: message2 });
        return;
      }
      if (!user.isActive) {
        if (user.approvalStatus === "approved" && (user.approvedAt || user.approvedBy)) {
          user.isActive = true;
          await user.save();
        } else {
          res.status(403).json({ message: "Your account is inactive." });
          return;
        }
      }
      const token = generateToken(user.id.toString(), res);
      const responsePayload = {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          idNumber: user.idNumber,
          profileImage: user.profileImage,
          studentClasses: user.studentClasses,
          studentClass: user.studentClasses,
          teacherSubject: user.teacherSubject,
          parentStudents: user.parentStudents,
          isActive: user.isActive,
          academicStatus: user.academicStatus,
          departmentRole: user.departmentRole
        },
        token
      };
      if (req.user) {
        await logActivity({
          userId: user._id.toString(),
          action: "Login User",
          details: `${user.name} logged in successfully.`
        });
      }
      res.status(201).json(responsePayload);
      return;
    } else {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
var approvePendingUser = async (req, res) => {
  try {
    const user = await user_default.findById(req.params.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    if (user.approvalStatus === "approved" && user.isActive) {
      res.status(200).json({ message: "User is already approved", user });
      return;
    }
    user.approvalStatus = "approved";
    user.isActive = true;
    user.approvedAt = user.approvedAt ?? /* @__PURE__ */ new Date();
    user.approvedBy = user.approvedBy ?? req.user?._id ?? null;
    await user.save();
    await Notification.create({
      userId: user._id,
      role: user.role,
      title: "Account approved",
      message: `Your account has been approved. You can now sign in with the password you created during registration.`,
      type: "success",
      isRead: false,
      metadata: { approvedBy: req.user?._id ?? null }
    });
    await sendAccountApprovalEmail({
      to: user.email,
      name: user.name,
      loginUrl: process.env.FRONTEND_URL || "http://localhost:5173/login",
      message: `Hi ${user.name}, your account has been approved. You can now sign in with the password you set during registration.`
    });
    res.status(200).json({
      message: "User approved successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        approvalStatus: user.approvalStatus
      }
    });
  } catch (error) {
    console.error("approvePendingUser error:", error);
    res.status(500).json({ message: "Server error", error: error?.message ?? String(error) });
  }
};
var updateUser = async (req, res) => {
  try {
    const authReq = req;
    const requestedId = req.params.id;
    const currentUserId = authReq.user?._id?.toString();
    const currentUserRole = authReq.user?.role;
    if (!mongoose14.isValidObjectId(requestedId)) {
      res.status(400).json({ status: "Error!", message: "Invalid user id" });
      return;
    }
    const isOwnProfile = currentUserId === requestedId;
    const isAdmin = currentUserRole === "admin" || currentUserRole === "teacher";
    if (!isOwnProfile && !isAdmin) {
      res.status(403).json({
        status: "Error!",
        message: "You can only update your own profile"
      });
      return;
    }
    const user = await user_default.findById(req.params.id);
    if (user) {
      let previousStudentClass = void 0;
      if (user.studentClasses) {
        if (typeof user.studentClasses === "object" && user.studentClasses?._id) {
          previousStudentClass = String(user.studentClasses._id);
        } else {
          previousStudentClass = String(user.studentClasses);
        }
      }
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.idNumber = req.body.idNumber || user.idNumber;
      if (req.body.role !== void 0) {
        const normalizedRole = normalizeRole(req.body.role);
        if (normalizedRole) {
          user.role = normalizedRole;
        }
      }
      user.isActive = req.body.isActive !== void 0 ? req.body.isActive : user.isActive;
      if (req.body.studentClasses !== void 0 || req.body.classId !== void 0) {
        const incoming = req.body.studentClasses !== void 0 ? req.body.studentClasses : req.body.classId;
        const normalized = Array.isArray(incoming) ? incoming.length ? incoming[0] : null : typeof incoming === "string" ? incoming.trim() || null : incoming ?? null;
        user.studentClasses = normalized;
      }
      if (req.body.teacherSubject !== void 0) {
        const normalizedTeacherSubject = Array.isArray(req.body.teacherSubject) ? req.body.teacherSubject : req.body.teacherSubject ? [req.body.teacherSubject] : [];
        user.teacherSubject = normalizedTeacherSubject.filter((subject) => typeof subject !== "string" || subject.trim() !== "");
      }
      if (req.body.parentStudents !== void 0) {
        const normalizedParentStudents = Array.isArray(req.body.parentStudents) ? req.body.parentStudents : req.body.parentStudents ? [req.body.parentStudents] : [];
        user.parentStudents = normalizedParentStudents.filter((student) => typeof student !== "string" || student.trim() !== "");
      }
      if (req.body.department !== void 0 || req.body.departmentId !== void 0) {
        const deptInput = req.body.departmentId ?? req.body.department;
        const deptDoc = await findDepartment(deptInput);
        if (deptDoc) {
          user.departmentId = deptDoc._id;
          user.department = deptDoc.name;
        } else if (req.body.department !== void 0) {
          user.department = String(req.body.department).trim();
        }
      }
      if (req.body.academicStatus !== void 0) user.academicStatus = req.body.academicStatus;
      if (req.body.departmentRole !== void 0) user.departmentRole = req.body.departmentRole;
      if (req.body.isSupervisor !== void 0) user.isSupervisor = req.body.isSupervisor;
      if (req.body.supervisorRank !== void 0) user.supervisorRank = req.body.supervisorRank;
      if (req.body.specialties !== void 0) user.specialties = Array.isArray(req.body.specialties) ? req.body.specialties : [req.body.specialties];
      if (req.body.password) {
        if (isOwnProfile && req.body.currentPassword) {
          const isMatch = await user.matchPassword(req.body.currentPassword);
          if (!isMatch) {
            res.status(400).json({
              status: "Error!",
              message: "Current password is incorrect"
            });
            return;
          }
        }
        user.password = req.body.password;
      }
      if (req.body.profileImage !== void 0) {
        user.profileImage = req.body.profileImage;
      }
      const updatedUser = await user.save();
      const updater = req.user;
      const userId = updater?._id?.toString?.();
      if (user.role === "student" && (req.body.studentClasses !== void 0 || req.body.classId !== void 0)) {
        const ClassModel = (init_classes(), __toCommonJS(classes_exports)).default;
        const oldClass = previousStudentClass;
        let newClass = void 0;
        if (updatedUser.studentClasses) {
          if (typeof updatedUser.studentClasses === "object" && updatedUser.studentClasses?._id) {
            newClass = String(updatedUser.studentClasses._id);
          } else {
            newClass = String(updatedUser.studentClasses);
          }
        }
        if (oldClass && oldClass !== newClass && mongoose14.isValidObjectId(oldClass)) {
          try {
            await ClassModel.findByIdAndUpdate(oldClass, { $pull: { students: user._id } });
          } catch (err) {
            console.error("Failed to remove student from old class", err);
          }
        }
        if (newClass && newClass !== oldClass && mongoose14.isValidObjectId(newClass)) {
          try {
            await ClassModel.findByIdAndUpdate(newClass, { $addToSet: { students: user._id } });
          } catch (err) {
            console.error("Failed to add student to new class", err);
          }
        }
        try {
          await Notification.deleteMany({ "metadata.newUserId": updatedUser._id, type: "system" });
        } catch (err) {
          console.error("Failed to clear admin notifications for user assignment:", err);
        }
        try {
          const ClassModel2 = (init_classes(), __toCommonJS(classes_exports)).default;
          const classObj = newClass ? await ClassModel2.findById(newClass).select("name") : null;
          try {
            const notificationRole = updatedUser.role === "unitconsultant" ? "unitconsultant" : updatedUser.role === "unitresident" ? "unitresident" : updatedUser.role;
            const created = await Notification.create({
              userId: updatedUser._id,
              role: notificationRole,
              title: "Assigned to class",
              message: classObj ? `You have been assigned to ${classObj.name}.` : "You have been assigned to a class.",
              type: "info",
              isRead: false,
              metadata: { classId: newClass, className: classObj?.name || null, updatedBy: userId }
            });
            try {
              sendSSE("notification", created, String(created.userId));
            } catch (err) {
              console.error("SSE send failed", err);
            }
          } catch (err) {
            console.error("Failed to notify user about class assignment:", err);
          }
        } catch (err) {
          console.error("Failed to notify user about class assignment:", err);
        }
      }
      try {
        const updater2 = req.user;
        if (!isOwnProfile && updater2) {
          try {
            const notificationRole = updatedUser.role === "unitconsultant" ? "unitconsultant" : updatedUser.role === "unitresident" ? "unitresident" : updatedUser.role;
            const created = await Notification.create({
              userId: updatedUser._id,
              role: notificationRole,
              title: "Profile updated",
              message: `Your profile was updated by ${updater2.name || updater2.email || "an admin"}.`,
              type: "info",
              isRead: false,
              metadata: { updatedBy: updater2._id, changes: req.body }
            });
            try {
              sendSSE("notification", created, String(created.userId));
            } catch (err) {
              console.error("SSE send failed", err);
            }
          } catch (err) {
            console.error("Failed to create profile-updated notification:", err);
          }
        }
      } catch (err) {
        console.error("Failed to create profile-updated notification:", err);
      }
      if (updater) {
        await logActivity({
          userId,
          action: "Updated user",
          details: `Updated user ${updatedUser.email} (ID: ${updatedUser.idNumber}) successfully.
                    Changes: ${JSON.stringify(req.body)}`
        });
      }
      res.status(200).json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        studentClasses: updatedUser.studentClasses,
        idNumber: updatedUser.idNumber,
        profileImage: updatedUser.profileImage,
        parentStudents: updatedUser.parentStudents,
        teacherSubject: updatedUser.teacherSubject,
        academicStatus: updatedUser.academicStatus,
        departmentRole: updatedUser.departmentRole,
        isSupervisor: updatedUser.isSupervisor,
        supervisorRank: updatedUser.supervisorRank,
        specialties: updatedUser.specialties,
        message: `User ${updatedUser.email} (ID: ${updatedUser.idNumber}) updated successfully.`
      });
    } else {
      res.status(404).json({ status: "Error!", message: "User not found" });
    }
  } catch (error) {
    console.error("updateUser error:", error);
    const err = error;
    res.status(500).json({ message: "Server error", error: err?.message ?? String(err), stack: err?.stack });
  }
};
var getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const role = normalizeRole(req.query.role);
    const departmentQuery = req.query.department;
    const search = req.query.search;
    const skip = (page - 1) * limit;
    const filter = {};
    if (role && role !== "all" && role !== "") {
      filter.role = role;
    }
    if (departmentQuery && departmentQuery !== "") {
      if (mongoose14.isValidObjectId(departmentQuery)) {
        filter.departmentId = departmentQuery;
      } else {
        const departmentDoc = await departments_default.findOne({
          $or: [{ code: departmentQuery }, { departmentID: departmentQuery }, { name: departmentQuery }]
        });
        if (departmentDoc) {
          filter.departmentId = departmentDoc._id;
        } else {
          filter.department = departmentQuery;
        }
      }
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { idNumber: { $regex: search, $options: "i" } }
      ];
    }
    const [total, users] = await Promise.all([
      user_default.countDocuments(filter),
      // Get total count of users matching the filter
      user_default.find(filter).select("-password").populate("studentClasses", "_id name").populate("teacherSubject", "_id name code").sort({ createdAt: -1 }).skip(skip).limit(limit)
    ]);
    res.status(200).json({
      users,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (error) {
    res.status(500).json({ message: `Server error`, error: `${error}` });
  }
};
var getUserById = async (req, res) => {
  try {
    const user = await user_default.findById(req.params.id).select("-password").populate("studentClasses", "_id name academicYear").populate("teacherSubject", "_id name code").populate("parentStudents", "name email idNumber role studentClasses");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: `Server error`, error: `${error}` });
  }
};
var deleteUser = async (req, res) => {
  try {
    const user = await user_default.findById(req.params.id);
    if (user) {
      await user_default.deleteOne({ _id: user._id });
      if (req.user) {
        await logActivity({
          userId: req.user._id.toString(),
          action: "Deleted user",
          details: `Deleted user ${user.name}, email: ${user.email}, id: ${user.idNumber}, successfully!`
        });
      }
      res.status(201).json({ message: `User ${user.email} deleted successfully.` });
    } else {
      res.status(404).json({ status: "Error!", message: "User not found" });
      return;
    }
  } catch (error) {
    res.status(500).json({ status: "Error!", message: `Server error: ${error}` });
  }
};
var getUserProfile = async (req, res) => {
  try {
    const user = await user_default.findById(req.user._id).populate("studentClasses", "name academicYear").populate("teacherSubject", "name code").populate("parentStudents", "name email idNumber role studentClasses");
    if (user) {
      res.json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          idNumber: user.idNumber,
          profileImage: user.profileImage,
          studentClasses: user.studentClasses,
          teacherSubject: user.teacherSubject,
          parentStudents: user.parentStudents,
          academicStatus: user.academicStatus,
          departmentRole: user.departmentRole,
          isSupervisor: user.isSupervisor,
          supervisorRank: user.supervisorRank,
          specialties: user.specialties
        }
      });
    } else {
      res.status(404).json({ status: "Error!", message: "Not authorized" });
    }
  } catch (error) {
    res.status(500).json({ status: "Error!", message: `Server error: ${error}` });
  }
};
var logoutUser = async (req, res) => {
  try {
    res.cookie("jwt", "", {
      httpOnly: true,
      expires: /* @__PURE__ */ new Date(0)
      // Set the cookie to expire immediately
    });
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ status: "Error!", message: `Server error: ${error}` });
  }
};
var bulkUploadUsers = async (req, res) => {
  try {
    const { users, classId, courseIds } = req.body;
    if (!users || users.length === 0) {
      res.status(400).json({ status: "Error!", message: "No users provided." });
      return;
    }
    if (users.length > 500) {
      res.status(400).json({ status: "Error!", message: "Maximum 500 users per upload." });
      return;
    }
    for (const u of users) {
      if (!u.name || !u.email || !u.role) {
        res.status(400).json({
          status: "Error!",
          message: "Each user entry must have name, email, and role."
        });
        return;
      }
      if (!["admin", "teacher", "student", "parent", "unitconsultant", "unitresident"].includes(u.role)) {
        res.status(400).json({
          status: "Error!",
          message: `Invalid role '${u.role}'. Must be admin, teacher, student, parent, unitconsultant, or unitresident.`
        });
        return;
      }
    }
    const { inngest: inngest2 } = (init_inngest(), __toCommonJS(inngest_exports));
    await inngest2.send({
      name: "users/bulk-create",
      data: {
        users,
        classId: classId || void 0,
        courseIds: courseIds || void 0,
        userId: req.user?._id?.toString()
      }
    });
    res.status(202).json({
      status: "Accepted",
      message: `Bulk upload started. Processing ${users.length} user(s) in the background.`
    });
  } catch (error) {
    res.status(500).json({ status: "Error!", message: `Server error: ${error}` });
  }
};
var extractFromPDF = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      res.status(400).json({ status: "Error!", message: "No file data provided." });
      return;
    }
    const { base64Data, mimeType } = req.body;
    if (!base64Data) {
      res.status(400).json({ status: "Error!", message: "No file data provided." });
      return;
    }
    res.status(501).json({
      status: "Error!",
      message: "PDF text extraction is not yet available. Please use a spreadsheet (.csv or .xlsx) with Name, Email, and ID Number columns."
    });
  } catch (error) {
    res.status(500).json({ status: "Error!", message: `Server error: ${error}` });
  }
};
var extractFromImage = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      res.status(400).json({ status: "Error!", message: "No file data provided." });
      return;
    }
    const { base64Data, mimeType } = req.body;
    if (!base64Data) {
      res.status(400).json({ status: "Error!", message: "No file data provided." });
      return;
    }
    res.status(501).json({
      status: "Error!",
      message: "Image OCR extraction is not yet available. Please use a spreadsheet (.csv or .xlsx) with Name, Email, and ID Number columns."
    });
  } catch (error) {
    res.status(500).json({ status: "Error!", message: `Server error: ${error}` });
  }
};

// src/middleware/auth.ts
init_user();
import "express";
import jwt2 from "jsonwebtoken";
var protect = async (req, res, next) => {
  let token;
  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }
  if (token) {
    try {
      const decoded = jwt2.verify(token, process.env.JWT_SECRET);
      req.user = await user_default.findById(decoded.userId).select("-password").populate("studentClasses", "_id name").populate("teacherSubject", "_id name code").populate("parentStudents", "_id name email idNumber role studentClasses");
      next();
    } catch (error) {
      console.log(error);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};
var authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: `Not authorized, no user found!` });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Access denied. User role '${req.user.role}' not allowed to acces this route. Allowed roles: ${roles.join(", ")}` });
    }
    next();
  };
};

// src/routes/user.ts
var userRoutes = express.Router();
userRoutes.post(
  "/register",
  protect,
  authorize(["admin"]),
  registerUser
);
userRoutes.get("/public/is-first", isFirstUser);
userRoutes.post("/public/register", registerPublic);
userRoutes.post("/login", login);
userRoutes.post("/logout", logoutUser);
userRoutes.get("/profile", protect, getUserProfile);
userRoutes.get(
  "/",
  protect,
  authorize(["admin", "teacher", "parent", "student", "unitconsultant"]),
  getUsers
);
userRoutes.post(
  "/:id/approve",
  protect,
  authorize(["admin"]),
  approvePendingUser
);
userRoutes.get(
  "/:id",
  protect,
  authorize(["admin", "teacher", "parent", "unitconsultant"]),
  getUserById
);
userRoutes.patch(
  "/update/:id",
  protect,
  updateUser
);
userRoutes.put(
  "/update/:id",
  protect,
  updateUser
);
userRoutes.delete(
  "/delete/:id",
  protect,
  authorize(["admin", "teacher", "unitconsultant"]),
  deleteUser
);
userRoutes.post(
  "/bulk-upload",
  protect,
  authorize(["admin"]),
  bulkUploadUsers
);
userRoutes.post(
  "/bulk-upload/extract-pdf",
  protect,
  authorize(["admin"]),
  extractFromPDF
);
userRoutes.post(
  "/bulk-upload/extract-image",
  protect,
  authorize(["admin"]),
  extractFromImage
);
var user_default2 = userRoutes;

// src/routes/activitieslog.ts
import express2 from "express";

// src/controllers/activitieslog.ts
init_activitieslog();
init_user();
import "express";
var getAllActivities = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const role = req.query.role;
    const search = req.query.search;
    const filter = {};
    if (role && role !== "all") {
      filter["user.role"] = role;
    }
    if (search) {
      filter.$or = [
        { "user.name": { $regex: search, $options: "i" } },
        { action: { $regex: search, $options: "i" } },
        { details: { $regex: search, $options: "i" } }
      ];
    }
    const count = await activitieslog_default.countDocuments(filter);
    const logs = await activitieslog_default.find(filter).populate("user", "name email role").sort({ createdAt: -1 }).skip(skip).limit(limit);
    res.json({
      logs,
      page,
      pages: Math.ceil(count / limit),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: `Server error`, error });
  }
};
var getRoleStats = async (req, res) => {
  try {
    const active = await user_default.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);
    const inactive = await user_default.aggregate([
      { $match: { isActive: false } },
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);
    const roleMap = {};
    const ensureRole = (r) => {
      if (!roleMap[r]) roleMap[r] = { role: r, active: 0, inactive: 0 };
    };
    active.forEach((a) => {
      ensureRole(a._id);
      roleMap[a._id].active = a.count;
    });
    inactive.forEach((a) => {
      ensureRole(a._id);
      roleMap[a._id].inactive = a.count;
    });
    const knownRoles = ["admin", "teacher", "student", "parent", "unitconsultant", "unitresident"];
    knownRoles.forEach((r) => ensureRole(r));
    const stats = Object.values(roleMap);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: `Server error`, error });
  }
};
var getWeeklyActivityCounts = async (req, res) => {
  try {
    const weeks = Number(req.query.weeks) || 8;
    const end = /* @__PURE__ */ new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - weeks * 7);
    const results = await activitieslog_default.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $match: { "user.role": "student" } },
      {
        $addFields: {
          actionType: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: "$action", regex: /attendance/i } }, then: "attendance" },
                { case: { $regexMatch: { input: "$action", regex: /rotation|clinical/i } }, then: "rotation" }
              ],
              default: "other"
            }
          }
        }
      },
      {
        $group: {
          _id: { week: { $dateTrunc: { date: "$createdAt", unit: "week" } }, type: "$actionType" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.week": 1 } }
    ]);
    const seriesWeeks = [];
    const curr = new Date(start);
    while (curr <= end) {
      seriesWeeks.push(new Date(curr));
      curr.setDate(curr.getDate() + 7);
    }
    const map = /* @__PURE__ */ new Map();
    results.forEach((r) => {
      const wk = new Date(r._id.week).toISOString();
      if (!map.has(wk)) map.set(wk, { attendance: 0, rotation: 0, other: 0 });
      const entry = map.get(wk);
      if (r._id.type === "attendance") entry.attendance = r.count;
      else if (r._id.type === "rotation") entry.rotation = r.count;
      else entry.other = r.count;
    });
    const out = seriesWeeks.map((d) => {
      const wk = d.toISOString();
      const counts = map.get(wk) ?? { attendance: 0, rotation: 0, other: 0 };
      return { weekStart: wk, ...counts };
    });
    res.json({ weeks: out });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// src/routes/activitieslog.ts
var LogsRouter = express2.Router();
LogsRouter.get("/", protect, authorize(["admin", "teacher", "unitconsultant", "unitresident"]), getAllActivities);
LogsRouter.get("/role-stats", protect, authorize(["admin"]), getRoleStats);
LogsRouter.get("/weekly", protect, authorize(["admin"]), getWeeklyActivityCounts);
var activitieslog_default2 = LogsRouter;

// src/routes/academicYear.ts
import express3 from "express";

// src/controllers/academicYear.ts
init_academicYear();
init_activitieslog2();
import "express";
var createAcademicYear = async (req, res) => {
  try {
    const { name, fromYear, toYear, isCurrent, clockPhase } = req.body;
    const existingYear = await academicYear_default.findOne({
      fromYear,
      toYear
    });
    if (existingYear) {
      res.status(400).json({
        message: "Academic Year already exists!"
      });
      return;
    }
    if (isCurrent) {
      await academicYear_default.updateMany(
        { _id: { $ne: null } },
        { isCurrent: false }
      );
    }
    const academicYear2 = await academicYear_default.create({
      name,
      fromYear,
      toYear,
      isCurrent: isCurrent || false,
      clockStartDate: fromYear,
      clockIsPaused: false,
      clockPausedAt: null,
      clockPhase: clockPhase ?? null
    });
    await logActivity({
      userId: req.user._id,
      action: `Created academic year ${name}, with ID: ${academicYear2._id} and it's ${isCurrent ? "current" : "not current"}`
    });
    res.status(201).json(academicYear2);
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: `${error}`
    });
  }
};
var getAllAcademicYears = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search;
    const query = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }
    const [total, years] = await Promise.all([
      academicYear_default.countDocuments(query),
      academicYear_default.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
    ]);
    res.json({
      years,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: `Server error`, error });
  }
};
var getCurrentAcademicYear = async (req, res) => {
  try {
    const currentYear = await academicYear_default.findOne({ isCurrent: true });
    if (!currentYear) {
      res.status(200).json({ year: null, message: "No current academic year set" });
      return;
    }
    res.status(200).json({ year: currentYear });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: `${error}`
    });
  }
};
var updateAcademicYear = async (req, res) => {
  try {
    const { isCurrent } = req.body;
    if (isCurrent) {
      await academicYear_default.updateMany(
        { _id: { $ne: req.params.id } },
        { isCurrent: false }
      );
    }
    const updatedYear = await academicYear_default.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: "after", runValidators: true }
    );
    await logActivity({
      userId: req.user._id,
      action: `Updated academic year ${updatedYear?.name} with ID: ${updatedYear?._id} and it's ${isCurrent ? "current" : "not current"}`
    });
    if (!updatedYear) {
      res.status(404).json({
        message: "Academic Year not found!"
      });
    }
    res.status(200).json(updatedYear);
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: `${error}`
    });
  }
};
var deleteAcedemicYear = async (req, res) => {
  try {
    const year = await academicYear_default.findById(req.params.id);
    if (!year) {
      res.status(404).json({ message: "Academic Year not found!" });
      return;
    }
    if (year.isCurrent) {
      res.status(404).json({ message: "Cannot delete the current active academic year!" });
      return;
    }
    await year.deleteOne();
    await logActivity({
      userId: req.user._id,
      action: `Deleted academic year ${year.name} with ID: ${year._id} and it's ${year.isCurrent ? "current" : "not current"}`
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: `${error}`
    });
  }
};

// src/routes/academicYear.ts
var academicYearRouter = express3.Router();
academicYearRouter.route("/create").post(protect, authorize(["admin"]), createAcademicYear);
academicYearRouter.route("/").get(protect, authorize(["admin", "teacher", "parent", "student", "unitconsultant", "unitresident"]), getAllAcademicYears);
academicYearRouter.route("/current").get(getCurrentAcademicYear);
academicYearRouter.route("/update/:id").patch(protect, authorize(["admin"]), updateAcademicYear);
academicYearRouter.route("/delete/:id").delete(protect, authorize(["admin"]), deleteAcedemicYear);
var academicYear_default2 = academicYearRouter;

// src/routes/academicClock.ts
import * as express4 from "express";

// src/controllers/academicClock.ts
import "express";

// src/models/academicClock.ts
import mongoose16, { Schema as Schema11 } from "mongoose";
var LevelPhaseData = {
  final: {},
  sixth: {
    classNameID: "600 Level",
    phase1: {
      name: "Medicine and Surgery Final Postings",
      duration: 4,
      postingType: "MED&SURG3",
      postingId: null
    },
    phase2: {
      name: "Other Specialty Postings",
      duration: 6,
      postingType: "SPECIALTY",
      postingId: null
    },
    phase3: {
      name: "Community Medicine & Rural Postings",
      duration: 4,
      postingType: "COM&RURAL",
      postingId: null
    },
    phase4: {
      name: "Acccident & Emergency Postings",
      duration: 2,
      postingType: "ACCIDENT&EMERGENCY",
      postingId: null
    },
    numberOfPhases: 4
  },
  fifth: {
    phase1: {
      name: "O&G/Pediatrics Junior Postings",
      duration: 4,
      postingType: "OG_PEDS",
      postingId: null
    },
    phase2: {
      name: "Specialty Postings",
      duration: 6,
      postingType: "SPECIALTY",
      postingId: null
    },
    phase3: {
      name: "O&G/Pediatrics Senior Postings",
      duration: 4,
      postingType: "OG_PEDS",
      postingId: null
    },
    phase4: {
      name: "4th MBBS Exams/Elective Posting",
      duration: 2,
      postingType: null,
      postingId: null
    },
    classNameID: "500 Level",
    numberOfPhases: 4
  },
  fourth: {
    classNameID: "400 Level",
    phase1: {
      name: "Medicine and Surgery Initial Clinical Postings",
      duration: 10,
      postingType: "MED&SURG0&1&2",
      postingId: null
    },
    phase2: {
      name: "Pathology Block Postings",
      duration: 4,
      postingType: "PATHOLOGY",
      postingId: null
    },
    phase3: {
      name: "3rd MBBS Exams",
      duration: 2,
      postingType: null,
      postingId: null
    },
    numberOfPhases: 3
  },
  third: {
    classNameID: "300 Level",
    phase1: {
      name: "Preclinical Postings",
      duration: 12,
      postingType: "PRECLINICAL",
      postingId: null
    },
    phase2: {
      name: "2nd MBBS Exams",
      duration: 2,
      postingType: null,
      postingId: null
    },
    numberOfPhases: 2
  }
};
var resolveClassLevelFromName = (className) => {
  const normalized = (className ?? "").toLowerCase();
  if (normalized.includes("500") || normalized.includes("fifth")) return "fifth";
  if (normalized.includes("400") || normalized.includes("fourth")) return "fourth";
  if (normalized.includes("300") || normalized.includes("third")) return "third";
  if (normalized.includes("600") || normalized.includes("sixth")) return "sixth";
  if (normalized.includes("final")) return "final";
  return null;
};
var buildPhaseConfigForClassLevel = (classLevel) => {
  if (!classLevel) return {};
  const phaseData = LevelPhaseData[String(classLevel)] ?? {};
  return Object.entries(phaseData).filter(([key]) => key.startsWith("phase")).reduce((acc, [key, value]) => {
    const phaseValue = value;
    acc[key] = {
      name: String(phaseValue?.name ?? ""),
      duration: Number(phaseValue?.duration ?? 0),
      postingType: phaseValue?.postingType ?? null,
      postingId: phaseValue?.postingId ?? null
    };
    return acc;
  }, {});
};
var AcademicClockSchema = new Schema11(
  {
    academicYear: {
      type: mongoose16.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true
    },
    classId: {
      type: mongoose16.Schema.Types.ObjectId,
      ref: "Class",
      required: true
    },
    classLevel: {
      type: String,
      enum: ["final", "sixth", "fifth", "fourth", "third"],
      default: null
    },
    clockStartDate: {
      type: Date,
      default: null
    },
    clockIsPaused: {
      type: Boolean,
      default: false
    },
    clockPausedAt: {
      type: Date,
      default: null
    },
    clockPhase: {
      type: String,
      enum: ["phase1", "phase2", "phase3", "phase4"],
      default: null
    },
    phaseConfig: {
      type: Schema11.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);
var AcademicClock = mongoose16.model("AcademicClock", AcademicClockSchema);
var academicClock_default = AcademicClock;
var PostingTemplate = {
  Schedule: {
    _id: new mongoose16.Types.ObjectId("64f8e1c2f1a2b3c4d5e6f7a9"),
    // Replace with the actual Schedule ID
    name: "500 Level OG/PAE Junior Postings",
    duration: 4,
    //months
    postingType: "OG_PEDS",
    postingId: null,
    classLevel: "fifth",
    classNameID: "500 Level",
    classId: new mongoose16.Types.ObjectId("64f8e1c2f1a2b3c4d5e6f7a8"),
    // Replace with the actual Class ID for 500 Level
    startDate: /* @__PURE__ */ new Date(),
    // Replace with the actual start date of the posting
    endDate: new Date((/* @__PURE__ */ new Date()).setMonth((/* @__PURE__ */ new Date()).getMonth() + 4)),
    // Replace with the actual end date of the posting
    phase1: {
      groupA: {
        posting: "O&G",
        duration: 2,
        //months
        totalNumberofUnitsPerStudent: 2,
        units: {
          unit1: {
            OandG_Unit_1: {
              name: "O&G Unit 1",
              duration: 1,
              //months
              postingType: "O&G",
              students: []
              //array of student IDs
            }
          },
          unit2: {
            OandG_Unit_2: {
              name: "O&G Unit 2",
              duration: 1,
              //months
              postingType: "O&G",
              students: []
              //array of student IDs
            }
          }
        }
        //array of units for this posting
      },
      groupB: {
        posting: "Pediatrics",
        duration: 2,
        //months
        totalNumberofUnitsPerStudent: 4,
        units: {
          unit1: {
            Pediatrics_Unit_1: {
              name: "Pediatrics Unit 1",
              duration: 2,
              // weeks
              postingType: "Pediatrics",
              students: []
              //array of student IDs
            }
          },
          unit2: {
            Pediatrics_Unit_2: {
              name: "Pediatrics Unit 2",
              duration: 2,
              // weeks
              postingType: "Pediatrics",
              students: []
              //array of student IDs
            }
          },
          //array of units for this posting
          unit3: {
            Pediatrics_Unit_3: {
              name: "Pediatrics Unit 3",
              duration: 2,
              // weeks
              postingType: "Pediatrics",
              students: []
              //array of student IDs
            }
          },
          unit4: {
            Pediatrics_Unit_4: {
              name: "Pediatrics Unit 4",
              duration: 2,
              // weeks
              postingType: "Pediatrics",
              students: []
              //array of student IDs
            }
          }
        }
      }
    },
    phase2: {
      groupA: {
        posting: "Pediatrics",
        duration: 2,
        //months
        totalNumberofUnitsPerStudent: 4,
        units: {
          unit1: {
            Pediatrics_Unit_1: {
              name: "Pediatrics Unit 1",
              duration: 2,
              // weeks
              postingType: "Pediatrics",
              students: []
              //array of student IDs
            }
          },
          unit2: {
            Pediatrics_Unit_2: {
              name: "Pediatrics Unit 2",
              duration: 2,
              // weeks
              postingType: "Pediatrics",
              students: []
              //array of student IDs
            }
          },
          //array of units for this posting
          unit3: {
            Pediatrics_Unit_3: {
              name: "Pediatrics Unit 3",
              duration: 2,
              // weeks
              postingType: "Pediatrics",
              students: []
              //array of student IDs
            }
          },
          unit4: {
            Pediatrics_Unit_4: {
              name: "Pediatrics Unit 4",
              duration: 2,
              // weeks
              postingType: "Pediatrics",
              students: []
              //array of student IDs
            }
          }
        }
      },
      groupB: {
        posting: "O&G",
        duration: 2,
        //months
        totalNumberofUnitsPerStudent: 2,
        units: {
          unit1: {
            OandG_Unit_1: {
              name: "O&G Unit 1",
              duration: 1,
              //months
              postingType: "O&G",
              students: []
              //array of student IDs
            }
          },
          unit2: {
            OandG_Unit_2: {
              name: "O&G Unit 2",
              duration: 1,
              //months
              postingType: "O&G",
              students: []
              //array of student IDs
            }
          }
        }
        //array of units for this posting   
      }
    }
  }
};

// src/controllers/academicClock.ts
init_academicYear();
init_classes();
init_activitieslog2();
var createAcademicClock = async (req, res) => {
  try {
    const {
      academicYearId,
      classId,
      clockStartDate,
      clockIsPaused,
      clockPausedAt,
      clockPhase,
      classLevel,
      phaseConfig
    } = req.body;
    if (!academicYearId || !classId) {
      res.status(400).json({ message: "academicYearId and classId are required" });
      return;
    }
    const [academicYear2, classDoc] = await Promise.all([
      academicYear_default.findById(academicYearId),
      classes_default.findById(classId)
    ]);
    if (!academicYear2) {
      res.status(404).json({ message: "Academic year not found" });
      return;
    }
    if (!classDoc) {
      res.status(404).json({ message: "Class not found" });
      return;
    }
    const existingClock = await academicClock_default.findOne({ academicYear: academicYearId, classId });
    if (existingClock) {
      res.status(409).json({ message: "Academic clock already exists for this class and academic year" });
      return;
    }
    const resolvedClassLevel = classLevel ?? resolveClassLevelFromName(classDoc?.name ?? "");
    const resolvedPhaseConfig = phaseConfig ?? buildPhaseConfigForClassLevel(resolvedClassLevel);
    const academicClock = await academicClock_default.create({
      academicYear: academicYearId,
      classId,
      clockStartDate: clockStartDate ?? null,
      clockIsPaused: clockIsPaused ?? false,
      clockPausedAt: clockPausedAt ?? null,
      clockPhase: clockPhase ?? null,
      classLevel: resolvedClassLevel ?? null,
      phaseConfig: resolvedPhaseConfig
    });
    await academicYear_default.findByIdAndUpdate(
      academicYearId,
      {
        $set: {
          [`classClockData.${String(classId)}`]: {
            classId,
            classLevel: academicClock.classLevel ?? null,
            clockStartDate: academicClock.clockStartDate,
            clockIsPaused: academicClock.clockIsPaused,
            clockPausedAt: academicClock.clockPausedAt,
            clockPhase: academicClock.clockPhase,
            phaseConfig: academicClock.phaseConfig
          }
        }
      },
      { returnDocument: "after" }
    );
    await logActivity({
      userId: req.user?._id,
      action: `Created academic clock for class ${classId} on academic year ${academicYear2.name}`
    });
    res.status(201).json(academicClock);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: `${error}` });
  }
};
var getAcademicClocks = async (req, res) => {
  try {
    const query = {};
    if (req.query.academicYearId) query.academicYear = req.query.academicYearId;
    if (req.query.classId) query.classId = req.query.classId;
    const clocks = await academicClock_default.find(query).populate("academicYear", "name fromYear toYear isCurrent").populate("classId", "name academicYear");
    res.json({ clocks });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
var getAcademicClockById = async (req, res) => {
  try {
    const academicClock = await academicClock_default.findById(req.params.id).populate("academicYear", "name fromYear toYear isCurrent").populate("classId", "name academicYear");
    if (!academicClock) {
      res.status(404).json({ message: "Academic clock not found" });
      return;
    }
    res.json(academicClock);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
var updateAcademicClock = async (req, res) => {
  try {
    const allowedUpdates = [
      "clockStartDate",
      "clockIsPaused",
      "clockPausedAt",
      "clockPhase",
      "classLevel",
      "phaseConfig",
      "academicYear",
      "classId"
    ];
    const updateData = {};
    allowedUpdates.forEach((field) => {
      if (field in req.body) {
        updateData[field] = req.body[field];
      }
    });
    const academicClock = await academicClock_default.findById(req.params.id);
    if (!academicClock) {
      res.status(404).json({ message: "Academic clock not found" });
      return;
    }
    const classDoc = await classes_default.findById(academicClock.classId);
    const resolvedClassLevel = typeof req.body.classLevel === "string" && req.body.classLevel ? req.body.classLevel : academicClock.classLevel ?? resolveClassLevelFromName(classDoc?.name ?? "");
    if (resolvedClassLevel && !Object.prototype.hasOwnProperty.call(req.body, "phaseConfig")) {
      updateData.phaseConfig = buildPhaseConfigForClassLevel(resolvedClassLevel);
    }
    if (resolvedClassLevel && !Object.prototype.hasOwnProperty.call(req.body, "classLevel")) {
      updateData.classLevel = resolvedClassLevel;
    }
    const updatedClock = await academicClock_default.findByIdAndUpdate(req.params.id, updateData, {
      returnDocument: "after",
      runValidators: true
    });
    if (!updatedClock) {
      res.status(404).json({ message: "Academic clock not found" });
      return;
    }
    await academicYear_default.findByIdAndUpdate(
      updatedClock.academicYear,
      {
        $set: {
          [`classClockData.${String(updatedClock.classId)}`]: {
            classId: updatedClock.classId,
            classLevel: updatedClock.classLevel ?? null,
            clockStartDate: updatedClock.clockStartDate,
            clockIsPaused: updatedClock.clockIsPaused,
            clockPausedAt: updatedClock.clockPausedAt,
            clockPhase: updatedClock.clockPhase,
            phaseConfig: updatedClock.phaseConfig
          }
        }
      },
      { returnDocument: "after" }
    );
    await logActivity({
      userId: req.user?._id,
      action: `Updated academic clock ${updatedClock._id}`
    });
    res.status(200).json(updatedClock);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
var deleteAcademicClock = async (req, res) => {
  try {
    const academicClock = await academicClock_default.findById(req.params.id);
    if (!academicClock) {
      res.status(404).json({ message: "Academic clock not found" });
      return;
    }
    await academicYear_default.findByIdAndUpdate(
      academicClock.academicYear,
      {
        $unset: {
          [`classClockData.${String(academicClock.classId)}`]: ""
        }
      },
      { returnDocument: "after" }
    );
    await academicClock.deleteOne();
    await logActivity({
      userId: req.user?._id,
      action: `Deleted academic clock ${academicClock._id}`
    });
    res.status(200).json({ message: "Academic clock deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
var deleteAcademicClockByClass = async (req, res) => {
  try {
    const academicYearId = req.query.academicYearId;
    const classId = req.query.classId;
    if (!academicYearId || !classId) {
      res.status(400).json({ message: "academicYearId and classId are required" });
      return;
    }
    const academicClock = await academicClock_default.findOne({ academicYear: academicYearId, classId });
    if (!academicClock) {
      res.status(404).json({ message: "Academic clock not found for this class" });
      return;
    }
    await academicYear_default.findByIdAndUpdate(
      academicYearId,
      {
        $unset: {
          [`classClockData.${String(classId)}`]: ""
        }
      },
      { returnDocument: "after" }
    );
    await academicClock.deleteOne();
    await logActivity({
      userId: req.user?._id,
      action: `Deleted academic clock for class ${classId}`
    });
    res.status(200).json({ message: "Academic clock deleted for class" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// src/controllers/academicClockComplete.ts
init_academicYear();
init_user();
init_classes();

// src/utils/notificationUtils.ts
init_notification();
import "mongoose";
var DUPLICATE_WINDOW_MS = 5 * 60 * 1e3;
var createNotificationIfUnique = async (payload) => {
  const now = /* @__PURE__ */ new Date();
  const duplicateSince = new Date(now.getTime() - DUPLICATE_WINDOW_MS);
  const search = {
    userId: payload.userId,
    title: payload.title,
    message: payload.message,
    type: payload.type ?? "system",
    createdAt: { $gte: duplicateSince }
  };
  const existing = await Notification.findOne(search);
  if (existing) {
    return existing;
  }
  return Notification.create({
    userId: payload.userId,
    role: payload.role,
    title: payload.title,
    message: payload.message,
    type: payload.type ?? "system",
    isRead: false,
    link: payload.link,
    metadata: payload.metadata,
    actorName: payload.actorName,
    actorRole: payload.actorRole
  });
};

// src/controllers/academicClockComplete.ts
var completeAcademicClockByClass = async (req, res) => {
  try {
    const { academicYearId, classId } = req.body;
    if (!academicYearId || !classId) {
      res.status(400).json({ message: "academicYearId and classId are required" });
      return;
    }
    const clock = await academicClock_default.findOne({ academicYear: academicYearId, classId });
    if (!clock) return res.status(404).json({ message: "Academic clock not found" });
    clock.clockIsPaused = true;
    await clock.save();
    const year = await academicYear_default.findById(academicYearId);
    const classDoc = await classes_default.findById(classId).select("name");
    const className = classDoc?.name ?? classId;
    const executor = req.user;
    const actorName = executor?.name ?? executor?.email ?? "An administrator";
    const actorRole = executor?.role ?? "admin";
    const adminUsers = await user_default.find({ role: "admin", isActive: true }).select("_id").lean();
    if (adminUsers.length > 0) {
      await Promise.all(
        adminUsers.map(
          (user) => createNotificationIfUnique({
            userId: user._id,
            role: "admin",
            title: "Academic Clock Completed",
            message: `${actorName} completed the academic clock for ${className} in ${year?.name ?? academicYearId}.`,
            type: "system",
            actorName,
            actorRole,
            metadata: {
              academicYearId,
              classId
            }
          })
        )
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to complete clock" });
  }
};

// src/routes/academicClock.ts
var academicClockRouter = express4.Router();
academicClockRouter.route("/create").post(protect, authorize(["admin"]), createAcademicClock);
academicClockRouter.route("/").get(
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident", "student", "parent"]),
  getAcademicClocks
);
academicClockRouter.route("/:id").get(
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident", "student", "parent"]),
  getAcademicClockById
);
academicClockRouter.route("/update/:id").patch(protect, authorize(["admin"]), updateAcademicClock);
academicClockRouter.route("/delete/by-class").delete(protect, authorize(["admin"]), deleteAcademicClockByClass);
academicClockRouter.route("/complete/by-class").post(protect, authorize(["admin"]), completeAcademicClockByClass);
academicClockRouter.route("/delete/:id").delete(protect, authorize(["admin"]), deleteAcademicClock);
var academicClock_default2 = academicClockRouter;

// src/routes/classes.ts
import express5 from "express";

// src/controllers/classes.ts
init_classes();
init_user();
init_activitieslog2();
import "express";
var getClassById = async (req, res) => {
  try {
    const cls = await classes_default.findById(req.params.id).populate("academicYear", "name").populate("classTeacher", "name email").populate("courses", "name code subjects.subjectID").select("name academicYear classTeacher courses");
    if (!cls) {
      return res.status(404).json({ message: "Class not found" });
    }
    res.json(cls);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
var getStudentsForClass = async (req, res) => {
  try {
    const classId = req.params.id;
    const students = await user_default.find({ studentClasses: classId, role: "student" }).select("name email idNumber studentClasses");
    res.json({ students });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
var createClass = async (req, res) => {
  try {
    const { name, academicYear: academicYear2, classTeacher, capacity, courses, students } = req.body;
    const existingClass = await classes_default.findOne({ name, academicYear: academicYear2 });
    if (existingClass) {
      return res.status(400).json({
        message: `Class with the same name already exists for the specified academic year!`
      });
    }
    const studentIds = Array.isArray(students) ? students : [];
    const newClass = await classes_default.create(
      {
        name,
        academicYear: academicYear2,
        classTeacher,
        capacity,
        courses: Array.isArray(courses) ? courses : [],
        students: studentIds
      }
    );
    if (studentIds.length > 0) {
      await user_default.updateMany(
        { _id: { $in: studentIds }, role: "student" },
        { $set: { studentClasses: newClass._id } }
      );
    }
    await logActivity({
      userId: req.user?._id,
      action: `Created new class: ${newClass.name}`
    });
    res.status(201).json({ newClass });
  } catch (error) {
    res.status(500).json({ message: `Server error,`, error: `${error}` });
  }
};
var getAllClasses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search;
    const query = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }
    const [total, classes] = await Promise.all([
      classes_default.countDocuments(query),
      classes_default.find(query).populate("academicYear", "name").populate("classTeacher", "name email").populate("courses", "name code subjects.subjectID lecturer").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
    ]);
    res.json({
      classes,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error
    });
  }
};
var updateClass = async (req, res) => {
  try {
    const classId = req.params.id;
    const { name, academicYear: academicYear2, classTeacher, capacity, courses, students } = req.body;
    const existingClass = await classes_default.findOne({
      name,
      academicYear: academicYear2,
      _id: { $ne: classId }
    });
    if (existingClass) {
      return res.status(400).json({
        message: "Class with this name already exists for the specified academic year"
      });
    }
    const currentClass = await classes_default.findById(classId);
    if (!currentClass) {
      return res.status(404).json({ message: "Class not found!" });
    }
    const oldStudentIds = (currentClass.students ?? []).map(String);
    const newStudentIds = students === void 0 ? oldStudentIds : Array.isArray(students) ? students.map(String) : [];
    const addedStudentIds = newStudentIds.filter((id) => !oldStudentIds.includes(id));
    const removedStudentIds = oldStudentIds.filter((id) => !newStudentIds.includes(id));
    const updateData = {};
    if (name !== void 0) updateData.name = name;
    if (academicYear2 !== void 0) updateData.academicYear = academicYear2;
    if (classTeacher !== void 0) updateData.classTeacher = classTeacher;
    if (capacity !== void 0) updateData.capacity = capacity;
    if (courses !== void 0) updateData.courses = Array.isArray(courses) ? courses : [];
    if (students !== void 0) updateData.students = newStudentIds;
    const updatedClass = await classes_default.findByIdAndUpdate(
      classId,
      updateData,
      { returnDocument: "after", runValidators: true }
    );
    if (!updatedClass) {
      return res.status(404).json({ message: "Class not found!" });
    }
    if (addedStudentIds.length > 0) {
      await user_default.updateMany(
        { _id: { $in: addedStudentIds }, role: "student" },
        { $set: { studentClasses: updatedClass._id } }
      );
    }
    if (removedStudentIds.length > 0) {
      await user_default.updateMany(
        { _id: { $in: removedStudentIds }, role: "student" },
        { $set: { studentClasses: null } }
      );
    }
    await logActivity({
      userId: req.user.id,
      action: `Updated class: ${updatedClass?.name}`
    });
    res.status(200).json(updatedClass);
  } catch (error) {
    res.status(500).json({ message: `Server error`, error: `${error}` });
  }
};
var deleteClass = async (req, res) => {
  try {
    const deletedClass = await classes_default.findByIdAndDelete(req.params.id);
    const userId = req.user._id;
    await logActivity({
      userId,
      action: `Deleted ${deletedClass?.name} Class`
    });
    if (!deletedClass) {
      return res.status(404).json({
        message: `Class not found! - ${userId} Is ${deletedClass}.`
      });
    }
    res.json({ message: `Class removed!` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
var removeCourseFromClass = async (req, res) => {
  try {
    const { classId, courseId } = req.params;
    const cls = await classes_default.findById(classId);
    if (!cls) {
      return res.status(404).json({ message: "Class not found" });
    }
    const beforeCount = (cls.courses ?? []).length;
    cls.courses = (cls.courses ?? []).filter((c) => String(c) !== String(courseId));
    const afterCount = (cls.courses ?? []).length;
    if (beforeCount === afterCount) {
      return res.status(404).json({ message: "Course not found in this class" });
    }
    await cls.save();
    const userId = req.user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Removed course ${courseId} from class ${cls.name}`
      });
    }
    return res.json({ message: "Course removed from class", classId: cls._id, courses: cls.courses });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

// src/routes/classes.ts
var classRouter = express5.Router();
classRouter.post("/create", protect, authorize(["admin"]), createClass);
classRouter.get("/", protect, authorize(["admin", "teacher", "parent"]), getAllClasses);
classRouter.get("/:id", protect, authorize(["admin", "teacher", "student", "parent", "unitconsultant", "unitresident"]), getClassById);
classRouter.get("/:id/students", protect, authorize(["admin", "teacher", "student", "parent", "unitconsultant", "unitresident"]), getStudentsForClass);
classRouter.patch("/update/:id", protect, authorize(["admin", "teacher", "unitconsultant", "unitresident"]), updateClass);
classRouter.delete("/delete/:id", protect, authorize(["admin"]), deleteClass);
classRouter.delete(
  "/:classId/courses/:courseId",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  removeCourseFromClass
);
var classes_default2 = classRouter;

// src/routes/courses.ts
import express6 from "express";

// src/controllers/courses.ts
init_activitieslog2();
import "express";
import mongoose21 from "mongoose";

// src/models/courses.ts
import mongoose18, { Schema as Schema12 } from "mongoose";
var StudentClassMembershipSchema = new Schema12(
  {
    classID: {
      type: Schema12.Types.ObjectId,
      ref: "Class",
      required: true
    },
    students: [{ type: Schema12.Types.ObjectId, ref: "User", default: [] }]
  },
  { _id: false }
);
var CourseSubjectSchema = new Schema12(
  {
    subjectUID: {
      type: String,
      required: true,
      trim: true,
      default: () => new mongoose18.Types.ObjectId().toHexString()
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, default: null },
    // Keep naming consistent with requested output
    subjectID: { type: String, required: true, trim: true },
    unit: {
      type: Schema12.Types.ObjectId,
      ref: "Unit",
      required: false,
      default: null
    },
    lecturer: [{ type: Schema12.Types.ObjectId, ref: "User", default: [] }],
    isActive: { type: Boolean, default: true },
    semester: { type: String, trim: true, default: null },
    students: [{ type: Schema12.Types.ObjectId, ref: "User", default: [] }]
  },
  { timestamps: true }
);
var CourseSchema = new Schema12(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true },
    courseID: { type: String, required: true, trim: true },
    semester: { type: String, required: false, trim: true, default: null },
    year: { type: String, required: false, trim: true, default: null },
    department: {
      type: Schema12.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true
    },
    unit: {
      type: Schema12.Types.ObjectId,
      ref: "Unit",
      required: false,
      index: true,
      default: null
    },
    lecturer: [{ type: Schema12.Types.ObjectId, ref: "User", default: [] }],
    isActive: { type: Boolean, default: true },
    // [{ classID, students: [UserIds] }]
    studentClasses: { type: [StudentClassMembershipSchema], default: [] },
    // Embedded subjects
    subjects: { type: [CourseSubjectSchema], default: [] },
    // REQUIRED: academic year
    academicYear: {
      type: Schema12.Types.ObjectId,
      ref: "AcademicYear",
      required: false,
      index: true
    }
  },
  { timestamps: true }
);
CourseSchema.index({ courseID: 1, academicYear: 1, department: 1 }, { unique: true });
var courses_default = mongoose18.model("Course", CourseSchema);

// src/controllers/courses.ts
init_user();
init_classes();
init_academicYear();

// src/models/units.ts
import mongoose19, { Schema as Schema13 } from "mongoose";
var UnitSchema = new Schema13(
  {
    name: {
      type: String,
      required: [true, "Unit name required"],
      trim: true
    },
    code: {
      type: String,
      required: [true, "Unit code required"],
      trim: true
    },
    unitID: {
      type: String,
      required: [true, "Unit ID required"],
      trim: true
    },
    // Reference to the Department model
    department: {
      type: Schema13.Types.ObjectId,
      ref: "Department",
      required: true
    },
    // Reference to the User model (Supervisor role)
    supervisor: {
      type: Schema13.Types.ObjectId,
      ref: "User",
      default: null
    },
    // Arrays of References to Course model
    courses: [
      {
        type: Schema13.Types.ObjectId,
        ref: "Course"
      }
    ]
  },
  {
    timestamps: true
    // Automatically manages createdAt and updatedAt
  }
);
UnitSchema.index(
  { name: 1, unitID: 1 },
  { unique: true }
);
var units_default = mongoose19.model("Unit", UnitSchema);

// src/services/subjects.ts
import mongoose20, { Schema as Schema14 } from "mongoose";
var subjectSchema = new Schema14(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      trim: true,
      default: null
    },
    courseID: {
      type: String,
      required: true,
      trim: true
    },
    lecturer: [{
      type: Schema14.Types.ObjectId,
      ref: "User"
    }],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);
subjectSchema.index({ name: 1, courseID: 1 }, { unique: true });
var subjects_default = mongoose20.model("Subjects", subjectSchema);

// src/controllers/courses.ts
init_exam();
var isObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(value);
var findOrCreateDepartment = async (identifier) => {
  if (!identifier) return null;
  let departmentDoc = null;
  if (isObjectId(identifier)) {
    departmentDoc = await departments_default.findById(identifier);
  }
  if (!departmentDoc) {
    departmentDoc = await departments_default.findOne({ code: identifier });
  }
  if (!departmentDoc) {
    departmentDoc = await departments_default.findOne({ departmentID: identifier });
  }
  if (!departmentDoc) {
    const constantsDept = getAllDepartments().find(
      (d) => d.code === identifier || d.departmentID === identifier || d.name === identifier
    );
    if (constantsDept) {
      departmentDoc = await departments_default.findOneAndUpdate(
        { code: constantsDept.code },
        {
          name: constantsDept.name,
          code: constantsDept.code,
          departmentID: constantsDept.departmentID
        },
        { upsert: true, returnDocument: "after" }
      );
    }
  }
  return departmentDoc;
};
var normalizeCourseCode = (departmentCode, code) => {
  const raw = String(code ?? "").trim().toUpperCase().replace(/\s+/g, " ");
  const numberPart = raw.replace(/^[A-Z]{3}\s*/i, "").trim();
  if (!numberPart) return `${departmentCode} 000`;
  if (new RegExp(`^${departmentCode}\\s\\d{3}$`).test(raw)) return raw;
  return `${departmentCode} ${numberPart.padStart(3, "0")}`.trim();
};
var isValidCourseCode = (departmentCode, code) => {
  const raw = String(code ?? "").trim().toUpperCase();
  return new RegExp(`^${departmentCode}\\s\\d{3}$`).test(raw);
};
var deriveUnitCode = (name) => String(name).trim().split(/\s+/).map((segment) => segment.charAt(0)).join("").slice(0, 4).toUpperCase() || "UNIT";
var getNormalizedDepartmentValue = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "object") {
    const obj = value;
    return String(obj._id ?? obj.code ?? obj.departmentID ?? obj.name ?? "").trim().toLowerCase();
  }
  return "";
};
var isUserInDepartment = (user, departmentDoc) => {
  if (!user || !departmentDoc) return false;
  const userDept = getNormalizedDepartmentValue(user.department);
  const validDeptValues = /* @__PURE__ */ new Set([
    String(departmentDoc._id).trim().toLowerCase(),
    String(departmentDoc.code).trim().toLowerCase(),
    String(departmentDoc.departmentID).trim().toLowerCase(),
    String(departmentDoc.name).trim().toLowerCase()
  ]);
  return validDeptValues.has(userDept);
};
var generateSubjectUID = (subject) => {
  if (subject && typeof subject.subjectUID === "string" && subject.subjectUID.trim() !== "") {
    return String(subject.subjectUID).trim();
  }
  return new mongoose21.Types.ObjectId().toHexString();
};
var normalizeClassIdValue = (value) => {
  if (!value) return void 0;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (typeof value._id === "string") return value._id;
    if (typeof value.id === "string") return value.id;
  }
  return void 0;
};
var getClassCourseDocuments = async (classId) => {
  if (!isObjectId(classId)) return null;
  return await classes_default.findById(classId).populate({
    path: "courses",
    select: "name code courseID lecturer isActive subjects department unit",
    populate: [
      { path: "department", select: "name departmentID code head" },
      { path: "unit", select: "name unitID code" },
      { path: "lecturer", select: "name email" },
      { path: "subjects.lecturer", select: "name email" }
    ]
  });
};
var validateDepartmentLecturers = async (lecturerIds, departmentDoc) => {
  if (!Array.isArray(lecturerIds) || lecturerIds.length === 0) return null;
  const users = await user_default.find({ _id: { $in: lecturerIds }, role: { $in: ["teacher", "admin"] } });
  if (users.length !== lecturerIds.length) {
    return "Some selected lecturers were not found or do not have teacher/admin roles.";
  }
  const invalid = users.find((user) => !isUserInDepartment(user, departmentDoc));
  if (invalid) {
    return `Lecturer ${invalid.name ?? invalid.email ?? invalid._id} is not assigned to department ${departmentDoc.name}.`;
  }
  return null;
};
var findOrCreateUnit = async (departmentDoc, unitIdentifier) => {
  if (!unitIdentifier) return null;
  const unitName = String(unitIdentifier).trim();
  if (!unitName) return null;
  let unitDoc = null;
  if (isObjectId(unitName)) {
    unitDoc = await units_default.findById(unitName);
  }
  if (!unitDoc) {
    unitDoc = await units_default.findOne({ name: unitName, department: departmentDoc._id });
  }
  if (!unitDoc) {
    const counter = Math.floor(Math.random() * 900) + 100;
    unitDoc = await units_default.create({
      name: unitName,
      code: deriveUnitCode(unitName),
      unitID: `${departmentDoc.code}-${deriveUnitCode(unitName)}-${counter}`,
      department: departmentDoc._id,
      supervisor: void 0,
      courses: []
    });
  }
  if (String(unitDoc.department) !== String(departmentDoc._id)) {
    return null;
  }
  return unitDoc;
};
var syncUnitsFromConstants = async () => {
  const departments = getAllDepartments();
  await Promise.all(
    departments.map(async (constDept) => {
      const unitData = getDepartmentUnitsByCode(constDept.code);
      if (!unitData) return;
      const departmentDoc = await departments_default.findOne({ code: constDept.code });
      if (!departmentDoc) return;
      const normalizeUnitName = (unitEntry) => typeof unitEntry === "string" ? String(unitEntry).trim() : unitEntry && typeof unitEntry.name === "string" ? unitEntry.name.trim() : "";
      const unitNames = [
        ...unitData.units.active.map(normalizeUnitName),
        ...unitData.units.reserve.map(normalizeUnitName)
      ].filter(Boolean);
      await Promise.all(
        unitNames.map(async (name, index) => {
          const cleanName = String(name).trim();
          if (!cleanName) return;
          await units_default.findOneAndUpdate(
            { name: cleanName, department: departmentDoc._id },
            {
              name: cleanName,
              code: deriveUnitCode(cleanName),
              unitID: `${constDept.code}-${deriveUnitCode(cleanName)}-${index + 1}`,
              department: departmentDoc._id
            },
            { upsert: true }
          );
        })
      );
    })
  );
};
var createCourse = async (req, res) => {
  try {
    const {
      name,
      code,
      courseID,
      department,
      unit,
      semester,
      year,
      isActive,
      studentClasses,
      lecturer
    } = req.body;
    const { academicYearId } = req.body;
    if (!name || !code || !courseID || !department || !semester || !academicYearId) {
      return res.status(400).json({
        message: "Missing required fields (name, code, courseID, department, semester, academicYearId)."
      });
    }
    const departmentDoc = await findOrCreateDepartment(department);
    if (!departmentDoc) {
      return res.status(404).json({
        message: `Department not found for identifier=${department}`
      });
    }
    if (String(courseID).trim().toUpperCase() !== String(departmentDoc.code).trim().toUpperCase()) {
      return res.status(400).json({
        message: `Course Group ID must match the selected department code (${departmentDoc.code}).`
      });
    }
    const normalizedCode = normalizeCourseCode(departmentDoc.code, code);
    if (!isValidCourseCode(departmentDoc.code, normalizedCode)) {
      return res.status(400).json({
        message: `Course code must use the selected department code and three digits, e.g. ${departmentDoc.code} 501.`
      });
    }
    const unitValue = unit && String(unit).trim() !== "" ? unit : null;
    if (unitValue) {
      const unitDoc = await units_default.findById(unitValue);
      if (!unitDoc) {
        return res.status(404).json({
          message: `Unit not found for id=${unitValue}`
        });
      }
      if (String(unitDoc.department) !== String(departmentDoc._id)) {
        return res.status(400).json({
          message: `Unit ${unitDoc.name} does not belong to department ${departmentDoc.name}`
        });
      }
    }
    const academicYear2 = await academicYear_default.findById(academicYearId);
    if (!academicYear2) {
      return res.status(404).json({
        message: `AcademicYear not found for id=${academicYearId}`
      });
    }
    const courseLecturerIds = Array.isArray(lecturer) ? lecturer : [];
    const lecturerValidationError = await validateDepartmentLecturers(courseLecturerIds, departmentDoc);
    if (lecturerValidationError) {
      return res.status(400).json({ message: lecturerValidationError });
    }
    const existing = await courses_default.findOne({
      name: String(name).trim(),
      code: normalizedCode,
      department: departmentDoc._id
    });
    if (existing) {
      return res.status(400).json({
        message: `Course with name "${name}", code "${normalizedCode}", and department "${departmentDoc.name}" already exists.`
      });
    }
    const created = await courses_default.create({
      name,
      code: normalizedCode,
      courseID: departmentDoc.code,
      department: departmentDoc._id,
      unit: unitValue,
      academicYear: academicYearId,
      semester: semester ?? null,
      year: year ?? null,
      isActive: Boolean(isActive ?? true),
      studentClasses: Array.isArray(studentClasses) ? studentClasses : [],
      lecturer: Array.isArray(lecturer) ? lecturer : [],
      subjects: []
    });
    const userId = req.user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Course ${created.name} (${created.courseID}) created.`
      });
    }
    return res.status(201).json(created);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
var addCourseSubject = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { subject } = req.body;
    if (!subject?.subjectID || !subject?.name) {
      return res.status(400).json({
        message: "Missing subject payload. Expected subject: { subjectID, name, code?, lecturer?, isActive?, students? }"
      });
    }
    const topLevelCourse = await courses_default.findById(courseId);
    if (!topLevelCourse) {
      return res.status(404).json({ message: `Course ${courseId} not found` });
    }
    const departmentDoc = await departments_default.findById(topLevelCourse.department);
    if (!departmentDoc) {
      return res.status(404).json({ message: `Parent course department not found.` });
    }
    if (String(subject.subjectID).trim() !== String(departmentDoc.departmentID).trim()) {
      return res.status(400).json({
        message: `Subject ID must match the course department identifier (${departmentDoc.departmentID}).`
      });
    }
    const lecturerIds = Array.isArray(subject?.lecturer) ? subject.lecturer : [];
    const subjectLecturerError = await validateDepartmentLecturers(lecturerIds, departmentDoc);
    if (subjectLecturerError) {
      return res.status(400).json({ message: subjectLecturerError });
    }
    const studentIds = Array.isArray(subject?.students) ? subject.students : [];
    const subjectUID = generateSubjectUID(subject);
    const existingSubject = (topLevelCourse.subjects ?? []).some(
      (s) => String(s.subjectUID) === String(subjectUID) || String(s.name).trim().toLowerCase() === String(subject.name).trim().toLowerCase() && String(s.code ?? "").trim().toLowerCase() === String(subject.code ?? "").trim().toLowerCase()
    );
    if (existingSubject) {
      return res.status(400).json({
        message: `A subject with this identifier or matching name/code already exists for this course.`
      });
    }
    topLevelCourse.subjects.push({
      subjectUID,
      name: subject.name,
      code: subject.code ?? null,
      subjectID: subject.subjectID,
      unit: subject.unit ?? null,
      lecturer: lecturerIds,
      isActive: Boolean(subject.isActive ?? true),
      semester: subject.semester ?? null,
      students: studentIds
    });
    await topLevelCourse.save();
    const userId = req.user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Added subject ${subject.subjectID} to course ${topLevelCourse.name} (${topLevelCourse.courseID}).`
      });
    }
    return res.status(200).json(topLevelCourse);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
var deleteEmbeddedSubject = async (req, res) => {
  try {
    const { courseId, subjectId } = req.params;
    const topLevelCourse = await courses_default.findById(courseId);
    if (!topLevelCourse) {
      return res.status(404).json({ message: `Course ${courseId} not found` });
    }
    let subdoc = topLevelCourse.subjects.id ? topLevelCourse.subjects.id(subjectId) : null;
    if (!subdoc) {
      subdoc = (topLevelCourse.subjects ?? []).find(
        (s) => String(s._id) === String(subjectId) || String(s.subjectUID) === String(subjectId) || String(s.subjectID) === String(subjectId) || String(s.name) === String(subjectId) || String(s.code ?? "") === String(subjectId)
      );
    }
    if (!subdoc) {
      return res.status(404).json({ message: `Subject ${subjectId} not found in course ${courseId}` });
    }
    const removed = {
      _id: String(subdoc._id),
      name: subdoc.name,
      code: subdoc.code ?? null,
      subjectID: subdoc.subjectID ?? null
    };
    topLevelCourse.subjects = (topLevelCourse.subjects ?? []).filter((s) => String(s._id) !== String(removed._id));
    await topLevelCourse.save();
    try {
      await subjects_default.deleteMany({
        courseID: topLevelCourse.courseID,
        $or: [{ name: removed.name }, { code: removed.code ?? "" }]
      });
    } catch (e) {
      console.warn("Subjects cascade delete failed", e);
    }
    const userId = req.user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Deleted subject ${removed.name} from course ${topLevelCourse.name} (${topLevelCourse.courseID}).`
      });
    }
    return res.json({ message: "Subject removed", subject: removed, course: topLevelCourse });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
var createCourseSubject = async (req, res) => {
  try {
    const {
      name,
      code,
      courseID,
      department,
      unit,
      isActive,
      studentClasses,
      lecturer,
      subject,
      semester,
      year,
      academicYearId
    } = req.body;
    if (!name || !code || !courseID || !department) {
      return res.status(400).json({
        message: "Missing required fields (name, code, courseID, department)."
      });
    }
    if (!subject?.subjectID || !subject?.name) {
      return res.status(400).json({
        message: "Missing subject payload. Expected subject: { subjectID, name, code?, lecturer?, isActive?, students? }"
      });
    }
    const departmentDoc = await findOrCreateDepartment(department);
    if (!departmentDoc) {
      return res.status(404).json({
        message: `Department not found for identifier=${department}`
      });
    }
    const unitValue = unit && String(unit).trim() !== "" ? unit : null;
    if (unitValue) {
      const unitDoc = await units_default.findById(unitValue);
      if (!unitDoc) {
        return res.status(404).json({
          message: `Unit not found for id=${unitValue}`
        });
      }
      if (String(unitDoc.department) !== String(departmentDoc._id)) {
        return res.status(400).json({
          message: `Unit ${unitDoc.name} does not belong to department ${departmentDoc.name}`
        });
      }
    }
    const topLevelCourse = await courses_default.findOne({ courseID, department: departmentDoc._id, unit: unitValue, academicYear: academicYearId ?? null });
    const courseLecturerIds = Array.isArray(lecturer) ? lecturer : [];
    const courseLecturerValidationError = await validateDepartmentLecturers(courseLecturerIds, departmentDoc);
    if (courseLecturerValidationError) {
      return res.status(400).json({ message: courseLecturerValidationError });
    }
    if (String(subject.subjectID).trim() !== String(departmentDoc.departmentID).trim()) {
      return res.status(400).json({
        message: `Subject ID must match the selected department identifier (${departmentDoc.departmentID}).`
      });
    }
    const subjectLecturerIds = Array.isArray(subject?.lecturer) ? subject.lecturer : [];
    const subjectLecturerValidationError = await validateDepartmentLecturers(subjectLecturerIds, departmentDoc);
    if (subjectLecturerValidationError) {
      return res.status(400).json({ message: subjectLecturerValidationError });
    }
    const studentIds = Array.isArray(subject?.students) ? subject.students : [];
    if (!topLevelCourse) {
      const created = await courses_default.create({
        name,
        code,
        courseID,
        department: departmentDoc._id,
        unit: unitValue,
        academicYear: academicYearId ?? null,
        semester: semester ?? null,
        year: year ?? null,
        isActive: Boolean(isActive ?? true),
        studentClasses: Array.isArray(studentClasses) ? studentClasses : [],
        lecturer: Array.isArray(lecturer) ? lecturer : [],
        subjects: [
          {
            subjectUID,
            name: subject.name,
            code: subject.code ?? null,
            subjectID: subject.subjectID,
            unit: subject.unit ?? null,
            lecturer: subjectLecturerIds,
            isActive: Boolean(subject.isActive ?? true),
            semester: subject.semester ?? null,
            students: studentIds
          }
        ]
      });
      const userId2 = req.user?._id;
      if (userId2) {
        await logActivity({
          userId: userId2,
          action: `Course ${created.name} (${created.courseID}) created and subject ${subject.subjectID} added.`
        });
      }
      return res.status(201).json(created);
    }
    const subjectUID = generateSubjectUID(subject);
    const existingSubject = (topLevelCourse.subjects ?? []).some(
      (s) => String(s.subjectUID) === String(subjectUID) || String(s.name).trim().toLowerCase() === String(subject.name).trim().toLowerCase() && String(s.code ?? "").trim().toLowerCase() === String(subject.code ?? "").trim().toLowerCase()
    );
    if (existingSubject) {
      return res.status(400).json({
        message: `A subject with this identifier or matching name/code already exists for this course.`
      });
    }
    topLevelCourse.name = name;
    topLevelCourse.code = code;
    topLevelCourse.isActive = Boolean(isActive ?? topLevelCourse.isActive);
    if (academicYearId) topLevelCourse.academicYear = academicYearId;
    if (Array.isArray(studentClasses)) topLevelCourse.studentClasses = studentClasses;
    if (Array.isArray(lecturer)) topLevelCourse.lecturer = lecturer;
    topLevelCourse.subjects.push({
      subjectUID,
      name: subject.name,
      code: subject.code ?? null,
      subjectID: subject.subjectID,
      unit: subject.unit ?? null,
      lecturer: subjectLecturerIds,
      isActive: Boolean(subject.isActive ?? true),
      semester: subject.semester ?? null,
      students: studentIds
    });
    await topLevelCourse.save();
    const userId = req.user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Added subject ${subject.subjectID} to course ${topLevelCourse.name} (${topLevelCourse.courseID}).`
      });
    }
    return res.status(200).json(topLevelCourse);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
var getAllCourseSubjects = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userRole2 = req.user?.role;
    const search = req.query.search;
    const classIdQuery = req.query.class ?? req.query.classId;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { courseID: { $regex: search, $options: "i" } },
        { "subjects.subjectID": { $regex: search, $options: "i" } },
        { "subjects.name": { $regex: search, $options: "i" } },
        { "subjects.code": { $regex: search, $options: "i" } }
      ];
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const topLevelOnly = req.query.topLevel === "true";
    if (topLevelOnly) {
      if (classIdQuery || userRole2 === "student") {
        let effectiveClassId = classIdQuery;
        if (userRole2 === "student") {
          const studentClassId = normalizeClassIdValue(req.user?.studentClasses);
          effectiveClassId = studentClassId || effectiveClassId;
        }
        if (effectiveClassId) {
          const classDoc = await getClassCourseDocuments(effectiveClassId);
          let classCourses = classDoc?.courses ?? [];
          const seen = /* @__PURE__ */ new Set();
          classCourses = classCourses.filter((course) => {
            const key = `${String(course.name).trim().toLowerCase()}-${String(course.code).trim().toLowerCase()}-${String(course.department?._id ?? course.department ?? "")}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          const total3 = classCourses.length;
          return res.json({
            courses: classCourses,
            pagination: {
              total: total3,
              page,
              pages: Math.ceil(total3 / limit)
            }
          });
        }
      }
      const [total2, courses] = await Promise.all([
        courses_default.countDocuments(query),
        courses_default.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("department", "name departmentID code head").populate("unit", "name unitID code")
      ]);
      return res.json({
        courses,
        pagination: {
          total: total2,
          page,
          pages: Math.ceil(total2 / limit)
        }
      });
    }
    const flattened = [];
    let topLevelCourses = [];
    if (classIdQuery || userRole2 === "student") {
      let effectiveClassId = classIdQuery;
      if (userRole2 === "student") {
        const studentClassId = normalizeClassIdValue(req.user?.studentClasses);
        effectiveClassId = studentClassId || effectiveClassId;
      }
      if (effectiveClassId) {
        const classDoc = await getClassCourseDocuments(effectiveClassId);
        topLevelCourses = classDoc?.courses ?? [];
      }
    }
    if (topLevelCourses.length === 0) {
      if (userRole2 === "teacher") {
        topLevelCourses = await courses_default.find({
          ...query,
          "subjects.lecturer": userId
        }).sort({ createdAt: -1 });
      } else if (userRole2 === "student") {
        topLevelCourses = [];
      } else {
        topLevelCourses = await courses_default.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("department", "name departmentID code head").populate("unit", "name unitID code");
      }
    }
    for (const c of topLevelCourses) {
      const subjects = c?.subjects ?? [];
      for (const s of subjects) {
        if (search) {
          const matches = String(s?.name ?? "").toLowerCase().includes(search.toLowerCase()) || String(s?.code ?? "").toLowerCase().includes(search.toLowerCase()) || String(s?.subjectID ?? "").toLowerCase().includes(search.toLowerCase()) || String(c?.name ?? "").toLowerCase().includes(search.toLowerCase()) || String(c?.code ?? "").toLowerCase().includes(search.toLowerCase());
          if (!matches) continue;
        }
        if (userRole2 === "teacher") {
          const lecturerIds = Array.isArray(s?.lecturer) ? s.lecturer : [];
          const includesTeacher = lecturerIds.some((lid) => String(lid) === String(userId));
          if (!includesTeacher) continue;
        }
        const lecturerData = Array.isArray(s?.lecturer) ? s.lecturer : [];
        flattened.push({
          _id: String(s?._id ?? s?.subjectID ?? ""),
          name: s?.name,
          code: s?.code,
          isActive: Boolean(s?.isActive ?? true),
          teacher: lecturerData.map(
            (lect) => typeof lect === "object" && lect !== null ? { _id: String(lect._id ?? ""), name: lect.name ?? "" } : { _id: String(lect), name: "" }
          ),
          course: {
            _id: String(c?._id ?? ""),
            name: c?.name,
            code: c?.code
          },
          department: c?.department ? {
            _id: String(c.department._id ?? ""),
            name: c.department.name,
            code: c.department.code,
            head: c.department.head
          } : null
        });
      }
    }
    const total = flattened.length;
    return res.json({
      courses: flattened,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
var getCourseById = async (req, res) => {
  try {
    const course = await courses_default.findById(req.params.courseId).populate("department", "name departmentID code head").populate("unit", "name unitID code").populate("lecturer", "name email").populate("subjects.lecturer", "name email");
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    return res.json(course);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
var getCourseMeta = async (req, res) => {
  try {
    await syncDepartmentsFromConstants();
    const departments = await departments_default.find({}).select("name departmentID code").sort({ name: 1 });
    const units = await units_default.find({}).select("name unitID code department").sort({ name: 1 });
    const academicYears = await academicYear_default.find({}).select("name").sort({ name: 1 });
    return res.json({ departments, units, academicYears });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
var updateCourseSubjects = async (req, res) => {
  try {
    const { name, isActive, code, courseID, department, semester, year, unit, academicYearId, subjects, lecturer } = req.body;
    const updateData = {
      name,
      isActive,
      code,
      courseID,
      department,
      semester,
      year
    };
    if (unit !== void 0) {
      updateData.unit = unit === "" ? null : unit;
    }
    if (academicYearId) updateData.academicYear = academicYearId;
    if (lecturer !== void 0) {
      updateData.lecturer = Array.isArray(lecturer) ? lecturer : [];
    }
    if (subjects !== void 0) {
      updateData.subjects = (Array.isArray(subjects) ? subjects : []).map((subject) => ({
        name: subject.name,
        code: subject.code ?? null,
        subjectID: subject.subjectID ?? subject.code ?? "",
        lecturer: Array.isArray(subject.lecturer) ? subject.lecturer : [],
        students: Array.isArray(subject.students) ? subject.students : [],
        isActive: Boolean(subject.isActive ?? true),
        semester: subject.semester ?? null
      }));
    }
    const updated = await courses_default.findByIdAndUpdate(
      req.params.id,
      updateData,
      { returnDocument: "after", runValidators: true }
    );
    const userId = req.user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Course ${updated?.name} was updated successfully.`
      });
    }
    if (!updated) {
      return res.status(404).json({ message: `Course with ID ${req.params.id} not found!` });
    }
    return res.json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
var deleteCourseSubjects = async (req, res) => {
  try {
    const deleted = await courses_default.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: `Course with ID ${req.params.id} not found!` });
    }
    await subjects_default.deleteMany({ courseID: deleted.courseID });
    const userId = req.user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Course ${deleted.name} was deleted successfully.`
      });
    }
    return res.json({
      message: `Course ${deleted.name} deleted successfully.`,
      courseId: deleted._id
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
var deduplicateClassCourses = async (req, res) => {
  try {
    const classes = await classes_default.find({}, "name courses");
    let totalDeduplicated = 0;
    let classesUpdated = 0;
    for (const cls of classes) {
      const courseIds = (cls.courses ?? []).map((c) => String(c));
      const uniqueIds = Array.from(new Set(courseIds));
      if (uniqueIds.length < courseIds.length) {
        const removed = courseIds.length - uniqueIds.length;
        totalDeduplicated += removed;
        cls.courses = uniqueIds;
        await cls.save();
        classesUpdated++;
      }
    }
    return res.json({
      message: `Deduplication complete. Updated ${classesUpdated} classes, removed ${totalDeduplicated} duplicate entries.`,
      classesUpdated,
      totalDeduplicated
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
var bulkUploadCourses = async (req, res) => {
  try {
    const payload = req.body;
    if (!Array.isArray(payload?.courses) || payload.courses.length === 0) {
      return res.status(400).json({ message: "courses array is required for bulk upload." });
    }
    const results = {
      created: 0,
      skipped: 0,
      errors: []
    };
    for (let index = 0; index < payload.courses.length; index += 1) {
      const row = payload.courses[index];
      const rowNumber = index + 1;
      if (!row) {
        results.errors.push({ row: rowNumber, message: "Missing course row." });
        continue;
      }
      if (!row.name || !row.code || !row.courseID || !row.department || !row.unit || !row.semester || !row.academicYearId) {
        results.errors.push({ row: rowNumber, message: "Missing required course fields." });
        continue;
      }
      const departmentDoc = await findOrCreateDepartment(row.department);
      if (!departmentDoc) {
        results.errors.push({ row: rowNumber, message: `Department not found: ${row.department}` });
        continue;
      }
      if (String(row.courseID).trim().toUpperCase() !== String(departmentDoc.code).trim().toUpperCase()) {
        results.errors.push({ row: rowNumber, message: `Course Group ID must match department code ${departmentDoc.code}.` });
        continue;
      }
      const normalizedCode = normalizeCourseCode(departmentDoc.code, row.code);
      if (!normalizedCode || !isValidCourseCode(departmentDoc.code, normalizedCode)) {
        results.errors.push({ row: rowNumber, message: `Course code must be formatted as ${departmentDoc.code} 501.` });
        continue;
      }
      const unitDoc = await findOrCreateUnit(departmentDoc, row.unit);
      if (!unitDoc) {
        results.errors.push({ row: rowNumber, message: `Unit not found or invalid for department ${departmentDoc.name}: ${row.unit}` });
        continue;
      }
      const academicYear2 = await academicYear_default.findById(row.academicYearId);
      if (!academicYear2) {
        results.errors.push({ row: rowNumber, message: `Academic year not found for id ${row.academicYearId}` });
        continue;
      }
      const existing = await courses_default.findOne({ courseID: departmentDoc.code, department: departmentDoc._id, unit: unitDoc._id, academicYear: row.academicYearId });
      if (existing) {
        results.skipped += 1;
        continue;
      }
      const yearValue = row.year ? String(row.year).trim() : void 0;
      await courses_default.create({
        name: row.name,
        code: normalizedCode,
        courseID: departmentDoc.code,
        department: departmentDoc._id,
        unit: unitDoc._id,
        academicYear: row.academicYearId,
        semester: row.semester,
        year: yearValue,
        isActive: true,
        studentClasses: [],
        lecturer: Array.isArray(row.lecturer) ? row.lecturer : row.lecturer ? [String(row.lecturer)] : [],
        subjects: []
      });
      results.created += 1;
    }
    const userId = req.user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Bulk uploaded ${results.created} courses from spreadsheet`
      });
    }
    return res.json({ message: "Bulk upload processed", results });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
var seedDepartments = async (req, res) => {
  try {
    const userRole2 = req.user?.role;
    if (userRole2 !== "admin") {
      return res.status(403).json({ message: "Only admins can seed departments" });
    }
    const departmentsData = getAllDepartments();
    const results = await Promise.all(
      departmentsData.map(
        (dept) => departments_default.findOneAndUpdate(
          { code: dept.code },
          { name: dept.name, code: dept.code, departmentID: dept.departmentID },
          { upsert: true, returnDocument: "after" }
        )
      )
    );
    const userId = req.user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Seeded ${results.length} departments from constants`
      });
    }
    return res.json({
      message: `Successfully seeded ${results.length} departments`,
      departments: results
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
var syncDepartmentsFromConstants = async () => {
  const constantDepartments = getAllDepartments();
  await Promise.all(
    constantDepartments.map(async (constDept) => {
      await departments_default.findOneAndUpdate(
        { code: constDept.code },
        {
          name: constDept.name,
          code: constDept.code,
          departmentID: constDept.departmentID
        },
        { upsert: true }
      );
    })
  );
  await syncUnitsFromConstants();
};
var getAvailableDepartments = async (req, res) => {
  try {
    await syncDepartmentsFromConstants();
    let departments = await departments_default.find({}).sort({ name: 1 });
    if (!departments.length) {
      const constantDepartments = getAllDepartments().map((dept) => ({
        _id: dept.departmentID,
        ...dept
      }));
      return res.json({ departments: constantDepartments });
    }
    return res.json({ departments });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
var normalizeDepartmentPayload = (raw) => {
  const name = String(raw?.name || raw?.departmentName || raw?.["Department Name"] || "").trim();
  const code = String(raw?.code || raw?.departmentCode || raw?.["Department Code"] || "").trim().toUpperCase();
  const departmentID = String(
    raw?.departmentID || raw?.departmentId || raw?.["Department ID"] || raw?.["department id"] || ""
  ).trim();
  const head = String(raw?.head || raw?.departmentHead || "").trim();
  return { name, code, departmentID, head: head || void 0 };
};
var createDepartment = async (req, res) => {
  try {
    const { name, code, departmentID, head } = req.body;
    if (!name || !code || !departmentID) {
      return res.status(400).json({ message: "Department name, code, and departmentID are required." });
    }
    const normalizedName = String(name).trim();
    const normalizedCode = String(code).trim().toUpperCase();
    const normalizedDepartmentID = String(departmentID).trim();
    const existing = await departments_default.findOne({
      $or: [
        { code: normalizedCode },
        { departmentID: normalizedDepartmentID },
        { name: normalizedName }
      ]
    });
    if (existing) {
      return res.status(409).json({ message: "A department with that code, ID, or name already exists." });
    }
    const department = await departments_default.create({
      name: normalizedName,
      code: normalizedCode,
      departmentID: normalizedDepartmentID,
      head: head && mongoose21.isValidObjectId(head) ? head : void 0
    });
    const userId = req.user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Created department ${department.name} (${department.code})`
      });
    }
    return res.status(201).json(department);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
var updateDepartment = async (req, res) => {
  try {
    const department = await departments_default.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }
    const { name, code, departmentID, head } = req.body;
    const updateData = {};
    if (name !== void 0) updateData.name = String(name).trim();
    if (code !== void 0) updateData.code = String(code).trim().toUpperCase();
    if (departmentID !== void 0) updateData.departmentID = String(departmentID).trim();
    if (head !== void 0) updateData.head = head && mongoose21.isValidObjectId(head) ? head : null;
    if (updateData.name || updateData.code || updateData.departmentID) {
      const duplicate = await departments_default.findOne({
        _id: { $ne: department._id },
        $or: [
          ...updateData.code ? [{ code: updateData.code }] : [],
          ...updateData.departmentID ? [{ departmentID: updateData.departmentID }] : [],
          ...updateData.name ? [{ name: updateData.name }] : []
        ]
      });
      if (duplicate) {
        return res.status(409).json({ message: "Another department with the same name, code, or departmentID already exists." });
      }
    }
    Object.assign(department, updateData);
    const updated = await department.save();
    const userId = req.user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Updated department ${updated.name} (${updated.code})`
      });
    }
    return res.json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
var deleteDepartment = async (req, res) => {
  try {
    const deleted = await departments_default.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Department not found" });
    }
    const userId = req.user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Deleted department ${deleted.name} (${deleted.code})`
      });
    }
    return res.json({ message: `Department ${deleted.name} deleted successfully.` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
var bulkUploadDepartments = async (req, res) => {
  try {
    const payload = req.body;
    if (!Array.isArray(payload?.departments) || payload.departments.length === 0) {
      return res.status(400).json({ message: "departments array is required for bulk upload." });
    }
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };
    for (let index = 0; index < payload.departments.length; index += 1) {
      const row = normalizeDepartmentPayload(payload.departments[index]);
      const rowNumber = index + 1;
      if (!row.name || !row.code || !row.departmentID) {
        results.errors.push({ row: rowNumber, message: "Missing required department fields." });
        results.skipped += 1;
        continue;
      }
      const filter = {
        $or: [{ code: row.code }, { departmentID: row.departmentID }]
      };
      const existing = await departments_default.findOne(filter);
      if (existing) {
        await departments_default.findByIdAndUpdate(existing._id, {
          name: row.name,
          code: row.code,
          departmentID: row.departmentID,
          head: row.head && mongoose21.isValidObjectId(row.head) ? row.head : existing.head
        });
        results.updated += 1;
        continue;
      }
      await departments_default.create({
        name: row.name,
        code: row.code,
        departmentID: row.departmentID,
        head: row.head && mongoose21.isValidObjectId(row.head) ? row.head : void 0
      });
      results.created += 1;
    }
    const userId = req.user?._id;
    if (userId) {
      await logActivity({
        userId,
        action: `Bulk uploaded ${results.created} departments from spreadsheet`
      });
    }
    return res.json({ message: "Bulk upload processed", results });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
var getDepartmentConstants = async (req, res) => {
  try {
    return res.json({
      departments: getAllDepartments(),
      departmentUnits: DEPARTMENT_UNITS,
      departmentCourses: DEPARTMENT_COURSES
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

// src/routes/courses.ts
var courseRouter = express6.Router();
courseRouter.route("/").post(
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  createCourse
);
courseRouter.route("/meta").get(protect, authorize(["admin", "teacher", "unitconsultant", "unitresident"]), getCourseMeta);
courseRouter.route("/create").post(
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  createCourseSubject
);
courseRouter.route("/departments").get(getAvailableDepartments).post(protect, authorize(["admin"]), createDepartment);
courseRouter.route("/department-constants").get(protect, getDepartmentConstants);
courseRouter.route("/:courseId/subjects").post(
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  addCourseSubject
);
courseRouter.route("/:courseId/subjects/:subjectId").delete(
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  deleteEmbeddedSubject
);
courseRouter.route("/:courseId").get(
  protect,
  authorize(["admin", "teacher", "student", "unitconsultant", "unitresident"]),
  getCourseById
);
courseRouter.route("/deduplicate-classes").post(protect, authorize(["admin"]), deduplicateClassCourses);
courseRouter.route("/departments/bulk-upload").post(protect, authorize(["admin"]), bulkUploadDepartments);
courseRouter.route("/departments/:id").patch(protect, authorize(["admin"]), updateDepartment).delete(protect, authorize(["admin"]), deleteDepartment);
courseRouter.route("/seed/departments").post(protect, authorize(["admin"]), seedDepartments);
courseRouter.route("/department-constants").get(protect, getDepartmentConstants);
courseRouter.route("/bulk-upload").post(
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  bulkUploadCourses
);
courseRouter.route("/").get(
  protect,
  authorize(["admin", "teacher", "student", "unitconsultant", "unitresident"]),
  // Add "student"
  getAllCourseSubjects
);
courseRouter.route("/delete/:id").delete(protect, authorize(["admin"]), deleteCourseSubjects);
courseRouter.route("/update/:id").patch(
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  updateCourseSubjects
);
var courses_default2 = courseRouter;

// src/models/postings.ts
import { Schema as Schema15 } from "mongoose";
var PostingSchema = new Schema15({});

// src/server.ts
init_clinicalRotation();

// src/models/logbookEntry.ts
import mongoose24, { Schema as Schema17 } from "mongoose";
var DayEntrySchema = new Schema17({
  // Flexible day entry to support clinical logbook fields used by the frontend
  time: { type: String, default: "" },
  procedure: { type: String, default: "" },
  procedures: { type: [String], default: [] },
  diagnosis: { type: String, default: "" },
  supervisor: { type: String, default: "" },
  hours: { type: Number, default: 0 },
  location: { type: String, default: "" },
  outcome: { type: String, default: "" },
  // Backwards-compatible attendance fields (optional)
  weekNumber: { type: Number },
  date: { type: Date },
  dayName: { type: String },
  attendanceStatus: {
    type: String,
    enum: ["present", "absent", "late", "excused"],
    default: "present"
  },
  notes: { type: String, default: "" }
}, { _id: true });
var TutorialEntrySchema = new Schema17({
  topic: { type: String, required: true },
  date: { type: Date },
  presenter: { type: String, default: "" },
  notes: { type: String, default: "" }
}, { _id: true });
var PersonalEntrySchema = new Schema17({
  activity: { type: String, required: true },
  date: { type: Date },
  notes: { type: String, default: "" }
}, { _id: true });
var LogbookEntrySchema = new Schema17({
  student: { type: mongoose24.Schema.Types.ObjectId, ref: "User", required: true },
  rotation: { type: mongoose24.Schema.Types.ObjectId, ref: "ClinicalRotation", required: true },
  academicYear: { type: mongoose24.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
  date: { type: Date, required: true },
  callDuty: { type: [DayEntrySchema], default: [] },
  clinicDays: { type: [DayEntrySchema], default: [] },
  theatreDays: { type: [DayEntrySchema], default: [] },
  cwrDays: { type: [DayEntrySchema], default: [] },
  rwrDays: { type: [DayEntrySchema], default: [] },
  other: { type: [DayEntrySchema], default: [] },
  presentationTutorials: { type: [TutorialEntrySchema], default: [] },
  personal: { type: [PersonalEntrySchema], default: [] },
  notes: { type: String, default: "" }
}, {
  timestamps: true
});
var StudentLogbookEntryType = {
  tutorialAndDemonstrations: "tutorialAndDemonstrations",
  clinicalActivities: "clinicalActivities",
  clinicalProcedures: "clinicalProcedures",
  clinicalPatientPresentations: "clinicalPatientPresentations"
};
var studentLogbookEntryType_ = /* @__PURE__ */ ((studentLogbookEntryType_2) => {
  studentLogbookEntryType_2["tutorialAndDemonstrations"] = "tutorialAndDemonstrations";
  studentLogbookEntryType_2["clinicalActivities"] = "clinicalActivities";
  studentLogbookEntryType_2["clinicalProcedures"] = "clinicalProcedures";
  studentLogbookEntryType_2["clinicalPatientPresentations"] = "clinicalPatientPresentations";
  return studentLogbookEntryType_2;
})(studentLogbookEntryType_ || {});
var StudentsLogbookEntryDetails = {
  tutorialAndDemonstrations: {
    id: mongoose24.Types.ObjectId,
    topic: String,
    date: Date,
    supervisorId: mongoose24.Types.ObjectId,
    signed: Boolean,
    postingId: mongoose24.Types.ObjectId,
    presenterId: mongoose24.Types.ObjectId,
    //person who presented the tutorial/demonstration
    mPointScored: (signed) => signed ? 1 : 0
    // Example scoring logic
  },
  clinicalActivities: {
    id: mongoose24.Types.ObjectId,
    activity: String,
    //e.g., "Ward Round", "Clinic", "Theatre"
    date: Date,
    supervisorId: mongoose24.Types.ObjectId,
    signed: Boolean,
    postingId: mongoose24.Types.ObjectId,
    mPointScored: (signed) => signed ? 1 : 0
    // Example scoring logic
  },
  clinicalProcedures: {
    id: mongoose24.Types.ObjectId,
    procedure: String,
    //e.g., "Venipuncture", "Lumbar Puncture", "Suturing"
    date: Date,
    supervisorId: mongoose24.Types.ObjectId,
    //person who supervised the procedure
    signed: Boolean,
    postingId: mongoose24.Types.ObjectId,
    //id of the posting the procedure was performed in
    mPointScored: (signed) => signed ? 1 : 0,
    // Example scoring logic
    patientName: String,
    //name of the patient the procedure was performed on
    patientId: mongoose24.Types.ObjectId,
    //reference to the patient the procedure was performed on
    hospitalNumber: String,
    dxDiag: String
    //diagnosis or differential diagnosis for the procedure
  },
  clinicalPatientPresentations: {
    id: mongoose24.Types.ObjectId,
    patientName: String,
    patientId: mongoose24.Types.ObjectId,
    hospitalNumber: String,
    dxDiag: String,
    date: Date,
    supervisorId: mongoose24.Types.ObjectId,
    signed: Boolean,
    postingId: mongoose24.Types.ObjectId,
    mPointScored: (signed) => signed ? 1 : 0,
    // Example scoring logic
    clerksMan: mongoose24.Types.ObjectId
    //Student who presented the patient
  }
};
var StudentLogBookSchema = new Schema17({
  rotationId: { type: mongoose24.Schema.Types.ObjectId, ref: "ClinicalRotation", required: true },
  postingId: { type: mongoose24.Schema.Types.ObjectId, ref: "PostingAndRotation", required: true },
  academicYearId: { type: mongoose24.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
  studentId: { type: mongoose24.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: Object.values(StudentLogbookEntryType), required: true },
  //details should return an object with the appropriate fields based on the type of logbook entry, e.g., if type is "tutorialAndDemonstrations", details should have fields: topic, date, supervisorId, signed, postingId, presenterId
  details: {
    type: Schema17.Types.Mixed,
    enum: Object.values(studentLogbookEntryType_),
    //explain what this means: This line ensures that the `details` field can only contain an object that matches one of the defined types in `studentLogbookEntryType_`. It restricts the structure of the `details` field to be consistent with the expected fields for each logbook entry type, such as "tutorialAndDemonstrations", "clinicalActivities", "clinicalProcedures", or "clinicalPatientPresentations". This helps maintain data integrity and ensures that the logbook entries are structured correctly based on their type.
    required: true,
    default: {}
  },
  // Flexible details field to accommodate different logbook entry types
  attendanceStatus: {
    type: String,
    enum: ["present", "absent", "late", "excused"],
    default: "present"
  }
}, {
  timestamps: true
});
var logbookEntry_default = mongoose24.model("StudentLogBook", StudentLogBookSchema);

// src/server.ts
init_inngest();
init_functions();
import { serve } from "inngest/express";

// src/routes/timetable.ts
import express7 from "express";

// src/controllers/timetable.ts
init_activitieslog2();
init_inngest();
init_timetable();
init_classes();
init_user();
init_LevelTimetable();
import "express";
import mongoose25 from "mongoose";
var generateTimeTable2 = async (req, res) => {
  try {
    const { classId, academicYear: academicYear2, academicYearId, settings } = req.body;
    const classIdValue = classId?._id ?? classId?.id ?? classId;
    const academicYearValue = academicYearId ?? academicYear2?._id ?? academicYear2?.id ?? academicYear2;
    if (!classIdValue || !academicYearValue || !settings) {
      return res.status(400).json({ message: "classId, academicYear, and settings are required" });
    }
    const classData = await classes_default.findById(classIdValue);
    if (!classData) {
      return res.status(404).json({ message: "Class not found" });
    }
    const enhancedSettings = {
      ...settings,
      className: classData.name
    };
    if (settings && settings.fast) {
      const generated = await fastGenerateAndSave(classIdValue, academicYearValue, enhancedSettings);
      const userId2 = req.user._id;
      await logActivity({ userId: userId2, action: `Generated timetable (fast) for class ID: ${classIdValue}` });
      return res.status(200).json({ message: "Timetable generated (fast)", schedule: generated.schedule });
    }
    await inngest.send(
      {
        name: "generate/timetable",
        data: {
          classId: classIdValue,
          academicYear: academicYear2,
          academicYearId: academicYearValue,
          settings: enhancedSettings
        }
      }
    );
    const userId = req.user._id;
    await logActivity({
      userId,
      action: `Requested timetable generation for class ID: ${classId} `
    });
    res.status(200).json({
      message: `Timetable generation initiated`
    });
  } catch (error) {
    res.status(500).json({ message: `Serve error`, error });
  }
};
var getTimetable = async (req, res) => {
  try {
    const timetable = await timetable_default.findOne({ class: req.params.classId }).populate("schedule.periods.subject", "name code courseID subjects.subjectID").populate("schedule.periods.lecturer", "name email");
    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found!" });
    }
    res.json({ schedule: timetable.schedule });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
var addPeriod = async (req, res) => {
  try {
    const { classId } = req.params;
    const { day, period } = req.body;
    if (!day || !period || !period.subject || !period.startTime || !period.endTime) {
      res.status(400).json({ message: "day and period (subject, startTime, endTime) are required" });
      return;
    }
    const timetable = await timetable_default.findOne({ class: classId });
    if (!timetable) {
      res.status(404).json({ message: "Timetable not found for this class" });
      return;
    }
    const dayIndex = timetable.schedule.findIndex(
      (d) => d.day.toLowerCase() === day.toLowerCase()
    );
    if (dayIndex === -1) {
      timetable.schedule.push({ day, periods: [period] });
    } else {
      timetable.schedule[dayIndex].periods.push(period);
    }
    await timetable.save();
    const updated = await timetable_default.findById(timetable._id).populate("schedule.periods.subject", "name code subjects.subjectID").populate("schedule.periods.lecturer", "name email");
    await logActivity({
      userId: req.user._id,
      action: `Added period to timetable`,
      details: `Class ${classId}, day ${day}, subject ${period.subject}`
    });
    res.status(201).json({ schedule: updated?.schedule });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
var updatePeriod = async (req, res) => {
  try {
    const { classId } = req.params;
    const { dayIndex, periodIndex, period } = req.body;
    if (dayIndex === void 0 || periodIndex === void 0 || !period) {
      res.status(400).json({ message: "dayIndex, periodIndex, and period are required" });
      return;
    }
    const timetable = await timetable_default.findOne({ class: classId });
    if (!timetable) {
      res.status(404).json({ message: "Timetable not found for this class" });
      return;
    }
    if (dayIndex < 0 || dayIndex >= timetable.schedule.length) {
      res.status(400).json({ message: "Invalid dayIndex" });
      return;
    }
    const daySchedule = timetable.schedule[dayIndex];
    if (periodIndex < 0 || periodIndex >= daySchedule?.periods.length) {
      res.status(400).json({ message: "Invalid periodIndex" });
      return;
    }
    daySchedule.periods[periodIndex] = {
      ...daySchedule?.periods[periodIndex],
      ...period
    };
    await timetable.save();
    const updated = await timetable_default.findById(timetable._id).populate("schedule.periods.subject", "name code subjects.subjectID").populate("schedule.periods.lecturer", "name email");
    await logActivity({
      userId: req.user._id,
      action: `Updated timetable period`,
      details: `Class ${classId}, day ${dayIndex}, period ${periodIndex}`
    });
    res.status(200).json({ schedule: updated?.schedule });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
var deletePeriod = async (req, res) => {
  try {
    const { classId } = req.params;
    const { dayIndex, periodIndex } = req.body;
    if (dayIndex === void 0 || periodIndex === void 0) {
      res.status(400).json({ message: "dayIndex and periodIndex are required" });
      return;
    }
    const timetable = await timetable_default.findOne({ class: classId });
    if (!timetable) {
      res.status(404).json({ message: "Timetable not found for this class" });
      return;
    }
    if (dayIndex < 0 || dayIndex >= timetable.schedule.length) {
      res.status(400).json({ message: "Invalid dayIndex" });
      return;
    }
    const daySchedule = timetable.schedule[dayIndex];
    if (periodIndex < 0 || periodIndex >= daySchedule?.periods.length) {
      res.status(400).json({ message: "Invalid periodIndex" });
      return;
    }
    daySchedule?.periods.splice(periodIndex, 1);
    await timetable.save();
    const updated = await timetable_default.findById(timetable._id).populate("schedule.periods.subject", "name code subjects.subjectID").populate("schedule.periods.lecturer", "name email");
    await logActivity({
      userId: req.user._id,
      action: `Deleted timetable period`,
      details: `Class ${classId}, day ${dayIndex}, period ${periodIndex}`
    });
    res.status(200).json({ schedule: updated?.schedule });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
async function fastGenerateAndSave(classId, academicYearId, settings) {
  const is400Level = /^400\s*level/i.test(settings?.className || "");
  const is500Level = /^500\s*level/i.test(settings?.className || "");
  if (is400Level) {
    return await generate400LevelSchedule(classId, academicYearId, settings);
  }
  if (is500Level) {
    return await generate500LevelSchedule(classId, academicYearId, settings);
  }
  const cls = await classes_default.findById(classId).populate("courses");
  if (!cls) throw new Error("Class not found");
  const courses = (cls.courses || []).map((c) => ({ id: String(c._id), name: c.name }));
  const teachers = await user_default.find({ role: "teacher" }).select("_id name teacherSubject");
  const teachersByCourse = {};
  for (const t of teachers) {
    const subs = Array.isArray(t.teacherSubject) ? t.teacherSubject : [];
    for (const s of subs) {
      const key = String(s);
      teachersByCourse[key] = teachersByCourse[key] || [];
      teachersByCourse[key].push(String(t._id));
    }
  }
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const periodsPerDay = Number(settings?.periods) || 5;
  const parseHM = (h) => {
    const [hh, mm] = h.split(":").map(Number);
    return hh * 60 + mm;
  };
  const fmt = (mins) => {
    const hh = Math.floor(mins / 60).toString().padStart(2, "0");
    const mm = (mins % 60).toString().padStart(2, "0");
    return `${hh}:${mm}`;
  };
  let start = parseHM(settings?.startTime || "08:00");
  let end = parseHM(settings?.endTime || "16:00");
  const total = Math.max(1, periodsPerDay);
  const slotLength = Math.floor((end - start) / total) || 60;
  const schedule = [];
  const allSlots = [];
  for (const day of days) {
    let cur = start;
    for (let p = 0; p < periodsPerDay; p++) {
      const s = fmt(cur);
      cur += slotLength;
      const e = fmt(cur);
      allSlots.push({ day, startTime: s, endTime: e });
    }
  }
  let courseIdx = 0;
  for (const day of days) {
    const dayPeriods = [];
    for (let p = 0; p < periodsPerDay; p++) {
      const course = courses.length ? courses[courseIdx % courses.length] : null;
      let lecturerId = null;
      if (course && teachersByCourse[course.id] && teachersByCourse[course.id].length) {
        const list = teachersByCourse[course.id];
        lecturerId = list[courseIdx % list.length] || null;
      }
      const slot = allSlots.find((s) => s.day === day && s.startTime === fmt(start + p * slotLength));
      const startTime = slot ? slot.startTime : fmt(start + p * slotLength);
      const endTime = slot ? slot.endTime : fmt(start + (p + 1) * slotLength);
      dayPeriods.push({
        subject: course ? new mongoose25.Types.ObjectId(course.id) : null,
        lecturer: lecturerId ? new mongoose25.Types.ObjectId(lecturerId) : null,
        startTime,
        endTime
      });
      courseIdx++;
    }
    schedule.push({ day, periods: dayPeriods });
  }
  await timetable_default.findOneAndDelete({ class: classId, academicYear: academicYearId });
  await timetable_default.create({ class: classId, academicYear: academicYearId, schedule });
  const saved = await timetable_default.findOne({ class: classId, academicYear: academicYearId }).populate("schedule.periods.subject", "name code subjects.subjectID").populate("schedule.periods.lecturer", "name email idNumber");
  return { success: true, schedule: saved?.schedule ?? schedule };
}
async function generate500LevelSchedule(classId, academicYearId, settings) {
  const cls = await classes_default.findById(classId).populate("courses");
  if (!cls) throw new Error("Class not found");
  const academicYearDoc = await (await Promise.resolve().then(() => (init_academicYear(), academicYear_exports))).default.findById(academicYearId);
  const clockPhase = academicYearDoc?.clockPhase ?? settings?.clockPhase ?? "phase1";
  console.log(`[500-Level Timetable] Generating for class: ${cls.name}, phase: ${clockPhase}, from DB: ${academicYearDoc?.clockPhase ?? "N/A"}, from settings: ${settings?.clockPhase ?? "N/A"}`);
  const teachers = await user_default.find({ role: "teacher" }).select("_id teacherSubject");
  const teachersByCourse = {};
  for (const t of teachers) {
    const subs = Array.isArray(t.teacherSubject) ? t.teacherSubject.map(String) : [];
    for (const s of subs) {
      teachersByCourse[s] = teachersByCourse[s] || [];
      teachersByCourse[s].push(String(t._id));
    }
  }
  const getLecturerForCourseId = (courseDbId) => {
    if (!courseDbId) return null;
    const list = teachersByCourse[courseDbId] ?? [];
    return list.length ? list[0] : null;
  };
  const plan = build500LevelTimetablePlan(clockPhase, cls.courses);
  const schedule = plan.map(({ day, periods }) => ({
    day,
    periods: periods.map((period) => {
      const course = period.courseCode ? resolve500LevelCourse(cls.courses, period.courseCode) : null;
      const courseDbId = course?._id ? String(course._id) : null;
      const lecturerId = getLecturerForCourseId(courseDbId);
      return {
        subject: courseDbId ? new mongoose25.Types.ObjectId(courseDbId) : void 0,
        lecturer: lecturerId ? new mongoose25.Types.ObjectId(lecturerId) : void 0,
        startTime: period.startTime,
        endTime: period.endTime,
        ...period.kind === "clinical" ? { isClinical: true } : {},
        ...period.kind === "optional" || period.isOptional ? { isOptional: true, displayLabel: period.displayLabel ?? (period.kind === "optional" ? "Optional Activity" : void 0) } : {}
      };
    })
  }));
  await timetable_default.findOneAndDelete({ class: classId, academicYear: academicYearId });
  await timetable_default.create({ class: classId, academicYear: academicYearId, schedule });
  const saved = await timetable_default.findOne({ class: classId, academicYear: academicYearId }).populate("schedule.periods.subject", "name code subjects.subjectID").populate("schedule.periods.lecturer", "name email idNumber");
  return { success: true, schedule: saved?.schedule ?? schedule };
}
async function generate400LevelSchedule(classId, academicYearId, settings) {
  const cls = await classes_default.findById(classId).populate("courses");
  if (!cls) throw new Error("Class not found");
  const coursesByName = /* @__PURE__ */ new Map();
  const courseMap = /* @__PURE__ */ new Map();
  for (const course of cls.courses) {
    const courseObj = course;
    const courseName = courseObj.name?.toLowerCase() ?? "";
    const courseId = String(courseObj._id ?? course);
    if (courseName) {
      coursesByName.set(courseName, courseId);
      courseMap.set(courseObj.name, courseId);
    }
  }
  const teachers = await user_default.find({ role: "teacher" }).select("_id name teacherSubject");
  const teachersByCourse = {};
  for (const t of teachers) {
    const subs = Array.isArray(t.teacherSubject) ? t.teacherSubject : [];
    for (const s of subs) {
      const key = String(s);
      teachersByCourse[key] = teachersByCourse[key] || [];
      teachersByCourse[key].push(String(t._id));
    }
  }
  const getLecturerForCourse = (courseId) => {
    const lecturers = teachersByCourse[courseId] || [];
    return lecturers.length > 0 ? lecturers[0] : null;
  };
  const schedule = [
    {
      day: "Monday",
      periods: [
        // 08:00-09:00 Medicine
        {
          subject: coursesByName.get("medicine") ? new mongoose25.Types.ObjectId(coursesByName.get("medicine")) : null,
          lecturer: coursesByName.get("medicine") ? getLecturerForCourse(coursesByName.get("medicine")) ? new mongoose25.Types.ObjectId(getLecturerForCourse(coursesByName.get("medicine"))) : null : null,
          startTime: "08:00",
          endTime: "09:00"
        },
        // 09:00-10:00 Surgery
        {
          subject: coursesByName.get("surgery") ? new mongoose25.Types.ObjectId(coursesByName.get("surgery")) : null,
          lecturer: coursesByName.get("surgery") ? getLecturerForCourse(coursesByName.get("surgery")) ? new mongoose25.Types.ObjectId(getLecturerForCourse(coursesByName.get("surgery"))) : null : null,
          startTime: "09:00",
          endTime: "10:00"
        },
        // 10:00-12:00 Clinical Activities
        {
          subject: null,
          lecturer: null,
          startTime: "10:00",
          endTime: "12:00",
          isClinical: true
        },
        // 12:00-14:00 Chemical Pathology
        {
          subject: coursesByName.get("chemical pathology") ? new mongoose25.Types.ObjectId(coursesByName.get("chemical pathology")) : null,
          lecturer: coursesByName.get("chemical pathology") ? getLecturerForCourse(coursesByName.get("chemical pathology")) ? new mongoose25.Types.ObjectId(getLecturerForCourse(coursesByName.get("chemical pathology"))) : null : null,
          startTime: "12:00",
          endTime: "14:00"
        },
        // 14:00-17:00 Chemical Pathology Practicals
        {
          subject: coursesByName.get("chemical pathology") ? new mongoose25.Types.ObjectId(coursesByName.get("chemical pathology")) : null,
          lecturer: coursesByName.get("chemical pathology") ? getLecturerForCourse(coursesByName.get("chemical pathology")) ? new mongoose25.Types.ObjectId(getLecturerForCourse(coursesByName.get("chemical pathology"))) : null : null,
          startTime: "14:00",
          endTime: "17:00"
        }
      ]
    },
    {
      day: "Tuesday",
      periods: [
        // 08:00-09:00 Surgery
        {
          subject: coursesByName.get("surgery") ? new mongoose25.Types.ObjectId(coursesByName.get("surgery")) : null,
          lecturer: coursesByName.get("surgery") ? getLecturerForCourse(coursesByName.get("surgery")) ? new mongoose25.Types.ObjectId(getLecturerForCourse(coursesByName.get("surgery"))) : null : null,
          startTime: "08:00",
          endTime: "09:00"
        },
        // 09:00-10:00 Medicine
        {
          subject: coursesByName.get("medicine") ? new mongoose25.Types.ObjectId(coursesByName.get("medicine")) : null,
          lecturer: coursesByName.get("medicine") ? getLecturerForCourse(coursesByName.get("medicine")) ? new mongoose25.Types.ObjectId(getLecturerForCourse(coursesByName.get("medicine"))) : null : null,
          startTime: "09:00",
          endTime: "10:00"
        },
        // 10:00-12:00 Clinical Activities
        {
          subject: null,
          lecturer: null,
          startTime: "10:00",
          endTime: "12:00",
          isClinical: true
        },
        // 12:00-14:00 Medical Microbiology
        {
          subject: coursesByName.get("medical microbiology") ? new mongoose25.Types.ObjectId(coursesByName.get("medical microbiology")) : null,
          lecturer: coursesByName.get("medical microbiology") ? getLecturerForCourse(coursesByName.get("medical microbiology")) ? new mongoose25.Types.ObjectId(getLecturerForCourse(coursesByName.get("medical microbiology"))) : null : null,
          startTime: "12:00",
          endTime: "14:00"
        },
        // 14:00-17:00 Medical Microbiology Practicals
        {
          subject: coursesByName.get("medical microbiology") ? new mongoose25.Types.ObjectId(coursesByName.get("medical microbiology")) : null,
          lecturer: coursesByName.get("medical microbiology") ? getLecturerForCourse(coursesByName.get("medical microbiology")) ? new mongoose25.Types.ObjectId(getLecturerForCourse(coursesByName.get("medical microbiology"))) : null : null,
          startTime: "14:00",
          endTime: "17:00"
        }
      ]
    },
    {
      day: "Wednesday",
      periods: [
        // 08:00-09:00 Medicine
        {
          subject: coursesByName.get("medicine") ? new mongoose25.Types.ObjectId(coursesByName.get("medicine")) : null,
          lecturer: coursesByName.get("medicine") ? getLecturerForCourse(coursesByName.get("medicine")) ? new mongoose25.Types.ObjectId(getLecturerForCourse(coursesByName.get("medicine"))) : null : null,
          startTime: "08:00",
          endTime: "09:00"
        },
        // 09:00-10:00 Surgery
        {
          subject: coursesByName.get("surgery") ? new mongoose25.Types.ObjectId(coursesByName.get("surgery")) : null,
          lecturer: coursesByName.get("surgery") ? getLecturerForCourse(coursesByName.get("surgery")) ? new mongoose25.Types.ObjectId(getLecturerForCourse(coursesByName.get("surgery"))) : null : null,
          startTime: "09:00",
          endTime: "10:00"
        },
        // 10:00-12:00 Clinical Activities
        {
          subject: null,
          lecturer: null,
          startTime: "10:00",
          endTime: "12:00",
          isClinical: true
        },
        // 12:00-14:00 Hematology
        {
          subject: coursesByName.get("hematology") ? new mongoose25.Types.ObjectId(coursesByName.get("hematology")) : null,
          lecturer: coursesByName.get("hematology") ? getLecturerForCourse(coursesByName.get("hematology")) ? new mongoose25.Types.ObjectId(getLecturerForCourse(coursesByName.get("hematology"))) : null : null,
          startTime: "12:00",
          endTime: "14:00"
        },
        // 14:00-17:00 Hematology Practicals
        {
          subject: coursesByName.get("hematology") ? new mongoose25.Types.ObjectId(coursesByName.get("hematology")) : null,
          lecturer: coursesByName.get("hematology") ? getLecturerForCourse(coursesByName.get("hematology")) ? new mongoose25.Types.ObjectId(getLecturerForCourse(coursesByName.get("hematology"))) : null : null,
          startTime: "14:00",
          endTime: "17:00"
        }
      ]
    },
    {
      day: "Thursday",
      periods: [
        // 08:00-09:00 Surgery
        {
          subject: coursesByName.get("surgery") ? new mongoose25.Types.ObjectId(coursesByName.get("surgery")) : null,
          lecturer: coursesByName.get("surgery") ? getLecturerForCourse(coursesByName.get("surgery")) ? new mongoose25.Types.ObjectId(getLecturerForCourse(coursesByName.get("surgery"))) : null : null,
          startTime: "08:00",
          endTime: "09:00"
        },
        // 09:00-10:00 Medicine
        {
          subject: coursesByName.get("medicine") ? new mongoose25.Types.ObjectId(coursesByName.get("medicine")) : null,
          lecturer: coursesByName.get("medicine") ? getLecturerForCourse(coursesByName.get("medicine")) ? new mongoose25.Types.ObjectId(getLecturerForCourse(coursesByName.get("medicine"))) : null : null,
          startTime: "09:00",
          endTime: "10:00"
        },
        // 10:00-12:00 Clinical Activities
        {
          subject: null,
          lecturer: null,
          startTime: "10:00",
          endTime: "12:00",
          isClinical: true
        },
        // 12:00-14:00 Histopathology
        {
          subject: coursesByName.get("histopathology") ? new mongoose25.Types.ObjectId(coursesByName.get("histopathology")) : null,
          lecturer: coursesByName.get("histopathology") ? getLecturerForCourse(coursesByName.get("histopathology")) ? new mongoose25.Types.ObjectId(getLecturerForCourse(coursesByName.get("histopathology"))) : null : null,
          startTime: "12:00",
          endTime: "14:00"
        },
        // 14:00-17:00 Histopathology Practicals
        {
          subject: coursesByName.get("histopathology") ? new mongoose25.Types.ObjectId(coursesByName.get("histopathology")) : null,
          lecturer: coursesByName.get("histopathology") ? getLecturerForCourse(coursesByName.get("histopathology")) ? new mongoose25.Types.ObjectId(getLecturerForCourse(coursesByName.get("histopathology"))) : null : null,
          startTime: "14:00",
          endTime: "17:00"
        }
      ]
    },
    {
      day: "Friday",
      periods: [
        // 08:00-10:00 Community Medicine
        {
          subject: coursesByName.get("community medicine") ? new mongoose25.Types.ObjectId(coursesByName.get("community medicine")) : null,
          lecturer: coursesByName.get("community medicine") ? getLecturerForCourse(coursesByName.get("community medicine")) ? new mongoose25.Types.ObjectId(getLecturerForCourse(coursesByName.get("community medicine"))) : null : null,
          startTime: "08:00",
          endTime: "10:00"
        },
        // 10:00-14:00 Pharmacology
        {
          subject: coursesByName.get("pharmacology") ? new mongoose25.Types.ObjectId(coursesByName.get("pharmacology")) : null,
          lecturer: coursesByName.get("pharmacology") ? getLecturerForCourse(coursesByName.get("pharmacology")) ? new mongoose25.Types.ObjectId(getLecturerForCourse(coursesByName.get("pharmacology"))) : null : null,
          startTime: "10:00",
          endTime: "14:00"
        },
        // 14:00-17:00 Pharmacology Practicals
        {
          subject: coursesByName.get("pharmacology") ? new mongoose25.Types.ObjectId(coursesByName.get("pharmacology")) : null,
          lecturer: coursesByName.get("pharmacology") ? getLecturerForCourse(coursesByName.get("pharmacology")) ? new mongoose25.Types.ObjectId(getLecturerForCourse(coursesByName.get("pharmacology"))) : null : null,
          startTime: "14:00",
          endTime: "17:00"
        }
      ]
    }
  ];
  await timetable_default.findOneAndDelete({ class: classId, academicYear: academicYearId });
  await timetable_default.create({ class: classId, academicYear: academicYearId, schedule });
  const saved = await timetable_default.findOne({ class: classId, academicYear: academicYearId }).populate("schedule.periods.subject", "name code subjects.subjectID").populate("schedule.periods.lecturer", "name email idNumber");
  return { success: true, schedule: saved?.schedule ?? schedule };
}

// src/routes/timetable.ts
var timeRouter = express7.Router();
timeRouter.post(
  "/generate",
  protect,
  authorize(["admin"]),
  generateTimeTable2
);
timeRouter.get("/:classId", protect, getTimetable);
timeRouter.post(
  "/:classId/periods",
  protect,
  authorize(["admin"]),
  addPeriod
);
timeRouter.put(
  "/:classId/periods",
  protect,
  authorize(["admin"]),
  updatePeriod
);
timeRouter.delete(
  "/:classId/periods",
  protect,
  authorize(["admin"]),
  deletePeriod
);
var timetable_default2 = timeRouter;

// src/routes/exam.ts
import express8 from "express";

// src/controllers/exam.ts
init_activitieslog2();
init_inngest();
init_exam();
import "express";
import mongoose27 from "mongoose";

// src/models/submission.ts
import mongoose26, { Schema as Schema18 } from "mongoose";
var submissionSchema = new Schema18({
  exam: { type: Schema18.Types.ObjectId, ref: "Exam", required: true },
  student: { type: Schema18.Types.ObjectId, ref: "User", required: true },
  answers: [
    {
      questionId: String,
      answer: String
    }
  ],
  score: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now }
});
submissionSchema.index({ exam: 1, student: 1 }, { unique: true });
var submission_default = mongoose26.model("Submission", submissionSchema);

// src/controllers/exam.ts
var triggerExamGeneration = async (req, res) => {
  try {
    const {
      title,
      subject,
      class: classId,
      duration,
      dueDate,
      topic,
      difficulty,
      count
    } = req.body;
    const subjectDoc = await courses_default.findById(subject);
    if (!subjectDoc) {
      return res.status(404).json({ message: `Subject not found!` });
    }
    const lecturerId = req.user._id;
    const draftExam = await exam_default.create({
      title: title || `Auto-Generated ${topic}`,
      subject,
      class: classId,
      lecturer: lecturerId,
      duration: duration || 60,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3),
      // Defaults to 1 week.
      isActive: false,
      // Draft mode.
      questions: []
      // Filled up by Inngest.
    });
    const userId = req.user._id;
    await logActivity({
      userId,
      action: `User triggered exam generation: ${draftExam._id}`
    });
    await inngest.send({
      name: "exam/generate",
      data: {
        examId: draftExam._id,
        topic,
        subjectName: subjectDoc?.name,
        difficulty: difficulty || "Medium",
        count: typeof count === "number" ? count : count ? Number(count) : 10
      }
    });
    return res.status(202).json({
      message: `Exam generation started`,
      examId: draftExam._id
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
var deleteExam = async (req, res) => {
  try {
    const examId = req.params.id;
    const user = req.user;
    const exam = await exam_default.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found!" });
    }
    if (user.role !== "admin" && exam.lecturer.toString() !== user._id.toString()) {
      return res.status(401).json({ message: "Not authorized to delete this exam!" });
    }
    await exam_default.findByIdAndDelete(examId);
    await logActivity({
      userId: user._id,
      action: `User ${user._id} deleted exam ${examId}`
    });
    return res.json({ message: "Exam deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
var getExams = async (req, res) => {
  try {
    const user = req.user;
    let query = {};
    if (user.role === "student") {
      const studentClassId = (
        // preferred: populated studentClasses
        user.studentClasses?.[0]?._id || // fallback: direct object
        user.studentClass?._id || // fallback: legacy capitalized field could be populated or raw id
        user.StudentClass?._id || user.StudentClass || user.studentClass
      );
      if (!studentClassId) {
        return res.json([]);
      }
      try {
        await exam_default.deleteMany({ class: studentClassId, dueDate: { $lt: /* @__PURE__ */ new Date() } });
      } catch (err) {
        console.warn("Failed to cleanup expired exams for class", studentClassId, err);
      }
      query = { class: studentClassId, isActive: true, dueDate: { $gte: /* @__PURE__ */ new Date() } };
    } else if (user.role === "teacher") {
      query = { lecturer: user._id };
    }
    const exams = await exam_default.find(query).populate("subject", "name subjects.subjectID").populate("class", "name section").select("-questions.correctAnswer");
    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
var getExamById = async (req, res) => {
  try {
    const examId = req.params.id;
    const user = req.user;
    let query = exam_default.findById(examId).populate("subject", "name code subjects.subjectID").populate("class", "name section").populate("lecturer", "name email idNumber");
    if (user.role === "teacher" || user.role === "admin") {
      query = query.select("+questions.correctAnswer");
    }
    const exam = await query;
    if (!exam) {
      return res.status(404).json({ message: `Exam not found!` });
    }
    ;
    if (user.role === "student" && exam.class.toString() !== user.studentClass.toString()) {
      const examClassId = exam.class._id ? exam.class._id.toString() : exam.class.toString();
      const userClassId = user.studentClass ? user.studentClass.toString() : "";
      if (examClassId !== userClassId) {
        return res.status(403).json({
          message: `You are not authorized to view this exam!`
        });
      }
    }
    res.json(exam);
  } catch (error) {
    console.error(error);
    if (error.name === "CastError") {
      return res.status(400).json({
        message: `Invalid Exam ID!`
      });
    }
    return res.status(500).json({
      message: `Internal server error!`
    });
  }
};
var toggleExamStatus = async (req, res) => {
  try {
    const examId = req.params.id;
    const user = req.user;
    const exam = await exam_default.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found!" });
    }
    if (user.role !== "admin" && exam.lecturer.toString() !== user._id.toString()) {
      return res.status(401).json({
        message: `Not authorized to modify this exam!`
      });
    }
    exam.isActive = !exam.isActive;
    await exam.save();
    const userId = req.user._id;
    await logActivity({
      userId,
      action: `User ${userId} toggled exam status!`
    });
    res.json({
      message: `Exam is now ${exam.isActive ? "Active" : "Inactive"}`,
      _id: exam._id,
      isActive: exam.isActive
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
var submitExam = async (req, res) => {
  try {
    const { answers } = req.body;
    const studentId = req.user._id;
    const examId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id || "";
    if (!examId) {
      return res.status(400).json({ message: "Exam ID is required" });
    }
    const existingSubmission = await submission_default.findOne({
      exam: examId,
      student: studentId
    });
    if (existingSubmission) {
      return res.status(400).json({ message: `You have already submitted this exam!` });
    }
    const exam = await exam_default.findById(examId).select("+questions.correctAnswers");
    if (!exam) return res.status(404).json({ message: `Exam not found!` });
    let score = 0;
    let totalPoints = 0;
    exam.questions.forEach((question) => {
      totalPoints += question.points;
      const studentAns = answers.find(
        (a) => a.questionId === question._id.toString()
      );
      if (studentAns && studentAns.answer === question.correctAnswer) {
        score += question.points;
      }
    });
    const examObjectId = new mongoose27.Types.ObjectId(examId);
    const studentObjectId = new mongoose27.Types.ObjectId(studentId);
    await submission_default.create({
      exam: examObjectId,
      student: studentObjectId,
      answers,
      score
    });
    const userId = req.user._id;
    await logActivity({
      userId,
      action: `User ${userId} submitted an exam!`
    });
    res.status(201).json({
      message: `Exam ${examId} submitted successfully`,
      score,
      total: totalPoints
    });
  } catch (error) {
    res.status(500).json({
      message: `${error.message}`
    });
  }
};
var getExamResult = async (req, res) => {
  try {
    const studentId = req.user._id;
    const examId = req.params.id;
    const submission = await submission_default.findOne({
      exam: examId,
      student: studentId
    }).populate({
      path: "exam",
      select: "title questions._id questions.correctAnswers"
      // FORCE SELECT CORRECT ANSWERS
    });
    if (!submission) {
      return res.status(404).json({ message: `No submission found!` });
    }
    res.json(submission);
  } catch (error) {
    res.status(500).json({
      messgae: `${error.message}`
    });
  }
};

// src/routes/exam.ts
var examRouter = express8.Router();
examRouter.post(
  "/generate",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  triggerExamGeneration
);
examRouter.post(
  "/:id/submit",
  protect,
  authorize(["admin", "student"]),
  submitExam
);
examRouter.patch(
  "/:id/status",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  toggleExamStatus
);
examRouter.delete(
  "/:id",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  deleteExam
);
examRouter.get(
  "/:id/result",
  protect,
  authorize(["admin", "teacher", "student", "unitconsultant", "unitresident"]),
  getExamResult
);
examRouter.get(
  "/:id",
  protect,
  authorize(["admin", "teacher", "student", "unitconsultant", "unitresident"]),
  getExamById
);
examRouter.get(
  "/",
  protect,
  authorize(["admin", "teacher", "student", "unitconsultant", "unitresident"]),
  getExams
);
var exam_default2 = examRouter;

// src/routes/dashboard.ts
import express9 from "express";

// src/controllers/dashboard.ts
init_activitieslog();
init_exam();
init_classes();
init_user();
import "express";
init_timetable();
var getTodayName = () => (/* @__PURE__ */ new Date()).toLocaleDateString("en-us", { weekday: "long" });
var getDashboradStats = async (req, res) => {
  try {
    const user = req.user;
    let stats = {};
    const activityQuery = user.role === "admin" ? {} : { user: user._id };
    const recentActivities = await activitieslog_default.find(activityQuery).sort({ createdAt: -1 }).limit(5).populate("user", "name");
    const formattedActivity = recentActivities.map((log) => `${log.user.name}: ${log.action} (${new Date(log.createdAt).toLocaleDateString([], { hour: "2-digit", minute: "2-digit" })})`);
    if (user.role === "admin") {
      const totalStudents = await user_default.countDocuments({ role: "student" });
      const totalLecturers = await user_default.countDocuments({ role: "teacher" });
      const activeExams = await user_default.countDocuments({ isActive: true });
      const avgAttendance = "94.5%";
      stats = {
        totalLecturers,
        totalStudents,
        activeExams,
        avgAttendance,
        recentActivities: formattedActivity
      };
    } else if (user.role === "teacher") {
      const myClassessCount = await classes_default.countDocuments({
        classTeacher: user._id
      });
      const myExams = await exam_default.find({ teacher: user._id }).select("_id");
      const myExamsIds = myExams.map((exam) => exam._id);
      const pendingGrading = await submission_default.countDocuments({
        exam: { $in: myExamsIds },
        score: 0
        // Assuming 0 or null means ungraded
      });
      const today = getTodayName();
      const nextClass = " Pediatrics = 500 Level";
      const nextClassTime = "08:00 AM";
      stats = {
        myClassessCount,
        pendingGrading,
        nextClass,
        nextClassTime,
        recentActivities: formattedActivity
      };
    } else if (user.role === "student") {
      const nextExam = await exam_default.findOne({
        class: user.studentClass,
        dueDate: { $gte: /* @__PURE__ */ new Date() }
      }).sort({ dueDate: 1 });
      const pendingAssignments = await exam_default.countDocuments({
        class: user.studentClass,
        isActive: true,
        dueDate: { $gte: /* @__PURE__ */ new Date() }
      });
      const myAttendance = "98%";
      stats = {
        myAttendance,
        pendingAssignments,
        nextExam,
        nextExamDate: nextExam ? new Date(nextExam.dueDate).toLocaleDateString() : "",
        recentActivities: formattedActivity
      };
    }
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      message: `Server error: ${error}`
    });
  }
};

// src/routes/dashboard.ts
var dashBoardRouter = express9.Router();
dashBoardRouter.get(
  "/stats",
  protect,
  getDashboradStats
);
var dashboard_default = dashBoardRouter;

// src/routes/attendance.ts
import express10 from "express";

// src/controllers/attendance.ts
init_attendance();
import "express";
init_user();
init_activitieslog2();
init_inngest();

// src/models/hospitalUnit.ts
import mongoose28, { Schema as Schema19 } from "mongoose";
var HospitalUnitSchema = new Schema19(
  {
    name: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["medicine", "surgery", "paediatrics", "obstetrics", "block", "specialty"],
      required: true
    },
    umbrella: {
      type: String,
      enum: ["MEDICINE", "SURGERY"],
      required: true
    },
    description: { type: String },
    supervisors: [
      {
        type: mongoose28.Types.ObjectId,
        ref: "HospitalStaff"
      }
    ],
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);
HospitalUnitSchema.index({ department: 1, category: 1 });
HospitalUnitSchema.index({ umbrella: 1, isActive: 1 });
var HospitalUnitModel = mongoose28.model(
  "HospitalUnit",
  HospitalUnitSchema,
  "hospital_units"
);
var hospitalUnit_default = HospitalUnitModel;

// src/controllers/attendance.ts
var recordAttendance = async (req, res) => {
  try {
    const { student, course, class: classId, academicYear: academicYear2, status, notes } = req.body;
    const lecturer = req.user._id;
    if (!student || !course || !classId || !academicYear2 || !status) {
      return res.status(400).json({ message: "Missing required attendance fields." });
    }
    const record = await attendance_default.create({
      student,
      lecturer,
      course,
      class: classId,
      academicYear: academicYear2,
      status,
      notes
    });
    await logActivity({
      userId: lecturer,
      action: "Recorded attendance",
      details: `Attendance for student ${student} on ${new Date(record.date).toDateString()} set to ${status}`
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};
var getMyAttendanceSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole2 = req.user.role;
    if (userRole2 === "student") {
      const stats2 = await attendance_default.aggregate([
        { $match: { student: userId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]);
      const records2 = await attendance_default.find({ student: userId }).populate("course", "name code courseID subjects.subjectID").populate("class", "name").populate("lecturer", "name email").sort({ date: -1 }).limit(50);
      res.json({ stats: stats2, records: records2 });
      return;
    }
    const stats = await attendance_default.aggregate([
      { $match: { lecturer: userId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    const records = await attendance_default.find({ lecturer: userId }).populate("course", "name code courseID subjects.subjectID").populate("class", "name").populate("student", "name idNumber email").populate("lecturer", "name email").populate("approvedBy", "name email").sort({ date: -1 }).limit(50);
    res.json({ stats, records });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};
var getStudentAttendanceSummary = async (req, res) => {
  try {
    const { studentId } = req.params;
    const stats = await attendance_default.aggregate([
      { $match: { student: studentId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    const records = await attendance_default.find({ student: studentId }).populate("course", "name code courseID subjects.subjectID").populate("class", "name").populate("lecturer", "name email").sort({ date: -1 }).limit(50);
    res.json({ stats, records });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};
var getStudentNotificationsSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await Promise.resolve().then(() => (init_user(), user_exports)).then((m) => m.default.findById(userId).select("studentClasses name"));
    const classId = user?.studentClasses;
    if (!classId) {
      return res.json({ className: null, academicYear: null, timetable: [], todayLectures: [], totalAttended: 0, totalClasses: 0, percentage: 0, weeklyAlerts: [] });
    }
    const ClassModel = (await Promise.resolve().then(() => (init_classes(), classes_exports))).default;
    const Timetable2 = (await Promise.resolve().then(() => (init_timetable(), timetable_exports))).default;
    const cls = await ClassModel.findById(classId).populate("academicYear", "name").select("name academicYear");
    const timetable = await Timetable2.findOne({ class: classId }).select("schedule");
    const dayMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayName = dayMap[(/* @__PURE__ */ new Date()).getDay()];
    const todaySchedule = timetable?.schedule.find((s) => s.day === todayName);
    const todayLectures = (todaySchedule?.periods ?? []).map((p) => ({
      subject: p.subject,
      lecturer: p.lecturer,
      startTime: p.startTime,
      endTime: p.endTime
    }));
    const subjectIds = /* @__PURE__ */ new Set();
    const lecturerIds = /* @__PURE__ */ new Set();
    const addIdsFromPeriods = (periods) => {
      for (const p of periods || []) {
        if (p?.subject) subjectIds.add(String(p.subject));
        if (p?.lecturer) lecturerIds.add(String(p.lecturer));
      }
    };
    addIdsFromPeriods(todaySchedule?.periods ?? []);
    for (const s of timetable?.schedule ?? []) addIdsFromPeriods(s.periods ?? []);
    const subjectsArr = subjectIds.size ? await courses_default.find({ _id: { $in: Array.from(subjectIds) } }).select("name") : [];
    const lecturersArr = lecturerIds.size ? await user_default.find({ _id: { $in: Array.from(lecturerIds) } }).select("name") : [];
    const subjMap = new Map(subjectsArr.map((c) => [String(c._id), { _id: c._id, name: c.name }]));
    const lectMap = new Map(lecturersArr.map((u) => [String(u._id), { _id: u._id, name: u.name }]));
    const resolvePeriod = (p) => ({
      subject: p?.subject && subjMap.get(String(p.subject)) ? subjMap.get(String(p.subject)) : p.subject,
      lecturer: p?.lecturer && lectMap.get(String(p.lecturer)) ? lectMap.get(String(p.lecturer)) : p.lecturer,
      startTime: p?.startTime,
      endTime: p?.endTime
    });
    const resolvedTodayLectures = (todaySchedule?.periods ?? []).map(resolvePeriod);
    const now = /* @__PURE__ */ new Date();
    const dayOfWeek = now.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);
    monday.setHours(0, 0, 0, 0);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);
    const weekAttendance = await attendance_default.find({
      student: userId,
      date: { $gte: monday, $lte: friday }
    }).select("status course date dayOfWeek lecturer");
    const totalAttended = await attendance_default.countDocuments({ student: userId, status: { $in: ["present", "late", "excused"] } });
    const totalClasses = await attendance_default.countDocuments({ student: userId });
    const attendanceMap = /* @__PURE__ */ new Map();
    weekAttendance.forEach((a) => {
      const key = `${a.course?._id ?? a.course}-${a.dayOfWeek}`;
      attendanceMap.set(key, a.status);
    });
    const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const weeklyAlerts = weekDays.map((day) => {
      const daySchedule = timetable?.schedule.find((s) => s.day === day);
      const lectures = (daySchedule?.periods ?? []).map((p) => {
        const key = `${p.subject?._id ?? p.subject}-${day}`;
        const resolved = resolvePeriod(p);
        return {
          subject: resolved.subject,
          lecturer: resolved.lecturer,
          startTime: resolved.startTime,
          endTime: resolved.endTime,
          status: attendanceMap.get(key) ?? null
        };
      });
      return { day, lectures };
    });
    res.json({
      className: cls?.name ?? null,
      academicYear: cls?.academicYear?.name ?? null,
      timetable: timetable?.schedule ?? [],
      todayDay: todayName,
      todayLectures: resolvedTodayLectures,
      totalAttended,
      totalClasses,
      percentage: totalClasses > 0 ? Math.round(totalAttended / totalClasses * 100) : 0,
      weeklyAlerts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};
var getCourseClassAttendance = async (req, res) => {
  try {
    const userId = req.user._id;
    const summary = await attendance_default.aggregate([
      { $match: { lecturer: userId } },
      { $group: {
        _id: { course: "$course", class: "$class" },
        present: {
          $sum: {
            $cond: [{ $eq: ["$status", "present"] }, 1, 0]
          }
        },
        absent: {
          $sum: {
            $cond: [{ $eq: ["$status", "absent"] }, 1, 0]
          }
        },
        late: {
          $sum: {
            $cond: [{ $eq: ["$status", "late"] }, 1, 0]
          }
        },
        excused: {
          $sum: {
            $cond: [{ $eq: ["$status", "excused"] }, 1, 0]
          }
        }
      } },
      {
        $lookup: {
          from: "courses",
          localField: "_id.course",
          foreignField: "_id",
          as: "course"
        }
      },
      { $unwind: "$course" },
      {
        $lookup: {
          from: "classes",
          localField: "_id.class",
          foreignField: "_id",
          as: "class"
        }
      },
      { $unwind: "$class" },
      { $project: { _id: 0, course: 1, class: 1, present: 1, absent: 1, late: 1, excused: 1 } }
    ]);
    const formattedSummary = summary.map((item) => ({
      courseName: item.course.name,
      className: item.class.name,
      present: item.present,
      absent: item.absent,
      late: item.late,
      excused: item.excused
    }));
    return res.json(formattedSummary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};
var approveExcusedAbsence = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const userId = req.user._id;
    const attendanceRecord = await attendance_default.findById(attendanceId);
    if (!attendanceRecord) {
      return res.status(404).json({ message: "Attendance record not found" });
    }
    ;
    if (attendanceRecord.status !== "excused") {
      return res.status(400).json({ message: "Only excused absences can be approved" });
    }
    attendanceRecord.approvedBy = userId;
    await attendanceRecord.save();
    await logActivity({
      userId,
      action: "Approved excused absence",
      details: `Approved excused absence for attendance record ID: ${attendanceId}`
    });
    res.json({ message: "Excused absence approved successfully", attendanceRecord });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
  ;
};
var getStudentAttendanceRecords = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, status, page = 1, limit = 20 } = req.query;
    const filter = { student: studentId };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (status) {
      filter.status = status;
    }
    const records = await attendance_default.find(filter).populate("course", "name code courseID subjects.subjectID").populate("class", "name").populate("lecturer", "name email").sort({ date: -1 }).skip((+page - 1) * +limit).limit(+limit);
    const total = await attendance_default.countDocuments(filter);
    res.json({ records, total, page: +page, limit: +limit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
  ;
};
var getClassSessionAttendance = async (req, res) => {
  try {
    const { classId, courseId, date } = req.query;
    if (!classId || !courseId || !date) {
      res.status(400).json({ message: "classId, courseId, and date are required." });
      return;
    }
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    const nextDay = new Date(dateObj);
    nextDay.setDate(nextDay.getDate() + 1);
    const records = await attendance_default.find({
      class: classId,
      course: courseId,
      date: { $gte: dateObj, $lt: nextDay }
    }).populate("student", "name email idNumber").populate("course", "name code subjects.subjectID").populate("class", "name").populate("lecturer", "name email").sort({ "student.name": 1 });
    res.json({ records });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
var bulkUpdateAttendance = async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({ message: "updates array is required." });
      return;
    }
    const userId = req.user._id;
    const results = await Promise.all(
      updates.map(async ({ attendanceId, status, notes, lecturerApproval, hodApproval }) => {
        const existing = await attendance_default.findById(attendanceId);
        if (!existing) return null;
        const updateData = {};
        if (status !== void 0) updateData.status = status;
        if (notes !== void 0) updateData.notes = notes;
        if (lecturerApproval !== void 0) {
          updateData.lecturerApproval = lecturerApproval;
          updateData.lecturerApprovalDate = /* @__PURE__ */ new Date();
        }
        if (hodApproval !== void 0) {
          updateData.hodApproval = hodApproval;
          updateData.hodApprovalDate = /* @__PURE__ */ new Date();
        }
        const record = await attendance_default.findByIdAndUpdate(
          attendanceId,
          updateData,
          { returnDocument: "after", runValidators: true }
        );
        return record;
      })
    );
    await logActivity({
      userId,
      action: "Bulk updated attendance statuses",
      details: `Updated ${results.length} attendance record(s)`
    });
    res.json({ message: "Attendance updated", results });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
var triggerAttendanceGeneration = async (req, res) => {
  try {
    const { courseId, classId, academicYearId, date } = req.body;
    if (!courseId || !classId || !academicYearId || !date) {
      res.status(400).json({ message: "courseId, classId, academicYearId, and date are required." });
      return;
    }
    const userId = req.user._id?.toString();
    await inngest.send({
      name: "attendance/generate",
      data: { courseId, classId, academicYearId, date, userId }
    });
    res.status(202).json({ message: "Attendance generation started.", status: "processing" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
var checkTimetableExists = async (req, res) => {
  try {
    const { classId, academicYearId } = req.query;
    if (!classId || !academicYearId) {
      res.status(400).json({ message: "classId and academicYearId are required." });
      return;
    }
    const Timetable2 = (await Promise.resolve().then(() => (init_timetable(), timetable_exports))).default;
    const timetable = await Timetable2.findOne({
      class: classId,
      academicYear: academicYearId
    }).select("_id");
    res.json({ exists: !!timetable });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
var getAllAttendanceLists = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole2 = req.user.role;
    const { classId, courseId, date } = req.query;
    const filter = {};
    if (classId) filter.class = classId;
    if (courseId) filter.course = courseId;
    if (date) {
      const dateObj = new Date(date);
      dateObj.setHours(0, 0, 0, 0);
      const nextDay = new Date(dateObj);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.date = { $gte: dateObj, $lt: nextDay };
    }
    if (userRole2 !== "admin") {
      filter.lecturer = userId;
    }
    const records = await attendance_default.find(filter).populate("course", "name code courseID subjects.subjectID").populate("class", "name").populate("student", "name idNumber email").populate("lecturer", "name email").populate("approvedBy", "name email").sort({ date: -1 }).limit(100);
    res.json({ records });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};
var getSubjectsAttendance = async (req, res) => {
  try {
    const userId = req.user._id;
    const summary = await attendance_default.aggregate([
      { $match: { lecturer: userId } },
      {
        $group: {
          _id: "$course",
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $eq: ["$status", "excused"] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "course"
        }
      },
      { $unwind: "$course" },
      {
        $project: {
          _id: 1,
          subject: [{ name: "$course.name", code: "$course.code" }],
          present: 1,
          absent: 1,
          late: 1,
          excused: 1
        }
      }
    ]);
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
var getClassesAttendanceStatus = async (req, res) => {
  try {
    const ClassModel = (await Promise.resolve().then(() => (init_classes(), classes_exports))).default;
    const Timetable2 = (await Promise.resolve().then(() => (init_timetable(), timetable_exports))).default;
    const classes = await ClassModel.find().populate("academicYear", "name").select("name academicYear courses").sort({ name: 1 });
    const classesWithStatus = await Promise.all(
      classes.map(async (cls) => {
        const [timetable, attendanceStats] = await Promise.all([
          Timetable2.findOne({ class: cls._id }).select("_id"),
          attendance_default.aggregate([
            { $match: { class: cls._id } },
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 }
              }
            }
          ])
        ]);
        const statusMap = {};
        attendanceStats.forEach((s) => {
          statusMap[s._id] = s.count;
        });
        return {
          classId: cls._id,
          className: cls.name,
          academicYear: cls.academicYear?.name ?? "N/A",
          timetableStatus: !!timetable ? "active" : "not set",
          present: statusMap.present ?? 0,
          absent: statusMap.absent ?? 0,
          late: statusMap.late ?? 0,
          excused: statusMap.excused ?? 0
        };
      })
    );
    res.json({ classes: classesWithStatus });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
var getWeeklyCourseAttendance = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole2 = req.user.role;
    const now = /* @__PURE__ */ new Date();
    const dayOfWeek = now.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);
    monday.setHours(0, 0, 0, 0);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);
    const matchFilter = {
      date: { $gte: monday, $lte: friday }
    };
    if (userRole2 !== "admin") {
      matchFilter.lecturer = userId;
    }
    const raw = await attendance_default.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            course: "$course",
            dayOfWeek: "$dayOfWeek"
          },
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $eq: ["$status", "excused"] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id.course",
          foreignField: "_id",
          as: "courseDoc"
        }
      },
      { $unwind: "$courseDoc" },
      {
        $project: {
          _id: 0,
          courseId: "$_id.course",
          courseName: "$courseDoc.name",
          courseCode: "$courseDoc.code",
          dayOfWeek: "$_id.dayOfWeek",
          present: 1,
          absent: 1,
          late: 1,
          excused: 1
        }
      },
      { $sort: { courseName: 1, dayOfWeek: 1 } }
    ]);
    res.json({ records: raw, weekStart: monday.toISOString(), weekEnd: friday.toISOString() });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// src/routes/attendance.ts
var attendanceRouter = express10.Router();
attendanceRouter.post(
  "/record",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  recordAttendance
);
attendanceRouter.get("/me", protect, getMyAttendanceSummary);
attendanceRouter.get("/me/summary", protect, getMyAttendanceSummary);
attendanceRouter.post(
  "/approve-excused/:attendanceId",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  approveExcusedAbsence
);
attendanceRouter.get(
  "/courses/:courseId/classes/:classId",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  getCourseClassAttendance
);
attendanceRouter.get(
  "/students/:studentId",
  protect,
  authorize(["admin", "teacher", "parent", "student"]),
  getStudentAttendanceRecords
);
attendanceRouter.get(
  "/student/:studentId/summary",
  protect,
  authorize(["admin", "teacher", "parent"]),
  getStudentAttendanceSummary
);
attendanceRouter.post(
  "/generate",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  triggerAttendanceGeneration
);
attendanceRouter.get(
  "/session",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  getClassSessionAttendance
);
attendanceRouter.patch(
  "/bulk",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  bulkUpdateAttendance
);
attendanceRouter.get(
  "/timetable-check",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  checkTimetableExists
);
attendanceRouter.get(
  "/subjects",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  getSubjectsAttendance
);
attendanceRouter.get(
  "/lists",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  getAllAttendanceLists
);
attendanceRouter.get(
  "/status",
  protect,
  authorize(["admin", "teacher", "parent"]),
  getClassesAttendanceStatus
);
attendanceRouter.get(
  "/weekly",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident"]),
  getWeeklyCourseAttendance
);
attendanceRouter.get(
  "/student-notifications",
  protect,
  authorize(["student"]),
  getStudentNotificationsSummary
);
var attendance_default2 = attendanceRouter;

// src/routes/notification.ts
import { Router as Router2 } from "express";
init_notification();
var router = Router2();
router.get("/", protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const page = Math.max(1, parseInt(String(req.query.page)) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit)) || 20));
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      Notification.find({ userId: user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments({ userId: user._id })
    ]);
    res.json({ notifications, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("GET /notifications error:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});
router.get("/unread-count", protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const count = await Notification.countDocuments({ userId: user._id, isRead: false });
    res.json({ count });
  } catch (err) {
    console.error("GET /notifications/unread-count error:", err);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
});
router.get("/system", protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit)) || 100));
    const notifications = await Notification.find({}).sort({ createdAt: -1 }).limit(limit).lean();
    const seen = /* @__PURE__ */ new Map();
    for (const n of notifications) {
      const key = `${n.type}:${new Date(n.createdAt).toISOString()}`;
      if (!seen.has(key)) {
        seen.set(key, n);
      }
    }
    const deduped = Array.from(seen.values()).map((n) => ({
      ...n,
      unreadForUser: String(n.userId) === String(user._id) && n.isRead === false
    }));
    res.json({ notifications: deduped });
  } catch (err) {
    console.error("GET /notifications/system error:", err);
    res.status(500).json({ error: "Failed to fetch system notifications" });
  }
});
router.patch("/:id/read", protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: user._id },
      { isRead: true },
      // { new: true }
      { returnDocument: "after" }
    );
    if (!updated) return res.status(404).json({ error: "Notification not found" });
    res.json({ notification: updated });
  } catch (err) {
    console.error("PATCH /notifications/:id/read error:", err);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});
router.patch("/read-all", protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    await Notification.updateMany({ userId: user._id, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    console.error("PATCH /notifications/read-all error:", err);
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});
router.delete("/:id", protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    let deleted;
    if (user.role === "admin" || user.role === "teacher") {
      deleted = await Notification.findOneAndDelete({ _id: req.params.id });
    } else {
      deleted = await Notification.findOneAndDelete({ _id: req.params.id, userId: user._id });
    }
    if (!deleted) return res.status(404).json({ error: "Notification not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /notifications/:id error:", err);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});
router.get("/stream", protect, async (req, res) => {
  try {
    addSSEClient(req, res);
  } catch (err) {
    console.error("Failed to add SSE client", err);
    try {
      res.status(500).end();
    } catch {
    }
  }
});
var notification_default = router;

// src/routes/for500LevelPostings.ts
import express11 from "express";

// src/controllers/for500LevelPosting.ts
import "express";

// src/models/rotationPlan.ts
import mongoose29, { Schema as Schema20 } from "mongoose";
var GroupRefSchema = new Schema20({
  groupId: { type: mongoose29.Schema.Types.ObjectId, ref: "Class" },
  group: { type: Schema20.Types.Mixed },
  assigned: { type: [{ startDate: Date, endDate: Date }], default: [] },
  supervisorName: { type: String },
  supervisor: { type: mongoose29.Schema.Types.ObjectId, ref: "User" }
}, { _id: false });
var PostingSchema2 = new Schema20({
  name: { type: String, required: true },
  category: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  groups: { type: [GroupRefSchema], default: [] },
  meta: { type: Schema20.Types.Mixed, default: {} }
}, { _id: false });
var RotationPlanSchema = new Schema20({
  name: { type: String },
  class: { type: mongoose29.Schema.Types.ObjectId, ref: "Class" },
  createdBy: { type: mongoose29.Schema.Types.ObjectId, ref: "User" },
  postings: { type: [PostingSchema2], default: [] },
  groups: { type: [Schema20.Types.Mixed], default: [] },
  meta: { type: Schema20.Types.Mixed, default: {} },
  createdAt: { type: Date, default: () => /* @__PURE__ */ new Date() },
  updatedAt: { type: Date, default: () => /* @__PURE__ */ new Date() }
}, { collection: "rotationplans" });
RotationPlanSchema.pre("save", function() {
  this.updatedAt = /* @__PURE__ */ new Date();
});
var RotationPlan = mongoose29.model("RotationPlan", RotationPlanSchema);
var rotationPlan_default = RotationPlan;

// src/routes/for500LevelPostings.ts
var routerFor500LevelPostings = express11.Router();
var for500LevelPostings_default = routerFor500LevelPostings;

// src/routes/rotationSchedules.ts
import express12 from "express";

// src/controllers/rotationSchedules.ts
import "express";
var createRotationSchedule = async (req, res) => {
  try {
    const payload = req.body || {};
    payload.createdBy = req.user?._id;
    const doc = await rotationPlan_default.create(payload);
    res.status(201).json(doc);
  } catch (err) {
    console.error("createRotationSchedule error", err);
    res.status(500).json({ message: "Server error", error: String(err) });
  }
};
var listRotationSchedules = async (req, res) => {
  try {
    const { classId, query, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (classId) filter.class = classId;
    if (query) filter.name = { $regex: String(query), $options: "i" };
    const docs = await rotationPlan_default.find(filter).sort({ createdAt: -1 }).skip((+page - 1) * +limit).limit(+limit).lean();
    const total = await rotationPlan_default.countDocuments(filter);
    res.json({ schedules: docs, total, page: +page, limit: +limit });
  } catch (err) {
    console.error("listRotationSchedules error", err);
    res.status(500).json({ message: "Server error", error: String(err) });
  }
};
var getRotationScheduleById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await rotationPlan_default.findById(id).lean();
    if (!doc) return res.status(404).json({ message: "Schedule not found" });
    res.json(doc);
  } catch (err) {
    console.error("getRotationScheduleById error", err);
    res.status(500).json({ message: "Server error", error: String(err) });
  }
};
var deleteRotationSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await rotationPlan_default.findByIdAndDelete(id).lean();
    if (!doc) return res.status(404).json({ message: "Schedule not found" });
    res.json({ message: "Schedule deleted" });
  } catch (err) {
    console.error("deleteRotationSchedule error", err);
    res.status(500).json({ message: "Server error", error: String(err) });
  }
};
var getStudentAssignments = async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) return res.status(400).json({ message: "Missing studentId" });
    const schedules = await rotationPlan_default.find({}).sort({ createdAt: -1 }).limit(200).lean();
    const assignments = {};
    for (const s of schedules) {
      const postings = s.postings || [];
      for (const p of postings) {
        const groups = p.groups || [];
        for (const g of groups) {
          const groupObj = g.group || {};
          const students = Array.isArray(groupObj.students) ? groupObj.students : [];
          if (students.some((st) => String(st) === String(studentId) || st && st._id && String(st._id) === String(studentId))) {
            assignments[p.name || "Posting"] = { groupName: groupObj.name || g.groupId || "Group", supervisorName: g.supervisorName || "" };
          }
        }
      }
    }
    res.json({ assignments });
  } catch (err) {
    console.error("getStudentAssignments error", err);
    res.status(500).json({ message: "Server error", error: String(err) });
  }
};

// src/routes/rotationSchedules.ts
var router2 = express12.Router();
router2.post("/", protect, authorize(["admin", "teacher"]), createRotationSchedule);
router2.get("/", protect, listRotationSchedules);
router2.get("/student-assignments", protect, getStudentAssignments);
router2.get("/:id", protect, getRotationScheduleById);
router2.delete("/:id", protect, authorize(["admin", "teacher"]), deleteRotationSchedule);
var rotationSchedules_default = router2;

// src/routes/logbookEntry.ts
import express13 from "express";
var logbookEntryRouter = express13.Router();
var logbookEntry_default2 = logbookEntryRouter;

// src/routes/hospitalData.ts
import { Router as Router3 } from "express";

// src/controllers/hospitalData.ts
init_hospitalStaff();
import "mongoose";
var createHospitalUnit = async (req, res) => {
  try {
    const { name, department, category, umbrella, description, supervisors } = req.body;
    if (!name || !department || !category || !umbrella) {
      return res.status(400).json({ error: "Missing required fields: name, department, category, umbrella." });
    }
    const unit = await hospitalUnit_default.create({
      name,
      department,
      category,
      umbrella,
      description,
      supervisors: supervisors || []
    });
    return res.status(201).json({ message: "Hospital unit created successfully.", unit });
  } catch (error) {
    console.error("Error creating hospital unit:", error);
    return res.status(500).json({ error: "Failed to create hospital unit." });
  }
};
var listHospitalUnits = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = parseInt(req.query.skip) || 0;
    const department = req.query.department;
    const category = req.query.category;
    const umbrella = req.query.umbrella;
    const filter = { isActive: true };
    if (department) filter.department = new RegExp(department, "i");
    if (category) filter.category = category;
    if (umbrella) filter.umbrella = umbrella;
    const total = await hospitalUnit_default.countDocuments(filter);
    const units = await hospitalUnit_default.find(filter).populate("supervisors", "name designation").sort({ department: 1, name: 1 }).limit(limit).skip(skip);
    return res.status(200).json({ units, total, page: Math.floor(skip / limit) + 1, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error listing hospital units:", error);
    return res.status(500).json({ error: "Failed to list hospital units." });
  }
};
var getHospitalUnit = async (req, res) => {
  try {
    const { unitId } = req.params;
    const unit = await hospitalUnit_default.findById(unitId).populate("supervisors", "name designation fileNumber");
    if (!unit) {
      return res.status(404).json({ error: "Hospital unit not found." });
    }
    return res.status(200).json({ unit });
  } catch (error) {
    console.error("Error fetching hospital unit:", error);
    return res.status(500).json({ error: "Failed to fetch hospital unit." });
  }
};
var updateHospitalUnit = async (req, res) => {
  try {
    const { unitId } = req.params;
    const { name, description, supervisors, isActive } = req.body;
    const unit = await hospitalUnit_default.findByIdAndUpdate(
      unitId,
      { name, description, supervisors, isActive },
      { returnDocument: "after" }
    );
    if (!unit) {
      return res.status(404).json({ error: "Hospital unit not found." });
    }
    return res.status(200).json({ message: "Hospital unit updated successfully.", unit });
  } catch (error) {
    console.error("Error updating hospital unit:", error);
    return res.status(500).json({ error: "Failed to update hospital unit." });
  }
};
var createHospitalStaff = async (req, res) => {
  try {
    const { fileNumber, name, qualification, designation, systemRole, department, assignedUnits, email, phone, canApproveLogbooks } = req.body;
    if (!fileNumber || !name || !designation || !department) {
      return res.status(400).json({ error: "Missing required fields: fileNumber, name, designation, department." });
    }
    const staff = await hospitalStaff_default.create({
      fileNumber,
      name,
      qualification,
      designation,
      systemRole: systemRole || "CONSULTANT",
      department,
      assignedUnits: assignedUnits || [],
      email,
      phone,
      canApproveLogbooks: canApproveLogbooks !== false
      // default true
    });
    return res.status(201).json({ message: "Hospital staff created successfully.", staff });
  } catch (error) {
    if (error.code === 11e3) {
      return res.status(400).json({ error: "File number already exists." });
    }
    console.error("Error creating hospital staff:", error);
    return res.status(500).json({ error: "Failed to create hospital staff." });
  }
};
var listHospitalStaff = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = parseInt(req.query.skip) || 0;
    const department = req.query.department;
    const designation = req.query.designation;
    const systemRole = req.query.systemRole;
    const filter = { isActive: true };
    if (department) filter.department = new RegExp(department, "i");
    if (designation) filter.designation = designation;
    if (systemRole) filter.systemRole = systemRole;
    const total = await hospitalStaff_default.countDocuments(filter);
    const staff = await hospitalStaff_default.find(filter).populate("assignedUnits", "name department category").sort({ fileNumber: 1 }).limit(limit).skip(skip);
    return res.status(200).json({ staff, total, page: Math.floor(skip / limit) + 1, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error listing hospital staff:", error);
    return res.status(500).json({ error: "Failed to list hospital staff." });
  }
};
var getHospitalStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const staff = await hospitalStaff_default.findById(staffId).populate("assignedUnits", "name department category umbrella");
    if (!staff) {
      return res.status(404).json({ error: "Staff member not found." });
    }
    return res.status(200).json({ staff });
  } catch (error) {
    console.error("Error fetching hospital staff:", error);
    return res.status(500).json({ error: "Failed to fetch hospital staff." });
  }
};
var updateHospitalStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { assignedUnits, email, phone, isActive, canApproveLogbooks } = req.body;
    const staff = await hospitalStaff_default.findByIdAndUpdate(
      staffId,
      { assignedUnits, email, phone, isActive, canApproveLogbooks },
      { returnDocument: "after" }
    );
    if (!staff) {
      return res.status(404).json({ error: "Staff member not found." });
    }
    return res.status(200).json({ message: "Hospital staff updated successfully.", staff });
  } catch (error) {
    console.error("Error updating hospital staff:", error);
    return res.status(500).json({ error: "Failed to update hospital staff." });
  }
};
var bulkImportStaff = async (req, res) => {
  try {
    const { staffData } = req.body;
    if (!Array.isArray(staffData)) {
      return res.status(400).json({ error: "staffData must be an array." });
    }
    const results = {
      created: 0,
      failed: 0,
      errors: []
    };
    for (const data of staffData) {
      try {
        await hospitalStaff_default.updateOne(
          { fileNumber: data.fileNumber },
          {
            $setOnInsert: {
              name: data.name,
              qualification: data.qualification,
              designation: data.designation,
              department: data.department,
              systemRole: data.systemRole || "CONSULTANT",
              email: data.email,
              phone: data.phone,
              canApproveLogbooks: true
            }
          },
          { upsert: true }
        );
        results.created++;
      } catch (err) {
        results.failed++;
        results.errors.push({
          fileNumber: data.fileNumber,
          error: err instanceof Error ? err.message : "Unknown error"
        });
      }
    }
    return res.status(200).json({ message: "Bulk import completed.", ...results });
  } catch (error) {
    console.error("Error bulk importing staff:", error);
    return res.status(500).json({ error: "Failed to bulk import staff." });
  }
};

// src/routes/hospitalData.ts
var router3 = Router3();
router3.post("/units", protect, authorize(["admin"]), createHospitalUnit);
router3.get("/units", protect, listHospitalUnits);
router3.get("/units/:unitId", protect, getHospitalUnit);
router3.patch("/units/:unitId", protect, authorize(["admin"]), updateHospitalUnit);
router3.post("/staff", protect, authorize(["admin"]), createHospitalStaff);
router3.get("/staff", protect, listHospitalStaff);
router3.get("/staff/:staffId", protect, getHospitalStaff);
router3.patch("/staff/:staffId", protect, authorize(["admin"]), updateHospitalStaff);
router3.post("/staff/bulk-import", protect, authorize(["admin"]), bulkImportStaff);
var hospitalData_default = router3;

// src/routes/activityEntry.ts
import { Router as Router4 } from "express";

// src/models/activityEntry.ts
import mongoose31, { Schema as Schema21 } from "mongoose";
var ActivityEntrySchema = new Schema21(
  {
    student: {
      type: mongoose31.Types.ObjectId,
      ref: "User",
      required: true
    },
    rotation: {
      type: mongoose31.Types.ObjectId,
      ref: "ClinicalRotation",
      required: true
    },
    unit: {
      type: mongoose31.Types.ObjectId,
      ref: "HospitalUnit",
      required: true
    },
    supervisor: {
      type: mongoose31.Types.ObjectId,
      ref: "HospitalStaff"
    },
    umbrellaCategory: {
      type: String,
      enum: ["MEDICINE", "SURGERY"],
      required: true
    },
    entryDate: {
      type: Date,
      required: true,
      validate: {
        validator: function(v) {
          const day = v.getDay();
          return day !== 0 && day !== 6;
        },
        message: "Clinical activity entries can only be documented for Monday through Friday."
      }
    },
    // Shared metrics
    clinicsAttended: { type: Boolean, default: false },
    wardRoundsAttended: {
      type: String,
      enum: ["NONE", "RESIDENT_ROUND", "CONSULTANT_ROUND", "BOTH"],
      default: "NONE"
    },
    callDutyCompleted: { type: Boolean, default: false },
    // Umbrella-specific metrics
    surgicalMetrics: {
      theatreDaysCount: { type: Number, default: 0 },
      casesObserved: [{ type: String }],
      casesAssisted: [{ type: String }]
    },
    medicalMetrics: {
      proceduresWitnessedOrDone: [{ type: String }]
    },
    // Approval tracking
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    approvedBy: {
      type: mongoose31.Types.ObjectId,
      ref: "HospitalStaff"
    },
    approvedByRole: {
      type: String,
      enum: ["RESIDENT", "CONSULTANT"]
    },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    // Metadata
    notes: { type: String },
    attachments: [{ type: String }]
  },
  {
    timestamps: true
  }
);
ActivityEntrySchema.index({ student: 1, entryDate: -1 });
ActivityEntrySchema.index({ rotation: 1, approvalStatus: 1 });
ActivityEntrySchema.index({ unit: 1, umbrellaCategory: 1 });
ActivityEntrySchema.index({ approvalStatus: 1, supervisor: 1 });
ActivityEntrySchema.index({ entryDate: 1, approvalStatus: 1 });
var ActivityEntryModel = mongoose31.model(
  "ActivityEntry",
  ActivityEntrySchema,
  "activity_entries"
);
var activityEntry_default = ActivityEntryModel;

// src/services/activityLogbookService.ts
init_hospitalStaff();
import mongoose32 from "mongoose";
var ActivityLogbookService = class {
  /**
   * Validates that a date falls on a weekday (Monday-Friday)
   */
  isWeekday(date) {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  }
  /**
   * Validates the umbrella-specific requirements for an activity entry
   */
  validateUmbrellaRequirements(payload) {
    if (payload.umbrellaCategory === "SURGERY") {
      if (!payload.surgicalMetrics) {
        return {
          valid: false,
          error: "Surgical category postings require theatre metrics (cases observed/assisted)."
        };
      }
      if (payload.surgicalMetrics.casesObserved.length === 0 && payload.surgicalMetrics.casesAssisted.length === 0) {
        return {
          valid: false,
          error: "At least one case observation or case assistance record is required for surgical postings."
        };
      }
    } else if (payload.umbrellaCategory === "MEDICINE") {
      if (!payload.medicalMetrics) {
        return {
          valid: false,
          error: "Medical category postings require procedure records."
        };
      }
      if (payload.medicalMetrics.proceduresWitnessedOrDone.length === 0) {
        return {
          valid: false,
          error: "At least one procedure record is required for medical postings."
        };
      }
    }
    return { valid: true };
  }
  /**
   * Submit a new activity entry for a student
   */
  async submitActivityEntry(payload) {
    try {
      const entryDate = new Date(payload.entryDate);
      if (!this.isWeekday(entryDate)) {
        return {
          success: false,
          error: "Clinical activity entries can only be submitted for Monday through Friday."
        };
      }
      const umbrellaCheck = this.validateUmbrellaRequirements(payload);
      if (!umbrellaCheck.valid) {
        return { success: false, error: umbrellaCheck.error };
      }
      const student = await mongoose32.connection.collection("users").findOne({
        _id: new mongoose32.Types.ObjectId(payload.student)
      });
      if (!student) {
        return { success: false, error: "Student not found." };
      }
      const rotation = await mongoose32.connection.collection("clinical_rotations").findOne({
        _id: new mongoose32.Types.ObjectId(payload.rotation)
      });
      if (!rotation) {
        return { success: false, error: "Clinical rotation not found." };
      }
      const unit = await hospitalUnit_default.findById(payload.unit);
      if (!unit) {
        return { success: false, error: "Hospital unit not found." };
      }
      const entry = await activityEntry_default.create({
        student: payload.student,
        rotation: payload.rotation,
        unit: payload.unit,
        supervisor: payload.supervisor,
        umbrellaCategory: payload.umbrellaCategory,
        entryDate,
        clinicsAttended: payload.clinicsAttended,
        wardRoundsAttended: payload.wardRoundsAttended,
        callDutyCompleted: payload.callDutyCompleted,
        surgicalMetrics: payload.surgicalMetrics,
        medicalMetrics: payload.medicalMetrics,
        notes: payload.notes,
        approvalStatus: "pending"
      });
      return {
        success: true,
        entryId: entry._id.toString()
      };
    } catch (error) {
      console.error("Error submitting activity entry:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to submit activity entry."
      };
    }
  }
  /**
   * Approve an activity entry (sign-off by staff)
   */
  async approveActivityEntry(entryId, staffId, role) {
    try {
      const entry = await activityEntry_default.findById(entryId);
      if (!entry) {
        return { success: false, error: "Activity entry not found." };
      }
      if (entry.approvalStatus === "approved") {
        return { success: false, error: "This entry has already been approved." };
      }
      const staff = await hospitalStaff_default.findById(staffId);
      if (!staff) {
        return { success: false, error: "Staff member not found." };
      }
      if (!staff.canApproveLogbooks) {
        return {
          success: false,
          error: "This staff member does not have permission to approve logbook entries."
        };
      }
      if (!staff.assignedUnits.some(
        (unitId) => unitId.toString() === entry.unit.toString()
      )) {
        return {
          success: false,
          error: "This staff member is not assigned to the unit where this activity occurred."
        };
      }
      entry.approvalStatus = "approved";
      entry.approvedBy = new mongoose32.Types.ObjectId(staffId);
      entry.approvedByRole = role;
      entry.approvedAt = /* @__PURE__ */ new Date();
      await entry.save();
      return { success: true };
    } catch (error) {
      console.error("Error approving activity entry:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to approve activity entry."
      };
    }
  }
  /**
   * Reject an activity entry with reason
   */
  async rejectActivityEntry(entryId, staffId, rejectionReason) {
    try {
      const entry = await activityEntry_default.findById(entryId);
      if (!entry) {
        return { success: false, error: "Activity entry not found." };
      }
      if (entry.approvalStatus === "approved") {
        return {
          success: false,
          error: "Cannot reject an already-approved entry."
        };
      }
      const staff = await hospitalStaff_default.findById(staffId);
      if (!staff) {
        return { success: false, error: "Staff member not found." };
      }
      entry.approvalStatus = "rejected";
      entry.rejectionReason = rejectionReason;
      entry.approvedBy = new mongoose32.Types.ObjectId(staffId);
      entry.approvedAt = /* @__PURE__ */ new Date();
      await entry.save();
      return { success: true };
    } catch (error) {
      console.error("Error rejecting activity entry:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to reject activity entry."
      };
    }
  }
  /**
   * Get pending activity entries for a staff member to review
   */
  async getPendingEntriesForStaff(staffId, limit = 20, skip = 0) {
    try {
      const staff = await hospitalStaff_default.findById(staffId);
      if (!staff) {
        return { success: false, error: "Staff member not found." };
      }
      const total = await activityEntry_default.countDocuments({
        unit: { $in: staff.assignedUnits },
        approvalStatus: "pending"
      });
      const entries = await activityEntry_default.find({
        unit: { $in: staff.assignedUnits },
        approvalStatus: "pending"
      }).populate("student", "name email").populate("rotation", "rotationName rotationType").populate("unit", "name department").sort({ entryDate: -1 }).limit(limit).skip(skip);
      return { success: true, entries, total };
    } catch (error) {
      console.error("Error fetching pending entries:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch pending entries."
      };
    }
  }
  /**
   * Get all approved entries for a student in a rotation
   */
  async getStudentRotationLogbook(studentId, rotationId) {
    try {
      const entries = await activityEntry_default.find({
        student: studentId,
        rotation: rotationId,
        approvalStatus: "approved"
      }).populate("unit", "name department umbrellaCategory").populate("approvedBy", "name designation").sort({ entryDate: 1 });
      return { success: true, entries };
    } catch (error) {
      console.error("Error fetching logbook:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch logbook."
      };
    }
  }
};
var activityLogbookService_default = new ActivityLogbookService();

// src/controllers/activityEntry.ts
import mongoose33 from "mongoose";
var createActivityEntry = async (req, res) => {
  try {
    const { student, rotation, unit, umbrellaCategory, entryDate, clinicsAttended, wardRoundsAttended, callDutyCompleted, surgicalMetrics, medicalMetrics, notes } = req.body;
    const studentId = student || req.user?._id;
    if (!studentId) {
      return res.status(400).json({ error: "Student ID is required." });
    }
    const result = await activityLogbookService_default.submitActivityEntry({
      student: studentId,
      rotation,
      unit,
      umbrellaCategory,
      entryDate,
      clinicsAttended,
      wardRoundsAttended,
      callDutyCompleted,
      surgicalMetrics,
      medicalMetrics,
      notes
    });
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    return res.status(201).json({ message: "Activity entry submitted successfully.", entryId: result.entryId });
  } catch (error) {
    console.error("Error creating activity entry:", error);
    return res.status(500).json({ error: "Failed to create activity entry." });
  }
};
var getPendingEntries = async (req, res) => {
  try {
    const staffId = req.user?._id;
    if (!staffId) {
      return res.status(401).json({ error: "Unauthorized." });
    }
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = parseInt(req.query.skip) || 0;
    const result = await activityLogbookService_default.getPendingEntriesForStaff(staffId, limit, skip);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    return res.status(200).json({ entries: result.entries, total: result.total });
  } catch (error) {
    console.error("Error fetching pending entries:", error);
    return res.status(500).json({ error: "Failed to fetch pending entries." });
  }
};
var getStudentLogbook = async (req, res) => {
  try {
    const { studentId, rotationId } = req.params;
    const result = await activityLogbookService_default.getStudentRotationLogbook(studentId, rotationId);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    return res.status(200).json({ entries: result.entries });
  } catch (error) {
    console.error("Error fetching logbook:", error);
    return res.status(500).json({ error: "Failed to fetch logbook." });
  }
};
var approveActivityEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const staffId = req.user?._id;
    const userRole2 = req.user?.role;
    if (!staffId) {
      return res.status(401).json({ error: "Unauthorized." });
    }
    if (userRole2 !== "unitconsultant" && userRole2 !== "unitresident") {
      return res.status(403).json({ error: "Only clinical staff can approve entries." });
    }
    const approverRole = userRole2 === "unitconsultant" ? "CONSULTANT" : "RESIDENT";
    const result = await activityLogbookService_default.approveActivityEntry(entryId, staffId, approverRole);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    return res.status(200).json({ message: "Activity entry approved successfully." });
  } catch (error) {
    console.error("Error approving activity entry:", error);
    return res.status(500).json({ error: "Failed to approve activity entry." });
  }
};
var rejectActivityEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const { rejectionReason } = req.body;
    const staffId = req.user?._id;
    const userRole2 = req.user?.role;
    if (!staffId) {
      return res.status(401).json({ error: "Unauthorized." });
    }
    if (userRole2 !== "unitconsultant" && userRole2 !== "unitresident") {
      return res.status(403).json({ error: "Only clinical staff can reject entries." });
    }
    if (!rejectionReason) {
      return res.status(400).json({ error: "Rejection reason is required." });
    }
    const result = await activityLogbookService_default.rejectActivityEntry(entryId, staffId, rejectionReason);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    return res.status(200).json({ message: "Activity entry rejected." });
  } catch (error) {
    console.error("Error rejecting activity entry:", error);
    return res.status(500).json({ error: "Failed to reject activity entry." });
  }
};
var getActivityEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    if (!mongoose33.Types.ObjectId.isValid(entryId)) {
      return res.status(400).json({ error: "Invalid entry ID." });
    }
    const entry = await activityEntry_default.findById(entryId).populate("student", "name email idNumber").populate("rotation", "rotationName rotationType rotationUnit").populate("unit", "name department umbrellaCategory").populate("approvedBy", "name designation");
    if (!entry) {
      return res.status(404).json({ error: "Activity entry not found." });
    }
    return res.status(200).json({ entry });
  } catch (error) {
    console.error("Error fetching activity entry:", error);
    return res.status(500).json({ error: "Failed to fetch activity entry." });
  }
};
var listActivityEntries = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = parseInt(req.query.skip) || 0;
    const status = req.query.status;
    const studentId = req.query.studentId;
    const unitId = req.query.unitId;
    const filter = {};
    if (status) filter.approvalStatus = status;
    if (studentId) filter.student = studentId;
    if (unitId) filter.unit = unitId;
    const total = await activityEntry_default.countDocuments(filter);
    const entries = await activityEntry_default.find(filter).populate("student", "name email").populate("unit", "name department").populate("approvedBy", "name designation").sort({ entryDate: -1 }).limit(limit).skip(skip);
    return res.status(200).json({ entries, total, page: Math.floor(skip / limit) + 1, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error listing activity entries:", error);
    return res.status(500).json({ error: "Failed to list activity entries." });
  }
};

// src/routes/activityEntry.ts
var router4 = Router4();
router4.post("/", protect, createActivityEntry);
router4.get("/", protect, authorize(["admin", "teacher"]), listActivityEntries);
router4.get("/pending", protect, authorize(["unitconsultant", "unitresident"]), getPendingEntries);
router4.get("/:entryId", protect, getActivityEntry);
router4.get("/logbook/:studentId/:rotationId", protect, getStudentLogbook);
router4.post("/:entryId/approve", protect, authorize(["unitconsultant", "unitresident"]), approveActivityEntry);
router4.post("/:entryId/reject", protect, authorize(["unitconsultant", "unitresident"]), rejectActivityEntry);
var activityEntry_default2 = router4;

// src/controllers/mordred.ts
import "express";
import mongoose36 from "mongoose";

// src/models/mordredMessenger.ts
import mongoose34, { Schema as Schema22 } from "mongoose";
var MordredMessageSchema = new Schema22({
  user_id: { type: mongoose34.Schema.Types.ObjectId, ref: "User", required: true },
  chat_token: { type: String, default: null },
  sender: { type: String, enum: ["student", "mordred_ai", "staff"], required: true },
  text: { type: String, required: true },
  is_saved: { type: Boolean, default: false },
  expires_at: { type: Date, default: () => new Date(Date.now() + 12 * 60 * 60 * 1e3) }
  // 12 Hours from now
}, { timestamps: true });
MordredMessageSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
var MordredMessage = mongoose34.model("MordredMessage", MordredMessageSchema);
var mordredMessenger_default = MordredMessage;

// src/controllers/mordred.ts
init_mordredEngine();
init_client();
init_attendance();
import { createGoogleGenerativeAI as createGoogleGenerativeAI2 } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

// src/models/mordredLog.ts
import mongoose35, { Schema as Schema23 } from "mongoose";
var MordredLogSchema = new Schema23({
  logType: { type: String, enum: ["API_FAILURE", "SYSTEM_METRIC"], required: true },
  message: { type: String, required: true },
  details: { type: String, required: true },
  resolved: { type: Boolean, default: false }
}, { timestamps: true });
var mordredLog_default = mongoose35.model("MordredLog", MordredLogSchema);

// src/controllers/mordred.ts
init_user();

// src/utils/mordredFallback.ts
var buildMordredFallbackResponse = (reason, message2, studentContext2, userRole2) => {
  const department = studentContext2?.department ? ` for ${String(studentContext2.department)}` : "";
  const roleHint = userRole2 === "student" ? "I\u2019ve noted your message and can help again once the service is back." : "I\u2019ve noted your request and can assist again once the service is back.";
  return {
    _id: `mordred-fallback-${Date.now()}`,
    sender: "mordred_ai",
    text: `I\u2019m unable to reach the AI service right now, so I\u2019m falling back to a safe response.${department} Reason: ${reason || "the chat service is temporarily unavailable"}. Your message "${message2}" was received. ${roleHint}`,
    is_ticket_created: false,
    systemAction: void 0,
    fallbackUsed: true
  };
};

// src/controllers/mordred.ts
var permittedInsightRoles = /* @__PURE__ */ new Set(["admin", "teacher", "unitconsultant", "unitresident", "parent"]);
var systemActionType = z.enum([
  "NONE",
  "UPDATE_PROFILE",
  "REQUEST_ROLE_CHANGE",
  "CREATE_USER",
  "DELETE_USER",
  "SEND_ALERT",
  "ESCALATE_TO_ADMIN"
]);
var isAdminRole = (role) => String(role ?? "").trim().toLowerCase() === "admin";
var isInsightRole = (role) => permittedInsightRoles.has(String(role ?? "").trim().toLowerCase());
var handleAdminSystemAction = async (action, user) => {
  if (!action || action.actionType === "NONE") return "";
  console.log(`MORDRED system action requested by admin ${user?.email || user?._id}:`, action);
  switch (action.actionType) {
    case "UPDATE_PROFILE":
      return ` System action prepared: update profile request recorded.`;
    case "REQUEST_ROLE_CHANGE":
      return ` System action prepared: role change request recorded.`;
    case "CREATE_USER":
      return ` System action prepared: user creation workflow flagged.`;
    case "DELETE_USER":
      return ` System action prepared: user deletion workflow flagged.`;
    case "SEND_ALERT":
      return ` System action prepared: alert dispatch request recorded.`;
    case "ESCALATE_TO_ADMIN":
      return ` System action prepared: escalation workflow queued.`;
    default:
      return "";
  }
};
var saveChatMessage = async (req, res) => {
  try {
    const { messageId, uniqueToken } = req.body;
    const savedLog = await mordredMessenger_default.findOneAndUpdate(
      {
        _id: messageId,
        user_id: req.user._id
      },
      // Ensure the student owns this message
      {
        $set: {
          is_saved: true,
          chat_token: uniqueToken,
          expires_at: null
          // Setting to null clears the TTL deletion timer completely
        }
      },
      { returnDocument: "after" }
    );
    if (!savedLog) return res.status(404).json({ message: "Message link not found." });
    return res.status(200).json({ success: true, message: "Secured by MORDRED." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
var mordredsWords = async (req, res) => {
  try {
    const { message: message2, studentContext: studentContext2 } = req.body;
    const userRole2 = String(req.user?.role ?? "").trim().toLowerCase();
    const canExecuteSystemActions = isAdminRole(userRole2);
    const apiKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      console.warn("\u26A0\uFE0F MORDRED Configuration Warning: AI credentials are missing. Using fallback response.");
      return res.status(200).json(
        buildMordredFallbackResponse(
          "missing credentials",
          message2,
          studentContext2,
          userRole2
        )
      );
    }
    try {
      const googleAI = createGoogleGenerativeAI2({ apiKey });
      const activeModel = googleAI(process.env.MORDRED_MODEL || "gemini-2.0-flash");
      const { object: mordredDecision } = await generateObject({
        model: activeModel,
        system: `
        You are MORDRED (Medlog Operational Rotation, Dialogue, & Record Engagement Director).
        Your persona is a vigilant, polite, and clinically precise digital steward.
        
        Your job is to read student messages and do one of two things:
        1. ANSWER directly if it's a general question about medical school policies, rotations, or tips.
        2. ESCALATE by creating a ticket if they are reporting a software bug, hardware issue, missing attendance logs, or a direct complaint that requires human admin intervention.
        // We provide a strict schema to ensure MORDRED's responses are machine-readable and actionable and also limit the scope of the AI's responses to avoid hallucinations or irrelevant answers, and each student can only have one active ticket at a time, so MORDRED should check for existing tickets before creating a new one. and Limit ANSWERS to 5 per student per day to avoid spam and ensure quality responses.
        3. The schema is designed to ensure that MORDRED's responses are structured and actionable, allowing the backend to process them effectively.
        4. If the student is asking about attendance, logbook issues, or timetable conflicts, MORDRED should always escalate to a human staff member and not attempt to answer directly.
        5. If the student is asking about general questions, MORDRED should answer directly and not escalate.
        6. If the student is asking about a bug or issue, MORDRED should escalate to a human staff member and not answer directly.
        7. If the student is asking about a timetable conflict, MORDRED should escalate to a human staff member and not answer directly.
        8. MORDRED should always be polite, professional, and concise in its responses, and should never provide medical advice or diagnosis.
        9. MORDRED should always check for existing tickets before creating a new one, and should only create a new ticket if there are no existing tickets for the student.
        10. MORDRED should always limit ANSWERS to 5 per student per day to avoid spam and ensure quality responses.
        
        user: 
        User ID: ${req.user._id}. 
        User Name: ${req.user.name}. 
        User Email: ${req.user.email}. 
        User Role: ${userRole2}. 
        User Permissions: ${canExecuteSystemActions ? "admin system actions allowed" : "non-admin profile/role requests only"}. 
        Student Department: ${studentContext2.department}. 
        Student Rotation Unit: ${studentContext2.rotationUnit}. 
        Student Rotation Start Date: ${studentContext2.rotationStartDate}. 
        Student Rotation End Date: ${studentContext2.rotationEndDate}.,
        input: 'Student says: "${message2}". Student Current Rotation Context: ${JSON.stringify(studentContext2)}.',
        `,
        schema: z.object({
          reply: z.string().describe("Your conversational response back to the student."),
          shouldEscalate: z.boolean().describe("Set to true ONLY if a human staff member needs to fix a bug, logbook issue, or attendance error."),
          issueCategory: z.enum(["NONE", "ATTENDANCE_BUG", "LOGBOOK_ERROR", "TIMETABLE_CONFLICT", "OTHER"]).describe("The classification category of the problem."),
          systemAction: z.object({
            actionType: systemActionType,
            details: z.string().optional()
          }).optional().describe("Structured system action request. Only admins may execute real system actions.")
        }),
        prompt: `Student says: "${message2}". Student Current Rotation Context: ${JSON.stringify(studentContext2)}`
      });
      const systemAction = mordredDecision.systemAction ?? { actionType: "NONE" };
      if (!canExecuteSystemActions && systemAction.actionType !== "NONE") {
        mordredDecision.reply = `As a non-admin user, I cannot execute system-level changes. ${mordredDecision.reply}`;
        systemAction.actionType = "NONE";
        systemAction.details = void 0;
      }
      if (mordredDecision.shouldEscalate) {
        try {
          const assignedStaff = await routeTaskToStaff(
            studentContext2.department,
            "is_available_for_escalations",
            req.user._id
          );
          await inngest.send({
            name: "mordred/ticket.created",
            data: {
              ticketId: req.user._id,
              departmentName: studentContext2.department,
              assignedTo: assignedStaff?._id || "SUPER_ADMIN"
            }
          });
          mordredDecision.reply += ` [System Notice: I have flagged this anomaly and routed a ticket to ${assignedStaff?.name || "the admin desk"}.]`;
          const actorName = "MORDRED AI";
          const requestedBy = req.user?.name || req.user?.email || "A user";
          const notificationMessage = `MORDRED flagged an anomaly for ${requestedBy} and routed a ticket to ${assignedStaff?.name || "the admin desk"}.`;
          const adminUsers = await user_default.find({ role: "admin", isActive: true }).select("_id").lean();
          if (adminUsers.length > 0) {
            await Promise.all(
              adminUsers.map(
                (admin) => createNotificationIfUnique({
                  userId: admin._id,
                  role: "admin",
                  title: "MORDRED Alert: Anomaly Ticket Routed",
                  message: notificationMessage,
                  type: "system",
                  actorName,
                  actorRole: "admin",
                  metadata: {
                    studentId: req.user?._id,
                    assignedStaffId: assignedStaff?._id,
                    issueCategory: mordredDecision.issueCategory
                  }
                })
              )
            );
          }
        } catch (escalationError) {
          console.error("\u26A0\uFE0F MORDRED escalation flow failed, continuing with fallback response.", escalationError);
        }
      }
      let adminActionNote = "";
      if (canExecuteSystemActions && systemAction.actionType !== "NONE") {
        adminActionNote = await handleAdminSystemAction(systemAction, req.user);
      }
      return res.status(200).json({
        _id: new mongoose36.Types.ObjectId(),
        sender: "mordred_ai",
        text: `${mordredDecision.reply}${adminActionNote}`.trim(),
        is_ticket_created: mordredDecision.shouldEscalate,
        systemAction: canExecuteSystemActions ? systemAction : void 0
      });
    } catch (error) {
      console.error("\u26A0\uFE0F MORDRED AI request failed, returning a safe fallback response.", error);
      return res.status(200).json(
        buildMordredFallbackResponse(
          error?.message || "AI request failed",
          message2,
          studentContext2,
          userRole2
        )
      );
    }
  } catch (error) {
    if (error.message.includes("API key") || error.message.includes("identity")) {
      await mordredLog_default.create({
        logType: "API_FAILURE",
        message: "Google Gemini Authentication Failure",
        details: error.message
      });
    }
    return res.status(200).json(buildMordredFallbackResponse(error?.message || "unexpected error", message, studentContext, userRole));
  }
};
var trackMordredPerformance = async (req, res) => {
  try {
    const staffMetrics = await user_default.aggregate([
      { $match: { role: { $in: ["teacher", "unitconsultant", "unitresident"] } } },
      {
        $group: {
          _id: null,
          totalActiveLoad: { $sum: "$mordred_rules.current_active_load" },
          totalCapacity: { $sum: "$mordred_rules.max_ticket_capacity" }
        }
      }
    ]);
    const automaticReplies = await mordredMessenger_default.countDocuments({ is_saved: false });
    const escalatedSavedTickets = await mordredMessenger_default.countDocuments({ is_saved: true });
    const criticalFailures = await mordredLog_default.find({ logType: "API_FAILURE", resolved: false }).sort({ createdAt: -1 });
    return res.status(200).json({
      automationScore: automaticReplies,
      escalationScore: escalatedSavedTickets,
      currentStaffWorkload: staffMetrics[0] || { totalActiveLoad: 0, totalCapacity: 0 },
      criticalFailures
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
var dynamicAIInsights = async (req, res) => {
  try {
    const userRole2 = String(req.user?.role ?? "").trim().toLowerCase();
    if (!isInsightRole(userRole2)) {
      return res.status(403).json({ message: "Access denied. MORDRED insights are only available to admin, teacher, unitconsultant, unitresident, and parent users." });
    }
    const dynamicInsights = [];
    const criticalFailures = await mordredLog_default.find({ logType: "API_FAILURE", resolved: false }).limit(2);
    for (const failure of criticalFailures) {
      dynamicInsights.push({
        id: failure._id.toString(),
        type: "CRITICAL",
        targetUser: "System Admin",
        message: `System Anomaly: ${failure.message} (${failure.details})`,
        timestamp: "Just Now"
      });
    }
    const lowAttendanceStudents = await user_default.find({
      role: "student",
      isActive: true,
      "attendance_percentage.clinical": { $lt: 75 }
    }).limit(2).select("name attendance_percentage department");
    for (const student of lowAttendanceStudents) {
      const attendanceClinical = student.attendance_percentage?.clinical ?? "unknown";
      dynamicInsights.push({
        id: student._id.toString(),
        type: "WARNING",
        targetUser: "Clinical Coordinators",
        message: `Attendance Alert: ${student.name}'s clinical attendance in ${student.department || "Wards"} has dropped to ${attendanceClinical}%. Action required.`,
        timestamp: "Calculated Recently"
      });
    }
    const missedRotationsCount = await attendance_default.countDocuments({
      status: "absent",
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1e3) }
      // Past 24 hours
    });
    if (missedRotationsCount > 0) {
      dynamicInsights.push({
        id: "missed_rotation_summary",
        type: "INFO",
        targetUser: "Faculty Records",
        message: `Logbook Audit: ${missedRotationsCount} mandatory clinical rotation check-ins were missed by students today.`,
        timestamp: "Daily Summary"
      });
    }
    if (dynamicInsights.length === 0) {
      dynamicInsights.push({
        id: "clean_slate",
        type: "INFO",
        targetUser: "All Staff",
        message: "MORDRED Engine Audit complete. No system flags, lecture absences, or attendance warnings detected.",
        timestamp: "Just Now"
      });
    }
    return res.status(200).json({ insights: dynamicInsights });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// src/routes/mordred.ts
import express14 from "express";

// src/services/whatsappGateway.ts
import path from "path";
import { createRequire } from "module";
var qrcode = require2("qrcode-terminal");
var require2 = createRequire(import.meta.url);
var sessionDataPath = path.resolve(process.cwd(), "mordred_whatsapp_session");
var isGatewayReady = false;
var gatewayInitialization = null;
var resolveGatewayReady = null;
var rejectGatewayReady = null;
var Client;
var LocalAuth;
try {
  const whatsappModule = require2("whatsapp-web.js");
  Client = whatsappModule.Client;
  LocalAuth = whatsappModule.LocalAuth;
} catch (error) {
  console.warn("\u26A0\uFE0F MORDRED WhatsApp Gateway disabled: unable to load whatsapp-web.js", error);
}
var client = Client && LocalAuth ? new Client({
  authStrategy: new LocalAuth({ dataPath: sessionDataPath }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
      "--single-process"
    ]
  }
}) : null;
var initializeGateway = async () => {
  if (gatewayInitialization) return gatewayInitialization;
  gatewayInitialization = new Promise((resolve, reject) => {
    resolveGatewayReady = resolve;
    rejectGatewayReady = reject;
    setTimeout(() => {
      reject(new Error("WhatsApp gateway initialization timed out."));
    }, 3e4);
  });
  if (!client) {
    const error = new Error("WhatsApp gateway is unavailable in this environment.");
    console.warn("\u26A0\uFE0F", error.message);
    rejectGatewayReady?.(error);
    return gatewayInitialization;
  }
  try {
    client.initialize();
  } catch (error) {
    console.error("\u274C Failed to initialize MORDRED WhatsApp Gateway:", error.message || error);
    rejectGatewayReady?.(error instanceof Error ? error : new Error(String(error)));
  }
  return gatewayInitialization;
};
var recoverGateway = async (reason) => {
  console.warn(`\u26A0\uFE0F MORDRED WhatsApp Gateway disconnected. Reason: ${reason}`);
  isGatewayReady = false;
  if (!client) return;
  try {
    await client.destroy();
  } catch (destroyError) {
    console.warn("\u26A0\uFE0F Failed to destroy WhatsApp client cleanly:", destroyError);
  }
  setTimeout(() => {
    console.log("\u{1F501} Attempting to restart MORDRED WhatsApp Gateway...");
    initializeGateway();
  }, 5e3);
};
if (client) {
  client.on("qr", (qr) => {
    console.log("\u2694\uFE0F MORDRED WhatsApp Gateway activation required. Scan this QR code:");
    qrcode.generate(qr, { small: true });
  });
  client.on("ready", () => {
    isGatewayReady = true;
    console.log("\u{1F4E1} MORDRED WhatsApp Gateway successfully deployed and online.");
    resolveGatewayReady?.();
    resolveGatewayReady = null;
    rejectGatewayReady = null;
  });
  client.on("auth_failure", (message2) => {
    isGatewayReady = false;
    console.error("\u274C MORDRED WhatsApp authentication failed:", message2);
  });
  client.on("disconnected", async (reason) => {
    await recoverGateway(reason || "unknown");
  });
  client.on("change_state", (state) => {
    console.log(`\u{1F504} MORDRED WhatsApp Gateway state changed: ${state}`);
  });
  client.on("error", async (error) => {
    console.error("\u274C MORDRED WhatsApp Gateway internal error:", error?.message || error);
    if (String(error).includes("Execution context was destroyed")) {
      await recoverGateway("execution-context-destroyed");
    }
  });
}
var ensureGatewayReady = async () => {
  if (!isGatewayReady) {
    await initializeGateway();
  }
  return isGatewayReady;
};
async function sendMordredWhatsAppAlert(target, message2) {
  try {
    await ensureGatewayReady();
    if (!isGatewayReady) {
      throw new Error("WhatsApp gateway is not ready. Please wait for the client to connect.");
    }
    if (target.includes("://whatsapp.com")) {
      const inviteCode = target.split("://whatsapp.com/")[1]?.split(" ")[0];
      if (!inviteCode) throw new Error("Invalid WhatsApp Group Link Profile provided.");
      const groupId = await client.acceptInvite(inviteCode);
      await client.sendMessage(groupId, message2);
      console.log(`\u{1F4AC} MORDRED group broadcast successful.`);
      return true;
    }
    const cleanNumber = target.replace(/[^0-9]/g, "");
    if (!cleanNumber) throw new Error("Invalid destination phone number.");
    const formattedId = `${cleanNumber}@c.us`;
    await client.sendMessage(formattedId, message2);
    console.log(`\u{1F4AC} MORDRED individual text message delivered to: ${formattedId}`);
    return true;
  } catch (error) {
    console.error("\u274C MORDRED WhatsApp Pipeline Exception Error:", error?.message || error);
    if (String(error?.message || error).includes("Execution context was destroyed")) {
      await recoverGateway("execution-context-destroyed");
    }
    return false;
  }
}

// src/routes/mordred.ts
var mordredAIRouter = express14.Router();
mordredAIRouter.post(
  "/save-message",
  protect,
  saveChatMessage
);
mordredAIRouter.post(
  "/chat/handle",
  protect,
  mordredsWords
);
mordredAIRouter.get(
  "/admin/diagnostics",
  protect,
  authorize(["admin"]),
  trackMordredPerformance
);
mordredAIRouter.get(
  "/insights",
  protect,
  authorize(["admin", "teacher", "unitconsultant", "unitresident", "parent"]),
  dynamicAIInsights
);
mordredAIRouter.post(
  "/test-whatsapp",
  async (req, res) => {
    const { destination, alertText } = req.body;
    if (!destination || !alertText) {
      return res.status(400).json({ error: "Missing destination phone/link details or alert texts variables." });
    }
    const deliveryStatus = await sendMordredWhatsAppAlert(destination, alertText);
    if (deliveryStatus) {
      return res.status(200).json({ success: true, message: "Alert processed by MORDRED WhatsApp Gateway routing rules." });
    } else {
      return res.status(500).json({ success: false, error: "Gateway transaction pipeline crash." });
    }
  }
);
var mordred_default = mordredAIRouter;

// src/server.ts
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
dotenv.config();
var app = express15();
var PORT = process.env.PORT || 5e3;
var isVercelRuntime = Boolean(process.env.VERCEL || process.env.VERCEL_URL || process.env.NOW_REGION);
app.use(helmet());
app.use(express15.json());
app.use(express15.urlencoded({ extended: true }));
app.use(cookieParser());
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
var allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "https://localhost:5173",
  "http://127.0.0.1:5173",
  "https://127.0.0.1:5173"
].filter((origin) => origin !== void 0 && origin !== "");
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is healthy!" });
});
app.use("/api/users", user_default2);
app.use("/api/activities", activitieslog_default2);
app.use("/api/academic-years", academicYear_default2);
app.use("/api/academic-clocks", academicClock_default2);
app.use("/api/classes", classes_default2);
app.use("/api/courses", courses_default2);
app.use("/api/timetables", timetable_default2);
app.use("/api/exams", exam_default2);
app.use("/api/dashboard", dashboard_default);
app.use("/api/attendance", attendance_default2);
app.use("/api/notifications", notification_default);
app.use("/api/og-ped-rotations", for500LevelPostings_default);
app.use("/api/rotation-schedules", rotationSchedules_default);
app.use("/api/logbook-entries", logbookEntry_default2);
app.use("/api/hospital-data", hospitalData_default);
app.use("/api/activity-entries", activityEntry_default2);
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [generateTimeTable, generateExam, generateAttendance, bulkCreateUsers, rotationNotify]
  })
);
app.use("/api/mordred", mordred_default);
app.use((err, req, res, next) => {
  console2.error(err.stack);
  res.status(500).json({ status: "Error!", message: err.message });
});
if (!isVercelRuntime) {
  connectDB().then(async () => {
    app.listen(PORT, () => {
      console2.log(`Server is running on http://localhost:${PORT}`);
    });
  }).catch((error) => {
    console2.error("Failed to connect to the database:", error);
  });
} else {
  connectDB().catch((error) => {
    console2.error("Failed to connect to the database on Vercel startup:", error);
  });
}
var server_default = app;

// api/index.ts
var handler = serverless(server_default);
var index_default = handler;
export {
  index_default as default,
  handler
};
