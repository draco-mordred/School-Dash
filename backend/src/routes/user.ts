import express from "express";
const userRoutes = express.Router();
import {
    login,
    registerUser,
    registerPublic,
    requestPasswordReset,
    resetPassword,
    approvePendingUser,
    updateUser,
    deleteUser,
    logoutUser,
    getUserProfile,
    getGoogleDriveAuthUrl,
    handleGoogleDriveOAuthCallback,
    getGoogleDriveStatus,
    saveGoogleDriveAccount,
    disconnectGoogleDriveAccount,
    getVisibleClassesForCurrentUser,
    getUsers,
    getUserById,
    bulkUploadUsers,
    extractFromPDF,
    extractFromImage,
    isFirstUser,
} from "../controllers/user";
import { protect, authorize } from "../middleware/auth";

// Make sure to protect to get access to your user token and also add role-based access control to the routes, for example only admin and teacher can register new users, but students and parents cannot. You can use the authorize middleware to specify which roles are allowed to access each route. For example, you can modify the register route like this:
userRoutes.post("/register",
    protect,
    authorize(["admin"]),
    registerUser
);

// Public registration endpoints
userRoutes.get("/public/is-first", isFirstUser);
userRoutes.post("/public/register", registerPublic);
userRoutes.post("/forgot-password", requestPasswordReset);
userRoutes.post("/reset-password", resetPassword);
userRoutes.post("/login", login); 
userRoutes.post("/logout", logoutUser);
userRoutes.get("/google-drive/connect-url", protect, getGoogleDriveAuthUrl);
userRoutes.get("/google-drive/oauth/callback", protect, handleGoogleDriveOAuthCallback);
userRoutes.post("/google-drive/oauth/callback", protect, handleGoogleDriveOAuthCallback);
userRoutes.post("/google-drive/link", protect, saveGoogleDriveAccount);
userRoutes.post("/google-drive/disconnect", protect, disconnectGoogleDriveAccount);
userRoutes.get("/google-drive/status", protect, getGoogleDriveStatus);
userRoutes.get("/profile", protect, getUserProfile); // Get user profile via cookie, protected route    
userRoutes.get("/visible-classes", protect, getVisibleClassesForCurrentUser);
userRoutes.get("/",
    protect,
    authorize(["admin", "teacher", "parent", "student", "unitconsultant"]),
    getUsers
);
userRoutes.post("/:id/approve",
    protect,
    authorize(["admin"]),
    approvePendingUser
);
userRoutes.get("/:id",
    protect,
    authorize(["admin", "teacher", "parent", "unitconsultant"]),
    getUserById
);
// here you can use either patch or put
// Allow anyone to update their own profile, or admins/teachers to update any profile
userRoutes.patch("/update/:id",
    protect,
    updateUser
);
userRoutes.put("/update/:id",
    protect,
    updateUser
);
userRoutes.delete("/delete/:id",
    protect,
    authorize(["admin", "teacher", "unitconsultant"]),
    deleteUser
);
userRoutes.post("/bulk-upload",
    protect,
    authorize(["admin"]),
    bulkUploadUsers
);
userRoutes.post("/bulk-upload/extract-pdf",
    protect,
    authorize(["admin"]),
    extractFromPDF
);
userRoutes.post("/bulk-upload/extract-image",
    protect,
    authorize(["admin"]),
    extractFromImage
);
 
export default userRoutes;
//Next we protect the routes, also add rolebased access