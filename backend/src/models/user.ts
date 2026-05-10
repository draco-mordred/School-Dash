import mongoose, {Document, Schema} from "mongoose";
import bcrypt from "bcryptjs";

// Define the User interface that extends the Mongoose Document
export enum UserRole {
    ADMIN = "admin",
    TEACHER = "teacher",
    STUDENT = "student",
    PARENT = "parent"
}

export type userRoles = "admin" | "teacher" | "student" | "parent";

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: userRoles;
    isActive: boolean;
    studentClasses?: string | null; // Array of class IDs for students
    teacherSubject?: string[] | null; // Array of class IDs for teachers
    parentStudents?: string[] | null; // Array of student IDs for parents
    // studentClasses?: string[]; // Array of class IDs for students
    // teacherClasses?: string[]; // Array of class IDs for teachers
    // parentStudents?: string[]; // Array of student IDs for parents
    matchPassword: (enteredPassword: string) => Promise<boolean>;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
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
    studentClasses: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
        // default: null
    },
    teacherSubject: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        default: null
    }],
    parentStudents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
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