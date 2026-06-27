import mongoose, { Schema, Document } from "mongoose";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface IDayEntry {
  _id?: mongoose.Types.ObjectId;
  time?: string;
  procedure?: string;
  procedures?: string[];
  diagnosis?: string;
  supervisor?: string;
  hours?: number;
  location?: string;
  outcome?: string;
  weekNumber?: number;
  date?: Date;
  dayName?: string;
  attendanceStatus?: AttendanceStatus;
  notes?: string;
}

export interface ITutorialEntry {
  _id?: mongoose.Types.ObjectId;
  topic: string;
  date?: Date;
  presenter?: string;
  notes?: string;
}

export interface IPersonalEntry {
  _id?: mongoose.Types.ObjectId;
  activity: string;
  date?: Date;
  notes?: string;
}

export interface ILogbookEntry extends Document {
  student: mongoose.Types.ObjectId;
  rotation: mongoose.Types.ObjectId;
  academicYear: mongoose.Types.ObjectId;
  date: Date;
  callDuty: IDayEntry[];
  clinicDays: IDayEntry[];
  theatreDays: IDayEntry[];
  cwrDays: IDayEntry[];
  rwrDays: IDayEntry[];
  other: IDayEntry[];
  presentationTutorials: ITutorialEntry[];
  personal: IPersonalEntry[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const DayEntrySchema = new Schema({
  // Flexible day entry to support clinical logbook fields used by the frontend
  time: { type: String, default: "" },
  procedure: { type: String, default: "" },
  procedures: { type: [String], default: [] },
  diagnosis: { type: String, default: "" },
  supervisor: { type: String, default: "" },
  hours: { type: Number, default: 0 },
  location: { type: String, default: "" },
  outcome: { type: String, default: "" },
  // Backwards-compatible attendance fields (optional)
  weekNumber: { type: Number },
  date: { type: Date },
  dayName: { type: String },
  attendanceStatus: {
    type: String,
    enum: ["present", "absent", "late", "excused"],
    default: "present",
  },
  notes: { type: String, default: "" },
}, { _id: true });

const TutorialEntrySchema = new Schema({
  topic: { type: String, required: true },
  date: { type: Date },
  presenter: { type: String, default: "" },
  notes: { type: String, default: "" },
}, { _id: true });

const PersonalEntrySchema = new Schema({
  activity: { type: String, required: true },
  date: { type: Date },
  notes: { type: String, default: "" },
}, { _id: true });

const LogbookEntrySchema = new Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rotation: { type: mongoose.Schema.Types.ObjectId, ref: "ClinicalRotation", required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
  date: { type: Date, required: true },
  callDuty: { type: [DayEntrySchema], default: [] },
  clinicDays: { type: [DayEntrySchema], default: [] },
  theatreDays: { type: [DayEntrySchema], default: [] },
  cwrDays: { type: [DayEntrySchema], default: [] },
  rwrDays: { type: [DayEntrySchema], default: [] },
  other: { type: [DayEntrySchema], default: [] },
  presentationTutorials: { type: [TutorialEntrySchema], default: [] },
  personal: { type: [PersonalEntrySchema], default: [] },
  notes: { type: String, default: "" },
}, {
  timestamps: true,
});


export const StudentLogbookEntryType = {
  tutorialAndDemonstrations: "tutorialAndDemonstrations",
  clinicalActivities: "clinicalActivities",
  clinicalProcedures: "clinicalProcedures",
  clinicalPatientPresentations: "clinicalPatientPresentations",
} as const;

export enum studentLogbookEntryType_ {
  tutorialAndDemonstrations = "tutorialAndDemonstrations",
  clinicalActivities = "clinicalActivities",
  clinicalProcedures = "clinicalProcedures",
  clinicalPatientPresentations = "clinicalPatientPresentations",
}

export type studentLogbookEntryType = "tutorialAndDemonstrations" | "clinicalActivities" | "clinicalProcedures" | "clinicalPatientPresentations";

export const StudentsLogbookEntryDetails = {
  tutorialAndDemonstrations: {
    id: mongoose.Types.ObjectId,
    topic: String,
    date: Date,
    supervisorId: mongoose.Types.ObjectId,
    signed: Boolean,
    postingId: mongoose.Types.ObjectId,
    presenterId: mongoose.Types.ObjectId, //person who presented the tutorial/demonstration
    mPointScored: (signed: boolean) => signed ? 1 : 0, // Example scoring logic
  },
  clinicalActivities: {
    id: mongoose.Types.ObjectId,
    activity: String, //e.g., "Ward Round", "Clinic", "Theatre"
    date: Date,
    supervisorId: mongoose.Types.ObjectId,
    signed: Boolean,
    postingId: mongoose.Types.ObjectId,
    mPointScored: (signed: boolean) => signed ? 1 : 0, // Example scoring logic
  },
  clinicalProcedures: {
    id: mongoose.Types.ObjectId,
    procedure: String, //e.g., "Venipuncture", "Lumbar Puncture", "Suturing"
    date: Date,
    supervisorId: mongoose.Types.ObjectId, //person who supervised the procedure
    signed: Boolean,
    postingId: mongoose.Types.ObjectId, //id of the posting the procedure was performed in
    mPointScored: (signed: boolean) => signed ? 1 : 0, // Example scoring logic
    patientName: String, //name of the patient the procedure was performed on
    patientId: mongoose.Types.ObjectId, //reference to the patient the procedure was performed on
    hospitalNumber: String,
    dxDiag: String, //diagnosis or differential diagnosis for the procedure
  },
  clinicalPatientPresentations: {
    id: mongoose.Types.ObjectId,
    patientName: String,
    patientId: mongoose.Types.ObjectId,
    hospitalNumber: String,
    dxDiag: String,
    date: Date,
    supervisorId: mongoose.Types.ObjectId,
    signed: Boolean,
    postingId: mongoose.Types.ObjectId,
    mPointScored: (signed: boolean) => signed ? 1 : 0, // Example scoring logic
    clerksMan: mongoose.Types.ObjectId, //Student who presented the patient
  },
} as const;

export type studentLogbookEntryDetails = typeof StudentsLogbookEntryDetails[studentLogbookEntryType];

export interface IStudentLogBook {
  id: mongoose.Types.ObjectId;
  rotationId: mongoose.Types.ObjectId; //reference to the rotation unit the logbook entry belongs to
  postingId: mongoose.Types.ObjectId; //reference to the posting the logbook entry belongs to
  academicYearId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId; //reference to the student the logbook entry belongs to
  //type of logbook entry, e.g., tutorial, clinical activity, procedure, patient presentation
  type: studentLogbookEntryType;
  details: studentLogbookEntryDetails;
  attendanceStatus?: AttendanceStatus; //optional field to track attendance status for the logbook entry
}

const StudentLogBookSchema = new Schema<IStudentLogBook>({
  rotationId: { type: mongoose.Schema.Types.ObjectId, ref: "ClinicalRotation", required: true },
  postingId: { type: mongoose.Schema.Types.ObjectId, ref: "PostingAndRotation", required: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: Object.values(StudentLogbookEntryType), required: true },
  //details should return an object with the appropriate fields based on the type of logbook entry, e.g., if type is "tutorialAndDemonstrations", details should have fields: topic, date, supervisorId, signed, postingId, presenterId
  details: { type: Schema.Types.Mixed,
     enum: Object.values(studentLogbookEntryType_), //explain what this means: This line ensures that the `details` field can only contain an object that matches one of the defined types in `studentLogbookEntryType_`. It restricts the structure of the `details` field to be consistent with the expected fields for each logbook entry type, such as "tutorialAndDemonstrations", "clinicalActivities", "clinicalProcedures", or "clinicalPatientPresentations". This helps maintain data integrity and ensures that the logbook entries are structured correctly based on their type.
     required: true,
     default: {} }, // Flexible details field to accommodate different logbook entry types
  attendanceStatus: {
    type: String,
    enum: ["present", "absent", "late", "excused"],
    default: "present",
  },
}, {
  timestamps: true,
});

//Students should not hsore more than 4 M points per day in the same posting, in a week a student should have a total of 20 M points, and in a rotation a student should have a total of 80 M points. The mPointScored function in the StudentsLogbookEntryDetails object can be used to calculate the M points scored for each logbook entry based on whether it was signed or not.

export default mongoose.model<IStudentLogBook>("StudentLogBook", StudentLogBookSchema);

// export default mongoose.model<ILogbookEntry>("LogbookEntry", LogbookEntrySchema);
