import express from "express";

const userRoutes = express.Router();

import { login, register } from "../controllers/user";
import { protect, authorize } from "../middleware/auth";

// Make sure to protect to get access to your user token and also add role-based access control to the routes, for example only admin and teacher can register new users, but students and parents cannot. You can use the authorize middleware to specify which roles are allowed to access each route. For example, you can modify the register route like this:
userRoutes.post(
    "/register",
    protect, 
    authorize(["admin", "teacher", 'student', 'parent']), // Only allow admin, teacher, student, and parent roles to access the register route  
    register);
userRoutes.post("/login", login); 

export default userRoutes;
//Next we protect the routes, also add rolebased access