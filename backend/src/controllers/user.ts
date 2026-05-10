import { type Request, type Response } from "express";
import User from "../models/user";

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public 

// Controller function to handle user registration
export const registerUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, role, studentClasses, teacherSubject, parentStudents, isActive } = req.body;

        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ status: "Error!", message: "User already exists" });
            return;
        }
        // Create a new user
        const newUser = await User.create({
            name,
            email,
            password,
            role,
            studentClasses,
            teacherSubject,
            parentStudents,
            isActive
        });

        if (newUser) {
            res.status(201).json({ 
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                studentClasses: newUser.studentClasses,
                teacherSubject: newUser.teacherSubject,
                parentStudents: newUser.parentStudents,
                isActive: newUser.isActive,
                message: "User created successfully"
            });
            return;
        }else {            
            res.status(400).json({ status: "Error!", message: "Invalid user data" });
            return;
        }

        res.status(201).json({ status: "Success!", message: "User created successfully", data: newUser });
    } catch (error) {
        res.status(500).json({ status: "Error!", message: "Internal server error" });
    }
}