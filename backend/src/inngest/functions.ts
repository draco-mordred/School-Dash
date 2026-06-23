import mongoose from "mongoose";
import { inngest } from "./client";
import ClassModel from "../models/classes";
import User from "../models/user";
import Timetable from "../models/timetable";
import Exam from "../models/exam";
import Course from "../models/courses";
import Attendance from "../models/attendance";
import { NonRetriableError } from "inngest";
import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { generateText } from "ai";
import { logActivity } from "../utils/activitieslog";
// import { count } from "node:console";
// export const inngest = new Inngest({ id: "my-app"});
interface GenSettings {
  startTime: string;
  endTime: string;
  periods: number;
}
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

      // Filter qualified teachers for class courses
      const classCourseIds = classData.courses.map((course) => course._id.toString());

      // [
      //   "6a1aed10b3a7676e968a639d",
      //   "6a1af7f05b5acae623853ecf",
      //   "6a1d5914166b2f94290264d8",
      //   "6a1d6c4c0264bbd574c84664",
      //   "6a1d6cb90264bbd574c84666"
      // ]

      const qualifiedTeachers = allTeachersAndLecturers
        .filter((lecturer) => {
          if(!lecturer.teacherSubject) return false;
          return lecturer.teacherSubject.some((subId) => classCourseIds.includes(subId.toString()));
        })
        .map((tea) => ({
          id: String(tea._id),
          idNumber: tea.idNumber,
          name: tea.name,
          courses: tea.teacherSubject?.map((subId: any) => String(subId)) ?? [],
        }))
      const subjectsPayload = classData.courses.map((course: any) => ({
        id: course._id,
        name: course.name,
        code: course.code,
      }))
      return {
        className: classData.name,
        courses: subjectsPayload,
        lecturers: qualifiedTeachers,
      }
        // Map teacher's subjects to courses for clarity
        const qualifiedLecturers = qualifiedTeachers.map((t: any) => ({
          ...t,
          courses: t.subjects
        }))
        const coursesPayload = classData.courses.map((course: any) => ({
          id: course._id,
          name: course.name,
          code: course.code,
        }))
        return {
          className: classData.name,
          courses: coursesPayload,
          lecturers: qualifiedLecturers,
        }
      });

    // Detect if this is a clinical level class (400 or 500 level)
    const is400Level = /^400\s*level/i.test(contextData.className);
    const is500Level = /^500\s*level/i.test(contextData.className);
    const isClinicalLevel = is400Level || is500Level;
    const clinicalEndTime = is500Level ? "13:00" : "12:00"; // 500 level: 1PM, 400 level: 12PM

    // Timetable generation logic would go here
    const aiSchedule = await step.run("generate-timetable-logic", async () => {
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
            // Handle clinical activities - set subject and lecturer to null
            if (period.courseId === "CLINICAL_ACTIVITIES") {
              return {
                subject: null,
                lecturer: null,
                startTime: period.startTime,
                endTime: period.endTime,
                isClinical: true,
              };
            }
            return {
              subject: new mongoose.Types.ObjectId(period.courseId),
              lecturer: period.lecturer ? new mongoose.Types.ObjectId(period.lecturer) : null,
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
        .populate("schedule.periods.subject", "name code")
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

    const dayMap: Record<number, string> = {
      0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday",
      4: "Thursday", 5: "Friday", 6: "Saturday",
    };
    const dateObj = new Date(date);
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
      const { matchingPeriods } = timetableData;
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
      users: Array<{ name: string; email: string; idNumber?: string; role: string }>;
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

          // If student, also add to class students array
          if (u.role === "student" && classId) {
            const ClassModel = require("../models/classes").default;
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