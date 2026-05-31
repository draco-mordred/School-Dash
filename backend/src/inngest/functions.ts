import { inngest } from "./index";
import ClassModel from "../models/classes";
import User from "../models/user";
import { NonRetriableError } from "inngest";
// export const inngest = new Inngest({ id: "my-app"});

interface GenSettings {
  startTime: string;
  endTime: string;
  periods: number;
}

// Your new function:
export const generateTimeTable = inngest.createFunction(
  { id: "Generate-Timetable", event: "generate/timetable" },
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

// Add the function to the exported array:
// export const functions = [
//   helloWorld
// ]

