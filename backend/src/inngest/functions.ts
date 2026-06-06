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

    // Timetable generation logic would go here
    const aiSchedule = await step.run("generate-timetable-logic", async () => {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if(!apiKey) {
        throw new NonRetriableError("GOOGLE_GENERATIVE_AI_API_KEY is missing! (!-_-)")
      }

      const allTimeTables = await Timetable.find({ 
        academicYear: academicYearIdValue,
      })

        const prompt = `
        You are a University Timetable Scheduler. 
        Generate a weekly timetable (Monday to Friday).

        CONTEXT:
        - Class: ${contextData.className}
        - Hours: ${settings.startTime} to ${settings.endTime} (Total ${settings.periods} periods per day).

        RESOURCES:
        - Courses: ${JSON.stringify(contextData.courses)}
        - Lecturers: ${JSON.stringify(contextData.lecturers)}
        - Other Timetables: ${JSON.stringify(allTimeTables)}

        STRICT RULES:
   
        1. Assign a Lecturer to every Course period.
        2. Lecturer MUST have the course ID in their courses list.
        3. Break Time/free period after every 2 periods(10 minutes), Lunch time after 5 periods (at 12:00)(30 minutes).
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

      // const mappedSchedule = (aiExam.schedule ?? []).map((day: any) => ({
      //   day: day.day,
      //   periods: (day.periods ?? []).map((period: any) => {
      //     const subject = period.subjectId ?? period.subject;
      //     const requestedTeacher = period.teacherId ?? period.teacher;
      //     const requestedTeacherKey = requestedTeacher != null ? String(requestedTeacher).trim() : undefined;

      //     let teacherObjectId: mongoose.Types.ObjectId | undefined;
      //     let teacherId: string | undefined;

      //     if (requestedTeacherKey) {
      //       const foundTeacher = contextData.teachers.find((t) =>
      //         t.id === requestedTeacherKey || t.idNumber === requestedTeacherKey ||
      //         t.name?.trim().toLowerCase() === requestedTeacherKey.toLowerCase()
      //       );

      //       if (foundTeacher) {
      //         teacherObjectId = new mongoose.Types.ObjectId(foundTeacher.id);
      //         teacherId = foundTeacher.id;
      //       } else {
      //         teacherId = requestedTeacherKey;
      //       }
      //     }

      //     return {
      //       subject,
      //       teacher: teacherObjectId,
      //       teacherId,
      //       startTime: period.startTime,
      //       endTime: period.endTime,
      //     };
      //   }),
      // }));

   
        // Map AI output to MongoDB schema: courseId -> subject, lecturer stays lecturer
        const mappedSchedule = (aiSchedule.schedule ?? []).map((day: any) => ({
          day: day.day,
          periods: (day.periods ?? []).map((period: any) => ({
            subject: period.courseId, // AI uses courseId, MongoDB schema uses subject
            lecturer: period.lecturer, // Keep lecturer as is
            startTime: period.startTime,
            endTime: period.endTime,
          })),
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
        throw new NonRetriableError(`NO_PERIOD: No period found for the selected course on ${dayName}.`);
      }

      return { daySchedule, matchingPeriods };
    });

    // Step 3: Check for duplicate attendance (same class, course, date)
    const duplicateCheck = await step.run("check-duplicate", async () => {
      const startOfDay = new Date(dateObj);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const existing = await Attendance.findOne({
        class: classId,
        course: courseId,
        date: { $gte: startOfDay, $lt: endOfDay },
      });

      if (existing) {
        throw new NonRetriableError(`DUPLICATE: Attendance records already exist for this class, course, and date. Please use the existing list.`);
      }

      return { ok: true };
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