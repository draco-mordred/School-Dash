import mongoose, { Schema, Document } from "mongoose";

// Proximity check-in location types
export type CheckinLocationType = "lecture_hall" | "clinical_ward" | "lab" | "classroom" | "other";

// Check-in method
export type CheckinMethod = "qr_code" | "nfc" | "biometric" | "manual" | "gps";

// Check-in status
export type CheckinStatus = "pending" | "verified" | "rejected" | "expired";

/**
 * Proximity Check-in Model
 * Tracks student location check-ins for attendance marking
 * Used for both lecture (LATIFAH) and clinical (KRYSTA) attendance
 */
export interface IProximityCheckin extends Document {
  student: mongoose.Types.ObjectId; // Reference to User (student)
  studentIdNumber?: string; // Student ID for quick lookup
  
  // Location details
  locationType: CheckinLocationType;
  locationName?: string;
  classroomId?: mongoose.Types.ObjectId; // Reference to room/location
  clinicalUnitId?: mongoose.Types.ObjectId; // Reference to hospital unit (for clinical)
  
  // Check-in timing
  checkinTime: Date;
  checkoutTime?: Date;
  
  // Session references (link to attendance records)
  lectureSessionId?: mongoose.Types.ObjectId; // Link to LATIFAH lecture session
  clinicalSessionId?: mongoose.Types.ObjectId; // Link to KRYSTA clinical session
  timetablePeriodId?: mongoose.Types.ObjectId; // Link to timetable period
  
  // Verification
  checkinMethod: CheckinMethod;
  status: CheckinStatus;
  verifiedBy?: mongoose.Types.ObjectId; // Staff who verified
  verifiedAt?: Date;
  
  // GPS data (for outdoor/field checkins)
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy: number; // in meters
  };
  ipAddress?: string; // For web-based checkins
  deviceId?: string; // Device identifier
  
  // Validation
  isWithinRange: boolean; // Was checkin within acceptable range of location
  distanceFromTarget?: number; // Distance in meters from target location
  
  // Class and academic context
  classId: mongoose.Types.ObjectId;
  academicYear: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  
  // For offline sync (network issues)
  syncStatus: "synced" | "pending" | "failed";
  syncAttempts: number;
  lastSyncAttempt?: Date;
  syncError?: string;
  
  // Metadata
  notes?: string;
  createdBy: mongoose.Types.ObjectId; // Could be student or system
}

const ProximityCheckinSchema = new Schema<IProximityCheckin>(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    studentIdNumber: {
      type: String,
      default: "",
      index: true,
    },
    
    locationType: {
      type: String,
      enum: ["lecture_hall", "clinical_ward", "lab", "classroom", "other"],
      required: true,
      index: true,
    },
    locationName: {
      type: String,
      default: "",
    },
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      default: null,
    },
    clinicalUnitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      default: null,
      index: true,
    },
    
    checkinTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    checkoutTime: {
      type: Date,
      default: null,
    },
    
    lectureSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
      default: null,
    },
    clinicalSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClinicalAttendance",
      default: null,
    },
    timetablePeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Timetable",
      default: null,
    },
    
    checkinMethod: {
      type: String,
      enum: ["qr_code", "nfc", "biometric", "manual", "gps"],
      default: "qr_code",
    },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected", "expired"],
      default: "pending",
      index: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    
    gpsCoordinates: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null },
    },
    ipAddress: {
      type: String,
      default: "",
    },
    deviceId: {
      type: String,
      default: "",
    },
    
    isWithinRange: {
      type: Boolean,
      default: false,
    },
    distanceFromTarget: {
      type: Number,
      default: null,
    },
    
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
      index: true,
    },
    
    syncStatus: {
      type: String,
      enum: ["synced", "pending", "failed"],
      default: "pending",
      index: true,
    },
    syncAttempts: {
      type: Number,
      default: 0,
    },
    lastSyncAttempt: {
      type: Date,
      default: null,
    },
    syncError: {
      type: String,
      default: "",
    },
    
    notes: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
ProximityCheckinSchema.index({ student: 1, checkinTime: -1 });
ProximityCheckinSchema.index({ classId: 1, date: -1 });
ProximityCheckinSchema.index({ locationType: 1, checkinTime: -1 });
ProximityCheckinSchema.index({ syncStatus: 1, lastSyncAttempt: 1 });
ProximityCheckinSchema.index({ lectureSessionId: 1 });
ProximityCheckinSchema.index({ clinicalSessionId: 1 });

// TTL index for automatic cleanup of old pending checkins (after 7 days)
ProximityCheckinSchema.index(
  { checkinTime: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 }
);

export default mongoose.model<IProximityCheckin>(
  "ProximityCheckin",
  ProximityCheckinSchema
);
