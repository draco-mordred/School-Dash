import { type Request, type Response } from "express";
import mongoose from "mongoose";
import { logActivity } from "../utils/activitieslog";
import { inngest } from "../inngest"
import Exam from "../models/exam";
import CourseModel from "../models/courses";
import Submission from "../models/submission";
import { scoreSubmission } from "../utils/examScoring";
import { checkExamOverlap } from "../services/riskService"; // PR H — pre-save overlap warnings
// @desc    Trigger AI Exam Generation
// @route   POST /api/exams/generate
export const triggerExamGeneration = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      title,
      subject,
      course,
      class: classId,
      duration,
      dueDate,
      topic,
      difficulty,
      count,
    } = req.body;
    // The Exam schema's ref is `course` (there is no `subject` field).
    // Older clients send the course id under the `subject` key — accept either.
    const courseId = course ?? subject;
    if (!courseId) {
      return res.status(400).json({ message: `Course is required!` });
    }
    const courseDoc = await CourseModel.findById(courseId);
    if (!courseDoc) {
      return res.status(404).json({ message: `Course not found!` });
    }
    const lecturerId = (req as any).user._id;
    const draftExam = await Exam.create({
      title: title || `Auto-Generated ${topic}`,
      course: courseId,
      class: classId,
      lecturer: lecturerId,
      duration: duration || 60,
      dueDate:
        dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Defaults to 1 week.
      isActive: false, // Draft mode.
      questions: [], // Filled up by Inngest.
    });
    const userId = (req as any).user._id;
    await logActivity({
      userId,
      action: `User triggered exam generation: ${draftExam._id}`,
    });
    await inngest.send({
      name: "exam/generate",
      data: {
        examId: draftExam._id,
        topic,
        subjectName: courseDoc?.name,
        difficulty: difficulty || "Medium",
        count: typeof count === "number" ? count : count ? Number(count) : 10,
      },
    });
    // PR H: pre-save overlap warning for the draft exam's window.
    let draftOverlapWarnings: any[] = [];
    try {
      draftOverlapWarnings = await checkExamOverlap({
        classId: draftExam.class,
        dueDate: draftExam.dueDate,
        durationMinutes: Number(draftExam.duration) || 60,
      });
    } catch {
      // never block generation on overlap checks
    }
    return res.status(202).json({
      message: `Exam generation started`,
      examId: draftExam._id,
      overlapWarnings: draftOverlapWarnings,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Server error", error });
  }
};
// Delete exam (teacher/admin) 
export const deleteExam = async (req: Request, res: Response) => {
  try {
    const examId = req.params.id;
    const user = (req as any).user;
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found!" });
    }
    if (user.role !== "admin" && exam.lecturer.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this exam!" });
    }
    // Remove the exam AND its submissions together so no orphaned submissions remain.
    await Submission.deleteMany({ exam: examId });
    await Exam.findByIdAndDelete(examId);
    await logActivity({
      userId: user._id,
      action: `User ${user._id} deleted exam ${examId}`,
    });
    return res.json({ message: "Exam deleted" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
// Create Exam
// @desc  Create/Publish Exam
// @route POST /api/exams
export const createExam = async (
  req: Request,
  res: Response
) => {
  try {
    const { title, course, class: classId, duration, dueDate } = req.body;
    // PR G1: validate grading-related exam fields
    const assessmentKind = req.body.assessmentKind ?? "major_exam";
    if (assessmentKind !== "major_exam" && assessmentKind !== "ca_test") {
      return res.status(400).json({ message: "assessmentKind must be major_exam or ca_test" });
    }
    if (req.body.maxScore != null && (!Number.isFinite(Number(req.body.maxScore)) || Number(req.body.maxScore) <= 0)) {
      return res.status(400).json({ message: "maxScore must be a positive number" });
    }
    if (!title || !course || !classId || !duration || !dueDate) {
      return res.status(400).json({
        message: "title, course, class, duration and dueDate are required",
      });
    }
    // PR H: pre-save overlap warning (non-blocking) — active exams for the
    // same class whose [dueDate, dueDate + duration] window intersect this one.
    let overlapWarnings: any[] = [];
    try {
      overlapWarnings = await checkExamOverlap({
        classId,
        dueDate,
        durationMinutes: Number(duration),
      });
    } catch {
      // overlap warnings must never block exam creation
    }
    const exam = await Exam.create({
      ...req.body,
      course,
      lecturer: (req as any).user._id, // From Auth Middleware.
    });
    const userId = (req as any).user._id;
    await logActivity({
      userId,
      action: `User created a new exam.`
    });
    res.status(201).json({ ...exam.toObject(), overlapWarnings });
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
      // NOTE: expired exams are NOT deleted — the query below simply filters them
      // out for students. Deleting exams here orphaned submissions/results.
      // Only return active/upcoming exams for students
      query = { class: studentClassId, isActive: true, dueDate: { $gte: new Date() } };
    } else if (user.role === "teacher") {
      // Teacher see exams they created
      query = { lecturer: user._id };
    }
    const exams = await Exam.find(query)
    .populate("course", "name code courseID")
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
        .populate("course", "name code courseID")
        .populate("class", "name section")
        .populate("lecturer", "name email idNumber");
    //2. Conditional Logic: Reveal answers for the Teachers/Admins
    // The "+" syntax forces selection of fields marked as { select: false } in SChema
    if (user.role === "teacher" || user.role === "admin") {
      query = query.select("+questions.correctAnswer");
    } else {
      // Explicitly hide correct answers from non-teacher/admin roles (defense in depth)
      query = query.select("-questions.correctAnswer");
    }
    //3. Execute Query
    const exam = await query;
    //4. Handle Not Found
    if (!exam) {
      return res.status(404).json({ message: `Exam not found!` });
    };
    //5. Security Check: ensure Students only access their class exams.
    // (user.studentClass may be unset — resolve the class id via the same
    // fallback chain getExams uses, instead of crashing with a 500.)
    if (user.role === "student") {
      const examClassId = exam.class?._id
        ? exam.class._id.toString()
        : exam.class?.toString() ?? "";
      const userClassId =
        user.studentClasses?.[0]?._id?.toString() ||
        user.studentClass?._id?.toString() ||
        user.StudentClass?._id?.toString() ||
        user.StudentClass?.toString() ||
        user.studentClass?.toString() ||
        "";
      if (examClassId && userClassId && examClassId !== userClassId) {
        return res.status(403).json({
          message: `You are not authorized to view this exam!`
        });
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
    .status(403)
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
  const exam = await Exam.findById(examId).select("+questions.correctAnswer");
  if (!exam) return res.status(404).json({ message: `Exam not found!`});
  //2b. Server-side availability guards (the frontend-only check is not sufficient).
  if (!exam.isActive) {
    return res.status(403).json({ message: `This exam is not active!` });
  }
  if (new Date(exam.dueDate).getTime() < Date.now()) {
    return res.status(403).json({ message: `This exam has expired!` });
  }
  //3. Calculate Score
  const { score, totalPoints } = scoreSubmission(
    exam as any,
    Array.isArray(answers) ? answers : []
  );
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
    const user = (req as any).user;
    const examId = req.params.id;
    // Students always see their own submission. Staff (teacher/admin/unit roles)
    // must pass ?studentId=<id> to view a specific student's submission.
    const isStaff = ["admin", "teacher", "unitconsultant", "unitresident"].includes(user.role);
    const studentId = isStaff ? (req.query.studentId as string | undefined) : user._id;
    if (!studentId) {
      return res.status(400).json({ message: "studentId query parameter is required for staff users" });
    }
    const submission = await Submission.findOne({
      exam: examId,
      student: studentId,
    }).populate({
      path: 'exam',
      select: "title questions._id questions.correctAnswer", // FORCE SELECT CORRECT ANSWERS
    }).populate("student", "name idNumber email");
    if (!submission){
      return res.status(404).json({ message: `No submission found!`});
    }
    res.json(submission);
  } catch (error: any) {
    res.status(500).json({
      message: `${error.message}`
    })
  }
}
// @desc    Regrade all submissions for an exam (fixes historically misgraded scores)
// @route   POST /api/exams/:id/regrade
// @access  Private (Admin only)
export const regradeExamSubmissions = async (
  req: Request,
  res: Response
) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Only administrators can regrade exams" });
    }
    const examId = req.params.id;
    const exam = await Exam.findById(examId).select("+questions.correctAnswer");
    if (!exam) {
      return res.status(404).json({ message: "Exam not found!" });
    }
    const submissions = await Submission.find({ exam: examId });
    let updated = 0;
    for (const submission of submissions) {
      const { score } = scoreSubmission(exam as any, (submission as any).answers ?? []);
      if (score !== (submission as any).score) {
        (submission as any).score = score;
        await submission.save();
        updated++;
      }
    }
    await logActivity({
      userId: user._id,
      action: `Admin regraded exam ${examId}: ${updated}/${submissions.length} submissions updated`,
    });
    return res.status(200).json({
      message: "Regrade complete",
      examId,
      submissions: submissions.length,
      updated,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
// @desc    Generate (append) more AI questions for an existing exam
// @route   POST /api/exams/:id/generate-questions
// @access  Private (owner teacher/admin)
export const generateExamQuestions = async (
  req: Request,
  res: Response
) => {
  try {
    const examId = req.params.id;
    const { topic, difficulty, count } = req.body;
    if (!topic || !String(topic).trim()) {
      return res.status(400).json({ message: "topic is required" });
    }
    const exam = await Exam.findById(examId).populate("course", "name");
    if (!exam) {
      return res.status(404).json({ message: "Exam not found!" });
    }
    const user = (req as any).user;
    if (user.role !== "admin" && exam.lecturer?.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to modify this exam!" });
    }
    const numCount = typeof count === "number" ? count : count ? Number(count) : 3;
    if (!Number.isFinite(numCount) || numCount < 1 || numCount > 20) {
      return res.status(400).json({ message: "count must be a number between 1 and 20" });
    }
    await logActivity({
      userId: user._id,
      action: `User triggered additional question generation for exam ${examId}`,
    });
    await inngest.send({
      name: "exam/generate-questions",
      data: {
        examId,
        topic: String(topic).trim(),
        subjectName: (exam as any).course?.name ?? null,
        difficulty: difficulty || "Medium",
        count: numCount,
      },
    });
    return res.status(202).json({ message: "Question generation started" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
// @desc    Delete a single question from an exam
// @route   DELETE /api/exams/:id/questions/:questionId
// @access  Private (owner teacher/admin)
export const deleteExamQuestion = async (
  req: Request,
  res: Response
) => {
  try {
    const { id: examId, questionId } = req.params;
    const user = (req as any).user;
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found!" });
    }
    if (user.role !== "admin" && exam.lecturer?.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to modify this exam!" });
    }
    const before = exam.questions.length;
    exam.questions = exam.questions.filter(
      (q: any) => q._id?.toString() !== questionId
    );
    if (exam.questions.length === before) {
      return res.status(404).json({ message: "Question not found!" });
    }
    await exam.save();
    await logActivity({
      userId: user._id,
      action: `User ${user._id} deleted question ${questionId} from exam ${examId}`,
    });
    return res.json({
      message: "Question deleted",
      remaining: exam.questions.length,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
