import mongoose, {Document, Schema} from "mongoose";
import * as bcrypt from "bcryptjs";

// Define the User interface that extends the Mongoose Document
export const UserRole = {
    ADMIN: "admin",
    TEACHER: "teacher",
    STUDENT: "student",
    PARENT: "parent",
    UNITCONSULTANT: "unitconsultant",
    UNITRESIDENT: "unitresident",
} as const;

export const UserIDs = {
    ADMINID: "UJMBBSAD0000",
    STUDENTID: "UJMBBSST0000",
    TEACHERID: "UJMBBSTE0000",
    PARENTID: "UJMBBSPA0000",
    UNITCONSULTANTID: "UJMBBSUC0000",
    UNITRESIDENTID: "UJMBBSUR0000",
} as const;

export const UserDepartments = {
    OandG: {
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
} as const;

export type userRoles = "admin" | "teacher" | "student" | "parent" | "unitconsultant" | "unitresident" ; // Define a type for user roles, including the unique admin and student IDs

export type userIDs =  "ADMINID" | "STUDENTID" | "TEACHERID" | "PARENTID" | "UNITCONSULTANTID" | "UNITRESIDENTID";
// Let's map type userDepartments to UserDeparments so that Users can be assigned to OandG or Pediatrics or other Deparments, for all user roles except students and parents.
export enum UserDepartmentName {
    /*
    Medicine       → 9 Units
    Surgery        → 9 Units
    O&G            → 8 Units
    Paediatrics    → 8 Units
    Psychiatry     → 6 Units
    ENT            → 6 Units
    Anaesthesia    → 6 Units
    Radiology      → 6 Units
    Ophthalmology  → 7 Units
    Dermatology    → 5 Units
    */
    medicine = "Medicine",
    surgery = "Surgery",
    og = "O&G",
    paediatrics = "Paediatrics",
    psychiatry = "Psychiatry",
    ent = "ENT",
    anaesthesia = "Anaesthesia",
    radiology = "Radiology",
    ophthalmology = "Ophthalmology",
    dermatology = "Dermatology",
    hematology = "Hematology",
    histopathology = "Histopathology",
    microbiology = "Microbiology",
    chemicalPathology = "Chemical Pathology"
}
// export type userDepartments = keyof typeof UserDepartments

export const roleDisplayName: Record<userRoles, string> = {
    admin: "Admin",
    teacher: "Teacher",
    student: "Student",
    parent: "Parent",
    unitconsultant: "Unit Consultant",
    unitresident: "Unit Resident",
};

export interface IUser extends Document {
    name: string;
    email: string;
    idNumber: string; // field for ID number
    password: string;
    role: userRoles;
    department?: string | null;
    isActive: boolean;
    profileImage?: string; // Base64 encoded profile image
    studentClasses?: mongoose.Types.ObjectId | null; // Class ID for student
    teacherSubject?: mongoose.Types.ObjectId[] | null; // Array of class IDs for teachers
    parentStudents?: mongoose.Types.ObjectId[] | null; // Array of student IDs for parents
    // Academic status tags for teachers/lecturers
    academicStatus?: "professor" | "associate professor" | "lecturer i" | "lecturer ii" | "assistant lecturer" | "resident" | null;
    // Department role tags for teachers/lecturers
    departmentRole?: "head of department" | "dean of faculty" | "exam officer" | null;
    // Optional contact phone for supervisors
    phone?: string | null;
    // Supervisor eligibility and ranking for rotation assignment
    isSupervisor?: boolean;
    supervisorRank?: number; // higher = more senior
    supervisorStudents?: mongoose.Types.ObjectId[] | null; // Array of student IDs for supervisors
    specialties?: string[]; // e.g., ["ENT","RADIOLOGY"]
    matchPassword: (enteredPassword: string) => Promise<boolean>;
    comparePassword(candidatePassword: string): Promise<boolean>;
    attendance: mongoose.Types.ObjectId[]; // Array of attendance record IDs
}

const UserSchema: Schema<IUser> = new Schema({
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
        default: UserIDs.STUDENTID, // Default to STUDENTID if not provided, but can be overridden when creating an admin user with ADMINID
        // required: true, // Make idNumber required to ensure every user has a unique ID, but you can remove this if you want to allow users without an ID number (e.g., for testing purposes)
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
    isActive: {
        type: Boolean,
        default: true
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
        type: mongoose.Schema.Types.ObjectId,// This field points to Course (your “subjets” implementation lives under courses.ts)
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
        enum: ["professor", "associate professor", "lecturer i", "lecturer ii", "assistant lecturer", "resident", null],
        default: null,
    },
    departmentRole: {
        type: String,
        enum: ["head of department", "dean of faculty", "exam officer", null],
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
    }]
}, {
    timestamps: true
});

// Pre-save middleware to hash the password before saving the user document
UserSchema.pre<IUser>("save", async function () {
    if (!this.isModified("password")) return; // Only hash the password if it has been modified (or is new)
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare entered password with hashed password in the database
UserSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model<IUser>("User", UserSchema);
export default User;