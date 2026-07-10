import { type Request, type Response } from "express";
import mongoose from "mongoose";
import Institution from "../models/institution";
import AcademicSession from "../models/academicSession";
import AcademicYear from "../models/academicYear";
import Semester from "../models/semester";
import AttendanceSettings from "../models/attendanceSettings";
import AssessmentSettings from "../models/assessmentSettings";
import BrandingSettings from "../models/brandingSettings";
import ApplicationSettings from "../models/applicationSettings";
import Department from "../models/departments";
import Unit from "../models/units";
import User, { UserRole } from "../models/user";
import ClassModel from "../models/classes";
import AcademicClock, { buildPhaseConfigForClassLevel, resolveClassLevelFromName } from "../models/academicClock";

const DEFAULT_DEPARTMENT_NAMES = [
  "Medicine",
  "Surgery",
  "Obstetrics & Gynaecology",
  "Paediatrics",
  "Psychiatry",
  "Community Medicine",
  "Family Medicine",
  "Anaesthesia",
  "Radiology",
  "Orthopaedics",
  "ENT",
  "Ophthalmology",
  "Chemical Pathology",
  "Haematology",
  "Medical Microbiology",
  "Histopathology",
];

const sanitizeCode = (name: string) =>
  name
    .replace(/\s+&\s+/g, "-")
    .replace(/[^A-Za-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();

const parseSessionRange = (value: string) => {
  const cleaned = String(value || "").trim();
  const match = cleaned.match(/(\d{4})\s*[\/-]\s*(\d{4})/);
  if (!match) {
    const now = new Date();
    return {
      name: cleaned || `${now.getFullYear()}/${now.getFullYear() + 1}`,
      startsAt: new Date(now.getFullYear(), 0, 1),
      endsAt: new Date(now.getFullYear() + 1, 11, 31),
    };
  }
  const [, fromYear, toYear] = match;
  return {
    name: `${fromYear}/${toYear}`,
    startsAt: new Date(Number(fromYear), 0, 1),
    endsAt: new Date(Number(toYear), 11, 31),
  };
};

const getYearRangeFromSession = (value: string) => {
  const info = parseSessionRange(value);
  return {
    name: info.name,
    fromYear: info.startsAt,
    toYear: info.endsAt,
  };
};

const buildUserIdNumber = (role: string, index: number) => {
  const roleCode = role === UserRole.STUDENT
    ? "STU"
    : role === UserRole.TEACHER
      ? "TCH"
      : role === UserRole.UNITCONSULTANT
        ? "UC"
        : role === UserRole.UNITRESIDENT
          ? "UR"
          : "ADM";

  return `${roleCode}-${String(index).padStart(3, "0")}-${Date.now()}`;
};

export const getSetupStatus = async (_req: Request, res: Response) => {
  try {
    const institution = await Institution.findOne().populate("brandingSettings", "primaryColor accentColor").lean();
    res.status(200).json({
      configured: Boolean(institution),
      institution: institution
        ? {
            name: institution.name,
            shortName: institution.shortName,
            type: institution.type,
            country: institution.country,
            state: institution.state,
            city: institution.city,
            academicCalendarType: institution.academicCalendarType,
            timezone: institution.timezone,
            logoUrl: institution.logoUrl || "",
            backgroundImageUrl: (institution as any).backgroundImageUrl || "",
            brandingSettings: {
              primaryColor: (institution as any).brandingSettings?.primaryColor || "#2563eb",
              accentColor: (institution as any).brandingSettings?.accentColor || "#4f46e5",
            },
          }
        : null,
    });
  } catch (error) {
    console.error("Setup status error:", (error as Error).message);
    res.status(500).json({ status: "Error", message: "Unable to determine setup status." });
  }
};

export const createInitialSetup = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existingInstitution = await Institution.findOne().session(session);
    if (existingInstitution) {
      await session.abortTransaction();
      return res.status(409).json({ status: "Error", message: "The application has already been configured." });
    }

    const {
      institutionProfile,
      academicStructure,
      clinicalStructure,
      attendanceConfiguration,
      assessmentConfiguration,
      brandingSettings,
      administrator,
      applicationSettings,
      staffUsers = [],
      students = [],
    } = req.body;

    if (!institutionProfile || !academicStructure || !administrator) {
      await session.abortTransaction();
      return res.status(400).json({ status: "Error", message: "Missing required setup payload." });
    }

    const sessionInfo = parseSessionRange(academicStructure.academicSession || academicStructure.academicYear || "");
    const academicSessionDoc = await AcademicSession.create([
      {
        name: sessionInfo.name,
        startsAt: sessionInfo.startsAt,
        endsAt: sessionInfo.endsAt,
        isCurrent: true,
      },
    ], { session, ordered: true });

    const academicYearInfo = getYearRangeFromSession(academicStructure.academicYear || academicStructure.academicSession || "");
    const academicYearDoc = await AcademicYear.create([
      {
        name: academicYearInfo.name,
        fromYear: academicYearInfo.fromYear,
        toYear: academicYearInfo.toYear,
        isCurrent: true,
      },
    ], { session, ordered: true });

    const semesterOptions = Array.isArray(academicStructure.semesters) && academicStructure.semesters.length
      ? academicStructure.semesters
      : ["First Semester", "Second Semester"];

    const semesterDocs = await Semester.create(
      semesterOptions.map((semesterName: string, index: number) => ({
        name: semesterName,
        academicSession: academicSessionDoc[0]._id,
        order: index + 1,
        isActive: true,
      })),
      { session, ordered: true }
    );

    const attendanceDoc = await AttendanceSettings.create([
      {
        lectureAttendance: Boolean(attendanceConfiguration?.lectureAttendance),
        clinicalAttendance: Boolean(attendanceConfiguration?.clinicalAttendance),
        seminarAttendance: Boolean(attendanceConfiguration?.seminarAttendance),
        verificationMethods: {
          qrCode: Boolean(attendanceConfiguration?.verificationMethods?.qrCode),
          bluetooth: Boolean(attendanceConfiguration?.verificationMethods?.bluetooth),
          gps: Boolean(attendanceConfiguration?.verificationMethods?.gps),
          administratorApproval: Boolean(attendanceConfiguration?.verificationMethods?.administratorApproval),
        },
        minimumAttendancePercentage: Number(attendanceConfiguration?.minimumAttendancePercentage ?? 75),
        gracePeriodMinutes: Number(attendanceConfiguration?.gracePeriodMinutes ?? 10),
        attendanceWindowMinutes: Number(attendanceConfiguration?.attendanceWindowMinutes ?? 120),
      },
    ], { session, ordered: true });

    const assessmentDoc = await AssessmentSettings.create([
      {
        mcq: Boolean(assessmentConfiguration?.mcq),
        essay: Boolean(assessmentConfiguration?.essay),
        osce: Boolean(assessmentConfiguration?.osce),
        longCase: Boolean(assessmentConfiguration?.longCase),
        shortCase: Boolean(assessmentConfiguration?.shortCase),
        continuousAssessment: Boolean(assessmentConfiguration?.continuousAssessment),
        passMark: Number(assessmentConfiguration?.passMark ?? 50),
        gradingScale: Array.isArray(assessmentConfiguration?.gradingScale)
          ? assessmentConfiguration.gradingScale
          : ["A", "B", "C", "D", "F"],
      },
    ], { session, ordered: true });

    const brandingDoc = await BrandingSettings.create([
      {
        logoUrl: String(brandingSettings?.logoUrl || ""),
        faviconUrl: String(brandingSettings?.faviconUrl || ""),
        coverImageUrl: String(brandingSettings?.coverImageUrl || ""),
        primaryColor: String(brandingSettings?.primaryColor || "#2563eb"),
        accentColor: String(brandingSettings?.accentColor || "#4f46e5"),
      },
    ], { session, ordered: true });

    const applicationSettingsDoc = await ApplicationSettings.create([
      {
        defaultLanguage: String(applicationSettings?.defaultLanguage || "en"),
        allowPublicRegistration: Boolean(applicationSettings?.allowPublicRegistration ?? false),
        timezone: String(applicationSettings?.timezone || institutionProfile.timezone || "UTC"),
        dateFormat: String(applicationSettings?.dateFormat || "YYYY-MM-DD"),
        extra: applicationSettings?.extra || {},
      },
    ], { session, ordered: true });

    const departmentNames = Array.isArray(clinicalStructure?.defaultDepartments) && clinicalStructure.defaultDepartments.length
      ? clinicalStructure.defaultDepartments
      : DEFAULT_DEPARTMENT_NAMES;

    const departments: Array<any> = [];
    for (const departmentName of departmentNames) {
      const existingDepartment = await Department.findOne({ name: departmentName }).session(session);
      if (existingDepartment) {
        departments.push(existingDepartment);
        continue;
      }
      const code = sanitizeCode(departmentName).slice(0, 8);
      const departmentID = `${code}-${new Date().getFullYear()}`;
      const doc = await Department.create([{ name: departmentName, code, departmentID }], { session, ordered: true });
      departments.push(doc[0]);
    }

    const unitItems = Array.isArray(clinicalStructure?.defaultUnits) ? clinicalStructure.defaultUnits : [];
    const units: Array<any> = [];
    for (const item of unitItems) {
      const department = departments.find((dept) => dept.name === item.departmentName || dept.departmentID === item.departmentId);
      if (!department) continue;
      const existingUnit = await Unit.findOne({ name: item.name, department: department._id }).session(session);
      if (existingUnit) {
        units.push(existingUnit);
        continue;
      }
      const code = sanitizeCode(item.name).slice(0, 8);
      const unitID = `${code}-${new Date().getFullYear()}`;
      const unitDoc = await Unit.create([{ name: item.name, code, unitID, department: department._id }], { session, ordered: true });
      units.push(unitDoc[0]);
      await Department.findByIdAndUpdate(department._id, { $addToSet: { units: unitDoc[0]._id } }, { session });
    }

    const adminPayload = {
      name: `${administrator.firstName || ""} ${administrator.lastName || ""}`.trim(),
      email: administrator.email,
      password: administrator.password,
      idNumber: administrator.idNumber || `ADMIN-${Date.now()}`,
      role: UserRole.ADMIN,
      isActive: true,
      approvalStatus: "approved" as const,
      profileImage: administrator.profileImage || null,
    };
    const [adminUserDoc] = await User.create([adminPayload], { session, ordered: true });

    const classPayloads = Array.isArray(academicStructure.classes) && academicStructure.classes.length
      ? academicStructure.classes
      : [{ name: "500 Level", capacity: 120 }];

    const createdClasses: Array<any> = [];
    for (const classItem of classPayloads) {
      const className = classItem.name || "500 Level";
      const matchingStaff = Array.isArray(staffUsers)
        ? staffUsers.find((person: any) => person.role === UserRole.TEACHER && person.className === className)
        : null;

      const classDoc = await ClassModel.create([
        {
          name: className,
          academicYear: academicYearDoc[0]._id,
          classTeacher: matchingStaff ? null : null,
          capacity: Number(classItem.capacity ?? 120),
        },
      ], { session, ordered: true });
      createdClasses.push(classDoc[0]);
    }

    const createdStaffUsers: Array<any> = [];
    for (const [index, person] of (staffUsers as Array<any>).entries()) {
      const departmentName = person.departmentName || person.department || "Medicine";
      const department = departments.find((item) => item.name === departmentName) || departments[0];
      const unitName = person.unitName || person.unit || null;
      const unit = unitName
        ? await Unit.findOne({ name: unitName, department: department?._id }).session(session)
        : null;

      const userDoc = await User.create([
        {
          name: `${person.firstName || ""} ${person.lastName || ""}`.trim(),
          email: person.email,
          password: person.password || "Password@123",
          idNumber: person.idNumber || buildUserIdNumber(person.role || UserRole.TEACHER, index + 1),
          role: person.role || UserRole.TEACHER,
          department: department?.name || departmentName,
          departmentId: department?._id || null,
          isActive: true,
          approvalStatus: "approved",
          phone: person.phone || null,
          specialties: Array.isArray(person.specialties) ? person.specialties : [],
          academicStatus: person.academicStatus || null,
          departmentRole: person.departmentRole || null,
          profileImage: person.profileImage || null,
        },
      ], { session, ordered: true });

      createdStaffUsers.push(userDoc[0]);

      if (person.role === UserRole.TEACHER && person.className) {
        const assignedClass = createdClasses.find((item) => item.name === person.className);
        if (assignedClass) {
          await ClassModel.findByIdAndUpdate(assignedClass._id, { classTeacher: userDoc[0]._id }, { session });
        }
      }

      if (unit && person.role !== UserRole.STUDENT) {
        await User.findByIdAndUpdate(userDoc[0]._id, { $set: { specialties: Array.from(new Set([...(userDoc[0].specialties || []), unit.name])) } }, { session });
      }
    }

    const createdStudents: Array<any> = [];
    for (const [index, person] of (students as Array<any>).entries()) {
      const departmentName = person.departmentName || person.department || "Medicine";
      const department = departments.find((item) => item.name === departmentName) || departments[0];
      const className = person.className || classPayloads[0]?.name || "500 Level";
      const targetClass = createdClasses.find((item) => item.name === className) || createdClasses[0];
      const userDoc = await User.create([
        {
          name: `${person.firstName || ""} ${person.lastName || ""}`.trim(),
          email: person.email,
          password: person.password || "Student@123",
          idNumber: person.idNumber || buildUserIdNumber(UserRole.STUDENT, index + 1),
          role: UserRole.STUDENT,
          department: department?.name || departmentName,
          departmentId: department?._id || null,
          studentClasses: targetClass?._id || null,
          isActive: true,
          approvalStatus: "approved",
          profileImage: person.profileImage || null,
        },
      ], { session, ordered: true });

      createdStudents.push(userDoc[0]);
      if (targetClass) {
        await ClassModel.findByIdAndUpdate(targetClass._id, { $addToSet: { students: userDoc[0]._id } }, { session });
      }
    }

    for (const classItem of createdClasses) {
      const classLevel = resolveClassLevelFromName(classItem.name);
      await AcademicClock.create([
        {
          academicYear: academicYearDoc[0]._id,
          classId: classItem._id,
          classLevel,
          clockStartDate: academicYearDoc[0].fromYear,
          phaseConfig: buildPhaseConfigForClassLevel(classLevel),
        },
      ], { session, ordered: true });
    }

    const institution = await Institution.create([
      {
        name: institutionProfile.name,
        shortName: institutionProfile.shortName,
        type: institutionProfile.type,
        country: institutionProfile.country,
        state: institutionProfile.state,
        city: institutionProfile.city,
        academicCalendarType: institutionProfile.academicCalendarType,
        timezone: institutionProfile.timezone,
        logoUrl: String(institutionProfile.logoUrl || ""),
        backgroundImageUrl: String(institutionProfile.backgroundImageUrl || ""),
        academicSession: academicSessionDoc[0]._id,
        semesters: semesterDocs.map((semester) => semester._id),
        defaultDepartments: departments.map((dept) => dept._id),
        defaultUnits: units.map((unit) => unit._id),
        attendanceSettings: attendanceDoc[0]._id,
        assessmentSettings: assessmentDoc[0]._id,
        brandingSettings: brandingDoc[0]._id,
        applicationSettings: applicationSettingsDoc[0]._id,
        administratorUser: adminUserDoc._id,
      },
    ], { session, ordered: true });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: "Success",
      message: "Initial system setup completed.",
      institution: institution[0],
      created: {
        academicSession: academicSessionDoc[0],
        academicYear: academicYearDoc[0],
        classes: createdClasses,
        staff: createdStaffUsers,
        students: createdStudents,
      },
    });
  } catch (error) {
    console.error("Initial setup failed:", (error as Error).message);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ status: "Error", message: "Could not complete initial setup.", error: (error as Error).message });
  }
};
