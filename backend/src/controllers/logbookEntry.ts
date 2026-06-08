import { type Request, type Response } from "express";
import LogbookEntry from "../models/logbookEntry";
import { logActivity } from "../utils/activitieslog";

// @desc    Create a logbook entry
// @route   POST /api/logbook-entries
// @access  Private (Student)
export const createLogbookEntry = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const {
      rotation, academicYear, date,
      callDuty, clinicDays, theatreDays, cwrDays, rwrDays, other,
      presentationTutorials, personal, notes,
    } = req.body;

    if (!rotation || !date) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    let resolvedAcademicYear = academicYear;
    if (!resolvedAcademicYear) {
      const AcademicYear = (await import("../models/academicYear")).default;
      const currentYear = await AcademicYear.findOne({ isCurrent: true });
      resolvedAcademicYear = currentYear?._id;
    }

    // Only include arrays that have actual data
    const entryData: any = {
      student: userId,
      rotation,
      academicYear: resolvedAcademicYear,
      date: new Date(date),
      notes: notes || "",
    };

    if (callDuty?.length) entryData.callDuty = callDuty;
    if (clinicDays?.length) entryData.clinicDays = clinicDays;
    if (theatreDays?.length) entryData.theatreDays = theatreDays;
    if (cwrDays?.length) entryData.cwrDays = cwrDays;
    if (rwrDays?.length) entryData.rwrDays = rwrDays;
    if (other?.length) entryData.other = other;
    if (presentationTutorials?.length) entryData.presentationTutorials = presentationTutorials;
    if (personal?.length) entryData.personal = personal;

    const entry = await LogbookEntry.create(entryData);

    await logActivity({
      userId,
      action: "Created logbook entry",
      details: `Created logbook entry for rotation ${rotation} on ${new Date(date).toDateString()}`,
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Get all logbook entries (filtered by role)
// @route   GET /api/logbook-entries
// @access  Private
export const getAllLogbookEntries = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    const { rotationId, studentId, page = 1, limit = 20 } = req.query;

    const filter: any = {};
    if (userRole === "student") filter.student = userId;
    else if (userRole === "teacher" && studentId) filter.student = studentId;
    else if (userRole === "parent") {
      const User = (await import("../models/user")).default;
      const user = await User.findById(userId).select("parentStudents");
      if (user?.parentStudents?.length) {
        filter.student = { $in: user.parentStudents };
      } else {
        res.json({ entries: [], total: 0, page: 1, limit: 20 });
        return;
      }
    }

    if (rotationId) filter.rotation = rotationId;
    if (studentId && userRole !== "student") filter.student = studentId;

    const entries = await LogbookEntry.find(filter)
      .populate("student", "name idNumber email")
      .populate("rotation", "rotationName rotationType rotationUnit")
      .populate("academicYear", "name")
      .sort({ date: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    const total = await LogbookEntry.countDocuments(filter);
    res.json({ entries, total, page: +page, limit: +limit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Get a single logbook entry by ID
// @route   GET /api/logbook-entries/:id
// @access  Private
export const getLogbookEntryById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    const { id } = req.params;

    const entry = await LogbookEntry.findById(id)
      .populate("student", "name idNumber email")
      .populate("rotation", "rotationName rotationType rotationUnit rotationSupervisor")
      .populate("academicYear", "name");

    if (!entry) {
      res.status(404).json({ message: "Logbook entry not found" });
      return;
    }

    if (userRole === "student" && entry.student._id.toString() !== userId) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    res.json(entry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Update a logbook entry
// @route   PUT /api/logbook-entries/:id
// @access  Private (Student own entry)
export const updateLogbookEntry = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    const { id } = req.params;

    const entry = await LogbookEntry.findById(id);
    if (!entry) {
      res.status(404).json({ message: "Logbook entry not found" });
      return;
    }

    if (userRole === "student" && entry.student.toString() !== userId) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    const allowedFields = [
      "date", "callDuty", "clinicDays", "theatreDays",
      "cwrDays", "rwrDays", "other",
      "presentationTutorials", "personal", "notes",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        (entry as any)[field] = req.body[field];
      }
    });

    await entry.save();

    await logActivity({
      userId,
      action: "Updated logbook entry",
      details: `Updated logbook entry ${id}`,
    });

    res.json(entry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Delete a logbook entry
// @route   DELETE /api/logbook-entries/:id
// @access  Private (Admin/Teacher)
export const deleteLogbookEntry = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { id } = req.params;

    const entry = await LogbookEntry.findById(id);
    if (!entry) {
      res.status(404).json({ message: "Logbook entry not found" });
      return;
    }

    await LogbookEntry.findByIdAndDelete(id);

    await logActivity({
      userId,
      action: "Deleted logbook entry",
      details: `Deleted logbook entry ${id}`,
    });

    res.json({ message: "Logbook entry deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};
