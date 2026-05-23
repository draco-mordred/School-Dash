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
export const registerUser = async (
    req: Request, 
    res: Response
): Promise<void> => {
    try {
        const { 
            name, email, password, idNumber, role, studentClasses, teacherSubject, parentStudents, isActive 
        } = req.body;
        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ status: "Error!", message: "User already exists" });
            return;
        }
        //check if userID exists
        const existingID = await User.findOne({ idNumber });
        let newIDNumber = idNumber; // Initialize newIDNumber with the provided idNumber
        const updateUserIdIfExists = async () => {
            if (existingID) {
                const lastUserWithID = await User.findOne({ idNumber: { $regex: `^${idNumber.slice(0, -4)}` } }).sort({ createdAt: -1 });
                if (lastUserWithID) {
                    const lastIDNumber = lastUserWithID.idNumber;
                    const prefix = lastIDNumber.slice(0, -4);
                    const lastNumericPart = parseInt(lastIDNumber.slice(-4));
                    const newNumericPart = (lastNumericPart + 1).toString().padStart(4, '0');
                    newIDNumber = `${prefix}${newNumericPart}`;
                }
            } else {
                // if no ID number is passed, update with the next in the sequence based on the role prefix (e.g., UJ0000ST0001 for students, UJ0000AD0001 for admins, etc.)
                if (!idNumber) {
                    const rolePrefix = role === "admin" ? "UJ0000AD" : role === "teacher" ? "UJ0000TE" : role === "student" ? "UJ0000ST" : role === "parent" ? "UJ0000PA" : "UJ0000ST"; // Default prefix for unknown roles
                    const lastUserWithRolePrefix = await User.findOne({ idNumber: { $regex: `^${rolePrefix}` } }).sort({ createdAt: -1 });
                    if (lastUserWithRolePrefix) {
                        const lastIDNumber = lastUserWithRolePrefix.idNumber;
                        const prefix = lastIDNumber.slice(0, -4);
                        const lastNumericPart = parseInt(lastIDNumber.slice(-4));
                        const newNumericPart = (lastNumericPart + 1).toString().padStart(4, '0');
                        newIDNumber = `${prefix}${newNumericPart}`;
                    } else {
                        // If no existing user with the same role prefix is found, we can start with the first ID number in the sequence (e.g., UJ0000ST0001 for students)
                        const rolePrefix = role === "admin" ? "UJ0000AD" : role === "teacher" ? "UJ0000TE" : role === "student" ? "UJ0000ST" : role === "parent" ? "UJ0000PA" : "UJ0000ST"; // Default prefix for unknown roles
                        newIDNumber = `${rolePrefix}0001`;
                    }
                }
            }
            return;
        };
        await updateUserIdIfExists();
        if (existingID) {
            // TO BE USED IN PRODUCTION...
            //we want to make the userIDs sequentially update if there is an already existing user with the same ID number, for example if there is already a user with ID number "UJ0000ST0001", the next user with the same prefix "UJ0000ST" will get the ID number "UJ0000ST0002", and so on ... 

            // we then update the existing user with the new data, this is to allow for easy testing without having to delete users all the time, but in production you might want to handle this differently (e.g., by returning an error or allowing duplicate ID numbers if they are not meant to be unique)
            // existingID.name = name || existingID.name;
            // existingID.email = email || existingID.email;
            // existingID.password = password || existingID.password;
            // existingID.role = role || existingID.role;
            // existingID.studentClasses = studentClasses || existingID.studentClasses;
            // existingID.teacherSubject = teacherSubject || existingID.teacherSubject;
            // existingID.parentStudents = parentStudents || existingID.parentStudents;
            // existingID.isActive = isActive !== undefined ? isActive : existingID.isActive;
            // const updatedUser = await existingID.save();
            // res.status(200).json({ 
            //     _id: updatedUser._id,
            //     name: updatedUser.name,
            //     email: updatedUser.email,
            //     idNumber: updatedUser.idNumber,
            //     role: updatedUser.role,
            //     studentClasses: updatedUser.studentClasses,
            //     teacherSubject: updatedUser.teacherSubject,
            //     parentStudents: updatedUser.parentStudents,
            //     isActive: updatedUser.isActive,
            //     message: `User '${updatedUser.name}' updated successfully`
            // });

            // OR SIMPLY NOTIFY THAT THE USERID ALREADY EXISTS

            // const lastUserWithID = await User.findOne({ idNumber: { $regex: `^${idNumber.slice(0, -4)}` } }).sort({ createdAt: -1 });   
            // if (lastUserWithID) {
            //     const lastIDNumber = lastUserWithID.idNumber;
            //     const prefix = lastIDNumber.slice(0, -4);
            //     const lastNumericPart = parseInt(lastIDNumber.slice(-4));
            //     const newNumericPart = (lastNumericPart + 1).toString().padStart(4, '0');
            //     const newIDNumber = `${prefix}${newNumericPart}`;
            // } else {
            //     // If no existing user with the same prefix is found, we can start with the first ID number in the sequence (e.g., UJ0000ST0001)
            //     const prefix = idNumber.slice(0, -4);
            //     const newIDNumber = `${prefix}0001`;
            // }
            // res.status(400).json({ status: "Error!", message: `ID number '${idNumber}' already exists. Please use a unique ID number.` });
            // return;
        }
        // Create a new user
        const newUser = await User.create({
            name,
            email,
            password,
            idNumber: newIDNumber, // Use the newIDNumber which is now the updated sequential ID number we've updated
            role,
            studentClasses,
            teacherSubject,
            parentStudents,
            isActive
        });
        if (newUser) {
            if ((req as any).user) {
                await logActivity({
                    userId: (req as any).user._id.toString(),
                    action: "Created user",
                    details: `${newUser.name} (${newUser.email}) with role ${newUser.role}, and assigned ID number ${newUser.idNumber}`
                });
            }
            res.status(201).json({ 
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                idNumber: newUser.idNumber,
                role: newUser.role,
                studentClasses: newUser.studentClasses,
                teacherSubject: newUser.teacherSubject,
                parentStudents: newUser.parentStudents,
                isActive: newUser.isActive,
                message: `User '${newUser.name}' created successfully`
            });
        }else {            
            res.status(400).json({ status: "Error!", message: "Invalid user data" });
        }
        // res.status(201).json({ status: "Success!", message: `User '${newUser.name}' created successfully`, data: newUser });
    } catch (error) {
        res.status(500).json({ status: "Error!", message: "Internal server error", error: `${error}` });
    }
}

// @desc    Log in a user
// @route   POST /api/users/login
// @access  Public 

export const login = async (
    req: Request, 
    res: Response
): Promise<void> =>{
    try {
        const {email, password} = req.body;
        const user = await User.findOne({ email })
        // check if user exists and password matches
        if (user && (await user.matchPassword(password))){
            //generate token
            generateToken(user.id.toString(), res)
            res.status(201).json(user) //returns the user data to the Response/frontend ... can be customized to show specific fields only, for example: res.status(201).json({  name: user.name, email: user.email, message: `User '${user.name}' logged in successfully`)})

        //    if ((req as any).user){ //totally forgot this part cannot work since "/login" is not a protected route, but we can still log the activity using the authenticated user object that we just got from the database after successful login, which is "user" in this case, instead of using "req.user" which is not available at this point since the user is not authenticated yet
        //         await logActivity({
        //             userId: (req as any).user._id.toString(),
        //             action: "User login",
        //             details: `${user.name} logged in successfully.`
        //         })
        //     }
            
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

// // next we add fetch all activities(or let's do it now)
// // done!

// @desc    Update user (Admin)
// @route   PUT /api/users/:id
// @access  Private/Admin

export const updateUser = async (req: Request, res: Response) : Promise<void> => {
    try {
        const user = await User.findById(req.params.id);
        if (user){
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.idNumber = req.body.idNumber || user.idNumber;
            user.role = req.body.role || user.role;
            user.isActive = req.body.isActive !== undefined ? req.body.isActive : user.isActive;
            user.studentClasses = req.body.studentClasses || user.studentClasses;
            user.teacherSubject = req.body.teacherSubject || user.teacherSubject;
            user.parentStudents = req.body.parentStudents || user.parentStudents;

            if(req.body.password){
                user.password = req.body.password;
            }
            const updatedUser = await user.save();
            const userId = (req as any).user._id.toString();
            if ((req as any).user) { 
                //not responding at this point ... will continue the video for now ---to fix return to video at time: 1:30:45 / 7:05:54 ...
                await logActivity({
                    userId: (req as any).user._id.toString(),
                    action: "Updated user",
                    details: `Updated user ${updatedUser.email} (ID: ${updatedUser.idNumber}) successfully. 
                    Changes: ${JSON.stringify(req.body)}`
                });
            }
//             // res.status(200).json({ status: "Success!", message: `User '${updatedUser.name}' updated successfully`, data: updatedUser });
            res.status(200).json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                isActive: updatedUser.isActive,
                studentClasses: updatedUser.studentClasses,
                idNumber: updatedUser.idNumber,
                parentStudents: updatedUser.parentStudents,
                teacherSubject: updatedUser.teacherSubject,
                message: `User ${updatedUser.email} (ID: ${updatedUser.idNumber}) updated successfully.`,
            })
        } else {
            res.status(404).json({ status: "Error!", message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ message: `Server error: ${error}` });
    }
}

// // for some reason, thr server fails when not connected online ... let's go on for now and see if it'll come back later on ...

// // next we do Delete user
// // @desc    Delete user (Admin)
// // @route   DELETE /api/users/:id
// // @access  Private/Admin

export const deleteUser = async (req: Request, res: Response) : Promise<void> => {
    try {
        const user = await User.findById(req.params.id);
        if (user){
            await User.deleteOne({ _id: user._id });
            if ((req as any).user) {
                await logActivity({
                    userId: (req as any).user._id.toString(),
                    action: "Deleted user",
                    details: `Deleted user ${user.name}, email: ${user.email}, id: ${user.idNumber}, successfully!`
                });
            }
            res.status(201).json({ message: `User ${user.email} deleted successfully.` });
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
            // if (req.user){  
            //     res.json({
            //         user: {
            //             _id: req.user._id,
            //             name: req.user.name,
            //             email: req.user.email,
            //             role: req.user.role,
            //         }  
            //     })
            // }
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