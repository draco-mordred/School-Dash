import { inngest } from "./index";
import ClassModel from "../models/classes";
import User from "../models/user";
import Timetable from "../models/timetable";

import { NonRetriableError } from "inngest";
import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { generateText } from "ai";
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
      const allTeachersAndLecturers = await User.find({ role: "teacher"});

      // Filter qualified teachers for class courses
      const classCourseIds = classData.courses.map((course) => course._id.toString());

      const qualifiedTeachers = allTeachersAndLecturers
        .filter((teacher) => {
          if(!teacher.teacherSubject) return false;
          return teacher.teacherSubject.some((subId) => classCourseIds.includes(subId.toString()));
        })
        .map((tea) => ({
          id: tea._id,
          name: tea.name,
          subjects: tea.teacherSubject,
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
    const aiSchedule = await step.run("generate-timetable-logic", async () => {
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
            { "name": "SUBJECT_NAME", "subjectId": "SUBJECT_ID", "teacherId": "TEACHER_ID", "startTime": "HH:MM", "endTime": "HH:MM" }
            ]
          }
        ]
      }
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

    await step.run("save-timetable", async () => {
      await Timetable.findOneAndDelete({
        class: classIdValue,
        academicYear: academicYearIdValue,
      });

      await Timetable.create({
        class: classIdValue,
        academicYear: academicYearIdValue,
        schedule: aiSchedule.schedule,
      });
      return { success: true, classId }
    });
    // return { contextData, aiSchedule };
    return { success: true, message: "Timetable generated successfully", data: { contextData, aiSchedule } };
  }
)

// Add the function to the exported array:
// export const functions = [
//   helloWorld
// ]