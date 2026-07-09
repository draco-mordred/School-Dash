import mongoose, { Schema, Document } from "mongoose";

export interface IAttendanceSettings extends Document {
  lectureAttendance: boolean;
  clinicalAttendance: boolean;
  seminarAttendance: boolean;
  verificationMethods: {
    qrCode: boolean;
    bluetooth: boolean;
    gps: boolean;
    administratorApproval: boolean;
  };
  minimumAttendancePercentage: number;
  gracePeriodMinutes: number;
  attendanceWindowMinutes: number;
}

const AttendanceSettingsSchema = new Schema<IAttendanceSettings>(
  {
    lectureAttendance: { type: Boolean, default: true },
    clinicalAttendance: { type: Boolean, default: true },
    seminarAttendance: { type: Boolean, default: true },
    verificationMethods: {
      qrCode: { type: Boolean, default: false },
      bluetooth: { type: Boolean, default: false },
      gps: { type: Boolean, default: false },
      administratorApproval: { type: Boolean, default: false },
    },
    minimumAttendancePercentage: { type: Number, default: 75 },
    gracePeriodMinutes: { type: Number, default: 10 },
    attendanceWindowMinutes: { type: Number, default: 120 },
  },
  { timestamps: true }
);

export default mongoose.model<IAttendanceSettings>("AttendanceSettings", AttendanceSettingsSchema);
