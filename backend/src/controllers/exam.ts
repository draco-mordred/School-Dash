import { type Request, type Response } from "express";
import mongoose from "mongoose";
import { logActivity } from "../utils/activitieslog";
import { inngest } from "../inngest"
import Exam from "../models/exam";
import CourseModel from "../models/courses";
import Submission from "../models/submission";

// @desc    Trigger AI Exam Generation
// @route   POST /api/exams/generate
export const triggerExamGeneration = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      title, subject, class: classId, duration, dueDate, topic, difficulty, count,
    } = req.body;
    const subjectDoc = await CourseModel.findById(subject);
    if(!subjectDoc) {
      return res.status(404).json({ message: `Subject not found!` });
    }
    const lecturerId = (req as any).user._id;
    const draftExam = await Exam.create({
      title: title || `Auto-Generated ${topic}`,
      subject,
      class: classId,
      lecturer: lecturerId,
      duration: duration || 60,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Defaults to 1 week.
      isActive: false, // Draft mode.
      questions: [], // Filled up by Inngest.
    });
    const userId = (req as any).user._id;
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
        count: count || 10,
      },
    });
    res.status(202).json({
      message: `Exam generation started`,
      examId: draftExam._id,
    })
  } catch (error) {
    res.status(500).json({ message: "Server error", error})
  }
}

// Create Exam
// @desc  Create/Publish Exam
// @route POST /api/exams
export const createExam = async (
  req: Request,
  res: Response
) => {
  try {
    const exam = await Exam.create({
      ...req.body,
      lecturer: (req as any).user._id, // From Auth Middleware.
    });
    const userId = (req as any).user._id;
    await logActivity({
      userId,
      action: `User created a new exam.`
    });
    res.status(201).json( exam );
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

// @desc  Get Exam (Student sees available, Teacher sees created)
// @route GET /api/exams
export const getExams = async (
  req: Request,
  res: Response
) => {
  try {
    const user = (req as any).user;
    let query = {};

    if (user.role === "student") {
      // Student see exams for their class only
      // Auth middleware populates `studentClasses` (lowercase) as `studentClasses: [{_id, name}]`.
      // Some older code uses `StudentClass`, so we support both.
      const studentClassId =
        // preferred: populated studentClasses
        (user as any).studentClasses?.[0]?._id ||
        // fallback: direct object
        (user as any).studentClass?._id ||
        // fallback: legacy capitalized field could be populated or raw id
        (user as any).StudentClass?._id ||
        (user as any).StudentClass ||
        (user as any).studentClass;

      if (!studentClassId) {
        return res.json([]);
      }

      query = { class: studentClassId, isActive: true };
    } else if (user.role === "teacher") {
      // Teacher see exams they created
      query = { lecturer: user._id };
    }


    const exams = await Exam.find(query)
    .populate("subject", "name")
    .populate("class", "name section")
    .select("-questions.correctAnswer");

    res.json( exams );
  }catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

// @desc  Get Exam by id
// @route GET /api/exams/:id
export const getExamById = async (
  req: Request,
  res: Response
) => {
  try {
    const examId = req.params.id;
    const user = (req as any).user; // Assumes auth Middleware attaches to user

    //1. Initiate the query
    let query = Exam.findById(examId)
        .populate("subject", "name code")
        .populate("class", "name section")
        .populate("lecturer", "name email idNumber");

    //2. Conditional Logic: Reveal answers for the Teachers/Admins
    // The "+" syntax forces selection of fields marked as { select: false } in SChema
    if (user.role === "teacher" || user.role === "admin") {
      query = query.select("+questions.correctAnswer");
    }

    //3. Execute Query
    const exam = await query;

    //4. Handle Not Found
    if (!exam) {
      return res.status(404).json({ message: `Exam not found!` });
    };

    //5. Security Check (Optional but recommended): ensure Students only access their class exams.
    if (user.role === "student" && exam.class.toString() !== user.studentClass.toString()) {
      // Assuming user.studentClass is a string or ObjectId
      // We compare it with the exam.class._id (which might be populted or an ID)
      const examClassId = exam.class._id ? exam.class._id.toString() : exam.class.toString();
      const userClassId = user.studentClass ? user.studentClass.toString() : "";

      if (examClassId !== userClassId){
        return res.status(403).json({
          message: `You are not authorized to view this exam!`
        })
      }
    }
    res.json(exam);
  }catch (error: any) {
    console.error(error);

    // Handle Invalid ID format (CastError)
    if (error.name === "CastError") {
      return res.status(400).json({ 
        message: `Invalid Exam ID!`
      });
    }

    //Handle other errors
    return res.status(500).json({ 
      message: `Internal server error!`
    });
  }
};

// @desc    Toggle Exam Status (Active/Inactive)
// @route   PATCH /api/exams/:id/status
// @access  Private (Teacher/Admin)
export const toggleExamStatus = async (
  req: Request,
  res: Response
) => {
try {
  const examId = req.params.id;
  const user = (req as any).user;

  const exam = await Exam.findById(examId);

  if (!exam) {
    return res.status(404).json({ message: "Exam not found!" });
  }

  // Security Check: Ensure the user owns the exam (if not Admin)
  if (
    user.role !== "admin" &&
    exam.lecturer.toString() !== user._id.toString()
  ) {
    return res
    .status(401)
    .json({
      message: `Not authorized to modify this exam!`
    })
  }

  //Toggle the status
  exam.isActive = !exam.isActive;
  await exam.save();
  const userId = (req as any).user._id;
  await logActivity({
    userId,
    action: `User ${userId} toggled exam status!`
  });
  res.json({
    message: `Exam is now ${exam.isActive ? "Active" : "Inactive"}`,
    _id: exam._id,
    isActive: exam.isActive,
  });

} catch(error: any) {
res.status(500).json({
  message: error.message,
});
}
};

// @desc    Submit & Auto-grade Exam
// @route   POST /api/exams/:id/submit
export const submitExam = async (
  req: Request,
  res: Response
) => {
try {
  const { answers } = req.body;
  const studentId = (req as any).user._id;
  const examId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id || "";

  if (!examId) {
    return res.status(400).json({ message: "Exam ID is required" });
  }

  //1. Check if already submitted
  const existingSubmission = await Submission.findOne({
    exam: examId,
    student: studentId,
  });
  if (existingSubmission) {
    return res.status(400).json({ message: `You have already submitted this exam!` });
  }
  //2. Fetch full exam with answers.
  const exam = await Exam.findById(examId).select("+questins.correctAnswers");
  if (!exam) return res.status(404).json({ message: `Exam not found!`});
  
  //3. Claculate Score
  let score = 0;
  let totalPoints = 0;

  exam.questions.forEach((question) => {
    totalPoints += question.points;
    const studentAns = answers.find(
      (a: any) => a.questionId === question._id.toString()
    );
    if (studentAns && studentAns.answer === question.correctAnswer) {
      score += question.points;
    }
  });
  // 4. Save Submission
  const examObjectId = new mongoose.Types.ObjectId(examId);
  const studentObjectId = new mongoose.Types.ObjectId(studentId);

  await Submission.create({
    exam: examObjectId,
    student: studentObjectId,
    answers,
    score,
  });

  const userId = (req as any).user._id;
  await logActivity({
    userId,
    action: `User ${userId} submitted an exam!`
  })

  res.status(201).json({
    message: `Exam ${examId} submitted successfully`,
    score,
    total: totalPoints,
  })
} catch (error: any) {
res.status(500).json({
  message: `${error.message}`
})
}
};

// @desc    Get exa results (For students)
// @route   Get /api/exams/:id/result
export const getExamResult = async (
  req: Request,
  res: Response
) => {
  try {
    const studentId = (req as any).user._id;
    const examId = req.params.id;

    const submission = await Submission.findOne({
      exam: examId,
      student: studentId,
    }).populate({
      path: 'exam',
      select: "title questions._id questions.correctAnswers", // FORCE SELECT CORRECT ANSWERS
    });

    if (!submission){
      return res.status(404).json({ message: `No submission found!`});
    }

    res.json(submission);
  } catch (error: any) {
    res.status(500).json({
      messgae: `${error.message}`
    })
  }
}