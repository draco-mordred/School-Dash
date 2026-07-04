import activityLogbookService from "../services/activityLogbookService";
import ActivityEntryModel from "../models/activityEntry";
import mongoose from "mongoose";
/**
 * POST /activity-entries
 * Submit a new clinical activity entry
 */
export const createActivityEntry = async (req, res) => {
    try {
        const { student, rotation, unit, umbrellaCategory, entryDate, clinicsAttended, wardRoundsAttended, callDutyCompleted, surgicalMetrics, medicalMetrics, notes } = req.body;
        // Extract student ID from JWT if not provided
        const studentId = student || req.user?._id;
        if (!studentId) {
            return res.status(400).json({ error: "Student ID is required." });
        }
        const result = await activityLogbookService.submitActivityEntry({
            student: studentId,
            rotation,
            unit,
            umbrellaCategory,
            entryDate,
            clinicsAttended,
            wardRoundsAttended,
            callDutyCompleted,
            surgicalMetrics,
            medicalMetrics,
            notes,
        });
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }
        return res.status(201).json({ message: "Activity entry submitted successfully.", entryId: result.entryId });
    }
    catch (error) {
        console.error("Error creating activity entry:", error);
        return res.status(500).json({ error: "Failed to create activity entry." });
    }
};
/**
 * GET /activity-entries/pending
 * Get pending entries for the authenticated staff member
 */
export const getPendingEntries = async (req, res) => {
    try {
        const staffId = req.user?._id;
        if (!staffId) {
            return res.status(401).json({ error: "Unauthorized." });
        }
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = parseInt(req.query.skip) || 0;
        const result = await activityLogbookService.getPendingEntriesForStaff(staffId, limit, skip);
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }
        return res.status(200).json({ entries: result.entries, total: result.total });
    }
    catch (error) {
        console.error("Error fetching pending entries:", error);
        return res.status(500).json({ error: "Failed to fetch pending entries." });
    }
};
/**
 * GET /activity-entries/logbook/:studentId/:rotationId
 * Get all approved entries for a student's rotation
 */
export const getStudentLogbook = async (req, res) => {
    try {
        const { studentId, rotationId } = req.params;
        const result = await activityLogbookService.getStudentRotationLogbook(studentId, rotationId);
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }
        return res.status(200).json({ entries: result.entries });
    }
    catch (error) {
        console.error("Error fetching logbook:", error);
        return res.status(500).json({ error: "Failed to fetch logbook." });
    }
};
/**
 * POST /activity-entries/:entryId/approve
 * Approve an activity entry (staff sign-off)
 */
export const approveActivityEntry = async (req, res) => {
    try {
        const { entryId } = req.params;
        const staffId = req.user?._id;
        const userRole = req.user?.role;
        if (!staffId) {
            return res.status(401).json({ error: "Unauthorized." });
        }
        if (userRole !== "unitconsultant" && userRole !== "unitresident") {
            return res.status(403).json({ error: "Only clinical staff can approve entries." });
        }
        const approverRole = userRole === "unitconsultant" ? "CONSULTANT" : "RESIDENT";
        const result = await activityLogbookService.approveActivityEntry(entryId, staffId, approverRole);
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }
        return res.status(200).json({ message: "Activity entry approved successfully." });
    }
    catch (error) {
        console.error("Error approving activity entry:", error);
        return res.status(500).json({ error: "Failed to approve activity entry." });
    }
};
/**
 * POST /activity-entries/:entryId/reject
 * Reject an activity entry with reason
 */
export const rejectActivityEntry = async (req, res) => {
    try {
        const { entryId } = req.params;
        const { rejectionReason } = req.body;
        const staffId = req.user?._id;
        const userRole = req.user?.role;
        if (!staffId) {
            return res.status(401).json({ error: "Unauthorized." });
        }
        if (userRole !== "unitconsultant" && userRole !== "unitresident") {
            return res.status(403).json({ error: "Only clinical staff can reject entries." });
        }
        if (!rejectionReason) {
            return res.status(400).json({ error: "Rejection reason is required." });
        }
        const result = await activityLogbookService.rejectActivityEntry(entryId, staffId, rejectionReason);
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }
        return res.status(200).json({ message: "Activity entry rejected." });
    }
    catch (error) {
        console.error("Error rejecting activity entry:", error);
        return res.status(500).json({ error: "Failed to reject activity entry." });
    }
};
/**
 * GET /activity-entries/:entryId
 * Get details of a specific activity entry
 */
export const getActivityEntry = async (req, res) => {
    try {
        const { entryId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(entryId)) {
            return res.status(400).json({ error: "Invalid entry ID." });
        }
        const entry = await ActivityEntryModel.findById(entryId)
            .populate("student", "name email idNumber")
            .populate("rotation", "rotationName rotationType rotationUnit")
            .populate("unit", "name department umbrellaCategory")
            .populate("approvedBy", "name designation");
        if (!entry) {
            return res.status(404).json({ error: "Activity entry not found." });
        }
        return res.status(200).json({ entry });
    }
    catch (error) {
        console.error("Error fetching activity entry:", error);
        return res.status(500).json({ error: "Failed to fetch activity entry." });
    }
};
/**
 * GET /activity-entries
 * List activity entries with filtering
 */
export const listActivityEntries = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = parseInt(req.query.skip) || 0;
        const status = req.query.status;
        const studentId = req.query.studentId;
        const unitId = req.query.unitId;
        const filter = {};
        if (status)
            filter.approvalStatus = status;
        if (studentId)
            filter.student = studentId;
        if (unitId)
            filter.unit = unitId;
        const total = await ActivityEntryModel.countDocuments(filter);
        const entries = await ActivityEntryModel.find(filter)
            .populate("student", "name email")
            .populate("unit", "name department")
            .populate("approvedBy", "name designation")
            .sort({ entryDate: -1 })
            .limit(limit)
            .skip(skip);
        return res.status(200).json({ entries, total, page: Math.floor(skip / limit) + 1, pages: Math.ceil(total / limit) });
    }
    catch (error) {
        console.error("Error listing activity entries:", error);
        return res.status(500).json({ error: "Failed to list activity entries." });
    }
};
