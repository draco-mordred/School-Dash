import mongoose from "mongoose";
import { inngest } from "./index";
import ClassModel from "../models/classes";
import User from "../models/user";
import Timetable from "../models/timetable";
import Exam from "../models/exam";

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
        .filter((teacher) => {
          if(!teacher.teacherSubject) return false;
          return teacher.teacherSubject.some((subId) => classCourseIds.includes(subId.toString()));
        })
        .map((tea) => ({
          id: String(tea._id),
          idNumber: tea.idNumber,
          name: tea.name,
          subjects: tea.teacherSubject?.map((subId: any) => String(subId)) ?? [],
        }))
      const subjectsPayload = classData.courses.map((course: any) => ({
        id: course._id,
        name: course.name,
        code: course.code,
      }))
      return {
        className: classData.name,
        subjects: subjectsPayload,
        teachers: qualifiedTeachers,
      }
    });

    // Timetable generation logic would go here
    const aiExam = await step.run("generate-timetable-logic", async () => {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if(!apiKey) {
        throw new NonRetriableError("GOOGLE_GENERATIVE_AI_API_KEY is missing! (!-_-)")
      }

      const allTimeTables = await Timetable.find({ 
        academicYear: academicYearIdValue,
      })

      const prompt = `
      You are a scheduler the University Timetable Scheduler. 
      Generate a weekly timetable (Monday to Friday).

      CONTEXT:
      - Class: ${contextData.className}
      - Hours: ${settings.startTime} to ${settings.endTime} (Total ${settings.periods} periods per day).

      RESOURCES:
      - Subjects: ${JSON.stringify(contextData.subjects)}
      - Teachers: ${JSON.stringify(contextData.teachers)}
      - Other Timetables: ${JSON.stringify(allTimeTables)}

      STRICT RULES:
   
      1. Assign a Teacher to every Subject period.
      2. Teacher MUST have the subject ID in the in list.
      3. Break Time/free period after every 2 periods(10 minutes), Lunch time after 5 periods (at 12:00)(30 minutes).
      4. Avoid clashes with other classes (teacher cannot be in two classes at the same time).
      5. OUTPUT strict JSON only. Schema:
      {
        "schedule": [
          {
            "day": "Monday",
            "periods": [
            { "subjectId": "SUBJECT_ID", "teacher": "TEACHER._id", "startTime": "HH:MM", "endTime": "HH:MM" }
            ]
          }
        ]
      }
      Use the teacher's idNumber from the teacher list as teacherId, and preserve the generated teacherId exactly in the saved timetable.
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

      await Timetable.create({
        class: classIdValue,
        academicYear: academicYearIdValue,
        schedule: aiExam.schedule,
      });

      // const timetable = await Timetable.findOne({
      //   class: classIdValue,
      //   academicYear: academicYearIdValue,
      // })
      //   .populate("schedule.periods.subject", "name code")
      //   .populate("schedule.periods.teacher", "name email idNumber");

      // if (!timetable) {
      //   throw new NonRetriableError("Failed to save timetable");
      // }

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