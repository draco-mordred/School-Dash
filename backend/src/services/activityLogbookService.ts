import ActivityEntryModel from "../models/activityEntry";
import type { IActivityEntry, UmbrellaCategory } from "../models/activityEntry";
import HospitalStaffModel from "../models/hospitalStaff";
import type { IHospitalStaff } from "../models/hospitalStaff";
import HospitalUnitModel from "../models/hospitalUnit";
import type { IHospitalUnit } from "../models/hospitalUnit";
import RotationPlan from "../models/rotationPlan";
import mongoose from "mongoose";

export interface ActivitySubmissionPayload {
  student: string;
  rotation?: string;
  unit?: string;
  supervisor?: string;
  umbrellaCategory?: UmbrellaCategory;
  entryDate: Date | string;
  clinicsAttended?: boolean;
  wardRoundsAttended?: "NONE" | "RESIDENT_ROUND" | "CONSULTANT_ROUND" | "BOTH";
  callDutyCompleted?: boolean;
  surgicalMetrics?: {
    theatreDaysCount: number;
    casesObserved: string[];
    casesAssisted: string[];
  };
  medicalMetrics?: {
    proceduresWitnessedOrDone: string[];
  };
  notes?: string;
  // Categorisation (clinical logbook trend)
  category?: "clerking" | "theatre" | "clinic" | "ward_round" | "call_duty" | "other";
  categoryLabel?: string;
  title?: string;
  hours?: number;
  groupId?: string;
  groupLabel?: string;
  supervisorName?: string;
}

export class ActivityLogbookService {
  /**
   * Validates that a date falls on a weekday (Monday-Friday)
   */
  private isWeekday(date: Date): boolean {
    const day = date.getDay();
    return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
  }

  /**
   * Validates the umbrella-specific requirements for an activity entry
   */
  private validateUmbrellaRequirements(
    payload: ActivitySubmissionPayload
  ): { valid: boolean; error?: string } {
    // Custom procedure submissions (category set) carry their own
    // categorisation and do not need umbrella metric records.
    if (payload.category) return { valid: true };
    const umbrella = payload.umbrellaCategory ?? "OTHER";
    if (umbrella === "OTHER") return { valid: true };
    if (umbrella === "SURGERY") {
      if (!payload.surgicalMetrics) {
        return {
          valid: false,
          error: "Surgical category postings require theatre metrics (cases observed/assisted).",
        };
      }
      if (
        payload.surgicalMetrics.casesObserved.length === 0 &&
        payload.surgicalMetrics.casesAssisted.length === 0
      ) {
        return {
          valid: false,
          error:
            "At least one case observation or case assistance record is required for surgical postings.",
        };
      }
    } else if (umbrella === "MEDICINE") {
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
  async submitActivityEntry(
    payload: ActivitySubmissionPayload
  ): Promise<{ success: boolean; entryId?: string; error?: string }> {
    try {
      // Validate weekday constraint
      const entryDate = new Date(payload.entryDate);
      if (!this.isWeekday(entryDate)) {
        return {
          success: false,
          error:
            "Clinical activity entries can only be submitted for Monday through Friday.",
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

      const rotationId = payload.rotation;
      if (rotationId && mongoose.Types.ObjectId.isValid(String(rotationId))) {
        let rotationFound = null;
        try {
          rotationFound = await mongoose.connection.collection("clinical_rotations").findOne({
            _id: new mongoose.Types.ObjectId(String(rotationId)),
          });
        } catch (err) {
          // If the posted rotation value is not a valid clinical_rotations document, allow schedule-backed rotationIds for user UI flows.
          rotationFound = null;
        }

        if (!rotationFound) {
          const scheduleWindow = await RotationPlan.findOne({
            _id: new mongoose.Types.ObjectId(String(rotationId)),
          }).lean();

          if (!scheduleWindow) {
            return { success: false, error: "Clinical rotation not found." };
          }
        }
      }

      let unit: IHospitalUnit | null = null;
      if (payload.unit) {
        unit = await HospitalUnitModel.findById(payload.unit);
        if (!unit) {
          return { success: false, error: "Hospital unit not found." };
        }
      }

      // Create the activity entry
      const entry = await ActivityEntryModel.create({
        student: payload.student,
        rotation: payload.rotation ?? null,
        ...(payload.unit ? { unit: payload.unit } : {}),
        supervisor: payload.supervisor,
        umbrellaCategory: payload.umbrellaCategory ?? "OTHER",
        entryDate,
        clinicsAttended: payload.clinicsAttended ?? false,
        wardRoundsAttended: payload.wardRoundsAttended ?? "NONE",
        callDutyCompleted: payload.callDutyCompleted ?? false,
        surgicalMetrics: payload.surgicalMetrics,
        medicalMetrics: payload.medicalMetrics,
        notes: payload.notes,
        // Categorisation (clinical logbook trend)
        category: payload.category ?? "other",
        categoryLabel: payload.categoryLabel ?? "",
        title: payload.title ?? "",
        hours: payload.hours ?? 8,
        groupId: payload.groupId ?? "",
        groupLabel: payload.groupLabel ?? "",
        supervisorName: payload.supervisorName ?? "",
        source: "manual",
        approvalStatus: "pending",
      });

      return {
        success: true,
        entryId: entry._id.toString(),
      };
    } catch (error) {
      console.error("Error submitting activity entry:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to submit activity entry.",
      };
    }
  }

  /**
   * Approve an activity entry (sign-off by staff)
   */
  async approveActivityEntry(
    entryId: string,
    staffId: string,
    role: "RESIDENT" | "CONSULTANT"
  ): Promise<{ success: boolean; error?: string }> {
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
          error:
            "This staff member does not have permission to approve logbook entries.",
        };
      }

      // Validate that staff is assigned to the unit (if unit present)
      if (entry.unit) {
        if (
          !staff.assignedUnits.some(
            (unitId) => unitId.toString() === entry.unit?.toString()
          )
        ) {
          return {
            success: false,
            error:
              "This staff member is not assigned to the unit where this activity occurred.",
          };
        }
      }

      // Update the entry with approval
      entry.approvalStatus = "approved";
      entry.approvedBy = new mongoose.Types.ObjectId(staffId);
      entry.approvedByRole = role;
      entry.approvedAt = new Date();
      await entry.save();

      return { success: true };
    } catch (error) {
      console.error("Error approving activity entry:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to approve activity entry.",
      };
    }
  }

  /**
   * Reject an activity entry with reason
   */
  async rejectActivityEntry(
    entryId: string,
    staffId: string,
    rejectionReason: string
  ): Promise<{ success: boolean; error?: string }> {
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
    } catch (error) {
      console.error("Error rejecting activity entry:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to reject activity entry.",
      };
    }
  }

  /**
   * Get pending activity entries for a staff member to review
   */
  async getPendingEntriesForStaff(
    staffId: string,
    limit = 20,
    skip = 0
  ): Promise<{ success: boolean; entries?: any[]; total?: number; error?: string }> {
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
    } catch (error) {
      console.error("Error fetching pending entries:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch pending entries.",
      };
    }
  }

  /**
   * Get all approved entries for a student in a rotation
   */
  async getStudentRotationLogbook(
    studentId: string,
    rotationId?: string
  ): Promise<{ success: boolean; entries?: any[]; error?: string }> {
    try {
      const query: any = { student: studentId, approvalStatus: "approved" };
      if (rotationId) query.rotation = rotationId;

      const entries = await ActivityEntryModel.find(query)
        .populate("unit", "name department umbrellaCategory")
        .populate("approvedBy", "name designation")
        .sort({ entryDate: 1 });

      return { success: true, entries };
    } catch (error) {
      console.error("Error fetching logbook:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch logbook.",
      };
    }
  }

  /**
   * Get all entries for a student (any approval status), optionally filtered by rotation
   */
  async getStudentLogbookAll(
    studentId: string,
    rotationId?: string
  ): Promise<{ success: boolean; entries?: any[]; error?: string }> {
    try {
      const query: any = { student: studentId };
      if (rotationId) query.rotation = rotationId;

      const entries = await ActivityEntryModel.find(query)
        .populate("unit", "name department umbrellaCategory")
        .populate("approvedBy", "name designation")
        .sort({ entryDate: 1 });

      return { success: true, entries };
    } catch (error) {
      console.error("Error fetching student logbook (all statuses):", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch logbook.",
      };
    }
  }

  /**
   * Auto-sign logbook entries from a completed clinical attendance session.
   *
   * Rounds, theatre and clinics are signed based on the attendance schedule
   * for the day: when the student's team attendance is recorded present/late
   * for a session, a logbook entry is saved for that category with the date,
   * the student's team and the supervisor's name — already signed (approved).
   */
  async recordAttendanceLogbookEntries(session: {
    _id: any;
    activityType: string;
    title: string;
    date: Date | string;
    duration?: number | null;
    supervisor?: any;
    supervisorName?: string;
    supervisorGroupId?: string | null;
    supervisorGroupLabel?: string;
    clinicalRotation?: any;
    academicYear?: any;
    attendees: Array<{ student: any; status: string }>;
  }): Promise<{ success: boolean; created?: number; error?: string }> {
    try {
      const CATEGORY_BY_ACTIVITY: Record<string, string> = {
        ward_round: "ward_round",
        clinic: "clinic",
        theatre: "theatre",
        call_duty: "call_duty",
        procedure: "other",
        practical: "other",
        simulation: "other",
      };
      const category = CATEGORY_BY_ACTIVITY[session.activityType] ?? "other";
      const categoryLabel = String(session.activityType ?? "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      const hours = session.duration
        ? Math.max(1, Math.round((Number(session.duration) / 60) * 10) / 10)
        : 8;
      const signedAt = new Date();
      const supervisorName =
        session.supervisorName ||
        (typeof session.supervisor === "object" ? String(session.supervisor?.name ?? "") : "");

      const presentAttendees = (session.attendees ?? []).filter((attendee) =>
        ["present", "late"].includes(String(attendee.status ?? ""))
      );

      let created = 0;
      for (const attendee of presentAttendees) {
        const studentId = String(
          typeof attendee.student === "object" ? attendee.student?._id : attendee.student
        );
        if (!studentId) continue;

        // Idempotent: one auto logbook entry per student per session.
        const existing = await ActivityEntryModel.findOne({
          clinicalSessionId: session._id,
          student: studentId,
        }).lean();
        if (existing) continue;

        await ActivityEntryModel.create({
          student: studentId,
          rotation: session.clinicalRotation ?? null,
          umbrellaCategory: "OTHER",
          entryDate: new Date(session.date),
          category,
          categoryLabel,
          title: session.title || categoryLabel,
          hours,
          groupId: session.supervisorGroupId ? String(session.supervisorGroupId) : "",
          groupLabel: session.supervisorGroupLabel || "",
          supervisorName,
          source: "clinical_attendance",
          clinicalSessionId: session._id,
          autoSigned: true,
          approvalStatus: "approved",
          approvedAt: signedAt,
        });
        created += 1;
      }

      return { success: true, created };
    } catch (error) {
      console.error("Error recording attendance logbook entries:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to record logbook entries.",
      };
    }
  }
}

export default new ActivityLogbookService();
