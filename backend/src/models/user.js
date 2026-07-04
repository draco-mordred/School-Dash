import mongoose, { Schema } from "mongoose";
import * as bcrypt from "bcryptjs";
// Define the User interface that extends the Mongoose Document
export const UserRole = {
    ADMIN: "admin",
    TEACHER: "teacher",
    STUDENT: "student",
    PARENT: "parent",
    UNITCONSULTANT: "unitconsultant",
    UNITRESIDENT: "unitresident",
};
export const UserIDs = {
    ADMINID: "UJMBBSAD0000",
    STUDENTID: "UJMBBSST0000",
    TEACHERID: "UJMBBSTE0000",
    PARENTID: "UJMBBSPA0000",
    UNITCONSULTANTID: "UJMBBSUC0000",
    UNITRESIDENTID: "UJMBBSUR0000",
};
export const UserDepartments = {
    OBG: {
        id: "og",
        name: "Obstetrics & Gynaecology",
        rotationDurationWeeks: 4,
        units: {
            active: [
                "Antenatal Clinic",
                "Labour Ward",
                "Postnatal Ward",
                "Gynaecology Ward",
                "Emergency O&G",
                "Family Planning",
                "Fertility / Endocrine Unit",
                "Reproductive Medicine Unit",
                "Gynaecologic Oncology Unit"
            ],
            reserve: [
                "Family Medicine / Reproductive Health Unit"
            ],
        }
    },
    Pediatrics: {
        id: "peds",
        name: "Pediatrics",
        rotationDurationWeeks: 2,
        units: {
            active: [
                "Neonatology / SCBU",
                "Paediatric Nephrology",
                "Paediatric Infectious Diseases",
                "Emergency Paediatrics",
                "Nutrition Unit",
                "Paediatric Neurology",
                "Paediatric Cardiology",
                "Paediatric Endocrinology",
                "Paediatric Hemato-Oncology"
            ],
            reserve: [
                "General Paediatrics"
            ]
        }
    }
};
export const roleDisplayName = {
    admin: "Admin",
    teacher: "Teacher",
    student: "Student",
    parent: "Parent",
    unitconsultant: "Unit Consultant",
    unitresident: "Unit Resident",
};
// Let's map type userDepartments to UserDeparments so that Users can be assigned to OandG or Pediatrics or other Deparments, for all user roles except students and parents.
export const UserDepartmentName = {
    OBG: "Obstetrics & Gynaecology",
    Pediatrics: "Pediatrics",
    Medicine: "Medicine",
    Surgery: "Surgery",
    Psychiatry: "Psychiatry",
    earNoseAndThroat: "Ear, Nose, and Throat",
    Anaesthesiology: "Anaesthesiology",
    Radiology: "Radiology",
    Ophthalmology: "Ophthalmology",
    Dermatology: "Dermatology",
    Hematology: "Hematology",
    anatomicPathology: "Anatomic Pathology",
    chemicalPathology: "Chemical Pathology",
    Microbiology: "Microbiology",
};
export const UserAcademicStatus = {
    professor: "professor",
    associateProfessor: "associate professor",
    lecturerI: "lecturer i",
    lecturerII: "lecturer ii",
    assistantLecturer: "assistant lecturer",
    resident: "resident",
    student: "student",
};
export const UserDepartmentRole = {
    headOfDepartment: "head of department",
    deanOfFaculty: "dean of faculty",
    examOfficer: "exam officer",
    financeOfficer: "finance officer",
    levelCordinator: "level coordinator",
};
const UserSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: false,
        sparse: true
    },
    idNumber: {
        type: String,
        // unique: false,
        //enum: Object.values(UserIDs), // Ensure the idNumber can only be one of the specified values in UserIDs
        default: UserIDs.STUDENTID, // Default to STUDENTID if not provided, but can be overridden..
    },
    password: {
        type: String,
        required: true,
        // minlength: 6
    },
    role: {
        type: String,
        enum: Object.values(UserRole),
        required: true,
        default: UserRole.STUDENT
    },
    department: {
        type: String,
        default: null,
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        default: null,
    },
    isActive: {
        type: Boolean,
        default: true
    },
    approvalStatus: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "approved"
    },
    approvedAt: {
        type: Date,
        default: null,
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    profileImage: {
        type: String,
        default: null
    },
    studentClasses: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
        // default: null
    },
    teacherSubject: [{
            type: mongoose.Schema.Types.ObjectId, // This field points to Course (your “subjets” implementation lives under courses.ts)
            ref: "Course",
            default: null
        }],
    parentStudents: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }],
    academicStatus: {
        type: String,
        enum: Object.values(UserAcademicStatus),
        default: null,
    },
    departmentRole: {
        type: String,
        enum: Object.values(UserDepartmentRole),
        default: null,
    },
    // Optional contact phone for supervisors
    phone: {
        type: String,
        default: null,
    },
    isSupervisor: {
        type: Boolean,
        default: false,
    },
    supervisorRank: {
        //should return a number value based on the User's academicStatus value, let's do a little something to make that happen here: 
        type: Number,
        default: null,
    },
    supervisorStudents: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: []
        }],
    specialties: [{
            type: String,
            default: []
        }],
    attendance: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Attendance",
            default: []
        }],
    // Add these fields to your existing UserSchema definition before "timestamps: true"
    mordred_rules: {
        max_ticket_capacity: { type: Number, default: 5 },
        current_active_load: { type: Number, default: 0 },
        can_approve_logbooks: { type: Boolean, default: false },
        can_edit_timetables: { type: Boolean, default: false }
    },
    mordred_assigned_tasks: [{
            task_type: { type: String, uppercase: true }, // e.g., "LOGBOOK_REVIEW", "TICKET"
            reference_id: { type: mongoose.Schema.Types.ObjectId },
            assigned_at: { type: Date, default: Date.now }
        }]
}, {
    timestamps: true
});
// Pre-save middleware to hash the password before saving the user document
UserSchema.pre("save", async function () {
    if (!this.isModified("password"))
        return; // Only hash the password if it has been modified (or is new)
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});
// Method to compare entered password with hashed password in the database
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};
const User = mongoose.model("User", UserSchema);
export default User;
