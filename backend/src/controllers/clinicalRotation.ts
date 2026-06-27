import { type Request, type Response } from "express";
import { generate500LevelOgPaeJuniorPostingSchedule } from "../utils/clinicalPostingScheduler";
// ClinicalRotation model is loaded lazily to avoid module resolution errors during test bootstrapping
async function loadClinicalRotation() {
  // import the ClinicalRotation model directly
  return (await import("../models/clinicalRotation")).default;
}
import { Types } from "mongoose";
// lazy wrapper for activity logging to avoid import-time resolution problems in tests
const logActivity = async (payload: any) => {
  const mod = await import("../utils/activitieslog");
  return mod.logActivity(payload);
};

// @desc    Create a new clinical rotation
// @route   POST /api/clinical-rotations
// @access  Private (Admin/Teacher/Student)
export const createClinicalRotation = async (req: Request, res: Response) => {
  try {
    const ClinicalRotation = await loadClinicalRotation();
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;

    const {
      rotationName, rotationDescription, rotationType,
      rotationStartDate, rotationEndDate, rotationUnit,
      rotationSupervisor, rotationStatus,
      rotationNotes, rotationActivities,
      rotationTutorials, rotationTutorialPersonal,
      patientsClerked,
      clinicDays, theatreDays, cwrDays, rwrDays, callDays, otherDays,
      student, academicYear,
    } = req.body;

    if (!rotationName || !rotationType || !rotationStartDate || !rotationEndDate || !rotationUnit) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Auto-populate student and academicYear if not provided
    const resolvedStudent = student || userId;
    let resolvedAcademicYear = academicYear;
    if (!resolvedAcademicYear) {
      const AcademicYear = (await import("../models/academicYear")).default;
      const currentYear = await AcademicYear.findOne({ isCurrent: true });
      resolvedAcademicYear = currentYear?._id;
    }

    const rotation = await ClinicalRotation.create({
      rotationName, rotationDescription, rotationType,
      rotationStartDate: new Date(rotationStartDate),
      rotationEndDate: new Date(rotationEndDate),
      rotationUnit, rotationSupervisor: rotationSupervisor || userId,
      rotationStatus: rotationStatus || "pending_approval",
      rotationNotes: rotationNotes || "",
      rotationActivities: rotationActivities || {
        numberOfWeeks: 0, numberOfConsultantWardRound: 0,
        numberOfClinics: 0, numberOfResidentWardRound: 0,
        numberOfCallDuty: 0, numberOfTheatreDays: 0,
      },
      rotationTutorials: rotationTutorials || [],
      rotationTutorialPersonal: rotationTutorialPersonal || "",
      patientsClerked: patientsClerked || [],
      clinicDays: clinicDays || [],
      theatreDays: theatreDays || [],
      cwrDays: cwrDays || [],
      rwrDays: rwrDays || [],
      callDays: callDays || [],
      otherDays: otherDays || [],
      student: resolvedStudent, academicYear: resolvedAcademicYear,
    });

    await logActivity({
      userId,
      action: "Created clinical rotation",
      details: `Created rotation "${rotationName}" for student ${student}`,
    });

    // Create a system notification for all users about the new clinical rotation
    try {
      const User = (await import("../models/user")).default;
      const { Notification } = await import("../models/notification");
      // Notify all active users
      const users = await User.find({ isActive: { $ne: false } }).select("_id role").lean();
      if (Array.isArray(users) && users.length) {
        const now = new Date();
        const notifications = users.map((u: any) => ({
          userId: u._id,
          role: u.role || "student",
          title: `New clinical rotation: ${rotationName}`,
          message: `${rotationName} — ${rotationDescription || "New clinical posting available"}`,
          type: "info",
          isRead: false,
          link: `/clinical-rotations`,
          metadata: { rotationId: rotation._id },
          createdAt: now,
          updatedAt: now,
        }));
        // Insert many; do not block rotation creation on notification failures
        await Notification.insertMany(notifications);
      }
    } catch (notifErr) {
      console.error("Failed to create rotation notifications:", notifErr);
    }

    res.status(201).json(rotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Generate 500-level O&G / Pediatrics clinical posting schedule
// @route   POST /api/og-ped-rotations/oGPeds-JuniorPosting-Schedule
// @access  Private (Admin/Teacher)
export const generate500LevelJuniorOgPaePostingSchedule = async (req: Request, res: Response) => {
  try {
    const { classId, postingName, postingStartDate } = req.body;
    const result = await generate500LevelOgPaeJuniorPostingSchedule({ classId, postingName, postingStartDate });

    if (!result.validation.valid) {
      return res.status(422).json({ message: "Schedule validation failed", validation: result.validation, schedule: result.schedule });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to generate posting schedule", error });
  }
};


export const update500LevelJuniorOgPaePostingSchedule = async (req: Request, res: Response) => {
  try {
    const { scheduleId, updates } = req.body;
    const ClinicalRotation = await loadClinicalRotation();
    const schedule = await ClinicalRotation.findById(scheduleId);
    if (!schedule) return res.status(404).json({ message: "Schedule not found" });

    const updatedSchedule = await ClinicalRotation.findByIdAndUpdate(scheduleId, updates, { new: true });
    return res.status(200).json(updatedSchedule);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Get all clinical rotations (filtered by role)
// @route   GET /api/clinical-rotations
// @access  Private
export const getAllClinicalRotations = async (req: Request, res: Response) => {
  try {
    const ClinicalRotation = await loadClinicalRotation();
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    const { studentId, rotationType, rotationStatus, page = 1, limit = 20 } = req.query;

    const filter: any = {};
    if (userRole === "student") {
      // student should see rotations where they are the primary student or included in the participants
      filter.$or = [ { student: userId }, { students: { $in: [userId] } } ];
    } else if (userRole === "teacher") filter.rotationSupervisor = userId;
    else if (userRole === "parent") {
      // Parents see rotations for their linked students
      const User = (await import("../models/user")).default;
      const user = await User.findById(userId).select("parentStudents");
      if (user?.parentStudents?.length) {
        filter.$or = [ { student: { $in: user.parentStudents } }, { students: { $in: user.parentStudents } } ];
      } else {
        res.json({ rotations: [], total: 0, page: 1, limit: 20 });
        return;
      }
    } else if (studentId) filter.student = studentId;

    if (rotationType) filter.rotationType = rotationType;
    if (rotationStatus) filter.rotationStatus = rotationStatus;

    console.debug("getAvailableRotations filter:", JSON.stringify(filter));
    const rotations = await ClinicalRotation.find(filter)
      .populate("student", "name idNumber email")
      .populate("students", "name idNumber email")
      .populate("rotationSupervisor", "name email supervisorRank specialties")
      .populate("academicYear", "name")
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    const total = await ClinicalRotation.countDocuments(filter);
    res.json({ rotations, total, page: +page, limit: +limit });
  } catch (error) {
    console.error(error?.stack || error);
    res.status(500).json({ message: "Server error", error: String(error) });
  }
};

// @desc    Get a single clinical rotation by ID
// @route   GET /api/clinical-rotations/:id
// @access  Private
export const getClinicalRotationById = async (req: Request, res: Response) => {
  try {
    const ClinicalRotation = await loadClinicalRotation();
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid rotation id" });
    }

    const rotation = await ClinicalRotation.findById(id)
      .populate("student", "name idNumber email")
      .populate("rotationSupervisor", "name email")
      .populate("academicYear", "name");

    if (!rotation) {
      res.status(404).json({ message: "Clinical rotation not found" });
      return;
    }

    // Access control
    const isStudent = rotation.student?._id?.toString() === userId || (Array.isArray(rotation.students) && rotation.students.some((s: any) => s.toString() === userId));
    const isSupervisor = rotation.rotationSupervisor._id.toString() === userId;
    if (userRole === "student" && !isStudent) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    // notify the selected supervisor on the signup
    try {
      const { Notification } = await import("../models/notification");
      const supervisorId = rotation.rotationSupervisor;
      if (supervisorId) {
        const now = new Date();
        await Notification.create({
          userId: supervisorId,
          role: "teacher",
          title: `Rotation signup: ${rotation.rotationName}`,
          message: `${rotation.studentName} has signed up for the rotation ${rotation.rotationName}`,
          type: "info",
          isRead: false,
          link: `/clinical-rotations/${rotation._id}`,
          metadata: { rotationId: rotation._id, studentId: userId, supervisorId },
          createdAt: now,
          updatedAt: now,
        } as any);
      }
    } catch (err) {
      console.error("Failed to notify supervisor:", err);
    }

    res.json(rotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};


// @desc    Update a clinical rotation
// @route   PUT /api/clinical-rotations/:id
// @access  Private (Admin/Teacher/Student own rotation)
export const updateClinicalRotation = async (req: Request, res: Response) => {
  try {
    const ClinicalRotation = await loadClinicalRotation();
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid rotation id" });
    }

    const rotation = await ClinicalRotation.findById(id);
    if (!rotation) {
      res.status(404).json({ message: "Clinical rotation not found" });
      return;
    }

    const isOwner = rotation.student?.toString() === userId || (Array.isArray(rotation.students) && rotation.students.some((s: any) => s.toString() === userId));
    const isSupervisor = rotation.rotationSupervisor.toString() === userId;

    if (userRole === "student" && !isOwner) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    const allowedFields = [
      "rotationName", "rotationDescription", "rotationType",
      "rotationStartDate", "rotationEndDate", "rotationUnit",
      "rotationStatus", "rotationNotes", "rotationActivities",
      "rotationTutorials", "rotationTutorialPersonal",
      "patientsClerked", "clinicDays", "theatreDays",
      "cwrDays", "rwrDays", "callDays", "otherDays",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        (rotation as any)[field] = req.body[field];
      }
    });

    await rotation.save();

    await logActivity({
      userId,
      action: "Updated clinical rotation",
      details: `Updated rotation "${rotation.rotationName}"`,
    });

    res.json(rotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Delete a clinical rotation
// @route   DELETE /api/clinical-rotations/:id
// @access  Private (Admin/Teacher)
export const deleteClinicalRotation = async (req: Request, res: Response) => {
  try {
    const ClinicalRotation = await loadClinicalRotation();
    const userId = (req as any).user._id;
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid rotation id" });
    }

    const rotation = await ClinicalRotation.findById(id);
    if (!rotation) {
      res.status(404).json({ message: "Clinical rotation not found" });
      return;
    }

    await ClinicalRotation.findByIdAndDelete(id);

    await logActivity({
      userId,
      action: "Deleted clinical rotation",
      details: `Deleted rotation "${rotation.rotationName}"`,
    });

    res.json({ message: "Clinical rotation deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Add a note to a clinical rotation
// @route   POST /api/clinical-rotations/:id/notes
// @access  Private
export const addRotationNote = async (req: Request, res: Response) => {
  try {
    const ClinicalRotation = await loadClinicalRotation();
    const userId = (req as any).user._id;
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid rotation id" });
    }
    const { note } = req.body;

    const rotation = await ClinicalRotation.findById(id);
    if (!rotation) {
      res.status(404).json({ message: "Clinical rotation not found" });
      return;
    }

    rotation.rotationNotes = rotation.rotationNotes
      ? `${rotation.rotationNotes}\n${new Date().toDateString()}: ${note}`
      : `${new Date().toDateString()}: ${note}`;

    await rotation.save();

    await logActivity({
      userId,
      action: "Added note to clinical rotation",
      details: `Added note to rotation "${rotation.rotationName}"`,
    });

    res.json(rotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Add a patient clerked to a clinical rotation
// @route   POST /api/clinical-rotations/:id/patients
// @access  Private
export const addPatientClerked = async (req: Request, res: Response) => {
  try {
    const ClinicalRotation = await loadClinicalRotation();
    const userId = (req as any).user._id;
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid rotation id" });
    }
    const { patientName, diagnosis, notes } = req.body;

    const rotation = await ClinicalRotation.findById(id);
    if (!rotation) {
      res.status(404).json({ message: "Clinical rotation not found" });
      return;
    }

    rotation.patientsClerked.push({
      patientName, diagnosis,
      clerkedAt: new Date(),
      notes: notes || "",
    });

    await rotation.save();

    await logActivity({
      userId,
      action: "Added patient clerked",
      details: `Added patient "${patientName}" to rotation "${rotation.rotationName}"`,
    });

    res.json(rotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Approve a clinical rotation (teacher/supervisor)
// @route   POST /api/clinical-rotations/:id/approve
// @access  Private (Teacher/Admin)
export const approveRotation = async (req: Request, res: Response) => {
  try {
    const ClinicalRotation = await loadClinicalRotation();
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid rotation id" });
    }

    const rotation = await ClinicalRotation.findById(id);
    if (!rotation) {
      res.status(404).json({ message: "Clinical rotation not found" });
      return;
    }

    if (userRole === "student" || userRole === "parent") {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    if (userRole === "teacher" && rotation.rotationSupervisor.toString() !== userId) {
      res.status(403).json({ message: "Only the assigned supervisor can approve this rotation" });
      return;
    }

    if (rotation.rotationStatus === "completed") {
      res.status(400).json({ message: "Cannot approve a completed rotation" });
      return;
    }

    if (rotation.rotationStatus !== "pending_approval") {
      res.status(400).json({ message: `Rotation is already ${rotation.rotationStatus}` });
      return;
    }

    rotation.rotationStatus = "upcoming";
    (rotation as any).approvedBy = new (require("mongoose").Types.ObjectId)(userId);
    rotation.approvedAt = new Date();

    await rotation.save();

    await logActivity({
      userId,
      action: "Approved clinical rotation",
      details: `Approved rotation "${rotation.rotationName}" — moved to upcoming`,
    });

    res.json({
      message: "Rotation approved and moved to upcoming",
      rotation,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Get rotation statistics for dashboard (counts by status)
// @route   GET /api/clinical-rotations/stats
// @access  Private
export const getRotationStats = async (req: Request, res: Response) => {
  try {
    const ClinicalRotation = await loadClinicalRotation();
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;

    const filter: any = {};

    if (userRole === "student") {
      // include rotations where the user is primary student or included in participants
      filter.$or = [ { student: userId }, { students: { $in: [userId] } } ];
    } else if (userRole === "parent") {
      const User = (await import("../models/user")).default;
      const user = await User.findById(userId).select("parentStudents");
      if (user?.parentStudents?.length) filter.$or = [ { student: { $in: user.parentStudents } }, { students: { $in: user.parentStudents } } ];
      else return res.json({ counts: {} });
    } else if (userRole === "teacher") {
      const Class = (await import("../models/classes")).default;
      const classes = await Class.find({ classTeacher: userId }).select("students");
      const studentIds: any[] = [];
      classes.forEach((c: any) => {
        if (Array.isArray(c.students)) studentIds.push(...c.students.map((s: any) => s.toString()));
      });
      if (studentIds.length) filter.$or = [ { student: { $in: studentIds } }, { students: { $in: studentIds } } ];
      else filter.rotationSupervisor = userId; // fallback to supervisor-owned rotations
    } else if (userRole === "unitconsultant" || userRole === "unitresident") {
      // If users are unit-based, show rotations they supervise. If a unit mapping exists later, adapt this.
      filter.rotationSupervisor = userId;
    }

    // Aggregate counts by rotationStatus
    const pipeline: any[] = [
      { $match: filter },
      {
        $group: {
          _id: "$rotationStatus",
          count: { $sum: 1 },
        },
      },
    ];

    const agg = await ClinicalRotation.aggregate(pipeline);
    const counts: Record<string, number> = {};
    agg.forEach((row: any) => {
      counts[row._id || "unknown"] = row.count;
    });

    res.json({ counts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Get available (searchable) active clinical rotations
// @route   GET /api/clinical-rotations/available
// @access  Private (any authenticated user can search)
export const getAvailableRotations = async (req: Request, res: Response) => {
  try {
    const ClinicalRotation = await loadClinicalRotation();
    const userId = (req as any).user?._id;
    const userRole = (req as any).user?.role;
    const { q, rotationType, rotationUnit, page = 1, limit = 20 } = req.query;
    // Prefer returning postings from generated rotation schedules when present.
    // This allows students to browse generated postings instead of manually-created ClinicalRotation documents.

    // Attempt to load recent rotation schedules for the student's classes (or globally) and flatten postings.
    try {
      const RotationSchedule = (await import("../models/rotationPlan")).default;

      // If student, try to scope schedules to their class(es)
      let scheduleFilter: any = {};
      if (userId && userRole === "student") {
        const rawStudentClasses = (req as any).user?.studentClasses ?? (req as any).user?.studentClass ?? [];
        const classIds = Array.isArray(rawStudentClasses)
          ? rawStudentClasses.map((c: any) => (typeof c === "string" ? c : c._id))
          : rawStudentClasses
            ? [ (typeof rawStudentClasses === "string" ? rawStudentClasses : rawStudentClasses._id) ]
            : [];
        if (classIds.length) scheduleFilter.class = { $in: classIds };
      }

      const schedules = await RotationSchedule.find(scheduleFilter)
        .populate({ path: "groups", populate: { path: "supervisor", select: "name" } })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      if (Array.isArray(schedules) && schedules.length) {
        // Flatten postings and deduplicate by posting name
        const map = new Map<string, any>();
        for (const s of schedules) {
          const postings = (s.postings || []) as any[];
          for (const p of postings) {
            if (!p || !p.name) continue;
            // Build groups with populated group docs when available
            const groups = (p.groups || []).map((pg: any) => {
              const groupDoc = (s.groups || []).find((g: any) => String(g._id) === String(pg.groupId));
              const supervisorName = groupDoc?.supervisor?.name || groupDoc?.supervisorName || "";
              return { group: groupDoc ? { _id: groupDoc._id, name: groupDoc.name, students: groupDoc.students || [], supervisorName, supervisor: groupDoc.supervisor } : { _id: pg.groupId }, assigned: pg.assigned || [] };
            });

            if (!map.has(p.name)) map.set(p.name, { name: p.name, category: p.category, groups });
            else {
              // merge groups if posting name appears in multiple schedules
              const existing = map.get(p.name);
              existing.groups = existing.groups.concat(groups);
            }
          }
        }

        // transform map entries into rotation-like objects expected by frontend
        const flattened = Array.from(map.values()).map((entry: any, idx: number) => {
          // compute posting start/end from assigned ranges
          let startDate: string | null = null;
          let endDate: string | null = null;
          for (const g of entry.groups || []) {
            for (const a of g.assigned || []) {
              const s = new Date(a.startDate);
              const e = new Date(a.endDate);
              if (!startDate || s < new Date(startDate)) startDate = a.startDate;
              if (!endDate || e > new Date(endDate)) endDate = a.endDate;
            }
          }
          const now = new Date();
          const status: any = startDate && endDate ? ((new Date(startDate) <= now && new Date(endDate) >= now) ? 'active' : (new Date(startDate) > now ? 'upcoming' : 'completed')) : 'upcoming';

          // derive a supervisor name from first group's supervisor if available
          const supervisorName = (entry.groups && entry.groups[0]?.group?.supervisorName) || entry.groups?.[0]?.group?.supervisor?.name || '';

          return {
            _id: `posting:${entry.name}:${idx}`,
            rotationName: entry.name,
            rotationDescription: '',
            rotationType: entry.category || 'medicine',
            rotationStartDate: startDate || new Date().toISOString(),
            rotationEndDate: endDate || new Date().toISOString(),
            rotationUnit: '—',
            rotationSupervisor: { _id: '', name: supervisorName },
            rotationStatus: status,
            rotationNotes: '',
            rotationActivities: { numberOfWeeks: 0, numberOfConsultantWardRound: 0, numberOfClinics: 0, numberOfResidentWardRound: 0, numberOfCallDuty: 0, numberOfTheatreDays: 0 },
            rotationTutorials: [],
            rotationTutorialPersonal: '',
            patientsClerked: [],
            student: { _id: '', name: '' },
            students: [],
            academicYear: null,
            createdAt: new Date(),
          } as any;
        });

        // allow optional search q filtering on posting name
        const qstr = typeof q === 'string' ? q.trim().toLowerCase() : '';
        const filtered = qstr ? flattened.filter((f: any) => f.rotationName.toLowerCase().includes(qstr)) : flattened;
        const start = ((+page - 1) * +limit);
        const paged = filtered.slice(start, start + (+limit));
        return res.json({ rotations: paged, total: filtered.length, page: +page, limit: +limit });
      }
    } catch (schedErr) {
      console.error('Failed to load rotation schedules for available postings fallback', schedErr);
      // fall through to clinical-rotation document-based listing
    }

    // Fallback: Only return active rotations that are unclaimed OR claimed by the requesting student OR claimed by any student in the same class
    const filter: any = { rotationStatus: "active" };

    if (userId && userRole === "student") {
      // Try to collect student IDs from classes the user belongs to
      const rawStudentClasses = (req as any).user?.studentClasses ?? (req as any).user?.studentClass ?? [];
      const classIds = Array.isArray(rawStudentClasses)
        ? rawStudentClasses.map((c: any) => (typeof c === "string" ? c : c._id))
        : rawStudentClasses
          ? [ (typeof rawStudentClasses === "string" ? rawStudentClasses : rawStudentClasses._id) ]
          : [];
      let classStudentIds: string[] = [];
      if (classIds.length) {
        const Class = (await import("../models/classes")).default;
        const classes = await Class.find({ _id: { $in: classIds } }).select("students");
        classes.forEach((c: any) => {
          if (Array.isArray(c.students)) classStudentIds.push(...c.students.map((s: any) => s.toString()));
        });
      }

        // include rotations that are unclaimed by participants OR include the user OR include any student in same classes OR primary student is in those lists
        const orClauses: any[] = [];
        // unclaimed by participants (no students signed up)
        orClauses.push({ students: { $size: 0 } });
        // user already a participant
        orClauses.push({ students: userId });
        if (classStudentIds.length) orClauses.push({ students: { $in: classStudentIds } });
        // consider primary student field as well
        orClauses.push({ student: userId });
        if (classStudentIds.length) orClauses.push({ student: { $in: classStudentIds } });
        filter.$or = orClauses;
    } else {
      // Non-students see only unclaimed rotations when using the 'available' endpoint
      filter.$or = [ { student: { $exists: false } }, { student: null } ];
      if (userId) filter.$or.push({ student: userId });
    }

    if (rotationType) filter.rotationType = rotationType;
    if (rotationUnit) filter.rotationUnit = rotationUnit;

    if (q && typeof q === "string") {
      // escape user input before creating RegExp to avoid invalid pattern errors
      const safeQ = q.trim().replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&");
      const regex = new RegExp(safeQ, "i");
      const regexClauses = [
        { rotationName: regex },
        { rotationDescription: regex },
        { rotationUnit: regex },
      ];
      // merge with any existing $or clauses (e.g. student/class filters)
      if (filter.$or && Array.isArray(filter.$or)) filter.$or = filter.$or.concat(regexClauses);
      else filter.$or = regexClauses;
    }

    console.debug("listAllRotations filter:", JSON.stringify(filter));
    const rotations = await ClinicalRotation.find(filter)
      .populate("student", "name idNumber email")
      .populate("students", "name idNumber email")
      .populate("rotationSupervisor", "name email")
      .populate("academicYear", "name")
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    const total = await ClinicalRotation.countDocuments(filter);
    res.json({ rotations, total, page: +page, limit: +limit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Student signs up / claims an active rotation
// @route   POST /api/clinical-rotations/:id/signup
// @access  Private (Student)
export const signupRotation = async (req: Request, res: Response) => {
  try {
    const ClinicalRotation = await loadClinicalRotation();
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid rotation id" });
    }

    if (userRole !== "student") {
      return res.status(403).json({ message: "Only students can sign up for rotations" });
    }

    const rotation = await ClinicalRotation.findById(id);
    if (!rotation) return res.status(404).json({ message: "Clinical rotation not found" });

    if (rotation.rotationStatus !== "active") {
      return res.status(400).json({ message: "Rotation is not open for signup" });
    }

    // Allow multiple students in `students` array; if primary student is set to another person, still allow classmates to join
    if (rotation.student && rotation.student.toString() !== userId && (!rotation.students || !rotation.students.map((s: any) => s.toString()).includes(userId))) {
      // If the rotation is already claimed as primary by another student and the user is not already in participants, forbid claiming as primary
      // Instead, add the current user to the `students` participants array
      rotation.students = rotation.students || [];
      if (!rotation.students.map((s: any) => s.toString()).includes(userId)) {
        rotation.students.push(userId);
      }
    } else {
      // Set primary student if not set or if it's the same user
      rotation.student = userId;
    }
    // allow student to specify a supervisor on signup (optional)
    const { rotationSupervisor } = (req as any).body || {};
    if (rotationSupervisor) {
      rotation.rotationSupervisor = rotationSupervisor;
    }

    // Persist studentName + supervisorName at signup time
    const User = (await import("../models/user")).default;
    const studentUser = await User.findById(userId).select("name").lean();
    const supervisorUser = await User.findById(rotation.rotationSupervisor).select("name").lean();

    rotation.studentName = studentUser?.name ?? "";
    rotation.supervisorName = supervisorUser?.name ?? "";

    await rotation.save();

    await logActivity({
      userId,
      action: "Signed up for rotation",
      details: `Signed up for rotation \"${rotation.rotationName}\" (${rotation._id})`,
    });

    // notify admins about the student signup
    try {
      const admins = await User.find({ role: "admin", isActive: { $ne: false } }).select("_id role").lean();
      if (Array.isArray(admins) && admins.length) {
        const { Notification } = await import("../models/notification");
        const now = new Date();
        const notifications = admins.map((a: any) => ({
          userId: a._id,
          role: a.role || "admin",
          title: `Student signed up: ${rotation.rotationName}`,
          message: `${(req as any).user?.name || "A student"} signed up for ${rotation.rotationName}`,
          type: "info",
          isRead: false,
          link: `/clinical-rotations/${rotation._id}`,
          metadata: { rotationId: rotation._id, studentId: userId },
          createdAt: now,
          updatedAt: now,
        }));
        await Notification.insertMany(notifications);
      }
    } catch (err) {
      console.error("Failed to create signup notifications:", err);
    }

    // notify the selected supervisor on the signup
    try {
      const { Notification } = await import("../models/notification");
      const supervisorId = rotation.rotationSupervisor;
      if (supervisorId) {
        const now = new Date();
        await Notification.create({
          userId: supervisorId,
          role: "teacher",
          title: `Rotation signup: ${rotation.rotationName}`,
          message: `${rotation.studentName} has signed up for the rotation ${rotation.rotationName}`,
          type: "info",
          isRead: false,
          link: `/clinical-rotations/${rotation._id}`,
          metadata: { rotationId: rotation._id, studentId: userId, supervisorId },
          createdAt: now,
          updatedAt: now,
        } as any);
      }
    } catch (err) {
      console.error("Failed to notify supervisor:", err);
    }

    res.json(rotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};


// @desc    List all clinical rotations (no role restriction) for browsing
// @route   GET /api/clinical-rotations/list
// @access  Private
export const listAllRotations = async (req: Request, res: Response) => {
  try {
    const ClinicalRotation = await loadClinicalRotation();
    const userId = (req as any).user?._id;
    const userRole = (req as any).user?.role;
    const { q, rotationType, rotationUnit, rotationStatus, page = 1, limit = 50 } = req.query;
    const filter: any = {};

    if (rotationType) filter.rotationType = rotationType;
    if (rotationUnit) filter.rotationUnit = rotationUnit;
    if (rotationStatus) filter.rotationStatus = rotationStatus;

    if (q && typeof q === 'string') {
      // escape user input before creating RegExp to avoid invalid pattern errors
      const safeQ = q.trim().replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&");
      const regex = new RegExp(safeQ, 'i');
      const regexClauses = [
        { rotationName: regex },
        { rotationDescription: regex },
        { rotationUnit: regex },
      ];
      if (filter.$or && Array.isArray(filter.$or)) filter.$or = filter.$or.concat(regexClauses);
      else filter.$or = regexClauses;
    }

    // If the requester is a student, limit visibility to rotations that are unclaimed by participants OR claimed by anyone in their class OR claimed by the student
    if (userId && userRole === 'student') {
      const rawStudentClasses = (req as any).user?.studentClasses ?? (req as any).user?.studentClass ?? [];
      const classIds = Array.isArray(rawStudentClasses)
        ? rawStudentClasses.map((c: any) => (typeof c === 'string' ? c : c._id))
        : rawStudentClasses
          ? [ (typeof rawStudentClasses === 'string' ? rawStudentClasses : rawStudentClasses._id) ]
          : [];
      let classStudentIds: string[] = [];
      if (classIds.length) {
        const Class = (await import('../models/classes')).default;
        const classes = await Class.find({ _id: { $in: classIds } }).select('students');
        classes.forEach((c: any) => {
          if (Array.isArray(c.students)) classStudentIds.push(...c.students.map((s: any) => s.toString()));
        });
      }

      const orClauses: any[] = [];
      orClauses.push({ students: { $size: 0 } });
      orClauses.push({ students: userId });
      if (classStudentIds.length) orClauses.push({ students: { $in: classStudentIds } });
      orClauses.push({ student: userId });
      if (classStudentIds.length) orClauses.push({ student: { $in: classStudentIds } });
      filter.$or = orClauses;
    }

    const rotations = await ClinicalRotation.find(filter)
      .populate('student', 'name idNumber email')
      .populate('students', 'name idNumber email')
      .populate('rotationSupervisor', 'name email')
      .populate('academicYear', 'name')
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    const total = await ClinicalRotation.countDocuments(filter);
    res.json({ rotations, total, page: +page, limit: +limit });
  } catch (error) {
    console.error(error?.stack || error);
    res.status(500).json({ message: 'Server error', error: String(error) });
  }
};
