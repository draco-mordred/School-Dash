import { type Request, type Response } from "express";
import mongoose from "mongoose";
import ComplianceRule from "../models/complianceRule";
import ComplianceLog from "../models/complianceLog";
import User from "../models/user";
import ClassModel from "../models/classes";
import { 
  validateCompliance, 
  getUnifiedAttendanceReport, 
  getClassComplianceSummary 
} from "../subs/tinasha/krystaLatifahSync";
import { emitSystemEvent } from "../events";
import { logActivity } from "../utils/activitieslog";

/**
 * Compliance Controller
 * Manages attendance compliance rules and violations
 */

// Helper to extract user from request
const getRequestUser = (req: Request) => (req as any).user;

/**
 * Create a new compliance rule
 * POST /api/compliance/rules
 */
export const createComplianceRule = async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    
    if (!user || user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can create compliance rules",
      });
    }
    
    const {
      name,
      description,
      ruleType,
      severity = "warning",
      isActive = true,
      conditions = {},
      appliesTo = {},
      actions = {},
    } = req.body;
    
    if (!name || !description || !ruleType) {
      return res.status(400).json({
        success: false,
        message: "name, description, and ruleType are required",
      });
    }
    
    // Check if rule name already exists
    const existingRule = await ComplianceRule.findOne({ name });
    if (existingRule) {
      return res.status(409).json({
        success: false,
        message: "A compliance rule with this name already exists",
      });
    }
    
    const rule = await ComplianceRule.create({
      name,
      description,
      ruleType,
      severity,
      isActive,
      conditions,
      appliesTo,
      actions,
      createdBy: user._id,
    });
    
    await logActivity({
      userId: user._id,
      action: "Created compliance rule",
      details: `Created rule: ${name}`,
    });
    
    emitSystemEvent("compliance.rule.created", {
      ruleId: rule._id.toString(),
      name,
      ruleType,
    });
    
    return res.status(201).json({
      success: true,
      message: "Compliance rule created successfully",
      data: rule,
    });
  } catch (error: any) {
    console.error("Error creating compliance rule:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating compliance rule",
      error: error.message,
    });
  }
};

/**
 * Get all compliance rules
 * GET /api/compliance/rules
 */
export const getAllComplianceRules = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, isActive, ruleType, classId } = req.query;
    
    const filter: any = {};
    
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }
    
    if (ruleType) {
      filter.ruleType = ruleType;
    }
    
    if (classId) {
      filter.$or = [
        { "appliesTo.allClasses": true },
        { "appliesTo.classes": new mongoose.Types.ObjectId(String(classId)) },
      ];
    }
    
    const rules = await ComplianceRule.find(filter)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    
    const total = await ComplianceRule.countDocuments(filter);
    
    return res.status(200).json({
      success: true,
      data: rules,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Error fetching compliance rules:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching compliance rules",
      error: error.message,
    });
  }
};

/**
 * Get a single compliance rule
 * GET /api/compliance/rules/:id
 */
export const getComplianceRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const rule = await ComplianceRule.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Compliance rule not found",
      });
    }
    
    return res.status(200).json({
      success: true,
      data: rule,
    });
  } catch (error: any) {
    console.error("Error fetching compliance rule:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching compliance rule",
      error: error.message,
    });
  }
};

/**
 * Update a compliance rule
 * PATCH /api/compliance/rules/:id
 */
export const updateComplianceRule = async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    
    if (!user || user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can update compliance rules",
      });
    }
    
    const { id } = req.params;
    const updates = req.body;
    
    const rule = await ComplianceRule.findByIdAndUpdate(
      id,
      {
        ...updates,
        updatedBy: user._id,
      },
      { new: true, runValidators: true }
    );
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Compliance rule not found",
      });
    }
    
    await logActivity({
      userId: user._id,
      action: "Updated compliance rule",
      details: `Updated rule: ${rule.name}`,
    });
    
    emitSystemEvent("compliance.rule.updated", {
      ruleId: rule._id.toString(),
      name: rule.name,
    });
    
    return res.status(200).json({
      success: true,
      message: "Compliance rule updated successfully",
      data: rule,
    });
  } catch (error: any) {
    console.error("Error updating compliance rule:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating compliance rule",
      error: error.message,
    });
  }
};

/**
 * Delete a compliance rule
 * DELETE /api/compliance/rules/:id
 */
export const deleteComplianceRule = async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    
    if (!user || user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can delete compliance rules",
      });
    }
    
    const { id } = req.params;
    
    const rule = await ComplianceRule.findByIdAndDelete(id);
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Compliance rule not found",
      });
    }
    
    await logActivity({
      userId: user._id,
      action: "Deleted compliance rule",
      details: `Deleted rule: ${rule.name}`,
    });
    
    emitSystemEvent("compliance.rule.deleted", {
      ruleId: rule._id.toString(),
      name: rule.name,
    });
    
    return res.status(200).json({
      success: true,
      message: "Compliance rule deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting compliance rule:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting compliance rule",
      error: error.message,
    });
  }
};

/**
 * Manually trigger compliance check for a student
 * POST /api/compliance/check
 */
export const triggerComplianceCheck = async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const { studentId, classId, academicYear } = req.body;
    
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    
    // Students can only check their own compliance
    // Teachers/admins can check any student in their class
    const targetStudent = studentId || user._id;
    const targetClass = classId || user.studentClasses?.[0]?._id || user.studentClass?._id;
    const targetYear = academicYear || user.academicYear?._id;
    
    if (!targetClass) {
      return res.status(400).json({
        success: false,
        message: "Class information is required",
      });
    }
    
    // Verify access
    if (user.role === "student" && user._id.toString() !== targetStudent.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only check your own compliance",
      });
    }
    
    if (user.role === "teacher" && user.teacherSubject) {
      // Check if student is in teacher's class
      const student = await User.findById(targetStudent).select("studentClasses");
      if (!student?.studentClasses?.some((c) => c.toString() === targetClass.toString())) {
        return res.status(403).json({
          success: false,
          message: "This student is not in your class",
        });
      }
    }
    
    const result = await validateCompliance({
      student: new mongoose.Types.ObjectId(targetStudent),
      classId: new mongoose.Types.ObjectId(targetClass),
      academicYear: new mongoose.Types.ObjectId(targetYear),
    });
    
    await logActivity({
      userId: user._id,
      action: "Triggered compliance check",
      details: `Checked compliance for student ${targetStudent} in class ${targetClass}`,
    });
    
    return res.status(200).json({
      success: true,
      message: `Found ${result.violations.length} compliance violations`,
      violations: result.violations,
    });
  } catch (error: any) {
    console.error("Error triggering compliance check:", error);
    return res.status(500).json({
      success: false,
      message: "Error triggering compliance check",
      error: error.message,
    });
  }
};

/**
 * Get compliance violations for a student
 * GET /api/compliance/violations
 */
export const getStudentViolations = async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const { studentId, classId, startDate, endDate, status, severity } = req.query;
    
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    
    const targetStudent = studentId || user._id;
    const targetClass = classId || user.studentClasses?.[0]?._id || user.studentClass?._id;
    
    if (!targetClass) {
      return res.status(400).json({
        success: false,
        message: "Class information is required",
      });
    }
    
    const filter: any = {
      student: new mongoose.Types.ObjectId(targetStudent),
      classId: new mongoose.Types.ObjectId(targetClass),
    };
    
    if (startDate) {
      filter.createdAt = { $gte: new Date(String(startDate)) };
    }
    
    if (endDate) {
      if (!filter.createdAt) filter.createdAt = {};
      filter.createdAt.$lte = new Date(String(endDate));
    }
    
    if (status) {
      filter.status = status;
    }
    
    if (severity) {
      filter.severity = severity;
    }
    
    const violations = await ComplianceLog.find(filter)
      .populate("complianceRuleId", "name description ruleType")
      .populate("lectureSessionId", "course subject date")
      .populate("clinicalSessionId", "title activityType startTime")
      .sort({ createdAt: -1 });
    
    const total = await ComplianceLog.countDocuments(filter);
    
    return res.status(200).json({
      success: true,
      data: violations,
      total,
    });
  } catch (error: any) {
    console.error("Error fetching student violations:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching student violations",
      error: error.message,
    });
  }
};

/**
 * Get compliance summary for a class (admin/teacher view)
 * GET /api/compliance/summary/:classId
 */
export const getClassComplianceSummary = async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const { classId } = req.params;
    const { academicYear, startDate, endDate } = req.query;
    
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    
    // Verify user has access to this class
    if (user.role !== "admin" && user.role !== "teacher") {
      const studentClass = user.studentClasses?.[0]?._id || user.studentClass?._id;
      if (studentClass !== classId) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this class",
        });
      }
    }
    
    const result = await getClassComplianceSummary(
      new mongoose.Types.ObjectId(classId),
      academicYear ? new mongoose.Types.ObjectId(String(academicYear)) : user.academicYear?._id,
      startDate ? new Date(String(startDate)) : undefined,
      endDate ? new Date(String(endDate)) : undefined
    );
    
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error fetching class compliance summary:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching class compliance summary",
      error: error.message,
    });
  }
};

/**
 * Get unified attendance report for a student
 * GET /api/compliance/report
 */
export const getUnifiedAttendanceReport = async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const { studentId, classId, academicYear, startDate, endDate } = req.query;
    
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    
    const targetStudent = studentId || user._id;
    const targetClass = classId || user.studentClasses?.[0]?._id || user.studentClass?._id;
    const targetYear = academicYear || user.academicYear?._id;
    
    if (!targetClass) {
      return res.status(400).json({
        success: false,
        message: "Class information is required",
      });
    }
    
    // Verify access
    if (user.role === "student" && user._id.toString() !== targetStudent.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own attendance report",
      });
    }
    
    const result = await getUnifiedAttendanceReport(
      new mongoose.Types.ObjectId(targetStudent),
      new mongoose.Types.ObjectId(targetClass),
      new mongoose.Types.ObjectId(targetYear),
      startDate ? new Date(String(startDate)) : undefined,
      endDate ? new Date(String(endDate)) : undefined
    );
    
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error generating unified attendance report:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating unified attendance report",
      error: error.message,
    });
  }
};

/**
 * Resolve a compliance violation
 * PATCH /api/compliance/violations/:id
 */
export const resolveComplianceViolation = async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const { id } = req.params;
    const { status, resolutionNotes } = req.body;
    
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    
    const violation = await ComplianceLog.findById(id);
    if (!violation) {
      return res.status(404).json({
        success: false,
        message: "Compliance violation not found",
      });
    }
    
    // Only admin, teacher, or the student can update their own violations
    const isStudent = user._id.toString() === violation.student.toString();
    const isTeacher = user.role === "teacher";
    const isAdmin = user.role === "admin";
    
    if (!isStudent && !isTeacher && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this violation",
      });
    }
    
    // Students can only acknowledge, not fully resolve
    if (isStudent && !isTeacher && !isAdmin && status !== "acknowledged") {
      return res.status(403).json({
        success: false,
        message: "Students can only acknowledge violations, not resolve them",
      });
    }
    
    const validStatuses = ["open", "resolved", "acknowledged", "escalated", "waived"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }
    
    const updates: any = {
      status,
      resolvedBy: user._id,
      resolvedAt: new Date(),
    };
    
    if (resolutionNotes) {
      updates.resolutionNotes = resolutionNotes;
    }
    
    const updated = await ComplianceLog.findByIdAndUpdate(id, updates, { new: true });
    
    await logActivity({
      userId: user._id,
      action: "Resolved compliance violation",
      details: `Updated violation ${id} to status: ${status}`,
    });
    
    emitSystemEvent("compliance.violation.resolved", {
      violationId: id,
      status,
      resolvedBy: user._id.toString(),
    });
    
    return res.status(200).json({
      success: true,
      message: "Compliance violation updated successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Error resolving compliance violation:", error);
    return res.status(500).json({
      success: false,
      message: "Error resolving compliance violation",
      error: error.message,
    });
  }
};

/**
 * Escalate a compliance violation
 * POST /api/compliance/violations/:id/escalate
 */
export const escalateComplianceViolation = async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const { id } = req.params;
    const { escalationLevel, notes } = req.body;
    
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    
    // Only teachers and admins can escalate
    if (!["admin", "teacher"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only teachers and administrators can escalate violations",
      });
    }
    
    const violation = await ComplianceLog.findById(id);
    if (!violation) {
      return res.status(404).json({
        success: false,
        message: "Compliance violation not found",
      });
    }
    
    const newLevel = escalationLevel || violation.escalationLevel + 1;
    
    // Determine who to escalate to
    let escalateTo: mongoose.Types.ObjectId[] = [];
    if (newLevel === 1) {
      // Escalate to class teacher
      const cls = await ClassModel.findById(violation.classId).select("classTeacher");
      if (cls?.classTeacher) {
        escalateTo.push(cls.classTeacher);
      }
    } else if (newLevel >= 2) {
      // Escalate to admins
      const admins = await User.find({ role: "admin" }).select("_id");
      escalateTo = admins.map((a) => a._id);
    }
    
    const updated = await ComplianceLog.findByIdAndUpdate(
      id,
      {
        status: "escalated",
        escalationLevel: newLevel,
        $addToSet: { escalatedTo: { $each: escalateTo } },
        resolutionNotes: notes || violation.resolutionNotes,
      },
      { new: true }
    );
    
    await logActivity({
      userId: user._id,
      action: "Escalated compliance violation",
      details: `Escalated violation ${id} to level ${newLevel}`,
    });
    
    emitSystemEvent("compliance.violation.escalated", {
      violationId: id,
      newLevel,
      escalatedTo: escalateTo.map((id) => id.toString()),
    });
    
    return res.status(200).json({
      success: true,
      message: "Compliance violation escalated successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Error escalating compliance violation:", error);
    return res.status(500).json({
      success: false,
      message: "Error escalating compliance violation",
      error: error.message,
    });
  }
};

/**
 * Get compliance dashboard statistics
 * GET /api/compliance/dashboard
 */
export const getComplianceDashboard = async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    
    let filter: any = {};
    
    if (user.role === "student") {
      filter.student = user._id;
      filter.classId = user.studentClasses?.[0]?._id;
    } else if (user.role === "teacher") {
      // Get classes taught by this teacher
      const classes = await ClassModel.find({
        classTeacher: user._id,
      }).select("_id");
      const classIds = classes.map((c) => c._id);
      
      if (classIds.length > 0) {
        filter.classId = { $in: classIds };
      } else {
        // If no classes as teacher, check student classes
        const studentClass = user.studentClasses?.[0]?._id;
        if (studentClass) {
          filter.classId = studentClass;
        }
      }
    }
    // Admin sees all
    
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Total violations this week
    const weeklyViolations = await ComplianceLog.countDocuments({
      ...filter,
      createdAt: { $gte: startOfWeek },
    });
    
    // Violations by severity
    const bySeverity = await ComplianceLog.aggregate([
      { $match: filter },
      { $group: { _id: "$severity", count: { $sum: 1 } } },
    ]);
    
    // Violations by type
    const byType = await ComplianceLog.aggregate([
      { $match: filter },
      { $group: { _id: "$logType", count: { $sum: 1 } } },
    ]);
    
    // Open vs resolved
    const byStatus = await ComplianceLog.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    
    // Recent violations
    const recentViolations = await ComplianceLog.find(filter)
      .populate("student", "name idNumber")
      .populate("classId", "name")
      .sort({ createdAt: -1 })
      .limit(10);
    
    const stats = {
      weeklyViolations,
      bySeverity: bySeverity.reduce((acc: any, curr: any) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      byType: byType.reduce((acc: any, curr: any) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      byStatus: byStatus.reduce((acc: any, curr: any) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
    };
    
    return res.status(200).json({
      success: true,
      statistics: stats,
      recentViolations,
    });
  } catch (error: any) {
    console.error("Error fetching compliance dashboard:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching compliance dashboard",
      error: error.message,
    });
  }
};

export default {
  createComplianceRule,
  getAllComplianceRules,
  getComplianceRule,
  updateComplianceRule,
  deleteComplianceRule,
  triggerComplianceCheck,
  getStudentViolations,
  getClassComplianceSummary,
  getUnifiedAttendanceReport,
  resolveComplianceViolation,
  escalateComplianceViolation,
  getComplianceDashboard,
};
