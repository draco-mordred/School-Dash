import jwt from "jsonwebtoken";
import User from "../models/user";
// protect routes middleware
export const protect = async (req, res, next) => {
    let token;
    // Check for token in cookies first
    if (req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt;
    }
    // Check for token in Authorization header if not in cookies
    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith("Bearer ")) {
            token = authHeader.slice(7); // Remove "Bearer " prefix
        }
    }
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = (await User.findById(decoded.userId)
                .select("-password")
                .populate("studentClasses", "_id name")
                .populate("teacherSubject", "_id name code")
                .populate("parentStudents", "_id name email idNumber role studentClasses"));
            next();
        }
        catch (error) {
            console.log(error);
            return res.status(401).json({ message: "Not authorized, token failed" });
        }
    }
    else {
        return res.status(401).json({ message: "Not authorized, no token" });
    }
};
/**
 * Accepts a list of allowed roles and returns a middleware function that checks if the authenticated user has one of the allowed roles. If the user does not have the required role, it returns a 403 Forbidden response.
 * @param allowedRoles - An array of allowed user roles (e.g., ["admin", "teacher"])
 * @returns A middleware function that checks the user's role against the allowed roles
 * Usage example:
 * app.post("/api/some-protected-route", protect, authorize("admin", "teacher"), (req, res) => {
 *   // This route can only be accessed by users with the "admin" or "teacher" role
 * usage: router.post('/', protect, authorize("admin", "teacher"), someControllerFunction);
 * }
 */
export const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: `Not authorized, no user found!` });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Access denied. User role '${req.user.role}' not allowed to acces this route. Allowed roles: ${roles.join(", ")}` });
        }
        //User is authorized, proceed to the next middleware or route handler
        next();
    };
};
