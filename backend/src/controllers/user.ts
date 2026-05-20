import { type Request, type Response } from "express";
import User from "../models/user";
import { generateToken } from "../utils/generateToken";
import { logActivity } from "../utils/activitieslog";

// Define an interface extending Express Request to handle authenticated user data cleanly
interface AuthenticatedRequest extends Request {
    user?: {
        _id: { toString: () => string };
        name: string;
        email: string;
    };
}

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
            if ((req as AuthenticatedRequest).user) {
                await logActivity({
                    userId: (req as any).user._id.toString(),
                    action: "Created user",
                    details: `Created user ${newUser.name} (${newUser.email}) with role ${newUser.role}`
                });
            }
            res.status(201).json({ 
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                studentClasses: newUser.studentClasses,
                teacherSubject: newUser.teacherSubject,
                parentStudents: newUser.parentStudents,
                isActive: newUser.isActive,
                message: `User '${newUser.name}' created successfully`
            });
            return;
        }else {            
            res.status(400).json({ status: "Error!", message: "Invalid user data" });
            return;
        }
        res.status(201).json({ status: "Success!", message: `User '${newUser.name}' created successfully`, data: newUser });
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
            //totally forgot this part cannot work since "/login" is not a protected route
            if ((req as any).user){
                // FIX: Use the newly authenticated user object for the log activity, NOT req.user
                await logActivity({
                    userId: user._id.toString(),
                    action: "Login User",
                    details: `${user.name} logged in successfully.`
                });

                res.status(201).json({
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    studentClasses: user.studentClasses,
                    teacherSubject: user.teacherSubject,
                    parentStudents: user.parentStudents,
                    isActive: user.isActive,
                    message: `User '${user.name}' logged in successfully`
                });
                return;
            }
        }else{
            res.status(401).json({ message: "Invalid email or password"});
            return;
        }
    } catch (error) {
        res.status(500).json({message: "Server error", error})
    }
}

// next we add fetch all activities(or let's do it now)
// done!

// @desc    Update user (Admin)
// @route   PUT /api/users/:id
// @access  Private/Admin

export const updateUser = async (req: Request, res: Response) : Promise<void> => {
    try {
        const user = await User.findById(req.params.id);
        if (user){
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.role = req.body.role || user.role;
            user.isActive = req.body.isActive !== undefined ? req.body.isActive : user.isActive;
            user.studentClasses = req.body.studentClasses || user.studentClasses;
            user.teacherSubject = req.body.teacherSubject || user.teacherSubject;
            user.parentStudents = req.body.parentStudents || user.parentStudents;

            if(req.body.password){
                user.password = req.body.password;
            }
            const updatedUser = await user.save();
            // const userId = (req as any).user._id.toString();
            if ((req as any).user) {
                //not responding at this point ... will continue the video for now ---to fix return to video at time: 1:30:45 / 7:05:54 ...
                await logActivity({
                    userId: (req as any).user._id.toString(),
                    action: "Updated user",
                    details: `Updated user with email ${updatedUser.email}`
                });
            }
            // res.status(200).json({ status: "Success!", message: `User '${updatedUser.name}' updated successfully`, data: updatedUser });
            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                isActive: updatedUser.isActive,
                studentClasses: updatedUser.studentClasses,
                parentStudents: updatedUser.parentStudents,
                teacherSubject: updatedUser.teacherSubject,
                message: `User ${updatedUser.email} updated successfully.`,
            })
        } else {
            res.status(404).json({ status: "Error!", message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ message: `Server error: ${error}` });
    }
}

// for some reason, thr server fails when not connected online ... let's go on for now and see if it'll come back later on ...

// next we do Delete user
// @desc    Delete user (Admin)
// @route   DELETE /api/users/:id
// @access  Private/Admin

export const deleteUser = async (req: Request, res: Response) : Promise<void> => {
    try {
        const user = await User.findById(req.params.id);
        if (user){
            await User.deleteOne({ _id: user._id });
            if ((req as any).user) {
                await logActivity({
                    userId: (req as any).user._id.toString(),
                    action: "Deleted user",
                    details: `Deleted user with email ${user.email}`
                });
            }
            res.json({ message: `User ${user.email} deleted successfully.` });
        } else {
            res.status(404).json({ status: "Error!", message: "User not found" });
            return;
        }
    }catch (error) {
        res.status(500).json({ status: "Error!", message: `Server error: ${error}` });
    }
}

// @desc    Get user profile (via cookie)
// @route   GET /api/users/profile
// @access  Private 

export const getUserProfile = async (req: Request, res: Response) : Promise<void> => {
    try {
        const user = await User.findById((req as any).user._id);
        if (user){  
            res.json({
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                }
            })
        } else {
            res.status(404).json({ status: "Error!", message: "Not authorized" });
        }
    } catch (error) {
        res.status(500).json({ status: "Error!", message: `Server error: ${error}` });
    }
}

// desc   Logout users / clear cookie
// route   POST /api/users/logout
// access  Public

export const logoutUser = async (req: Request, res: Response) => {
    try {
        res.cookie("jwt", "", {
            httpOnly: true,
            expires: new Date(0) // Set the cookie to expire immediately
        });
        res.json({ message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ status: "Error!", message: `Server error: ${error}` });
    }
}