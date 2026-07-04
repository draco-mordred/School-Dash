import ActivityEntryModel from "../models/activityEntry";
import HospitalStaffModel from "../models/hospitalStaff";
import HospitalUnitModel from "../models/hospitalUnit";
import mongoose from "mongoose";
export class ActivityLogbookService {
    /**
     * Validates that a date falls on a weekday (Monday-Friday)
     */
    isWeekday(date) {
        const day = date.getDay();
        return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
    }
    /**
     * Validates the umbrella-specific requirements for an activity entry
     */
    validateUmbrellaRequirements(payload) {
        if (payload.umbrellaCategory === "SURGERY") {
            if (!payload.surgicalMetrics) {
                return {
                    valid: false,
                    error: "Surgical category postings require theatre metrics (cases observed/assisted).",
                };
            }
            if (payload.surgicalMetrics.casesObserved.length === 0 &&
                payload.surgicalMetrics.casesAssisted.length === 0) {
                return {
                    valid: false,
                    error: "At least one case observation or case assistance record is required for surgical postings.",
                };
            }
        }
        else if (payload.umbrellaCategory === "MEDICINE") {
            if (!payload.medicalMetrics) {
                return {
                    valid: false,
                    error: "Medical category postings require procedure records.",
                };
            }
            if (payload.medicalMetrics.proceduresWitnessedOrDone.length === 0) {
                return {
                    valid: false,
                    error: "At least one procedure record is required for medical postings.",
                };
            }
        }
        return { valid: true };
    }
    /**
     * Submit a new activity entry for a student
     */
    async submitActivityEntry(payload) {
        try {
            // Validate weekday constraint
            const entryDate = new Date(payload.entryDate);
            if (!this.isWeekday(entryDate)) {
                return {
                    success: false,
                    error: "Clinical activity entries can only be submitted for Monday through Friday.",
                };
            }
            // Validate umbrella requirements
            const umbrellaCheck = this.validateUmbrellaRequirements(payload);
            if (!umbrellaCheck.valid) {
                return { success: false, error: umbrellaCheck.error };
            }
            // Validate that student, rotation, and unit exist
            const student = await mongoose.connection.collection("users").findOne({
                _id: new mongoose.Types.ObjectId(payload.student),
            });
            if (!student) {
                return { success: false, error: "Student not found." };
            }
            const rotation = await mongoose.connection.collection("clinical_rotations").findOne({
                _id: new mongoose.Types.ObjectId(payload.rotation),
            });
            if (!rotation) {
                return { success: false, error: "Clinical rotation not found." };
            }
            const unit = await HospitalUnitModel.findById(payload.unit);
            if (!unit) {
                return { success: false, error: "Hospital unit not found." };
            }
            // Create the activity entry
            const entry = await ActivityEntryModel.create({
                student: payload.student,
                rotation: payload.rotation,
                unit: payload.unit,
                supervisor: payload.supervisor,
                umbrellaCategory: payload.umbrellaCategory,
                entryDate,
                clinicsAttended: payload.clinicsAttended,
                wardRoundsAttended: payload.wardRoundsAttended,
                callDutyCompleted: payload.callDutyCompleted,
                surgicalMetrics: payload.surgicalMetrics,
                medicalMetrics: payload.medicalMetrics,
                notes: payload.notes,
                approvalStatus: "pending",
            });
            return {
                success: true,
                entryId: entry._id.toString(),
            };
        }
        catch (error) {
            console.error("Error submitting activity entry:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Failed to submit activity entry.",
            };
        }
    }
    /**
     * Approve an activity entry (sign-off by staff)
     */
    async approveActivityEntry(entryId, staffId, role) {
        try {
            // Validate that the entry exists
            const entry = await ActivityEntryModel.findById(entryId);
            if (!entry) {
                return { success: false, error: "Activity entry not found." };
            }
            // Prevent double approval
            if (entry.approvalStatus === "approved") {
                return { success: false, error: "This entry has already been approved." };
            }
            // Validate that the staff member exists and has the required role
            const staff = await HospitalStaffModel.findById(staffId);
            if (!staff) {
                return { success: false, error: "Staff member not found." };
            }
            if (!staff.canApproveLogbooks) {
                return {
                    success: false,
                    error: "This staff member does not have permission to approve logbook entries.",
                };
            }
            // Validate that staff is assigned to the unit
            if (!staff.assignedUnits.some((unitId) => unitId.toString() === entry.unit.toString())) {
                return {
                    success: false,
                    error: "This staff member is not assigned to the unit where this activity occurred.",
                };
            }
            // Update the entry with approval
            entry.approvalStatus = "approved";
            entry.approvedBy = new mongoose.Types.ObjectId(staffId);
            entry.approvedByRole = role;
            entry.approvedAt = new Date();
            await entry.save();
            return { success: true };
        }
        catch (error) {
            console.error("Error approving activity entry:", error);
            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Failed to approve activity entry.",
            };
        }
    }
    /**
     * Reject an activity entry with reason
     */
    async rejectActivityEntry(entryId, staffId, rejectionReason) {
        try {
            const entry = await ActivityEntryModel.findById(entryId);
            if (!entry) {
                return { success: false, error: "Activity entry not found." };
            }
            if (entry.approvalStatus === "approved") {
                return {
                    success: false,
                    error: "Cannot reject an already-approved entry.",
                };
            }
            const staff = await HospitalStaffModel.findById(staffId);
            if (!staff) {
                return { success: false, error: "Staff member not found." };
            }
            entry.approvalStatus = "rejected";
            entry.rejectionReason = rejectionReason;
            entry.approvedBy = new mongoose.Types.ObjectId(staffId);
            entry.approvedAt = new Date();
            await entry.save();
            return { success: true };
        }
        catch (error) {
            console.error("Error rejecting activity entry:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Failed to reject activity entry.",
            };
        }
    }
    /**
     * Get pending activity entries for a staff member to review
     */
    async getPendingEntriesForStaff(staffId, limit = 20, skip = 0) {
        try {
            const staff = await HospitalStaffModel.findById(staffId);
            if (!staff) {
                return { success: false, error: "Staff member not found." };
            }
            const total = await ActivityEntryModel.countDocuments({
                unit: { $in: staff.assignedUnits },
                approvalStatus: "pending",
            });
            const entries = await ActivityEntryModel.find({
                unit: { $in: staff.assignedUnits },
                approvalStatus: "pending",
            })
                .populate("student", "name email")
                .populate("rotation", "rotationName rotationType")
                .populate("unit", "name department")
                .sort({ entryDate: -1 })
                .limit(limit)
                .skip(skip);
            return { success: true, entries, total };
        }
        catch (error) {
            console.error("Error fetching pending entries:", error);
            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Failed to fetch pending entries.",
            };
        }
    }
    /**
     * Get all approved entries for a student in a rotation
     */
    async getStudentRotationLogbook(studentId, rotationId) {
        try {
            const entries = await ActivityEntryModel.find({
                student: studentId,
                rotation: rotationId,
                approvalStatus: "approved",
            })
                .populate("unit", "name department umbrellaCategory")
                .populate("approvedBy", "name designation")
                .sort({ entryDate: 1 });
            return { success: true, entries };
        }
        catch (error) {
            console.error("Error fetching logbook:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch logbook.",
            };
        }
    }
}
export default new ActivityLogbookService();
