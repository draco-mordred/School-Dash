import mongoose from "mongoose";
import { inngest } from "./client";
import ClassModel from "../models/classes";
import User, { type userRoles } from "../models/user";
import Timetable from "../models/timetable";
import Exam from "../models/exam";
// import Course from "../models/courses";
import Attendance from "../models/attendance";
import { NonRetriableError } from "inngest";
import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { generateText } from "ai";
import { logActivity } from "../utils/activitieslog";
import { build500LevelTimetablePlan, resolve500LevelCourse } from "../utils/500LevelTimetable";
import { routeTaskToStaff } from "../services/mordredEngine";
// import { count } from "node:console";
// export const inngest = new Inngest({ id: "my-app"});
interface GenSettings {
  startTime: string;
  endTime: string;
  periods: number;
}

// const subject = lecturer?.teacherSubject;
// Your new function:
export const generateTimeTable = inngest.createFunction(
  { id: "Generate-Timetable", 
    triggers: { 
      event: "generate/timetable"
    } 
  },
  async ({ event, step }) => {
    const { classId, academicYearId, academicYear, settings } = event.data as {
      classId: string | { _id?: string; id?: string };
      academicYearId?: string;
      academicYear?: string | { _id?: string; id?: string };
      settings: GenSettings;
    };
    const classIdValue = typeof classId === "object"
      ? classId._id ?? classId.id
      : classId;
    const academicYearIdValue = academicYearId ?? (
      typeof academicYear === "object"
        ? academicYear._id ?? academicYear.id
        : academicYear
    );
    if (!classIdValue || !academicYearIdValue) {
      throw new NonRetriableError("classId and academicYearId are required");
    }
    const contextData = await step.run("fetch-class-context", async () => {
      // Fetch class
      const classData = await ClassModel.findById(classIdValue).populate('courses') as unknown as { courses: any[]; name: string };
      if (!classData) throw new NonRetriableError(`Class not found`);

      // Fetch teachers
      const allTeachersAndLecturers = await User.find({ role: "teacher" });

      // In the new model, Class.courses should still refer to top-level Course documents.
      // However, timetable periods should be tied to embedded Course.subjects.
      // For AI purposes we therefore expose *subject* options (not top-level course docs).
      //
      // Attempt to find embedded subjects within each top-level course.
      const topLevelCourses = (classData.courses ?? []) as any[];

      const embeddedSubjects = topLevelCourses.flatMap((c) =>
        ((c?.subjects ?? []) as any[]).map((s) => ({
          id: String(s?.subjectID ?? s?._id),
          name: s?.name,
          code: s?.code,
          // lecturer ids assigned for this subject
          lecturerIds: Array.isArray(s?.lecturer) ? s.lecturer.map((x: any) => String(x)) : [],
        }))
      );

      // Filter qualified teachers against subjects that exist in this class
      const qualifiedTeachers = allTeachersAndLecturers
        .filter((lecturer) => {
          if (!lecturer?.teacherSubject) return false;

          // lecturer.teacherSubject points at Course (legacy). We can still use it
          // to broadly filter teachers, but for subject selection we will rely on lecturerIds.
          return topLevelCourses.some((tc) => lecturer?.teacherSubject.some((subId: any) => String(subId) === String(tc._id)));
        })
        .map((tea) => ({
          id: String(tea._id),
          idNumber: tea.idNumber,
          name: tea.name,
          // AI needs to know which subject ids this teacher can teach.
          // Since we can't reliably derive subject-level permissions here without joining,
          // we provide an empty list and rely on the prompt rules + aiSchedule output.
          courses: [],
        }));

      return {
        className: classData.name,
        // expose embedded subjects as courses for AI naming consistency
        courses: embeddedSubjects.map((s) => ({ id: s.id, name: s.name, code: s.code })),
        lecturers: qualifiedTeachers,
      };
    });

    // Detect if this is a clinical level class (400 or 500 level)
    const is400Level = /^400\s*level/i.test(contextData.className);
    const is500Level = /^500\s*level/i.test(contextData.className);
    const isClinicalLevel = is400Level || is500Level;
    const clinicalEndTime = is500Level ? "13:00" : "12:00"; // 500 level: 1PM, 400 level: 12PM

    // Timetable generation logic would go here
    const aiSchedule = await step.run("generate-timetable-logic", async () => {      if (is500Level) {
        const plan = build500LevelTimetablePlan((settings as any)?.clockPhase, contextData.courses as any[]);
        return {
          schedule: plan.map(({ day, periods }) => ({
            day,
            periods: periods.map((period) => {
              const course = period.courseCode ? resolve500LevelCourse(contextData.courses as any[], period.courseCode) : null;
              return {
                courseId: course?.id ?? null,
                lecturer: null,
                startTime: period.startTime,
                endTime: period.endTime,
                isClinical: period.kind === "clinical",
                isOptional: period.kind === "optional" || period.isOptional,
                displayLabel: period.displayLabel ?? (period.kind === "optional" ? "Optional Activity" : undefined),
              };
            }),
          })),
        };
      }
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if(!apiKey) {
        throw new NonRetriableError("GOOGLE_GENERATIVE_AI_API_KEY is missing! (!-_-)")
      }

      const allTimeTables = await Timetable.find({
        academicYear: academicYearIdValue,
      })

      // Special handling for 400 Level classes with fixed schedule
      let prompt = "";
      
      if (is400Level) {
        // Fixed 400 Level Class Schedule
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
        // Original prompt for non-400 Level classes
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
      const google = createGoogleGenerativeAI({
        apiKey,
      });

      const activeModel = google("gemini-3-flash-preview")
      // List othher active models i can use here
      // const activeModel = google("gemini-2.5-pro")
      // const activeModel = google("gemini-1.5-pro")

      const {text} = await generateText({
        prompt,
        model: activeModel,
      })
      // Parse Response
      const cleanJSON = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .replace(/'''json/g, "")
        .replace(/'''/g, "")
        .replace(/`/g, "")
        .trim();
      return JSON.parse(cleanJSON);
    });

    // Saved Timetable Template
    const savedTimetable = await step.run("save-timetable", async () => {
      await Timetable.findOneAndDelete({
        class: classIdValue,
        academicYear: academicYearIdValue,
      });
   
        // Map AI output to MongoDB schema: courseId -> subject, lecturer stays lecturer
        const mappedSchedule = (aiSchedule.schedule ?? []).map((day: any) => ({
          day: day.day,
          periods: (day.periods ?? []).map((period: any) => {
            // Handle clinical activities placeholder safely
            const courseIdRaw = period?.courseId;
            const courseIdNormalized = typeof courseIdRaw === "string" ? courseIdRaw.trim().toUpperCase() : courseIdRaw;
            if (courseIdNormalized === "CLINICAL_ACTIVITIES") {
              return {
                subject: null,
                lecturer: null,
                startTime: period.startTime,
                endTime: period.endTime,
                isClinical: true,
              };
            }

            // Only create ObjectId when it is a valid 24-hex string.
            // If the model returned something else (name/code), we fail loudly.
            const isValidObjectId = (v: any) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
            if (!isValidObjectId(String(courseIdRaw))) {
              throw new NonRetriableError(`Invalid subject id returned by AI: ${String(courseIdRaw)}`);
            }

            const lecturerRaw = period?.lecturer;
            const lecturerObjId = isValidObjectId(lecturerRaw) ? new mongoose.Types.ObjectId(String(lecturerRaw)) : null;

            return {
              subject: new mongoose.Types.ObjectId(String(courseIdRaw)),
              lecturer: lecturerObjId,
              startTime: period.startTime,
              endTime: period.endTime,
            };
          }),
        }));

        await Timetable.create({
          class: classIdValue,
          academicYear: academicYearIdValue,
          schedule: mappedSchedule,
        });

      const timetable = await Timetable.findOne({
        class: classIdValue,
        academicYear: academicYearIdValue,
      })
        .populate("schedule.periods.subject", "name code subjects.subjectID")
        .populate("schedule.periods.lecturer", "name email idNumber");

      if (!timetable) {
        throw new NonRetriableError("Failed to save timetable");
      }

      return { success: true, classId };
    });
    // return { contextData, aiExam };
    return {
      success: true,
      message: "Timetable generated successfully",
      // timetable: savedTimetable.timetable,
    };
  }
)

//Next generate exam
export const generateExam = inngest.createFunction(
    { id: "Generate-Exam", 
    triggers: { 
      event: "exam/generate"
    } 
  },
  async ({ event, step }) => {
    const { examId, topic, subjectName, difficulty, count } = event.data;
    const aiExam = await step.run("generate-exam-logic", async () => {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if(!apiKey) {
      throw new NonRetriableError("GOOGLE_GENERATIVE_AI_API_KEY is missing! (!-_-)")
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
    const google = createGoogleGenerativeAI({
      apiKey,
    });
    const activeModel = google("gemini-3-flash-preview")
    const {text} = await generateText({
      prompt,
      model: activeModel,
    })
    // Parse Response and Sanitize JSON
    const cleanJSON = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleanJSON);
    });
    // Saved Timetable Template
    await step.run("save-exam", async () => {
      const exam = await Exam.findById(examId);
      if (!exam) {
        throw new NonRetriableError(`Exam ${examId} not found!`);
      }
      //Update the exam with the new questions
      exam.questions = aiExam;
      exam.isActive = false; //Keppe it inactive until teacher reviews it

      await exam.save();

      return { success: true, count: aiExam.length };
    });
    // return { contextData, aiExam };
    return {
      success: true,
      message: "Exam generated successfully",
    };
  }
)

// Add the function to the exported array:
// export const functions = [
//   helloWorld
// ]

// ─── Attendance Generation ────────────────────────────────────────────────────

export const generateAttendance = inngest.createFunction(
  { id: "Generate-Attendance",
    triggers: {
      event: "attendance/generate"
    }
  },
  async ({ event, step }) => {
    const { courseId, classId, academicYearId, date } = event.data as {
      courseId: string;
      classId: string;
      academicYearId: string;
      date: string;
    };

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
      6: "Saturday",
    } as const;
    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) {
      throw new NonRetriableError("Invalid date format");
    }
    const dayName = dayMap[dateObj.getDay()];

    // Reject weekends
    if (dayName === "Saturday" || dayName === "Sunday") {
      throw new NonRetriableError("Attendance cannot be generated on weekends (Saturday/Sunday)");
    }

    // Step 1: Fetch class students
    const classData = await step.run("fetch-class-students", async () => {
      const cls = await ClassModel.findById(classId).populate("students", "_id name");
      if (!cls) throw new NonRetriableError(`Class not found: ${classId}`);
      return cls;
    });

    const studentIds = (classData as any).students.map((s: any) => s._id);

    // Step 2: Fetch timetable for class/academicYear
    const timetableData = await step.run("fetch-timetable-schedule", async () => {
      const timetable = await Timetable.findOne({
        class: classId,
        academicYear: academicYearId,
      }).populate("schedule.periods.subject", "_id name code")
        .populate("schedule.periods.lecturer", "_id name");

      if (!timetable) {
        throw new NonRetriableError(`NO_TIMETABLE: No timetable found for this class. Please generate a timetable first.`);
      }

      const daySchedule = timetable.schedule.find(
        (d: any) => d.day?.toLowerCase() === dayName?.toLowerCase()
      );

      if (!daySchedule) {
        throw new NonRetriableError(`NO_SCHEDULE: No schedule found for ${dayName}. The timetable exists but has no periods on this day.`);
      }

      const courseStr = courseId.toString();
      const matchingPeriods = daySchedule.periods.filter(
        (p: any) => p.subject?._id?.toString() === courseStr
      );

      if (matchingPeriods.length === 0) {
        const availableSubjects = daySchedule.periods
          .map((p: any) => p.subject?.name ?? p.subject?.code ?? "Unknown")
          .filter(Boolean);
        const hint = availableSubjects.length > 0
          ? ` Available courses on ${dayName}: ${[...new Set(availableSubjects)].join(", ")}.`
          : "";
        throw new NonRetriableError(
          `NO_PERIOD: No period found for the selected course on ${dayName}. Please verify the course was added to the ${dayName} schedule in the timetable.${hint}`
        );
      }

      return { daySchedule, matchingPeriods };
    });

    const { matchingPeriods } = timetableData as { matchingPeriods: any[] };

    // Step 3: Remove any existing attendance for this class, course, and date
    const duplicateCheck = await step.run("check-duplicate", async () => {
      const startOfDay = new Date(dateObj);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const deleted = await Attendance.deleteMany({
        class: classId,
        course: courseId,
        date: { $gte: startOfDay, $lt: endOfDay },
      });

      return { deletedCount: deleted.deletedCount };
    });

    // Step 4: Create Attendance records for each student
    const createdRecords = await step.run("create-attendance-records", async () => {
      const lecturer = matchingPeriods[0]?.lecturer?._id ?? null;

      const records = await Promise.all(
        studentIds.map((studentId: mongoose.Types.ObjectId) =>
          Attendance.create({
            student: studentId,
            lecturer,
            course: courseId,
            class: classId,
            academicYear: academicYearId,
            date: dateObj,
            dayOfWeek: dayName,
            status: "present",
          })
        )
      );

      return records;
    });

    // Step 5: Log activity
    await step.run("log-activity", async () => {
      await logActivity({
        userId: (event.data as any).userId ?? "system",
        action: "Generated attendance list",
        details: `Attendance list generated for ${(classData as any).name} on ${new Date(date).toDateString()}, course ${courseId}. ${studentIds.length} student(s).`,
      });
    });

    return {
      success: true,
      message: `Attendance list generated for ${(classData as any).name} on ${dayName}`,
      count: studentIds.length,
    };
  }
);

// ─── Bulk User Upload ─────────────────────────────────────────────────────────

export const bulkCreateUsers = inngest.createFunction(
  { id: "Bulk-Create-Users", triggers: { event: "users/bulk-create" } },
  async ({ event, step }) => {
    const { users, classId, courseIds, userId } = event.data as {
      users: Array<{ name: string; email: string; idNumber?: string; role: userRoles }>;
      classId?: string;
      courseIds?: string[];
      userId?: string;
    };

    if (!users || users.length === 0) {
      throw new NonRetriableError("No users provided.");
    }

    const results = await step.run("bulk-create-users", async () => {
      const created: string[] = [];
      const skipped: string[] = [];
      const errors: string[] = [];

      // Pre-compute a fallback idNumber for each role that might need one
      const rolePrefixes: Record<string, string> = {
        teacher: "UJ0000TE",
        parent: "UJ0000PA",
        admin: "UJ0000AD",
        student: "UJ0000ST",
      };
      const fallbackIdNumbers: Record<string, string> = {};
      for (const [r, prefix] of Object.entries(rolePrefixes)) {
        const lastUser = await User.findOne({ idNumber: { $regex: `^${prefix}` } })
          .sort({ createdAt: -1 })
          .lean();
        if (lastUser && lastUser.idNumber) {
          const num = parseInt(lastUser.idNumber.slice(-4)) + 1;
          fallbackIdNumbers[r] = `${prefix}${num.toString().padStart(4, "0")}`;
        } else {
          fallbackIdNumbers[r] = `${prefix}0001`;
        }
      }

      for (const u of users) {
        try {
          // Use the provided idNumber as-is (any format), or fall back to auto-generated
          const idNumber = u.idNumber?.trim() || (() => {
            // Increment and rebuild a unique fallback idNumber for this user
            const prefixMap: Record<string, string> = { student: "UJ0000ST", teacher: "UJ0000TE", parent: "UJ0000PA", admin: "UJ0000AD" };
            const prefix = prefixMap[u.role] ?? "UJ0000ST";
            const currentNum = parseInt(fallbackIdNumbers[u.role]?.slice(-4) || "0");
            const nextNum = (currentNum + 1).toString().padStart(4, "0");
            fallbackIdNumbers[u.role] = `${prefix}${nextNum}`;
            return fallbackIdNumbers[u.role];
          })();

          // Generate email from name if not provided: "John Doe" → "john.doe@school.edu"
          const email = u.email?.trim() || u.name.toLowerCase().replace(/\s+/g, ".") + "@school.edu";

          // Build role-specific fields
          const studentClasses = u.role === "student" && classId ? classId : undefined;
          const teacherSubject = u.role === "teacher" && courseIds ? courseIds : undefined;

          // Delete existing user if duplicate exists (by idNumber first, then by email)
          if (u.idNumber?.trim()) {
            await User.findOneAndDelete({ idNumber: u.idNumber.trim() });
          }
          await User.findOneAndDelete({ email });

          // Create the new user
          const newUser = await User.create({
            name: u.name,
            email,
            idNumber,
            role: u.role,
            password: "password",
            studentClasses,
            teacherSubject,
          });

          if (!newUser) {
            throw new Error("Failed to create user");
          }

          // If student, also add to class students array
          if (u.role === "student" && classId) {
            await ClassModel.findByIdAndUpdate(classId, { $addToSet: { students: new mongoose.Types.ObjectId(newUser._id) } }, { returnDocument: 'after' });
          }

          created.push(newUser.email);
        } catch (err) {
          errors.push(`'${u.name}': ${(err as Error).message}`);
        }
      }

      return { created, skipped, errors };
    });

    // Log activity
    await step.run("log-activity", async () => {
      await logActivity({
        userId: userId ?? "system",
        action: "Bulk uploaded users",
        details: `Bulk upload: ${results.created.length} created, ${results.skipped.length} skipped, ${results.errors.length} errors.`,
      });
    });

    return {
      success: true,
      created: results.created.length,
      skipped: results.skipped,
      errors: results.errors,
    };
  }
);

// Rotation generation
// export const generateRotations = inngest.createFunction(
//   { id: "Generate-Rotations", 
//     triggers: { 
//       event: "rotation/generate"
//     } 
//   },
//   async ({ event, step }) => {
//     const { academicYearId, classId, level, options, generatedBy } = event.data as any;
//     if (!academicYearId || !classId || !level || !generatedBy) {
//       throw new NonRetriableError("academicYearId, classId, level and generatedBy are required");
//     }

//     const normalizedOptions = { ...(options || {}) };
//     if (normalizedOptions.startDate) {
//       const d = new Date(normalizedOptions.startDate);
//       if (isNaN(d.getTime())) {
//         throw new NonRetriableError("Invalid options.startDate — must be a valid date string or ISO date");
//       }
//       // normalize to ISO date string
//       normalizedOptions.startDate = d.toISOString();
//     }

//     const schedule = await step.run("generate-rotation-schedule", async () => {
//       return await generateRotationSchedule(academicYearId, classId, { ...(normalizedOptions || {}), level, generatedBy });
//     });

//     return { success: true, scheduleId: schedule._id };
//   }
// )

// Process delayed rotation notification events
export const rotationNotify = inngest.createFunction(
  { id: "Rotation-Notify",
    triggers: {
      event: "rotation/notify"
    }
  },
  async ({ event, step }) => {
    const payload = event.data as any;
    if (!payload?.userId || !payload?.title || !payload?.message) {
      throw new NonRetriableError('Invalid notification payload');
    }

    await step.run('create-notification', async () => {
      const { Notification } = await import('../models/notification');
      await Notification.create({
        userId: new mongoose.Types.ObjectId(payload.userId),
        role: 'student',
        title: payload.title,
        message: payload.message,
        type: 'timetable',
        isRead: false,
        link: payload.metadata?.link || null,
        metadata: payload.metadata || {},
      });
      return { ok: true };
    });

    return { success: true };
  }
)
/**
 * JOB 1: Automatic Posting Assignment Engine Notification
 * Triggered when a new clinical rotation posting is released.
 */
export const automaticPostingNotification = inngest.createFunction(
  { id: "Mordred-Auto-Posting-Assignment",
    triggers: {
      event: "mordred/auto-posting-assignment"
    }
  },
  async ({ event, step }) => {

    const { studentId, departmentName, hospitalUnitId } = event.data;

    // 1. Fetch student information
    const student = await step.run("fetch-student-profile", async () => {
      return await User.findById(studentId).select("name email deviceToken");
    });

    if (!student) return { success: false, error: "Student not found" };

    // 2. MORDRED logic automatically assigns a unit supervisor
    const assignedStaff = await step.run("mordred-assign-supervisor", async () => {
      return await routeTaskToStaff(departmentName, "can_approve_logbooks", hospitalUnitId);
    });

    // 3. Trigger notification step (Leveraging your notification tracking models)
    await step.run("send-push-notifications", async () => {
      console.log(`🤖 MORDRED: Posting established. Notified ${student.name}. Supervisor assigned: ${assignedStaff?.name || "None"}`);
      // Integrate your Firebase Cloud Messaging or SMS gateway dispatch here
    });

    return { success: true, supervisorId: assignedStaff?._id };
  }
);

/**
 * JOB 2: The 12-Hour Chat Ticket Escalation Sentry
 * Triggered when MORDRED generates an official support ticket out of a chat session.
 */
export const mordredTicketSentry = inngest.createFunction(
  { id: "Mordred-Ticket-Escalation-Sentry",
    triggers: {
      event: "mordred/ticket-escalation-sentry"
    }
   },
  async ({ event, step }) => {
    const { ticketId, departmentName } = event.data;

    // Wait exactly 12 hours before moving to the next code step execution
    await step.sleep("wait-twelve-hours", "12h");

    // Check if a human staff member took action or closed it
    const structuralAlertNeeded = await step.run("check-ticket-status", async () => {
      const mongoose = require("mongoose");
      // Import dynamically to protect runtime environments
      const Ticket = mongoose.model("mordred_tickets"); 
      const ticket = await Ticket.findById(ticketId);
      
      // If the ticket is still 'OPEN' and unassigned, trigger alert criteria
      return ticket && ticket.status === "OPEN" && !ticket.assigned_staff_id;
    });

    if (structuralAlertNeeded) {
      await step.run("escalate-to-super-admin", async () => {
        console.log(`🚨 MORDRED Sentry: Ticket ${ticketId} remained unresolved for 12 hours. Escalaning to Super Admin.`);
        // Emit system alert dashboard events or high priority email pipelines here
      });
    }

    return { evaluated: true, escalated: structuralAlertNeeded };
  }
);

// Add this step pattern inside backend/src/inngest/functions.ts
export const whatsappLectureAlert = inngest.createFunction(
  { id: "mordred-whatsapp-lecture-alert",
    triggers: { 
      event: "medlog/lecture.updated" 
    },
   },
  
  async ({ event, step }) => {
    const { className, lectureTitle, status, materialUrl, whatsappGroupId } = event.data;

    const compiledAlertString = `🤖 *M.O.R.D.R.E.D. System Update* 🤖\n\n` +
      `📚 *Class:* ${className}\n` +
      `📝 *Lecture:* ${lectureTitle}\n` +
      `⚠️ *Status Change:* ${status.toUpperCase()}\n` +
      `${materialUrl ? `📎 *Materials:* ${materialUrl}` : ""}`;

    await step.run("dispatch-whatsapp-payload", async () => {
      // If using a custom WhatsApp Web Gateway client instance on your server:
      // await whatsappClient.sendMessage(whatsappGroupId, compiledAlertString);
      console.log(`📡 MORDRED broadcasted update directly to WhatsApp Group: ${whatsappGroupId}`);
    });

    return { dispatched: true };
  }
);

// Rotation snapshot scheduled job - runs every 6 hours to persist active window snapshots
export const rotationSnapshotScheduler = inngest.createFunction(
  {
    id: "rotation-snapshot-scheduler",
    triggers: {
      cron: "0 */6 * * *", // every 6 hours
    },
  },
  async ({ step }) => {
    const RotationPlan = (await import("../models/rotationPlan")).default;
    const runRotationSnapshot = (await import("../services/rotationRunner")).default;

    await step.run("process-rotation-snapshots", async () => {
      const now = new Date();
      const plans = await RotationPlan.find({}).lean();
      const results: any[] = [];

      for (const plan of plans) {
        try {
          const planDoc = await RotationPlan.findById(plan._id);
          if (!planDoc) continue;

          const timeline = (planDoc.meta && planDoc.meta.timeline) || [];
          let anyActive = false;

          for (let i = 0; i < timeline.length; i++) {
            const t = timeline[i];
            const start = new Date(t.startDate);
            const end = new Date(t.endDate);
            if (start <= now && now < end) {
              anyActive = true;
              break;
            }
          }

          if (anyActive) {
            const snap = await runRotationSnapshot(String(plan._id), { snapshotTime: now.toISOString() });
            results.push({ planId: plan._id, snapshot: snap });
          }
        } catch (err) {
          console.error("Error processing rotation snapshot for plan", plan._id, err);
        }
      }

      return { processed: results.length, results };
    });

    return { success: true };
  }
);
