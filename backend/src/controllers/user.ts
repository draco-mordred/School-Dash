import { type Request, type Response } from "express";
import User from "../models/user";
import { generateToken } from "../utils/generateToken";

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Private (Admin and Teacher only) 

// Controller function to handle user registration
export const register = async (req: Request, res: Response): Promise<void> => {
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

// @desc    Register a new user
// @route   POST /api/users/login
// @access  Public 

export const login = async (req: Request, res: Response): Promise<void> =>{
    try {
        const {email, password} = req.body;
        const user = await User.findOne({ email })

        // check if user exists and password matches
        if (user && (await user.matchPassword(password))){
            //generate token
            generateToken(user.id.toString(), res)
            res.json(user)
        }else{
            res.status(401).json({ message: "Invalid email or password"})
        }
    } catch (error) {
        res.status(500).json({message: "Server error", error})
    }
}