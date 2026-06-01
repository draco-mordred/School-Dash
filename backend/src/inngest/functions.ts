import { inngest } from "./index";
import ClassModel from "../models/classes";
import Timetable from "../models/timetable";
import User from "../models/user";


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
    const { classId, academicYearId, settings } = event.data as {
      classId: string;
      academicYearId: string;
      settings: GenSettings;
    };
    const contextData = await step.run("fetch-class-context", async () => {
      // Fetch class
      const classData = await ClassModel.findById(classId).populate('courses') as unknown as { courses: any[]; name: string };
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
        academicYear: academicYearId,
      })

      const prompt = `
      You are a scheduler the University of Jos Medical Students' Timetable. 
      Generate a weekly timetable (Monday to Friday) for the class ${contextData.className} based on the following subjects and teachers.
      Each subject should be scheduled for a specific time slot (e.g., 8:00 AM - 10:00 AM) and assigned to one of the qualified teachers. 
      Ensure that there are no scheduling conflicts for teachers or subjects, and that the timetable is balanced throughout the week.
      You have been given the following data:

      CONTEXT:
      - Class: ${contextData.className}
      - Hours: ${settings.startTime} to ${settings.endTime} (Total ${settings.periods} periods per day).

      RESOURCES:
      - Subjects: ${JSON.stringify(contextData.subjects)}
      - Teachers: ${JSON.stringify(contextData.teachers)}
      - Other Timetables: ${JSON.stringify(allTimeTables)}

      STRICT RULES:
      1. Assign a Teacher to every COurse Subject Period.
      2. No Teacher or Subject can have overlapping time slots.
      3. The timetable should be balanced, with subjects distributed evenly throughout the week.
      4. If a valid timetable cannot be generated based on the provided data and constraints, respond with "Unable to generate a valid timetable with the given data and constraints."
      5. Teacher MUST have the course subject ID in their list.
      6. The timetable should be in a printable spreadsheet format - days of the week as ROWS and time slots as COLUMNS, with each cell containing the subject name and assigned teacher.
      7. Break Time/Free Periods is ALWAYS 1:00 PM - 1:30 PM (You can adjust the timetable to accommodate this break, but ensure that no subjects are scheduled during this time slot).
      8. Between 10:00 AM - 1:00 PM, only WARD ROUND ACTIVITIES can be scheduled for the Medical Students, and these should be supervised by a Teacher with the "WARD ROUND" subject in their teacherSubject list. (If there are no teachers with the "WARD ROUND" subject, then leave the space Open on the timetable).
      9. The timetable should be generated for the entire academic year, but you can assume that the same weekly schedule will repeat throughout the year for simplicity.
      10. All COurse subjects must run for at least 2 Hours a day (e.g., 8:00 AM - 10:00 AM) and a maximum of 4 hours a day (e.g., 8:00 AM - 12:00 PM), but you can split the hours into multiple sessions if needed (e.g., 8:00 AM - 10:00 AM and then 1:30 PM - 3:00 PM).
      11. OUTPUT strict JSON only in the following format:
      {
        "schedule": [
          {
            "day": "Monday",
            "periods": [
              { "Subjects": "SUBJECT_ID", "Teacher": "TEACHER_ID",
               "startTime: "HH:MM", "endTime": "HH:MM" }
            ]
          }
        ]
      }
      `;
      const google = createGoogleGenerativeAI({
        apiKey,
      });

      const activeModel = google("gemini-3-flash-preview")

      const {text} = await generateText(google, {
        prompt,
        model: activeModel,
      })

      const cleanJSON = text.replace(/```json/g, "").replace(/```json/g, "")
      return JSON.parse(cleanJSON);

    })
    return { contextData, aiSchedule };
  }
)

// Add the function to the exported array:
// export const functions = [
//   helloWorld
// ]


// Old Code in case the Correction doesnt work

/*
// Your new function:
export const generateTimeTable = inngest.createFunction(
  { id: "Generate-Timetable", 
    triggers: { 
      event: "generate/timetable" 
    } 
  },
  async ({ event, step }) => {
    const { classId, academicYearId, settings } = event.data as {
      classId: string;
      academicYearId: string;
      settings: GenSettings;
    };
    const contextData = await step.run("fetch-class-context", async () => {
      // Fetch class
      const classData = await ClassModel.findById(classId).populate('subjects')
      if (!classData) throw new NonRetriableError(`Class with ID ${classId} not found`);

      // Fetch Teachers/Lecturers
      const allTeachersAndLecturers = await User.find({ role: "teacher" });

      // Filter qualified teachers for class subjects
      const classSubjectsIds = classData.subjects.map((sub) => sub._id.toString());
      const qualifiedTeachers = allTeachersAndLecturers.filter((teacher) => {

        if(!teacher.teacherSubject) return false;
        return teacher.teacherSubject.some((subId) => classSubjectsIds.includes(subId.toString())).map((tea) => ({
          id: tea._id,
          name: tea.name,
          subjects: tea.teacherSubject,
        }));
      })
      const subjectsPayload = classData.subjects.map((sub) => ({
        id: sub._id,
        name: sub.name,
        code: sub.code,
      }))
      return {
        className: classData.name,
        subjects: subjectsPayload,
        teachers: qualifiedTeachers,
      }
    })
    return { contextData };
  }
)
*/ 
