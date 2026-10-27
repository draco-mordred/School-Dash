import mongoose, { Schema, Document } from "mongoose";

// Phase E — student complaints about auto-generated lecture attendance
// records (no-show unverified, out-of-range Present, lecturer-missing).
// Routed to the session's lecturer, who alone sets the final status of
// auto records (D13 — admins are read-only).

export interface IAttendanceComplaint extends Document {
  student: mongoose.Types.ObjectId;
  record: mongoose.Types.ObjectId; // Attendance record complained about
  session: mongoose.Types.ObjectId; // LectureSession it belongs to
  lecturer: mongoose.Types.ObjectId | null;
  message: string;
  status: "open" | "resolved" | "dismissed";
  resolution: {
    finalStatus: "present" | "absent" | null;
    note: string;
    resolvedBy: mongoose.Types.ObjectId | null;
    resolvedAt: Date | null;
  };
}

const attendanceComplaintSchema = new Schema<IAttendanceComplaint>(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    record: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
      required: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LectureSession",
      required: true,
    },
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["open", "resolved", "dismissed"],
      default: "open",
    },
    resolution: {
      finalStatus: {
        type: String,
        enum: ["present", "absent", null],
        default: null,
      },
      note: { type: String, default: "" },
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      resolvedAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

// Fast queue lookups: one open complaint per record, per-lecturer queue,
// per-student history.
attendanceComplaintSchema.index({ record: 1, status: 1 });
attendanceComplaintSchema.index({ lecturer: 1, status: 1, createdAt: -1 });
attendanceComplaintSchema.index({ student: 1, createdAt: -1 });

// Transient communication: complaints (with their resolution notes) are
// automatically deleted 48 hours after creation via a MongoDB TTL index.
// The resolved status itself lives on the Attendance record and persists.
attendanceComplaintSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 48 * 60 * 60 },
);

export default mongoose.model<IAttendanceComplaint>(
  "AttendanceComplaint",
  attendanceComplaintSchema,
);
