import mongoose, { Schema } from "mongoose";
const UnitSchema = new Schema({
    name: {
        type: String,
        required: [true, "Unit name required"],
        trim: true,
    },
    code: {
        type: String,
        required: [true, "Unit code required"],
        trim: true,
    },
    unitID: {
        type: String,
        required: [true, "Unit ID required"],
        trim: true,
    },
    // Reference to the Department model
    department: {
        type: Schema.Types.ObjectId,
        ref: "Department",
        required: true,
    },
    // Reference to the User model (Supervisor role)
    supervisor: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    // Arrays of References to Course model
    courses: [
        {
            type: Schema.Types.ObjectId,
            ref: "Course",
        },
    ],
}, {
    timestamps: true, // Automatically manages createdAt and updatedAt
});
// Compound Index: Prevents creating duplicate units (e.g., You can't have two "ER" units with the same unitID)
UnitSchema.index({ name: 1, unitID: 1 }, { unique: true });
export default mongoose.model("Unit", UnitSchema);
