import mongoose, {Document, Schema} from "mongoose";
import bcrypt from "bcryptjs";

// Define the User interface that extends the Mongoose Document
export enum UserRole {
    ADMIN = "admin",
    TEACHER = "teacher",
    STUDENT = "student",
    PARENT = "parent",
    UNIT_CONSULTANT = "unit_consultant",
    UNIT_RESIDENT = "unit_resident",
}

export enum UserIDs {
    ADMINID = "UJ0000AD0000", // Unique ID for admin
    STUDENTID = "UJ0000ST0000", // Unique ID for students
    TEACHERID = "UJ0000TE0000", // Unique ID for teachers
    PARENTID = "UJ0000PA0000", // Unique ID for parents
    UNITCONSULTANTID = "UJ0000UC0000", // Unique ID for unit consultants
    UNITRESIDENTID = "UJ0000UR0000" // Unique ID for unit residents
}

export type userRoles = "admin" | "teacher" | "student" | "parent" | "unit_consultant" | "unit_resident" ; // Define a type for user roles, including the unique admin and student IDs

export type userIDs =  "ADMINID" | "STUDENTID" | "TEACHERID" | "PARENTID" | "UNITCONSULTANTID" | "UNITRESIDENTID";

export const roleDisplayName: Record<userRoles, string> = {
    admin: "Admin",
    teacher: "Teacher",
    student: "Student",
    parent: "Parent",
    unit_consultant: "Unit Consultant",
    unit_resident: "Unit Resident",
};

export interface IUser extends Document {
    name: string;
    email: string;
    // idNumber?: userIDs;
    idNumber: string; // field for ID number
    password: string;
    role: userRoles;
    isActive: boolean;
    profileImage?: string; // Base64 encoded profile image
    studentClasses?: string | null; // Array of class IDs for students
    teacherSubject?: string[] | null; // Array of class IDs for teachers
    parentStudents?: string[] | null; // Array of student IDs for parents
    // Academic status tags for teachers/lecturers
    academicStatus?: "professor" | "associate professor" | "lecturer i" | "lecturer ii" | "assistant lecturer" | "resident" | null;
    // Department role tags for teachers/lecturers
    departmentRole?: "head of department" | "dean of faculty" | "exam officer" | null;
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
    }
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