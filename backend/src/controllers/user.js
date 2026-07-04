import mongoose from "mongoose";
import User from "../models/user";
import Department from "../models/departments";
import { getAllDepartments } from "../constants/departments";
import { Notification } from "../models/notification";
import { sendSSE } from "../utils/sse";
import { generateToken } from "../utils/generateToken";
import { logActivity } from "../utils/activitieslog";
import { getRegistrationApprovalState, requiresAdminApproval } from "../utils/registrationApproval";
import { sendAccountApprovalEmail } from "../utils/accountApprovalEmail";
const normalizeRole = (role) => {
    if (!role)
        return undefined;
    const value = String(role).trim().toLowerCase();
    if (value === "unitconsultant" || value === "unitconsultant")
        return "unitconsultant";
    if (value === "unitresident" || value === "unitresident")
        return "unitresident";
    if (value === "admin")
        return "admin";
    if (value === "teacher")
        return "teacher";
    if (value === "student")
        return "student";
    if (value === "parent")
        return "parent";
    return undefined;
};
const findDepartment = async (departmentInput) => {
    if (!departmentInput)
        return null;
    const identifier = String(departmentInput).trim();
    if (mongoose.isValidObjectId(identifier)) {
        const doc = await Department.findById(identifier);
        if (doc)
            return doc;
    }
    let doc = await Department.findOne({
        $or: [{ code: identifier }, { departmentID: identifier }, { name: identifier }],
    });
    if (doc)
        return doc;
    const constantDept = getAllDepartments().find((d) => d.code === identifier || d.departmentID === identifier || d.name === identifier);
    if (!constantDept)
        return null;
    doc = await Department.findOneAndUpdate({ code: constantDept.code }, {
        name: constantDept.name,
        code: constantDept.code,
        departmentID: constantDept.departmentID,
    }, { upsert: true, returnDocument: "after" });
    return doc;
};
// @desc    Register a new user
// @route   POST /api/users/register
// @access  Private (Admin and Teacher only) 
// Controller function to handle user registration
export const registerUser = async (req, res) => {
    try {
        const { name, email, password, idNumber, role, departmentId, department, studentClasses, teacherSubject, parentStudents, isActive, isSupervisor, supervisorRank, specialties, } = req.body;
        const normalizedRole = normalizeRole(role);
        if (!normalizedRole) {
            res.status(400).json({ status: "Error!", message: "Invalid user role" });
            return;
        }
        const departmentDoc = await findDepartment(departmentId || department ||
            req.body?.departmentCode || req.body?.departmentID);
        const isStaffRole = ["teacher", "unitconsultant", "unitresident"].includes(normalizedRole);
        if (isStaffRole && !departmentDoc) {
            res.status(400).json({ status: "Error!", message: "Staff users must be assigned a valid department" });
            return;
        }
        // Normalization: frontend sends arrays.
        // Mongoose schema expects:
        // - studentClasses: single ObjectId
        // - teacherSubject: array of ObjectId
        // - parentStudents: array of ObjectId
        const studentClassesNormalized = Array.isArray(studentClasses)
            ? (studentClasses.length ? studentClasses[0] : undefined)
            : studentClasses || undefined;
        // If form sends `{ classId: "..." }` instead of `studentClasses`, map it here.
        const studentClassIdFromClassId = req.body?.classId || undefined;
        const finalStudentClass = studentClassesNormalized ?? studentClassIdFromClassId;
        // Note: Students may be created without an assigned class; class can be added later.
        const teacherSubjectNormalized = Array.isArray(teacherSubject)
            ? teacherSubject
            : teacherSubject
                ? [teacherSubject]
                : [];
        const parentStudentsNormalized = Array.isArray(parentStudents)
            ? parentStudents
            : parentStudents
                ? [parentStudents]
                : [];
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
            }
            else {
                // if no ID number is passed, update with the next in the sequence based on the role prefix (e.g., UJ0000ST0001 for students, UJ0000AD0001 for admins, etc.)
                if (!idNumber) {
                    const rolePrefix = role === "admin" ? "UJMBBSAD" : role === "teacher" ? "UJMBBSTE" : role === "student" ? "UJMBBSST" : role === "parent" ? "UJMBBSPA" : role === "unitconsultant" ? "UJMBBSUC" : role === "unitresident" ? "UJMBBSUR" : "UJMBBSST"; // Default prefix for unknown roles
                    const lastUserWithRolePrefix = await User.findOne({ idNumber: { $regex: `^${rolePrefix}` } }).sort({ createdAt: -1 });
                    if (lastUserWithRolePrefix) {
                        const lastIDNumber = lastUserWithRolePrefix.idNumber;
                        const prefix = lastIDNumber.slice(0, -4);
                        const lastNumericPart = parseInt(lastIDNumber.slice(-4));
                        const newNumericPart = (lastNumericPart + 1).toString().padStart(4, '0');
                        newIDNumber = `${prefix}${newNumericPart}`;
                    }
                    else {
                        // If no existing user with the same role prefix is found, we can start with the first ID number in the sequence (e.g., UJ0000ST0001 for students)
                        const rolePrefix = role === "admin" ? "UJ0000AD" : role === "teacher" ? "UJ0000TE" : role === "student" ? "UJ0000ST" : role === "parent" ? "UJ0000PA" : role === "unitconsultant" ? "UJ0000UC" : role === "unitresident" ? "UJ0000UR" : "UJ0000ST"; // Default prefix for unknown roles
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
            role: normalizedRole,
            department: (departmentDoc ? departmentDoc.name : typeof department === "string" ? department.trim() : undefined),
            departmentId: departmentDoc ? departmentDoc._id : undefined,
            studentClasses: finalStudentClass,
            teacherSubject: teacherSubjectNormalized,
            parentStudents: parentStudentsNormalized,
            isActive,
            isSupervisor: isSupervisor || false,
            supervisorRank: supervisorRank || 0,
            specialties: Array.isArray(specialties) ? specialties : (specialties ? [specialties] : [])
        });
        if (newUser) {
            await newUser.populate("studentClasses", "name academicYear");
            // teacherSubject is populated from the Course model
            await newUser.populate("teacherSubject", "name code");
            // If student, link to class students array
            if (role === "student" && finalStudentClass) {
                const ClassModel = require("../models/classes").default;
                await ClassModel.findByIdAndUpdate(finalStudentClass, { $addToSet: { students: newUser._id } }, { returnDocument: 'after' });
            }
            //if a supevisor link to the supervisor array
            if (role === "supervisor") {
                const ClassModel = require("../models/classes").default;
                await ClassModel.findByIdAndUpdate(finalStudentClass, { $addToSet: { supervisors: newUser._id } }, { returnDocument: 'after' });
            }
            //if a supevisor, teacher, consultant, resident link to a department array
            if (req.user) {
                await logActivity({
                    userId: req.user._id.toString(),
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
                isSupervisor: newUser.isSupervisor,
                supervisorRank: newUser.supervisorRank,
                specialties: newUser.specialties,
                message: `User '${newUser.name}' created successfully`
            });
        }
        else {
            res.status(400).json({ status: "Error!", message: "Invalid user data" });
        }
        // res.status(201).json({ status: "Success!", message: `User '${newUser.name}' created successfully`, data: newUser });
    }
    catch (error) {
        res.status(500).json({ status: "Error!", message: "Internal server error", error: `${error}` });
    }
};
// @desc    Log in a user
// @route   POST /api/users/login
// @access  Public 
// Public registration for self-signup (used by frontend registration flow)
export const registerPublic = async (req, res) => {
    try {
        const { name, email, password, idNumber, role, departmentId, department, studentClasses, teacherSubject, parentStudents, isActive, } = req.body;
        const normalizedRole = normalizeRole(role);
        // Determine if first user
        const usersCount = await User.countDocuments();
        const isFirst = usersCount === 0;
        // If not first user, restrict public-assignable roles
        // Staff umbrella roles are allowed for self signup.
        const allowedRoles = isFirst
            ? ["admin", "teacher", "unitconsultant", "unitresident"]
            : ["student", "teacher", "parent", "unitconsultant", "unitresident"];
        if (!normalizedRole || !allowedRoles.includes(normalizedRole)) {
            res.status(400).json({ message: "Invalid role for public registration" });
            return;
        }
        const departmentDoc = await findDepartment(departmentId || department ||
            req.body?.departmentCode || req.body?.departmentID);
        const isStaffUmbrella = ["teacher", "unitconsultant", "unitresident"].includes(normalizedRole);
        if (isStaffUmbrella && !departmentDoc) {
            res.status(400).json({ message: "Staff users must select a valid department" });
            return;
        }
        const approvalState = getRegistrationApprovalState(normalizedRole);
        const needsAdminApproval = requiresAdminApproval(normalizedRole);
        const requestedActiveState = typeof isActive === "boolean" ? isActive : approvalState.isActive;
        // Students may register without selecting a class; create account now and allow class assignment later.
        // NOTE: frontend sends studentClassName (readable), not class ObjectId.
        const studentClassName = req.body?.studentClassName || undefined;
        // Staff umbrella role handling: teacher/unitconsultant/unitresident should be cross-checked
        // against HospitalStaff.
        const normalizedName = typeof name === "string" ? name.trim() : "";
        if (isStaffUmbrella) {
            const staffTokens = normalizedName
                .toLowerCase()
                .split(/[^a-z0-9]+/i)
                .filter(Boolean);
            await (async () => {
                const staffQuery = { isActive: true };
                const matches = await require("../models/hospitalStaff").default.find(staffQuery).select("name");
                for (const s of matches) {
                    const sTokens = String(s.name || "")
                        .toLowerCase()
                        .split(/[^a-z0-9]+/i)
                        .filter(Boolean);
                    const shared = new Set(sTokens.filter((t) => staffTokens.includes(t)));
                    if (shared.size >= 2)
                        return true;
                }
                return false;
            })();
        }
        const studentClassNameRaw = studentClassName;
        // studentClassName must be one of: "400 level", "500 level", "600 level", "Final year"
        // Map it to a Class document by Class.name.
        let studentClassId = Array.isArray(studentClasses)
            ? studentClasses[0]
            : studentClasses || req.body?.classId || undefined;
        if (role === "student") {
            const candidate = (studentClassNameRaw || "").trim();
            if (candidate) {
                const ClassModel = require("../models/classes").default;
                const normalizedCandidate = String(candidate).toLowerCase().replace(/\s+/g, " ").trim();
                // Try exact name match first
                const classDoc = await ClassModel.findOne({ name: { $exists: true } })
                    .lean();
                // Instead of relying on the whole collection, do deterministic queries by allowed names.
                // Since Class.name is stored exactly, we do a normalized OR match using regex anchors.
                const allowedNames = ["400 level", "500 level", "600 level", "final year"];
                const mappedAllowed = allowedNames.find((n) => n === normalizedCandidate) || null;
                if (mappedAllowed) {
                    const classMatch = await ClassModel.findOne({
                        name: { $in: ["400 level", "500 level", "600 level", "Final year"] },
                    });
                    // fallback: in case "Final year" casing differs in DB
                    const classMatch2 = classMatch || (await ClassModel.findOne({ name: { $regex: `^${mappedAllowed}$`, $options: "i" } }));
                    if (classMatch2?._id) {
                        studentClassId = classMatch2._id;
                    }
                }
            }
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: "User already exists" });
            return;
        }
        // Normalize arrays
        const teacherSubjectNormalized = Array.isArray(teacherSubject)
            ? teacherSubject
            : teacherSubject
                ? [teacherSubject]
                : [];
        const parentStudentsNormalized = Array.isArray(parentStudents)
            ? parentStudents
            : parentStudents
                ? [parentStudents]
                : [];
        // idNumber generation
        let newIDNumber = idNumber;
        if (!newIDNumber) {
            const rolePrefix = role === "admin"
                ? "UJ0000AD"
                : role === "teacher"
                    ? "UJ0000TE"
                    : role === "student"
                        ? "UJ0000ST"
                        : role === "parent"
                            ? "UJ0000PA"
                            : "UJ0000ST";
            const lastUserWithRolePrefix = await User.findOne({ idNumber: { $regex: `^${rolePrefix}` } }).sort({ createdAt: -1 });
            if (lastUserWithRolePrefix) {
                const lastIDNumber = lastUserWithRolePrefix.idNumber;
                const prefix = lastIDNumber.slice(0, -4);
                const lastNumericPart = parseInt(lastIDNumber.slice(-4));
                const newNumericPart = (lastNumericPart + 1).toString().padStart(4, '0');
                newIDNumber = `${prefix}${newNumericPart}`;
            }
            else {
                newIDNumber = `${rolePrefix}0001`;
            }
        }
        const newUser = await User.create({
            name,
            email,
            password,
            idNumber: newIDNumber,
            role: normalizedRole,
            department: (departmentDoc ? departmentDoc.name : typeof department === "string" ? department.trim() : undefined),
            departmentId: departmentDoc ? departmentDoc._id : undefined,
            studentClasses: studentClassId,
            teacherSubject: teacherSubjectNormalized,
            parentStudents: parentStudentsNormalized,
            isActive: requestedActiveState,
            approvalStatus: approvalState.approvalStatus,
        });
        if (newUser) {
            await newUser.populate('studentClasses', 'name academicYear');
            await newUser.populate('teacherSubject', 'name code');
            if (role === 'student' && studentClassId) {
                const ClassModel = require('../models/classes').default;
                await ClassModel.findByIdAndUpdate(studentClassId, { $addToSet: { students: newUser._id } });
            }
            // If a student registered without a class, notify all admins to assign a class
            if (role === 'student' && !studentClassId) {
                try {
                    const admins = await User.find({ role: 'admin' }).select('_id');
                    const notifications = admins.map((a) => ({
                        userId: a._id,
                        role: 'admin',
                        title: 'New student requires class assignment',
                        message: `${newUser.name} (${newUser.email}) registered and needs to be assigned to a class.`,
                        type: 'system',
                        isRead: false,
                        metadata: { newUserId: newUser._id },
                    }));
                    if (notifications.length) {
                        const inserted = await Notification.insertMany(notifications);
                        // broadcast each created notification via SSE to the specific admin user
                        try {
                            for (const doc of inserted) {
                                try {
                                    sendSSE('notification', doc, String(doc.userId));
                                }
                                catch (err) {
                                    console.error('Failed to send SSE for inserted notifications', err);
                                }
                            }
                        }
                        catch (err) {
                            console.error('Failed to send SSE for inserted notifications', err);
                        }
                    }
                }
                catch (err) {
                    console.error('Failed to notify admins about new student:', err);
                }
            }
            if (needsAdminApproval) {
                try {
                    const admins = await User.find({ role: 'admin' }).select('_id');
                    const notifications = admins.map((a) => ({
                        userId: a._id,
                        role: 'admin',
                        title: 'Pending staff registration',
                        message: `${newUser.name} (${newUser.email}) submitted a ${normalizedRole} registration and is waiting for admin approval.`,
                        type: 'system',
                        isRead: false,
                        metadata: {
                            pendingUserId: newUser._id,
                            pendingUserEmail: newUser.email,
                            pendingUserName: newUser.name,
                            requestedRole: normalizedRole,
                            approvalStatus: newUser.approvalStatus,
                        },
                    }));
                    if (notifications.length) {
                        const inserted = await Notification.insertMany(notifications);
                        for (const doc of inserted) {
                            try {
                                sendSSE('notification', doc, String(doc.userId));
                            }
                            catch (err) {
                                console.error('Failed to send SSE for pending staff notification', err);
                            }
                        }
                    }
                }
                catch (err) {
                    console.error('Failed to notify admins about pending staff registration:', err);
                }
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
                approvalStatus: newUser.approvalStatus,
                requiresApproval: needsAdminApproval,
                message: needsAdminApproval
                    ? `User '${newUser.name}' created successfully and is pending admin approval.`
                    : `User '${newUser.name}' created successfully`,
            });
            return;
        }
        res.status(400).json({ message: 'Invalid user data' });
    }
    catch (error) {
        console.error("updateUser error:", error);
        const err = error;
        res.status(500).json({ message: "Server error", error: err?.message ?? String(err), stack: err?.stack });
    }
};
// Check if any users exist
export const isFirstUser = async (req, res) => {
    try {
        const count = await User.countDocuments();
        res.status(200).json({ count, isFirst: count === 0 });
    }
    catch (error) {
        res.status(500).json({ message: `Server error: ${error}` });
    }
};
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        // check if user exists and password matches 
        if (user && (await user.matchPassword(password))) {
            if (user.approvalStatus !== "approved") {
                const message = user.approvalStatus === "pending"
                    ? "Your account is pending admin approval."
                    : user.approvalStatus === "rejected"
                        ? "Your account has been rejected."
                        : "Your account is not approved.";
                res.status(403).json({ message });
                return;
            }
            if (!user.isActive) {
                // Recover approved users that were accidentally left inactive
                if (user.approvalStatus === "approved" && (user.approvedAt || user.approvedBy)) {
                    user.isActive = true;
                    await user.save();
                }
                else {
                    res.status(403).json({ message: "Your account is inactive." });
                    return;
                }
            }
            const token = generateToken(user.id.toString(), res);
            const responsePayload = {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    idNumber: user.idNumber,
                    profileImage: user.profileImage,
                    studentClasses: user.studentClasses,
                    studentClass: user.studentClasses,
                    teacherSubject: user.teacherSubject,
                    parentStudents: user.parentStudents,
                    isActive: user.isActive,
                    academicStatus: user.academicStatus,
                    departmentRole: user.departmentRole,
                },
                token,
            };
            if (req.user) {
                await logActivity({
                    userId: user._id.toString(),
                    action: "Login User",
                    details: `${user.name} logged in successfully.`,
                });
            }
            res.status(201).json(responsePayload);
            return;
        }
        else {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};
// next we add fetch all activities(or let's do it now)
// done!
export const approvePendingUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        if (user.approvalStatus === "approved" && user.isActive) {
            res.status(200).json({ message: "User is already approved", user });
            return;
        }
        user.approvalStatus = "approved";
        user.isActive = true;
        user.approvedAt = user.approvedAt ?? new Date();
        user.approvedBy = user.approvedBy ?? req.user?._id ?? null;
        await user.save();
        await Notification.create({
            userId: user._id,
            role: user.role,
            title: "Account approved",
            message: `Your account has been approved. You can now sign in with the password you created during registration.`,
            type: "success",
            isRead: false,
            metadata: { approvedBy: req.user?._id ?? null },
        });
        await sendAccountApprovalEmail({
            to: user.email,
            name: user.name,
            loginUrl: process.env.FRONTEND_URL || "http://localhost:5173/login",
            message: `Hi ${user.name}, your account has been approved. You can now sign in with the password you set during registration.`,
        });
        res.status(200).json({
            message: "User approved successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                approvalStatus: user.approvalStatus,
            },
        });
    }
    catch (error) {
        console.error("approvePendingUser error:", error);
        res.status(500).json({ message: "Server error", error: error?.message ?? String(error) });
    }
};
// @desc    Update user (Admin or self)
// @route   PATCH /api/users/:id
// @access  Private
export const updateUser = async (req, res) => {
    try {
        const authReq = req;
        const requestedId = req.params.id;
        const currentUserId = authReq.user?._id?.toString();
        const currentUserRole = authReq.user?.role;
        if (!mongoose.isValidObjectId(requestedId)) {
            res.status(400).json({ status: "Error!", message: "Invalid user id" });
            return;
        }
        // Allow users to update their own profile, or admins/teachers to update any profile
        const isOwnProfile = currentUserId === requestedId;
        const isAdmin = currentUserRole === "admin" || currentUserRole === "teacher";
        if (!isOwnProfile && !isAdmin) {
            res.status(403).json({
                status: "Error!",
                message: "You can only update your own profile"
            });
            return;
        }
        const user = await User.findById(req.params.id);
        if (user) {
            // capture previous student class before any changes (normalize populated objects)
            let previousStudentClass = undefined;
            if (user.studentClasses) {
                if (typeof user.studentClasses === "object" && user.studentClasses?._id) {
                    previousStudentClass = String(user.studentClasses._id);
                }
                else {
                    previousStudentClass = String(user.studentClasses);
                }
            }
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.idNumber = req.body.idNumber || user.idNumber;
            if (req.body.role !== undefined) {
                const normalizedRole = normalizeRole(req.body.role);
                if (normalizedRole) {
                    user.role = normalizedRole;
                }
            }
            user.isActive = req.body.isActive !== undefined ? req.body.isActive : user.isActive;
            // Normalize incoming student class value: accept `studentClasses`, `classId`, or an array
            if (req.body.studentClasses !== undefined || req.body.classId !== undefined) {
                const incoming = req.body.studentClasses !== undefined ? req.body.studentClasses : req.body.classId;
                const normalized = Array.isArray(incoming)
                    ? incoming.length ? incoming[0] : null
                    : typeof incoming === "string"
                        ? incoming.trim() || null
                        : incoming ?? null;
                user.studentClasses = normalized;
            }
            if (req.body.teacherSubject !== undefined) {
                const normalizedTeacherSubject = Array.isArray(req.body.teacherSubject)
                    ? req.body.teacherSubject
                    : req.body.teacherSubject
                        ? [req.body.teacherSubject]
                        : [];
                user.teacherSubject = normalizedTeacherSubject.filter((subject) => typeof subject !== "string" || subject.trim() !== "");
            }
            if (req.body.parentStudents !== undefined) {
                const normalizedParentStudents = Array.isArray(req.body.parentStudents)
                    ? req.body.parentStudents
                    : req.body.parentStudents
                        ? [req.body.parentStudents]
                        : [];
                user.parentStudents = normalizedParentStudents.filter((student) => typeof student !== "string" || student.trim() !== "");
            }
            if (req.body.department !== undefined || req.body.departmentId !== undefined) {
                const deptInput = req.body.departmentId ?? req.body.department;
                const deptDoc = await findDepartment(deptInput);
                if (deptDoc) {
                    user.departmentId = deptDoc._id;
                    user.department = deptDoc.name;
                }
                else if (req.body.department !== undefined) {
                    user.department = String(req.body.department).trim();
                }
            }
            if (req.body.academicStatus !== undefined)
                user.academicStatus = req.body.academicStatus;
            if (req.body.departmentRole !== undefined)
                user.departmentRole = req.body.departmentRole;
            if (req.body.isSupervisor !== undefined)
                user.isSupervisor = req.body.isSupervisor;
            if (req.body.supervisorRank !== undefined)
                user.supervisorRank = req.body.supervisorRank;
            if (req.body.specialties !== undefined)
                user.specialties = Array.isArray(req.body.specialties) ? req.body.specialties : [req.body.specialties];
            // Handle password change with current password verification
            if (req.body.password) {
                // If changing own password, require current password verification
                if (isOwnProfile && req.body.currentPassword) {
                    const isMatch = await user.matchPassword(req.body.currentPassword);
                    if (!isMatch) {
                        res.status(400).json({
                            status: "Error!",
                            message: "Current password is incorrect"
                        });
                        return;
                    }
                }
                user.password = req.body.password;
            }
            // Handle profile image update
            if (req.body.profileImage !== undefined) {
                user.profileImage = req.body.profileImage;
            }
            const updatedUser = await user.save();
            const updater = req.user;
            const userId = updater?._id?.toString?.();
            // Handle student class changes
            if (user.role === "student" && (req.body.studentClasses !== undefined || req.body.classId !== undefined)) {
                const ClassModel = require("../models/classes").default;
                // previousStudentClass was captured before mutation
                const oldClass = previousStudentClass;
                // Determine new class from the saved user document (updatedUser) where possible
                let newClass = undefined;
                if (updatedUser.studentClasses) {
                    if (typeof updatedUser.studentClasses === "object" && updatedUser.studentClasses?._id) {
                        newClass = String(updatedUser.studentClasses._id);
                    }
                    else {
                        newClass = String(updatedUser.studentClasses);
                    }
                }
                // Remove from old class if different
                if (oldClass && oldClass !== newClass && mongoose.isValidObjectId(oldClass)) {
                    try {
                        await ClassModel.findByIdAndUpdate(oldClass, { $pull: { students: user._id } });
                    }
                    catch (err) {
                        console.error('Failed to remove student from old class', err);
                    }
                }
                // Add to new class
                if (newClass && newClass !== oldClass && mongoose.isValidObjectId(newClass)) {
                    try {
                        await ClassModel.findByIdAndUpdate(newClass, { $addToSet: { students: user._id } });
                    }
                    catch (err) {
                        console.error('Failed to add student to new class', err);
                    }
                }
                // If a pending admin notification exists for assigning this student, remove it
                try {
                    await Notification.deleteMany({ 'metadata.newUserId': updatedUser._id, type: 'system' });
                }
                catch (err) {
                    console.error('Failed to clear admin notifications for user assignment:', err);
                }
                // Send notification to the user about class assignment
                try {
                    const ClassModel2 = require("../models/classes").default;
                    const classObj = newClass ? await ClassModel2.findById(newClass).select('name') : null;
                    try {
                        const notificationRole = updatedUser.role === 'unitconsultant' ? 'unitconsultant' : updatedUser.role === 'unitresident' ? 'unitresident' : updatedUser.role;
                        const created = await Notification.create({
                            userId: updatedUser._id,
                            role: notificationRole,
                            title: 'Assigned to class',
                            message: classObj ? `You have been assigned to ${classObj.name}.` : 'You have been assigned to a class.',
                            type: 'info',
                            isRead: false,
                            metadata: { classId: newClass, className: classObj?.name || null, updatedBy: userId },
                        });
                        try {
                            sendSSE('notification', created, String(created.userId));
                        }
                        catch (err) {
                            console.error('SSE send failed', err);
                        }
                    }
                    catch (err) {
                        console.error('Failed to notify user about class assignment:', err);
                    }
                }
                catch (err) {
                    console.error('Failed to notify user about class assignment:', err);
                }
            }
            // Notify the user if their profile was updated by someone else
            try {
                const updater = req.user;
                if (!isOwnProfile && updater) {
                    try {
                        const notificationRole = updatedUser.role === 'unitconsultant' ? 'unitconsultant' : updatedUser.role === 'unitresident' ? 'unitresident' : updatedUser.role;
                        const created = await Notification.create({
                            userId: updatedUser._id,
                            role: notificationRole,
                            title: 'Profile updated',
                            message: `Your profile was updated by ${updater.name || updater.email || 'an admin'}.`,
                            type: 'info',
                            isRead: false,
                            metadata: { updatedBy: updater._id, changes: req.body },
                        });
                        try {
                            sendSSE('notification', created, String(created.userId));
                        }
                        catch (err) {
                            console.error('SSE send failed', err);
                        }
                    }
                    catch (err) {
                        console.error('Failed to create profile-updated notification:', err);
                    }
                }
            }
            catch (err) {
                console.error('Failed to create profile-updated notification:', err);
            }
            if (updater) {
                //not responding at this point ... will continue the video for now ---to fix return to video at time: 1:30:45 / 7:05:54 ...
                await logActivity({
                    userId: userId,
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
                profileImage: updatedUser.profileImage,
                parentStudents: updatedUser.parentStudents,
                teacherSubject: updatedUser.teacherSubject,
                academicStatus: updatedUser.academicStatus,
                departmentRole: updatedUser.departmentRole,
                isSupervisor: updatedUser.isSupervisor,
                supervisorRank: updatedUser.supervisorRank,
                specialties: updatedUser.specialties,
                message: `User ${updatedUser.email} (ID: ${updatedUser.idNumber}) updated successfully.`,
            });
        }
        else {
            res.status(404).json({ status: "Error!", message: "User not found" });
        }
    }
    catch (error) {
        console.error('updateUser error:', error);
        const err = error;
        res.status(500).json({ message: 'Server error', error: err?.message ?? String(err), stack: err?.stack });
    }
};
// next we do Get all users
// @desc    Get all users (With Pagination & Filtering)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
        const limit = parseInt(req.query.limit) || 100;
        const role = normalizeRole(req.query.role);
        const departmentQuery = req.query.department;
        const search = req.query.search; // optional: add search later
        const skip = (page - 1) * limit;
        // 2. Build Filter Object
        const filter = {};
        if (role && role !== "all" && role !== "") {
            filter.role = role;
        }
        if (departmentQuery && departmentQuery !== "") {
            if (mongoose.isValidObjectId(departmentQuery)) {
                filter.departmentId = departmentQuery;
            }
            else {
                const departmentDoc = await Department.findOne({
                    $or: [{ code: departmentQuery }, { departmentID: departmentQuery }, { name: departmentQuery }],
                });
                if (departmentDoc) {
                    filter.departmentId = departmentDoc._id;
                }
                else {
                    filter.department = departmentQuery;
                }
            }
        }
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { idNumber: { $regex: search, $options: "i" } },
            ];
        }
        // 3. Fetch Users with Pagination & Filtering
        const [total, users] = await Promise.all([
            User.countDocuments(filter), // Get total count of users matching the filter
            User.find(filter)
                .select("-password")
                .populate("studentClasses", "_id name")
                .populate("teacherSubject", "_id name code")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
        ]);
        // 4. Send response
        res.status(200).json({
            users,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit,
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: `Server error`, error: `${error}` });
    }
};
// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private (admin, teacher, parent — own children)
export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select("-password")
            .populate("studentClasses", "_id name academicYear")
            .populate("teacherSubject", "_id name code")
            .populate("parentStudents", "name email idNumber role studentClasses");
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: `Server error`, error: `${error}` });
    }
};
// // for some reason, thr server fails when not connected online ... let's go on for now and see if it'll come back later on ... resolved today (23rd may 2026) after discovering that the server had been cut off due to network issues...
// next we do Delete user
// @desc    Delete user (Admin)
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            await User.deleteOne({ _id: user._id });
            if (req.user) {
                await logActivity({
                    userId: req.user._id.toString(),
                    action: "Deleted user",
                    details: `Deleted user ${user.name}, email: ${user.email}, id: ${user.idNumber}, successfully!`
                });
            }
            res.status(201).json({ message: `User ${user.email} deleted successfully.` });
        }
        else {
            res.status(404).json({ status: "Error!", message: "User not found" });
            return;
        }
    }
    catch (error) {
        res.status(500).json({ status: "Error!", message: `Server error: ${error}` });
    }
};
// @desc    Get user profile (via cookie)
// @route   GET /api/users/profile
// @access  Private 
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate("studentClasses", "name academicYear")
            .populate("teacherSubject", "name code")
            .populate("parentStudents", "name email idNumber role studentClasses");
        if (user) {
            res.json({
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    idNumber: user.idNumber,
                    profileImage: user.profileImage,
                    studentClasses: user.studentClasses,
                    teacherSubject: user.teacherSubject,
                    parentStudents: user.parentStudents,
                    academicStatus: user.academicStatus,
                    departmentRole: user.departmentRole,
                    isSupervisor: user.isSupervisor,
                    supervisorRank: user.supervisorRank,
                    specialties: user.specialties,
                }
            });
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
        }
        else {
            res.status(404).json({ status: "Error!", message: "Not authorized" });
        }
    }
    catch (error) {
        res.status(500).json({ status: "Error!", message: `Server error: ${error}` });
    }
};
// desc   Logout users / clear cookie
// route   POST /api/users/logout
// access  Public
export const logoutUser = async (req, res) => {
    try {
        res.cookie("jwt", "", {
            httpOnly: true,
            expires: new Date(0) // Set the cookie to expire immediately
        });
        res.json({ message: "Logged out successfully" });
    }
    catch (error) {
        res.status(500).json({ status: "Error!", message: `Server error: ${error}` });
    }
};
// @desc    Bulk upload users via file
// @route   POST /api/users/bulk-upload
// @access  Private/Admin
export const bulkUploadUsers = async (req, res) => {
    try {
        const { users, classId, courseIds } = req.body;
        if (!users || users.length === 0) {
            res.status(400).json({ status: "Error!", message: "No users provided." });
            return;
        }
        if (users.length > 500) {
            res.status(400).json({ status: "Error!", message: "Maximum 500 users per upload." });
            return;
        }
        // Validate each user entry
        for (const u of users) {
            if (!u.name || !u.email || !u.role) {
                res.status(400).json({
                    status: "Error!",
                    message: "Each user entry must have name, email, and role.",
                });
                return;
            }
            if (!["admin", "teacher", "student", "parent", "unitconsultant", "unitresident"].includes(u.role)) {
                res.status(400).json({
                    status: "Error!",
                    message: `Invalid role '${u.role}'. Must be admin, teacher, student, parent, unitconsultant, or unitresident.`,
                });
                return;
            }
        }
        // Trigger async Inngest function
        const { inngest } = require("../inngest");
        await inngest.send({
            name: "users/bulk-create",
            data: {
                users,
                classId: classId || undefined,
                courseIds: courseIds || undefined,
                userId: req.user?._id?.toString(),
            },
        });
        res.status(202).json({
            status: "Accepted",
            message: `Bulk upload started. Processing ${users.length} user(s) in the background.`,
        });
    }
    catch (error) {
        res.status(500).json({ status: "Error!", message: `Server error: ${error}` });
    }
};
// @desc    Extract user data from a PDF file
// @route   POST /api/users/bulk-upload/extract-pdf
// @access  Private/Admin
export const extractFromPDF = async (req, res) => {
    try {
        if (!req.body || typeof req.body !== "object") {
            res.status(400).json({ status: "Error!", message: "No file data provided." });
            return;
        }
        const { base64Data, mimeType } = req.body;
        if (!base64Data) {
            res.status(400).json({ status: "Error!", message: "No file data provided." });
            return;
        }
        // TODO: Integrate a PDF text extraction library (e.g. pdf-parse) when available
        res.status(501).json({
            status: "Error!",
            message: "PDF text extraction is not yet available. Please use a spreadsheet (.csv or .xlsx) with Name, Email, and ID Number columns.",
        });
    }
    catch (error) {
        res.status(500).json({ status: "Error!", message: `Server error: ${error}` });
    }
};
// @desc    Extract user data from an image file (OCR)
// @route   POST /api/users/bulk-upload/extract-image
// @access  Private/Admin
export const extractFromImage = async (req, res) => {
    try {
        if (!req.body || typeof req.body !== "object") {
            res.status(400).json({ status: "Error!", message: "No file data provided." });
            return;
        }
        const { base64Data, mimeType } = req.body;
        if (!base64Data) {
            res.status(400).json({ status: "Error!", message: "No file data provided." });
            return;
        }
        // TODO: Integrate an OCR service (e.g. Google Cloud Vision, AWS Textract, or Tesseract) when available
        res.status(501).json({
            status: "Error!",
            message: "Image OCR extraction is not yet available. Please use a spreadsheet (.csv or .xlsx) with Name, Email, and ID Number columns.",
        });
    }
    catch (error) {
        res.status(500).json({ status: "Error!", message: `Server error: ${error}` });
    }
};
