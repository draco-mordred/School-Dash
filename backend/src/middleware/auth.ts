import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { type IUser, type userRoles } from "../models/user";

export interface AuthRequest extends Request {
    user?: IUser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token;

    //check for token in cookies, you can also check for token in headers if you want to support both cookie and header authentication
    if (req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt; //using .jwt should now allow new user registration to work without any issues, as the token will be sent in the cookie and can be accessed using req.cookies.jwt
    }

    if (token) {
        try {
            const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
            req.user = (await User.findById(decoded.userId).select("-password")) as IUser;
            next();
        } catch (error) {
            console.log(error);
            return res.status(401).json({ message: "Not authorized, token failed" });
        }
    } else {
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

export const authorize = (roles: userRoles[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: "Not authorized, no user found" });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Access denied to User role: ${req.user.role}!` });
        }

        //User is authorized, proceed to the next middleware or route handler
        next();
    };
};