import { type Request, type Response } from "express";
import { logActivity } from "../utils/activitieslog";

import Course, { type ICourse } from "../models/courses";


//  @desc    Create a new course
//  @route   POST /api/courses
//  @access  Private (Admin)
export const createCourse = async (
  req: Request, 
  res: Response
) => {
  try {
    // const { name, code, lecture, isActive } = req.body;
  //   // So we build the course then reference its courseSections array from the lecture data in the request body, which should be an array of lecture objects with title, lecturer, and date, and very importantly, the code for the lecture which will be used to ensure that there are no duplicate lectures in the same course, and also to allow us to easily identify each lecture when we want to update or delete it in the future. The courseSections array will be stored in the course document in the database, and each section will have its own code which will be unique within the course.

  const { name, isActive, courseSections } = req.body;

  // Let's display the expected structure/output of the Course here for better clarity and to ensure that the frontend sends the correct data structure in the request body when creating a new course, including its unique courseSection Code. The expected structure of the request body should be as follows:
  // SO let's show the expected Structure here below
  /*
  {
  "name": "Pediatrics",
  "isActive": true,
  "courseSections": [
    {
      "title": "Introduction to Pediatrics",
      "lecturer": "64b8c9f1e4b0a5d6c8f9a2b", // This should be the ObjectId of the lecturer in the User collection
      "date": "2024-09-01T00:00:00.000Z",
      "code": "PED001" // This code will be generated automatically based on the course name and section title, but it should be included in the request body to ensure that it is unique across all courses
    },  
    {
      "title": "The Cell",
      "lecturer": "64b8c9f1e4b0a5d6c8f9a2b", // This should be the ObjectId of the lecturer in the User collection
      "date": "2024-09-08T00:00:00.000Z",
      "code": "PED002" // This code will be generated automatically based on the course name and section title, but it should be included in the request body to ensure that it is unique across all courses
    }
  ]
}
  */

  //Here we Unique 6 digit code using the first the LETTERS of the course, and then the 4th digit will carry 1 if the school year is in the first semester, and 2 if the school year is in its second. The fifth and sixth digit will be based on the total number of subjects in the Overall Course
  const courseSectionsWithCodes = courseSections.map((section: any, index: number) => ({
    ...section,
    code: `${name.toUpperCase().replace(/\s+/g, "").substring(0, 3)}${index + 1 < 10 ? "0" : ""}${index + 1}` // Generate a unique code for each course section based on the course name and section title, e.g., "PediatricsIntroductionToPediatrics" becomes "PED001", "PED002", etc.
  }));

  // We'll the reference the unique code to ensure no duplicate sections are created within the same course, but we can have the same section title in different courses, so we need to ensure that the code is unique across all courses, not just within the same course. So we need to check if any course already has a section with the same code before creating the new course. If we find a course with a section that has the same code, we should return an error response indicating that a section with the same code already exists in another course.

  // const courseExists = await Course.findOne({ "courseSections.code": { $in: courseSectionsWithCodes.map((section: any) => section.code) } });
  
  // Here we wanna check if the course's courseSection code already exists in any other course's courseSections array, so we need to use the $elemMatch operator to check if any course has a section with a code that matches any of the codes in the courseSectionsWithCodes array. The query should look like this:
  // const courseExists = await Course.findOne({ 
  //   courseSections: {
  //     $elemMatch: {
  //       code: { $in: courseSectionsWithCodes.map((section: any) => section.code) }
  //     }
  //   }
  // });

  // if (courseExists) {
  //   return res.status(400).json({ // return a message showing the code of the section that already exists in another course for better clarity
  //     message: `A course section with the same code already exists in another course! Please ensure that each course section has a unique code. The conflicting code is: ${courseExists.courseSections.find((section: any) => courseSectionsWithCodes.map((sec: any) => sec.code).includes(section.code)).code}`
  //   })
  // }

  // const newCourse = await Course.create({
  //   name,
  //   isActive,
  //   courseSections: courseSectionsWithCodes,
  //   courseTitle: name // Set courseTitle to the same value as name for now, but you can change this if you want to have a different field for the course title
  // });

  // if (newCourse) {
  //   const userId = (req as any).user._id; // Assuming user ID is stored in req.user
  //   await logActivity({userId, action: `Created Course ${newCourse.name} with sections ${newCourse.courseSections.map((section: any) => section.title).join(", ")} was created.`});
  //   res.status(201).json(newCourse);
  // }

  // } catch (error) {
  //   res.status(500).json({
  //     message: "Server error", error
  //   })
  // }




  //   const { name, isActive, lecture } = req.body;

  //   const courseExists = await Course.findOne({ code });
  //   if (courseExists) {
  //     return res.status(400).json({
  //       message: "Course code already exists!"
  //     })
  //   }
  //   const newCourse = await Course.create({
  //     name,
  //     // code,
  //     isActive,
  //     // lecture,
  //     courseSections: lecture.map((lec: any) => ({
  //       title: lec.title,
  //       code: lec.code,
  //       lecturer: lec.lecturer,
  //       date: lec.date
  //     })),
  //     courseTitle: name // Set courseTitle to the same value as name for now, but you can change this if you want to have a different field for the course title
  //   });
  //   if (newCourse) {
  //     const userId = (req as any).user._id; // Assuming user ID is stored in req.user
  //     await logActivity({userId, action: `Created Course ${newCourse.name} with code ${newCourse.} was created.`});
  //     res.status(201).json(newCourse);
  //   }
  // } catch (error) {
  //   res.status(500).json({
  //     message: "Server error", error
  //   })
  // }
} catch (error) {
    res.status(500).json({
      message: "Server error", error
    })
  }
}