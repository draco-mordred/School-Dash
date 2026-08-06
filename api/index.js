import { createRequire } from "node:module";
import serverless from "serverless-http";
import cookieParser from "cookie-parser";
import * as express$1 from "express";
import express, { Router } from "express";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import cors from "cors";
import console$1 from "node:console";
import * as dns from "node:dns";
import mongoose, { Schema } from "mongoose";
import * as bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Inngest, NonRetriableError } from "inngest";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import { serve } from "inngest/express";
import { EventEmitter } from "events";
import { z } from "zod";
import crypto from "crypto";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esmMin = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __export = (all) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	return target;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __require = /* @__PURE__ */ createRequire(import.meta.url);
const connectDB = async () => {
	try {
		const link = process.env.MONGODB_URI || process.env.MONGO_URI;
		if (!link) throw new Error("Missing MongoDB connection string. Set MONGODB_URI or MONGO_URI.");
		const conn = await mongoose.connect(link, {
			serverSelectionTimeoutMS: 5e3,
			socketTimeoutMS: 2e4,
			connectTimeoutMS: 5e3,
			retryWrites: true,
			maxPoolSize: 10,
			minPoolSize: 2
		});
		console.log(`MongoDB Connected ONLINE @: ${conn.connection.host}`);
		return conn;
	} catch (error) {
		console.error(`MongoDB connection failed: ${error.message}`);
		throw error;
	}
};
var normalizeInstitutionName, normalizeRoleCode, normalizeIdNumber, buildInnNumber;
var init_innGenerator = __esmMin((() => {
	normalizeInstitutionName = (value) => {
		const cleaned = (value ?? "").toString().trim();
		if (!cleaned) return "00";
		const compact = cleaned.replace(/[^A-Za-z]/g, "").toUpperCase();
		if (!compact) return "00";
		const prefix = compact.slice(0, 2);
		return prefix.length === 2 ? prefix : `${prefix}0`;
	};
	normalizeRoleCode = (role) => {
		switch ((role ?? "student").toString().trim().toLowerCase()) {
			case "admin": return "01";
			case "teacher": return "02";
			case "student": return "03";
			case "parent": return "04";
			case "unitconsultant": return "05";
			case "unitresident": return "06";
			default: return "03";
		}
	};
	normalizeIdNumber = (value) => {
		const digits = (value ?? "").toString().trim().replace(/\D/g, "");
		return digits.length >= 4 ? digits.slice(-4) : digits.padStart(4, "0");
	};
	buildInnNumber = ({ institutionName, idNumber, role, sequence }) => {
		return `${normalizeInstitutionName(institutionName)}${normalizeRoleCode(role)}${normalizeIdNumber(idNumber)}${String(Math.max(0, sequence)).padStart(3, "0")}`.replace(/\D/g, "").slice(0, 10).padStart(10, "0");
	};
}));
var UserRole, UserIDs, UserAcademicStatus, UserDepartmentRole, UserSchema, User, user_default$1;
var init_user = __esmMin((() => {
	init_innGenerator();
	UserRole = {
		ADMIN: "admin",
		TEACHER: "teacher",
		STUDENT: "student",
		PARENT: "parent",
		UNITCONSULTANT: "unitconsultant",
		UNITRESIDENT: "unitresident"
	};
	UserIDs = {
		ADMINID: "UJMBBSAD0000",
		STUDENTID: "UJMBBSST0000",
		TEACHERID: "UJMBBSTE0000",
		PARENTID: "UJMBBSPA0000",
		UNITCONSULTANTID: "UJMBBSUC0000",
		UNITRESIDENTID: "UJMBBSUR0000"
	};
	UserAcademicStatus = {
		professor: "professor",
		associateProfessor: "associate professor",
		lecturerI: "lecturer i",
		lecturerII: "lecturer ii",
		assistantLecturer: "assistant lecturer",
		resident: "resident",
		intern: "intern",
		juniorResident: "junior resident",
		seniorResident: "senior resident",
		chiefResident: "chief resident",
		fellow: "fellow",
		attendingPhysician: "attending physician",
		consultant: "consultant",
		medicalDirector: "medical director",
		student: "student"
	};
	UserDepartmentRole = {
		headOfDepartment: "head of department",
		deanOfFaculty: "dean of faculty",
		examOfficer: "exam officer",
		financeOfficer: "finance officer",
		levelCordinator: "level coordinator",
		member: "member"
	};
	UserSchema = new Schema({
		name: {
			type: String,
			required: true
		},
		email: {
			type: String,
			required: false,
			sparse: true
		},
		idNumber: {
			type: String,
			default: UserIDs.STUDENTID
		},
		inn: {
			type: String,
			default: null,
			sparse: true
		},
		password: {
			type: String,
			required: true
		},
		passwordResetToken: {
			type: String,
			default: null
		},
		passwordResetExpiresAt: {
			type: Date,
			default: null
		},
		lastPasswordResetRequestedAt: {
			type: Date,
			default: null
		},
		role: {
			type: String,
			enum: Object.values(UserRole),
			required: true,
			default: UserRole.STUDENT
		},
		faculty: {
			type: String,
			default: null
		},
		facultyId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Faculty",
			default: null
		},
		department: {
			type: String,
			default: null
		},
		departmentId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Department",
			default: null
		},
		isActive: {
			type: Boolean,
			default: true
		},
		approvalStatus: {
			type: String,
			enum: [
				"pending",
				"approved",
				"rejected"
			],
			default: "approved"
		},
		approvedAt: {
			type: Date,
			default: null
		},
		approvedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null
		},
		profileImage: {
			type: String,
			default: null
		},
		studentClasses: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Class"
		},
		teacherSubject: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Course",
			default: null
		}],
		parentStudents: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null
		}],
		academicStatus: {
			type: String,
			enum: Object.values(UserAcademicStatus),
			default: null
		},
		departmentRole: {
			type: String,
			enum: Object.values(UserDepartmentRole),
			default: null
		},
		phone: {
			type: String,
			default: null
		},
		isSupervisor: {
			type: Boolean,
			default: false
		},
		supervisorRank: {
			type: Number,
			default: null
		},
		supervisorStudents: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: []
		}],
		specialties: [{
			type: String,
			default: []
		}],
		attendance: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Attendance",
			default: []
		}],
		mordred_rules: {
			max_ticket_capacity: {
				type: Number,
				default: 5
			},
			current_active_load: {
				type: Number,
				default: 0
			},
			can_approve_logbooks: {
				type: Boolean,
				default: false
			},
			can_edit_timetables: {
				type: Boolean,
				default: false
			}
		},
		mordred_assigned_tasks: [{
			task_type: {
				type: String,
				uppercase: true
			},
			reference_id: { type: mongoose.Schema.Types.ObjectId },
			assigned_at: {
				type: Date,
				default: Date.now
			}
		}]
	}, { timestamps: true });
	UserSchema.pre("save", async function() {
		if (this.isModified("password")) {
			const salt = await bcrypt.genSalt(10);
			this.password = await bcrypt.hash(this.password, salt);
		}
		if (!this.inn || this.isModified("inn") || this.isNew) {
			const institutionName = this.institutionName || process.env.INSTITUTION_NAME || "University";
			const role = this.role || UserRole.STUDENT;
			const idNumber = this.idNumber || "";
			if (!this.inn) this.inn = buildInnNumber({
				institutionName,
				idNumber,
				role,
				sequence: (await mongoose.model("User").find({ role }).select("_id inn").sort({
					createdAt: 1,
					_id: 1
				}).lean()).length + 1
			});
		}
	});
	UserSchema.methods.matchPassword = async function(enteredPassword) {
		return await bcrypt.compare(enteredPassword, this.password);
	};
	User = mongoose.model("User", UserSchema);
	user_default$1 = User;
}));
init_user();
var DepartmentSchema = new Schema({
	name: {
		type: String,
		required: [true, "Department name required"],
		trim: true
	},
	code: {
		type: String,
		required: [true, "Department code required"],
		trim: true
	},
	departmentID: {
		type: String,
		required: [true, "Department ID required"],
		trim: true
	},
	facultyId: {
		type: Schema.Types.ObjectId,
		ref: "Faculty",
		default: null
	},
	head: {
		type: Schema.Types.ObjectId,
		ref: "User",
		default: null
	},
	units: [{
		type: Schema.Types.ObjectId,
		ref: "Unit"
	}],
	courses: [{
		type: Schema.Types.ObjectId,
		ref: "Course"
	}]
}, { timestamps: true });
DepartmentSchema.index({
	name: 1,
	departmentID: 1
}, { unique: true });
var departments_default = mongoose.model("Department", DepartmentSchema);
var InstitutionSchema = new Schema({
	name: {
		type: String,
		required: [true, "Institution name is required"]
	},
	shortName: {
		type: String,
		required: [true, "Institution short name is required"]
	},
	type: {
		type: String,
		required: [true, "Institution type is required"]
	},
	country: {
		type: String,
		required: [true, "Country is required"]
	},
	state: {
		type: String,
		required: [true, "State is required"]
	},
	city: {
		type: String,
		required: [true, "City is required"]
	},
	addressLine1: {
		type: String,
		default: ""
	},
	addressLine2: {
		type: String,
		default: ""
	},
	contactEmail: {
		type: String,
		default: ""
	},
	phone: {
		type: String,
		default: ""
	},
	website: {
		type: String,
		default: ""
	},
	description: {
		type: String,
		default: ""
	},
	academicCalendarType: {
		type: String,
		required: [true, "Academic calendar type is required"]
	},
	timezone: {
		type: String,
		required: [true, "Timezone is required"]
	},
	logoUrl: {
		type: String,
		default: ""
	},
	backgroundImageUrl: {
		type: String,
		default: ""
	},
	academicSession: {
		type: Schema.Types.ObjectId,
		ref: "AcademicSession",
		required: true
	},
	semesters: [{
		type: Schema.Types.ObjectId,
		ref: "Semester"
	}],
	defaultDepartments: [{
		type: Schema.Types.ObjectId,
		ref: "Department"
	}],
	defaultUnits: [{
		type: Schema.Types.ObjectId,
		ref: "Unit"
	}],
	attendanceSettings: {
		type: Schema.Types.ObjectId,
		ref: "AttendanceSettings",
		required: true
	},
	assessmentSettings: {
		type: Schema.Types.ObjectId,
		ref: "AssessmentSettings",
		required: true
	},
	brandingSettings: {
		type: Schema.Types.ObjectId,
		ref: "BrandingSettings",
		required: true
	},
	administratorUser: {
		type: Schema.Types.ObjectId,
		ref: "User",
		required: true
	},
	applicationSettings: {
		type: Schema.Types.ObjectId,
		ref: "ApplicationSettings",
		required: true
	}
}, { timestamps: true });
var institution_default = mongoose.model("Institution", InstitutionSchema);
var FacultySchema = new Schema({
	name: {
		type: String,
		required: [true, "Faculty name required"],
		trim: true
	},
	code: {
		type: String,
		required: [true, "Faculty code required"],
		trim: true
	},
	facultyID: {
		type: String,
		required: [true, "Faculty ID required"],
		trim: true
	},
	head: {
		type: Schema.Types.ObjectId,
		ref: "User",
		default: null
	},
	departments: [{
		type: Schema.Types.ObjectId,
		ref: "Department"
	}],
	units: [{
		type: Schema.Types.ObjectId,
		ref: "Unit"
	}]
}, { timestamps: true });
FacultySchema.index({
	name: 1,
	facultyID: 1
}, { unique: true });
var faculty_default = mongoose.model("Faculty", FacultySchema);
let DepartmentName = /* @__PURE__ */ function(DepartmentName$1) {
	DepartmentName$1["medicine"] = "Medicine";
	DepartmentName$1["pediatrics"] = "Pediatrics";
	DepartmentName$1["obstetricsAndGynecology"] = "Obstetrics and Gynecology";
	DepartmentName$1["surgery"] = "Surgery";
	DepartmentName$1["psychiatry"] = "Psychiatry";
	DepartmentName$1["earNoseAndThroat"] = "ENT";
	DepartmentName$1["anaesthesiology"] = "Anaesthesiology";
	DepartmentName$1["radiology"] = "Radiology";
	DepartmentName$1["ophthalmology"] = "Ophthalmology";
	DepartmentName$1["dermatology"] = "Dermatology";
	DepartmentName$1["communityMedicine"] = "Community Medicine";
	DepartmentName$1["hematologyAndBloodTransfusion"] = "Hematology and Blood Transfusion";
	DepartmentName$1["anatomicPathology"] = "Anatomic Pathology";
	DepartmentName$1["microbiology"] = "Microbiology";
	DepartmentName$1["chemicalPathology"] = "Chemical Pathology";
	DepartmentName$1["clinicalParmacologyAndTherapeutics"] = "Clinical Pharmacology and Therapeutics";
	DepartmentName$1["familyMedicine"] = "Family Medicine";
	DepartmentName$1["orthopaedics"] = "Orthopaedics";
	DepartmentName$1["forensicMedicine"] = "Forensic Medicine";
	return DepartmentName$1;
}({});
let DepartmentCode = /* @__PURE__ */ function(DepartmentCode$1) {
	DepartmentCode$1["medicine"] = "MED";
	DepartmentCode$1["pediatrics"] = "PAE";
	DepartmentCode$1["obstetricsAndGynecology"] = "OBG";
	DepartmentCode$1["surgery"] = "SUR";
	DepartmentCode$1["psychiatry"] = "PSY";
	DepartmentCode$1["earNoseAndThroat"] = "ORL";
	DepartmentCode$1["anaesthesiology"] = "ANE";
	DepartmentCode$1["radiology"] = "RAD";
	DepartmentCode$1["ophthalmology"] = "OPH";
	DepartmentCode$1["dermatology"] = "DER";
	DepartmentCode$1["communityMedicine"] = "COM";
	DepartmentCode$1["hematologyAndBloodTransfusion"] = "HEM";
	DepartmentCode$1["microbiology"] = "MIC";
	DepartmentCode$1["chemicalPathology"] = "CHP";
	DepartmentCode$1["clinicalParmacologyAndTherapeutics"] = "PHA";
	DepartmentCode$1["anatomicPathology"] = "PAT";
	DepartmentCode$1["familyMedicine"] = "FAM";
	DepartmentCode$1["orthopaedics"] = "ORT";
	DepartmentCode$1["forensicMedicine"] = "FOR";
	return DepartmentCode$1;
}({});
const DEPARTMENTS_METADATA = {
	[DepartmentName.medicine]: {
		name: "Department of Medicine",
		code: DepartmentCode.medicine,
		departmentID: `${DepartmentCode.medicine}MBBS001`
	},
	[DepartmentName.pediatrics]: {
		name: "Department of Pediatrics",
		code: DepartmentCode.pediatrics,
		departmentID: `${DepartmentCode.pediatrics}MBBS001`
	},
	[DepartmentName.obstetricsAndGynecology]: {
		name: "Department of Obstetrics and Gynecology",
		code: DepartmentCode.obstetricsAndGynecology,
		departmentID: `${DepartmentCode.obstetricsAndGynecology}MBBS001`
	},
	[DepartmentName.surgery]: {
		name: "Department of Surgery",
		code: DepartmentCode.surgery,
		departmentID: `${DepartmentCode.surgery}MBBS001`
	},
	[DepartmentName.psychiatry]: {
		name: "Department of Psychiatry",
		code: DepartmentCode.psychiatry,
		departmentID: `${DepartmentCode.psychiatry}MBBS001`
	},
	[DepartmentName.earNoseAndThroat]: {
		name: "Department of ENT",
		code: DepartmentCode.earNoseAndThroat,
		departmentID: `${DepartmentCode.earNoseAndThroat}MBBS001`
	},
	[DepartmentName.anaesthesiology]: {
		name: "Department of Anaesthesiology",
		code: DepartmentCode.anaesthesiology,
		departmentID: `${DepartmentCode.anaesthesiology}MBBS001`
	},
	[DepartmentName.radiology]: {
		name: "Department of Radiology",
		code: DepartmentCode.radiology,
		departmentID: `${DepartmentCode.radiology}MBBS001`
	},
	[DepartmentName.ophthalmology]: {
		name: "Department of Ophthalmology",
		code: DepartmentCode.ophthalmology,
		departmentID: `${DepartmentCode.ophthalmology}MBBS001`
	},
	[DepartmentName.dermatology]: {
		name: "Department of Dermatology",
		code: DepartmentCode.dermatology,
		departmentID: `${DepartmentCode.dermatology}MBBS001`
	},
	[DepartmentName.communityMedicine]: {
		name: "Department of Community Medicine",
		code: DepartmentCode.communityMedicine,
		departmentID: `${DepartmentCode.communityMedicine}MBBS001`
	},
	[DepartmentName.hematologyAndBloodTransfusion]: {
		name: "Department of Hematology and Blood Transfusion",
		code: DepartmentCode.hematologyAndBloodTransfusion,
		departmentID: `${DepartmentCode.hematologyAndBloodTransfusion}MBBS001`
	},
	[DepartmentName.microbiology]: {
		name: "Department of Microbiology",
		code: DepartmentCode.microbiology,
		departmentID: `${DepartmentCode.microbiology}MBBS001`
	},
	[DepartmentName.chemicalPathology]: {
		name: "Department of Chemical Pathology",
		code: DepartmentCode.chemicalPathology,
		departmentID: `${DepartmentCode.chemicalPathology}MBBS001`
	},
	[DepartmentName.clinicalParmacologyAndTherapeutics]: {
		name: "Department of Clinical Pharmacology and Therapeutics",
		code: DepartmentCode.clinicalParmacologyAndTherapeutics,
		departmentID: `${DepartmentCode.clinicalParmacologyAndTherapeutics}MBBS001`
	},
	[DepartmentName.anatomicPathology]: {
		name: "Department of Anatomic Pathology",
		code: DepartmentCode.anatomicPathology,
		departmentID: `${DepartmentCode.anatomicPathology}MBBS001`
	},
	[DepartmentName.familyMedicine]: {
		name: "Department of Family Medicine",
		code: DepartmentCode.familyMedicine,
		departmentID: `${DepartmentCode.familyMedicine}MBBS001`
	},
	[DepartmentName.orthopaedics]: {
		name: "Department of Orthopaedics",
		code: DepartmentCode.orthopaedics,
		departmentID: `${DepartmentCode.orthopaedics}MBBS001`
	},
	[DepartmentName.forensicMedicine]: {
		name: "Department of Forensic Medicine",
		code: DepartmentCode.forensicMedicine,
		departmentID: `${DepartmentCode.forensicMedicine}MBBS001`
	}
};
const DEPARTMENT_UNITS = {
	[DepartmentName.obstetricsAndGynecology]: {
		id: DEPARTMENTS_METADATA[DepartmentName.obstetricsAndGynecology].code,
		name: DEPARTMENTS_METADATA[DepartmentName.obstetricsAndGynecology].name,
		postingType: "OG_PEDS",
		rotationDurationWeeks: 4,
		currentUnit: [],
		units: {
			active: [
				{
					id: "OBG01",
					name: "Antenatal Clinic"
				},
				{
					id: "OBG02",
					name: "Labour Ward"
				},
				{
					id: "OBG03",
					name: "Postnatal Ward"
				},
				{
					id: "OBG04",
					name: "Gynaecology Ward"
				},
				{
					id: "OBG05",
					name: "Emergency O&G"
				},
				{
					id: "OBG06",
					name: "Family Planning"
				},
				{
					id: "OBG07",
					name: "Fertility / Endocrine Unit"
				},
				{
					id: "OBG08",
					name: "Reproductive Medicine Unit"
				},
				{
					id: "OBG09",
					name: "Gynaecologic Oncology Unit"
				}
			],
			reserve: [{
				id: "OBGR01",
				name: "Family Medicine / Reproductive Health Unit"
			}],
			history: []
		}
	},
	[DepartmentName.pediatrics]: {
		id: DEPARTMENTS_METADATA[DepartmentName.pediatrics].code,
		name: DEPARTMENTS_METADATA[DepartmentName.pediatrics].name,
		postingType: "OG_PEDS",
		rotationDurationWeeks: 2,
		currentUnit: [],
		units: {
			active: [
				{
					id: "PAE01",
					name: "Neonatology / SCBU"
				},
				{
					id: "PAE02",
					name: "Paediatric Nephrology"
				},
				{
					id: "PAE03",
					name: "Paediatric Infectious Diseases"
				},
				{
					id: "PAE04",
					name: "Emergency Paediatrics"
				},
				{
					id: "PAE05",
					name: "Nutrition Unit"
				},
				{
					id: "PAE06",
					name: "Paediatric Neurology"
				},
				{
					id: "PAE07",
					name: "Paediatric Cardiology"
				},
				{
					id: "PAE08",
					name: "Paediatric Endocrinology"
				},
				{
					id: "PAE09",
					name: "Paediatric Hemato-Oncology"
				}
			],
			reserve: [{
				id: "PAER01",
				name: "General Paediatrics"
			}],
			history: []
		}
	},
	[DepartmentName.medicine]: {
		id: DEPARTMENTS_METADATA[DepartmentName.medicine].code,
		name: DEPARTMENTS_METADATA[DepartmentName.medicine].name,
		postingType: "MED_SURG",
		rotationDurationWeeks: 2,
		currentUnit: [],
		units: {
			active: [
				{
					id: "MED01",
					name: "Cardiology"
				},
				{
					id: "MED02",
					name: "Gastroenterology / Hepatology"
				},
				{
					id: "MED03",
					name: "Nephrology"
				},
				{
					id: "MED04",
					name: "Pulmonology"
				},
				{
					id: "MED05",
					name: "Infectious Diseases"
				},
				{
					id: "MED06",
					name: "Endocrinology"
				},
				{
					id: "MED07",
					name: "Neurology"
				},
				{
					id: "MED08",
					name: "Rheumatology"
				},
				{
					id: "MED09",
					name: "General Internal Medicine"
				}
			],
			reserve: [{
				id: "MEDR01",
				name: "Geriatric Medicine"
			}, {
				id: "MEDR02",
				name: "Clinical Pharmacology"
			}],
			history: []
		}
	},
	[DepartmentName.surgery]: {
		id: DEPARTMENTS_METADATA[DepartmentName.surgery].code,
		name: DEPARTMENTS_METADATA[DepartmentName.surgery].name,
		postingType: "MED_SURG",
		rotationDurationWeeks: 2,
		currentUnit: [],
		units: {
			active: [
				{
					id: "SUR01",
					name: "General Surgery"
				},
				{
					id: "SUR02",
					name: "Urology"
				},
				{
					id: "SUR03",
					name: "Paediatric Surgery"
				},
				{
					id: "SUR04",
					name: "Cardiothoracic Surgery"
				},
				{
					id: "SUR05",
					name: "Orthopaedic Surgery"
				},
				{
					id: "SUR06",
					name: "Trauma Surgery"
				},
				{
					id: "SUR07",
					name: "Neurosurgery"
				},
				{
					id: "SUR08",
					name: "Surgical Oncology"
				},
				{
					id: "SUR09",
					name: "Plastic & Reconstructive Surgery"
				}
			],
			reserve: [{
				id: "SURR01",
				name: "Burns Unit"
			}, {
				id: "SURR02",
				name: "Vascular Surgery"
			}],
			history: []
		}
	},
	[DepartmentName.psychiatry]: {
		id: DEPARTMENTS_METADATA[DepartmentName.psychiatry].code,
		name: DEPARTMENTS_METADATA[DepartmentName.psychiatry].name,
		postingType: "SPECIALTY",
		rotationDurationWeeks: 2,
		currentUnit: [],
		units: {
			active: [
				{
					id: "PSY01",
					name: "Adult Psychiatry"
				},
				{
					id: "PSY02",
					name: "Child & Adolescent Psychiatry"
				},
				{
					id: "PSY03",
					name: "Community Psychiatry"
				},
				{
					id: "PSY04",
					name: "Consultation-Liaison Psychiatry"
				},
				{
					id: "PSY05",
					name: "Addiction Psychiatry"
				},
				{
					id: "PSY06",
					name: "Emergency Psychiatry"
				}
			],
			reserve: [{
				id: "PSYR01",
				name: "Forensic Psychiatry"
			}],
			history: []
		}
	},
	[DepartmentName.earNoseAndThroat]: {
		id: DEPARTMENTS_METADATA[DepartmentName.earNoseAndThroat].code,
		name: DEPARTMENTS_METADATA[DepartmentName.earNoseAndThroat].name,
		postingType: "SPECIALTY",
		rotationDurationWeeks: 2,
		currentUnit: [],
		units: {
			active: [
				{
					id: "ORL01",
					name: "Otology"
				},
				{
					id: "ORL02",
					name: "Rhinology"
				},
				{
					id: "ORL03",
					name: "Laryngology"
				},
				{
					id: "ORL04",
					name: "Head & Neck Surgery"
				},
				{
					id: "ORL05",
					name: "Audiology"
				},
				{
					id: "ORL06",
					name: "Cochlear Implant Unit"
				}
			],
			reserve: [{
				id: "ORLR01",
				name: "Maxillofacial Interface Unit"
			}],
			history: []
		}
	},
	[DepartmentName.anaesthesiology]: {
		id: DEPARTMENTS_METADATA[DepartmentName.anaesthesiology].code,
		name: DEPARTMENTS_METADATA[DepartmentName.anaesthesiology].name,
		postingType: "SPECIALTY",
		rotationDurationWeeks: 2,
		currentUnit: [],
		units: {
			active: [
				{
					id: "ANE01",
					name: "General Anaesthesia"
				},
				{
					id: "ANE02",
					name: "Obstetric Anaesthesia"
				},
				{
					id: "ANE03",
					name: "Paediatric Anaesthesia"
				},
				{
					id: "ANE04",
					name: "ICU / Critical Care"
				},
				{
					id: "ANE05",
					name: "Pain Management"
				},
				{
					id: "ANE06",
					name: "Resuscitation Unit"
				}
			],
			reserve: [{
				id: "ANER01",
				name: "Neuroanaesthesia"
			}, {
				id: "ANER02",
				name: "Cardiothoracic Anaesthesia"
			}],
			history: []
		}
	},
	[DepartmentName.radiology]: {
		id: DEPARTMENTS_METADATA[DepartmentName.radiology].code,
		name: DEPARTMENTS_METADATA[DepartmentName.radiology].name,
		postingType: "SPECIALTY",
		rotationDurationWeeks: 2,
		currentUnit: [],
		units: {
			active: [
				{
					id: "RAD01",
					name: "Conventional Radiography"
				},
				{
					id: "RAD02",
					name: "Ultrasound"
				},
				{
					id: "RAD03",
					name: "CT Imaging"
				},
				{
					id: "RAD04",
					name: "MRI Imaging"
				},
				{
					id: "RAD05",
					name: "Fluoroscopy"
				},
				{
					id: "RAD06",
					name: "Interventional Radiology"
				}
			],
			reserve: [{
				id: "RADR01",
				name: "Nuclear Medicine"
			}],
			history: []
		}
	},
	[DepartmentName.ophthalmology]: {
		id: DEPARTMENTS_METADATA[DepartmentName.ophthalmology].code,
		name: DEPARTMENTS_METADATA[DepartmentName.ophthalmology].name,
		postingType: "SPECIALTY",
		rotationDurationWeeks: 2,
		currentUnit: [],
		units: {
			active: [
				{
					id: "OPH01",
					name: "General Ophthalmology"
				},
				{
					id: "OPH02",
					name: "Cataract Unit"
				},
				{
					id: "OPH03",
					name: "Glaucoma Unit"
				},
				{
					id: "OPH04",
					name: "Retina / Vitreoretinal Unit"
				},
				{
					id: "OPH05",
					name: "Oculoplasty Unit"
				},
				{
					id: "OPH06",
					name: "Paediatric Ophthalmology"
				},
				{
					id: "OPH07",
					name: "Cornea Unit"
				}
			],
			reserve: [{
				id: "OPHR01",
				name: "Neuro-Ophthalmology"
			}],
			history: []
		}
	},
	[DepartmentName.dermatology]: {
		id: DEPARTMENTS_METADATA[DepartmentName.dermatology].code,
		name: DEPARTMENTS_METADATA[DepartmentName.dermatology].name,
		postingType: "SPECIALTY",
		rotationDurationWeeks: 2,
		currentUnit: [],
		units: {
			active: [
				{
					id: "DER01",
					name: "General Dermatology"
				},
				{
					id: "DER02",
					name: "Venereology / STI Clinic"
				},
				{
					id: "DER03",
					name: "Paediatric Dermatology"
				},
				{
					id: "DER04",
					name: "Procedural Dermatology"
				},
				{
					id: "DER05",
					name: "Dermatopathology"
				}
			],
			reserve: [{
				id: "DERR01",
				name: "Cosmetic Dermatology"
			}],
			history: []
		}
	},
	[DepartmentName.communityMedicine]: {
		id: DEPARTMENTS_METADATA[DepartmentName.communityMedicine].code,
		name: DEPARTMENTS_METADATA[DepartmentName.communityMedicine].name,
		postingType: "COM&RURAL",
		rotationDurationWeeks: 2,
		currentUnit: [],
		units: {
			active: [
				{
					id: "COM01",
					name: "Epidemiology Unit"
				},
				{
					id: "COM02",
					name: "Health Promotion Unit"
				},
				{
					id: "COM03",
					name: "Environmental Health Unit"
				},
				{
					id: "COM04",
					name: "Occupational Health Unit"
				}
			],
			reserve: [{
				id: "COMR01",
				name: "Public Health Research Unit"
			}],
			history: []
		}
	},
	[DepartmentName.hematologyAndBloodTransfusion]: {
		id: DEPARTMENTS_METADATA[DepartmentName.hematologyAndBloodTransfusion].code,
		name: DEPARTMENTS_METADATA[DepartmentName.hematologyAndBloodTransfusion].name,
		postingType: "BLOCK",
		rotationDurationWeeks: 2,
		currentUnit: [],
		units: {
			active: [
				{
					id: "HEM01",
					name: "General Hematology"
				},
				{
					id: "HEM02",
					name: "Blood Transfusion Unit"
				},
				{
					id: "HEM03",
					name: "Hematopathology"
				}
			],
			reserve: [{
				id: "HEMR01",
				name: "Coagulation & Hemostasis Unit"
			}],
			history: []
		}
	}
};
const DEPARTMENT_NAMES = Object.values(DepartmentName);
Object.values(DepartmentCode);
const getDepartmentUnitsByCode = (code) => {
	const departmentName = DEPARTMENT_NAMES.find((name) => DEPARTMENTS_METADATA[name].code === code);
	return departmentName ? DEPARTMENT_UNITS[departmentName] ?? null : null;
};
const DEPARTMENT_COURSES = {
	[DepartmentName.pediatrics]: [],
	[DepartmentName.obstetricsAndGynecology]: [],
	[DepartmentName.medicine]: []
};
const getAllDepartmentUnits = () => Object.values(DEPARTMENT_UNITS);
const getAllDepartments = () => DEPARTMENT_NAMES.map((name) => ({ ...DEPARTMENTS_METADATA[name] }));
var NotificationSchema, Notification;
var init_notification = __esmMin((() => {
	NotificationSchema = new Schema({
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true
		},
		role: {
			type: String,
			enum: [
				"admin",
				"teacher",
				"student",
				"parent",
				"unitconsultant",
				"unitresident"
			],
			required: true,
			index: true
		},
		title: {
			type: String,
			required: true
		},
		message: {
			type: String,
			required: true
		},
		type: {
			type: String,
			enum: [
				"info",
				"warning",
				"success",
				"error",
				"attendance",
				"timetable",
				"system"
			],
			default: "info"
		},
		actorName: {
			type: String,
			index: true
		},
		actorRole: {
			type: String,
			enum: [
				"admin",
				"teacher",
				"student",
				"parent",
				"unitconsultant",
				"unitresident"
			],
			index: true
		},
		isRead: {
			type: Boolean,
			default: false,
			index: true
		},
		link: { type: String },
		metadata: { type: Schema.Types.Mixed }
	}, { timestamps: true });
	NotificationSchema.index({
		userId: 1,
		isRead: 1,
		createdAt: -1
	});
	Notification = mongoose.model("Notification", NotificationSchema);
}));
init_notification();
var clients = /* @__PURE__ */ new Map();
var heartbeats = /* @__PURE__ */ new WeakMap();
function addSSEClient(req, res) {
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");
	res.write(`event: hello\ndata: ${JSON.stringify({ now: (/* @__PURE__ */ new Date()).toISOString() })}\n\n`);
	const userId = req?.user?._id?.toString?.();
	if (!userId) {
		const set$1 = clients.get("_anon") || /* @__PURE__ */ new Set();
		set$1.add(res);
		clients.set("_anon", set$1);
		reqOnClose(res, () => set$1.delete(res));
		return;
	}
	const set = clients.get(userId) || /* @__PURE__ */ new Set();
	set.add(res);
	clients.set(userId, set);
	const interval = setInterval(() => {
		try {
			res.write(`: ping ${(/* @__PURE__ */ new Date()).toISOString()}\n\n`);
		} catch (err) {}
	}, 15e3);
	heartbeats.set(res, interval);
	reqOnClose(res, () => {
		const s = clients.get(userId);
		if (s) {
			s.delete(res);
			if (s.size === 0) clients.delete(userId);
		}
		const iv = heartbeats.get(res);
		if (iv) clearInterval(iv);
		heartbeats.delete(res);
	});
}
function reqOnClose(res, cb) {
	try {
		res.on && res.on("close", cb);
		res.on && res.on("finish", cb);
	} catch {}
}
function sendSSE(event, data, userId) {
	const payload = typeof data === "string" ? data : JSON.stringify(data);
	const targets = [];
	if (userId) {
		const set = clients.get(userId);
		if (set) targets.push(...Array.from(set));
	} else for (const set of clients.values()) targets.push(...Array.from(set));
	for (const res of targets) try {
		res.write(`event: ${event}\ndata: ${payload}\n\n`);
	} catch (err) {
		try {
			res.end();
		} catch {}
		for (const [k, set] of clients.entries()) if (set.has(res)) {
			set.delete(res);
			if (set.size === 0) clients.delete(k);
		}
	}
}
const generateToken = (userId, res) => {
	const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
		expiresIn: "30d",
		algorithm: "HS512"
	});
	res.cookie("jwt", token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
		maxAge: 720 * 60 * 60 * 1e3,
		path: "/"
	});
	return token;
};
var ActivityLogSchema, activitieslog_default$1;
var init_activitieslog$1 = __esmMin((() => {
	ActivityLogSchema = new Schema({
		user: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: "User"
		},
		action: {
			type: String,
			required: true
		},
		details: { type: String }
	}, { timestamps: true });
	activitieslog_default$1 = mongoose.model("ActivitiesLog", ActivityLogSchema);
}));
var logActivity;
var init_activitieslog = __esmMin((() => {
	init_activitieslog$1();
	logActivity = async ({ userId, action, details }) => {
		if (!mongoose.Types.ObjectId.isValid(userId)) {
			console.warn(`Invalid userId: ${userId}`);
			return;
		}
		try {
			await activitieslog_default$1.create({
				user: typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId,
				action,
				details
			});
		} catch (error) {
			console.error(`${error} disrupted activity log.`);
		}
	};
}));
init_activitieslog();
const requiresAdminApproval = (role) => {
	const normalizedRole = String(role ?? "").trim().toLowerCase();
	return [
		"teacher",
		"unitconsultant",
		"unitresident"
	].includes(normalizedRole);
};
const getRegistrationApprovalState = (role) => {
	if (requiresAdminApproval(role)) return {
		approvalStatus: "pending",
		isActive: false,
		canLogin: false
	};
	return {
		approvalStatus: "approved",
		isActive: true,
		canLogin: true
	};
};
const sendAccountApprovalEmail = async ({ to, name, loginUrl, message: message$1 }) => {
	const recipient = to || "unknown";
	const targetUrl = loginUrl || process.env.FRONTEND_URL || "http://localhost:5173/login";
	const body = message$1 || `Hi ${name}, your account has been approved. Please sign in using the password you set during registration.`;
	console.log(`[account-approval-email] to=${recipient} loginUrl=${targetUrl} message=${body}`);
	return {
		sent: false,
		reason: "smtp-not-configured",
		recipient
	};
};
const generatePasswordResetToken = (byteLength = 24) => {
	return randomBytes(byteLength).toString("hex");
};
const hashPasswordResetToken = async (token) => {
	const salt = randomBytes(16).toString("hex");
	return `${salt}:${createHash("sha256").update(`${salt}:${token}`).digest("hex")}`;
};
const verifyPasswordResetToken = async (token, storedToken) => {
	if (!token || !storedToken) return false;
	const [salt, hash] = storedToken.split(":");
	if (!salt || !hash) return false;
	const expectedHash = createHash("sha256").update(`${salt}:${token}`).digest("hex");
	const actualBuffer = Buffer.from(hash, "hex");
	const expectedBuffer = Buffer.from(expectedHash, "hex");
	if (actualBuffer.length !== expectedBuffer.length) return false;
	return timingSafeEqual(actualBuffer, expectedBuffer);
};
var classes_exports = /* @__PURE__ */ __export({ default: () => classes_default$1 });
var classSchema, classes_default$1;
var init_classes = __esmMin((() => {
	classSchema = new Schema({
		name: {
			type: String,
			required: [true, "Class name required"],
			trim: true
		},
		academicYear: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: "AcademicYear"
		},
		classTeacher: {
			type: Schema.Types.ObjectId,
			ref: "User",
			default: null
		},
		courses: [{
			type: Schema.Types.ObjectId,
			ref: "Course"
		}],
		students: [{
			type: Schema.Types.ObjectId,
			ref: "User"
		}],
		capacity: {
			type: Number,
			default: 200
		}
	}, { timestamps: true });
	classSchema.index({
		name: 1,
		academicYear: 1
	}, { unique: true });
	classes_default$1 = mongoose.model("Class", classSchema);
}));
var hospitalStaff_exports = /* @__PURE__ */ __export({ default: () => hospitalStaff_default });
var HospitalStaffSchema, HospitalStaffModel, hospitalStaff_default;
var init_hospitalStaff = __esmMin((() => {
	HospitalStaffSchema = new Schema({
		fileNumber: {
			type: String,
			required: true,
			unique: true,
			trim: true
		},
		name: {
			type: String,
			required: true,
			trim: true
		},
		qualification: {
			type: String,
			required: true
		},
		designation: {
			type: String,
			enum: [
				"Professor",
				"Reader",
				"Associate Prof.",
				"Senior Lecturer",
				"Lecturer I",
				"Lecturer II"
			],
			required: true
		},
		systemRole: {
			type: String,
			enum: ["CONSULTANT", "RESIDENT"],
			default: "CONSULTANT"
		},
		department: {
			type: String,
			required: true,
			trim: true
		},
		assignedUnits: [{
			type: mongoose.Types.ObjectId,
			ref: "HospitalUnit"
		}],
		email: {
			type: String,
			trim: true
		},
		phone: {
			type: String,
			trim: true
		},
		isActive: {
			type: Boolean,
			default: true
		},
		canApproveLogbooks: {
			type: Boolean,
			default: true
		}
	}, { timestamps: true });
	HospitalStaffSchema.index({
		department: 1,
		isActive: 1
	});
	HospitalStaffSchema.index({ assignedUnits: 1 });
	HospitalStaffSchema.index({
		systemRole: 1,
		canApproveLogbooks: 1
	});
	HospitalStaffModel = mongoose.model("HospitalStaff", HospitalStaffSchema, "hospital_staff");
	hospitalStaff_default = HospitalStaffModel;
}));
var inngest;
var init_client = __esmMin((() => {
	inngest = new Inngest({
		id: "medlog-lms",
		isDev: true,
		eventKey: process.env.INNGEST_EVENT_KEY ?? "dev",
		devServerUrl: process.env.INNGEST_DEVSERVER_URL ?? "http://localhost:8288"
	});
}));
var timetableSchema, timetable_default$1;
var init_timetable = __esmMin((() => {
	timetableSchema = new Schema({
		class: {
			type: mongoose.Types.ObjectId,
			ref: "Class",
			required: true
		},
		academicYear: {
			type: mongoose.Types.ObjectId,
			ref: "AcademicYear",
			required: true
		},
		schedule: [{
			day: {
				type: String,
				required: true
			},
			periods: [{
				subject: {
					type: mongoose.Types.ObjectId,
					ref: "Course",
					default: null
				},
				lecturer: {
					type: mongoose.Types.ObjectId,
					ref: "User",
					default: null
				},
				startTime: String,
				endTime: String,
				isClinical: {
					type: Boolean,
					default: false
				},
				isOptional: {
					type: Boolean,
					default: false
				},
				displayLabel: {
					type: String,
					default: null
				}
			}]
		}]
	}, { timestamps: true });
	timetableSchema.index({
		class: 1,
		academicYear: 1
	}, { unique: true });
	timetable_default$1 = mongoose.model("Timetable", timetableSchema);
}));
var examSchema, exam_default$1;
var init_exam = __esmMin((() => {
	examSchema = new Schema({
		title: {
			type: String,
			required: true
		},
		course: {
			type: Schema.Types.ObjectId,
			ref: "Course",
			required: true
		},
		class: {
			type: Schema.Types.ObjectId,
			ref: "Class",
			required: true
		},
		lecturer: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true
		},
		duration: {
			type: Number,
			required: true
		},
		dueDate: {
			type: Date,
			required: true
		},
		isActive: {
			type: Boolean,
			default: true
		},
		questions: [{
			questionText: {
				type: String,
				required: true
			},
			type: {
				type: String,
				enum: [
					"MCQ",
					"SHORT_ANSWER",
					"ESSAY"
				],
				default: "MCQ"
			},
			options: [{ type: String }],
			correctAnswer: {
				type: String,
				select: false
			},
			points: {
				type: Number,
				default: 1
			}
		}],
		courseSubjects: [{
			type: Schema.Types.ObjectId,
			ref: "Subject"
		}]
	}, { timestamps: true });
	exam_default$1 = mongoose.model("Exam", examSchema);
}));
var AttendanceSchema, attendance_default$1;
var init_attendance = __esmMin((() => {
	AttendanceSchema = new Schema({
		student: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true
		},
		lecturer: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null
		},
		course: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Course",
			required: true
		},
		subject: {
			type: mongoose.Schema.Types.ObjectId,
			default: null
		},
		class: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Class",
			required: true
		},
		academicYear: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "AcademicYear",
			required: true
		},
		date: {
			type: Date,
			required: true,
			default: Date.now
		},
		dayOfWeek: {
			type: String,
			enum: [
				"Monday",
				"Tuesday",
				"Wednesday",
				"Thursday",
				"Friday"
			],
			required: true
		},
		status: {
			type: String,
			enum: [
				"present",
				"absent",
				"late",
				"excused"
			],
			required: true,
			default: "present"
		},
		notes: {
			type: String,
			default: ""
		},
		approvedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null
		},
		lecturerApproval: {
			type: String,
			enum: [
				"approved",
				"not-approved",
				null
			],
			default: null
		},
		lecturerApprovalDate: {
			type: Date,
			default: null
		},
		hodApproval: {
			type: String,
			enum: [
				"approved",
				"not-approved",
				null
			],
			default: null
		},
		hodApprovalDate: {
			type: Date,
			default: null
		}
	}, { timestamps: true });
	attendance_default$1 = mongoose.model("Attendance", AttendanceSchema);
}));
function normalize(value) {
	return String(value ?? "").trim().toUpperCase();
}
function findCourseForCode(courses, code) {
	const target = normalize(code);
	return courses.find((course) => normalize(course.code) === target) ?? null;
}
function findCourseForName(courses, keywords) {
	const normalizedKeywords = keywords.map(normalize);
	return courses.find((course) => {
		const name = normalize(course.name);
		return normalizedKeywords.some((keyword) => name.includes(keyword));
	}) ?? null;
}
function resolve500LevelCourse(courses, code) {
	const exact = findCourseForCode(courses, code);
	if (exact) return exact;
	return findCourseForName(courses, COURSE_TOKEN_MAP[code] ?? []) ?? null;
}
function makePeriod(kind, startTime, endTime, courseCode = null, options = {}) {
	return {
		kind,
		startTime,
		endTime,
		courseCode,
		...options
	};
}
function build500LevelTimetablePlan(clockPhase, courses = []) {
	const phase = (clockPhase || "phase1").toLowerCase();
	const buildPhase1 = () => DAYS.map((day) => {
		if (day === "Friday") return {
			day,
			periods: [
				makePeriod("course", "08:00", "10:00", "COM"),
				makePeriod("empty", "10:00", "12:00"),
				makePeriod("empty", "12:00", "13:00"),
				makePeriod("course", "13:00", "15:00", "OBG")
			]
		};
		return {
			day,
			periods: [
				makePeriod("course", "08:00", "10:00", "PAE"),
				makePeriod("clinical", "10:00", "13:00"),
				makePeriod("empty", "13:00", "13:30"),
				makePeriod("course", "13:30", "15:00", "OBG")
			]
		};
	});
	const buildPhase2 = () => DAYS.map((day, index) => {
		return {
			day,
			periods: [
				makePeriod("course", "08:00", "10:00", [
					"OPH",
					"ANE",
					"ORL",
					"RAD",
					"PSY"
				][index] ?? "OPH"),
				makePeriod("clinical", "10:00", "12:00"),
				makePeriod("optional", "12:00", "15:00", null, {
					isOptional: true,
					displayLabel: "Tutorials/Presentations"
				}),
				makePeriod("optional", "15:00", "18:00", null, {
					isOptional: true,
					displayLabel: "Call Duty/Tutorials"
				})
			]
		};
	});
	const buildPhase3 = () => DAYS.map((day) => {
		if (day === "Friday") return {
			day,
			periods: [
				makePeriod("course", "08:00", "10:00", "COM"),
				makePeriod("empty", "10:00", "12:00"),
				makePeriod("empty", "12:00", "13:00"),
				makePeriod("course", "13:00", "15:00", "OBG")
			]
		};
		return {
			day,
			periods: [
				makePeriod("empty", "08:00", "10:00"),
				makePeriod("clinical", "10:00", "13:00"),
				makePeriod("empty", "13:00", "13:30"),
				makePeriod("course", "13:30", "15:00", "OBG")
			]
		};
	});
	const buildPhase4 = () => DAYS.map((day) => ({
		day,
		periods: [
			makePeriod("empty", "08:00", "10:00"),
			makePeriod("empty", "10:00", "12:00"),
			makePeriod("empty", "12:00", "15:00")
		]
	}));
	if (phase === "phase2") return buildPhase2();
	if (phase === "phase3") return buildPhase3();
	if (phase === "phase4") return buildPhase4();
	return buildPhase1();
}
var DAYS, COURSE_TOKEN_MAP;
var init__500LevelTimetable = __esmMin((() => {
	DAYS = [
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday"
	];
	COURSE_TOKEN_MAP = {
		PAE: ["PAE", "PEDIATRICS"],
		OBG: [
			"OBG",
			"OBSTETRICS",
			"OBSTETRICSANDGYNECOLOGY"
		],
		COM: ["COM", "COMMUNITY MEDICINE"],
		OPH: ["OPH", "OPHTHALMOLOGY"],
		ANE: [
			"ANE",
			"ANAESTHESIOLOGY",
			"ANAESTHESIA"
		],
		ORL: [
			"ORL",
			"ENT",
			"EAR NOSE AND THROAT"
		],
		RAD: ["RAD", "RADIOLOGY"],
		PSY: ["PSY", "PSYCHIATRY"]
	};
}));
async function routeTaskToStaff(departmentName, taskType, referenceId) {
	try {
		const queryFilter = {
			role: { $in: [
				"teacher",
				"unitconsultant",
				"unitresident"
			] },
			department: departmentName,
			isActive: true,
			[`mordred_rules.${taskType}`]: true,
			$expr: { $lt: ["$mordred_rules.current_active_load", "$mordred_rules.max_ticket_capacity"] }
		};
		return await user_default$1.findOneAndUpdate(queryFilter, {
			$inc: { "mordred_rules.current_active_load": 1 },
			$push: { mordred_assigned_tasks: {
				task_type: taskType.toUpperCase(),
				reference_id: new mongoose.Types.ObjectId(referenceId),
				assigned_at: /* @__PURE__ */ new Date()
			} }
		}, { returnDocument: "after" });
	} catch (error) {
		console.error("MORDRED Automation Core Error:", error);
		throw error;
	}
}
var init_mordredEngine = __esmMin((() => {}));
var functions_exports = /* @__PURE__ */ __export({
	automaticPostingNotification: () => automaticPostingNotification,
	bulkCreateUsers: () => bulkCreateUsers,
	createUsersForBulkUpload: () => createUsersForBulkUpload,
	generateAttendance: () => generateAttendance,
	generateExam: () => generateExam,
	generateTimeTable: () => generateTimeTable,
	mordredTicketSentry: () => mordredTicketSentry,
	rotationNotify: () => rotationNotify,
	rotationSnapshotScheduler: () => rotationSnapshotScheduler,
	whatsappLectureAlert: () => whatsappLectureAlert
});
var generateTimeTable, generateExam, generateAttendance, createUsersForBulkUpload, bulkCreateUsers, rotationNotify, automaticPostingNotification, mordredTicketSentry, whatsappLectureAlert, rotationSnapshotScheduler;
var init_functions = __esmMin((() => {
	init_client();
	init_classes();
	init_user();
	init_timetable();
	init_exam();
	init_attendance();
	init__500LevelTimetable();
	init_mordredEngine();
	generateTimeTable = inngest.createFunction({
		id: "Generate-Timetable",
		triggers: { event: "generate/timetable" }
	}, async ({ event, step }) => {
		const { classId, academicYearId, academicYear, settings } = event.data;
		const classIdValue = typeof classId === "object" ? classId._id ?? classId.id : classId;
		const academicYearIdValue = academicYearId ?? (typeof academicYear === "object" ? academicYear._id ?? academicYear.id : academicYear);
		if (!classIdValue || !academicYearIdValue) throw new NonRetriableError("classId and academicYearId are required");
		const contextData = await step.run("fetch-class-context", async () => {
			const classData = await classes_default$1.findById(classIdValue).populate("courses");
			if (!classData) throw new NonRetriableError(`Class not found`);
			const allTeachersAndLecturers = await user_default$1.find({ role: "teacher" });
			const topLevelCourses = classData.courses ?? [];
			const embeddedSubjects = topLevelCourses.flatMap((c) => (c?.subjects ?? []).map((s) => ({
				id: String(s?.subjectID ?? s?._id),
				name: s?.name,
				code: s?.code,
				lecturerIds: Array.isArray(s?.lecturer) ? s.lecturer.map((x) => String(x)) : []
			})));
			const qualifiedTeachers = allTeachersAndLecturers.filter((lecturer) => {
				if (!lecturer?.teacherSubject) return false;
				return topLevelCourses.some((tc) => lecturer?.teacherSubject.some((subId) => String(subId) === String(tc._id)));
			}).map((tea) => ({
				id: String(tea._id),
				idNumber: tea.idNumber,
				name: tea.name,
				courses: []
			}));
			return {
				className: classData.name,
				courses: embeddedSubjects.map((s) => ({
					id: s.id,
					name: s.name,
					code: s.code
				})),
				lecturers: qualifiedTeachers
			};
		});
		const is400Level = /^400\s*level/i.test(contextData.className);
		const is500Level = /^500\s*level/i.test(contextData.className);
		const isClinicalLevel = is400Level || is500Level;
		const clinicalEndTime = is500Level ? "13:00" : "12:00";
		const aiSchedule = await step.run("generate-timetable-logic", async () => {
			if (is500Level) return { schedule: build500LevelTimetablePlan(settings?.clockPhase, contextData.courses).map(({ day, periods }) => ({
				day,
				periods: periods.map((period) => {
					return {
						courseId: (period.courseCode ? resolve500LevelCourse(contextData.courses, period.courseCode) : null)?.id ?? null,
						lecturer: null,
						startTime: period.startTime,
						endTime: period.endTime,
						isClinical: period.kind === "clinical",
						isOptional: period.kind === "optional" || period.isOptional,
						displayLabel: period.displayLabel ?? (period.kind === "optional" ? "Optional Activity" : void 0)
					};
				})
			})) };
			const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
			if (!apiKey) throw new NonRetriableError("GOOGLE_GENERATIVE_AI_API_KEY is missing! (!-_-)");
			const allTimeTables = await timetable_default$1.find({ academicYear: academicYearIdValue });
			let prompt = "";
			if (is400Level) prompt = `
        You are a University Timetable Scheduler.
        Generate a FIXED weekly timetable for 400 Level Class (Monday to Friday).

        CONTEXT:
        - Class: ${contextData.className}
        - Hours: 08:00 to 17:00 (8am to 5pm)

        RESOURCES:
        - Courses: ${JSON.stringify(contextData.courses)}
        - Lecturers: ${JSON.stringify(contextData.lecturers)}

        MANDATORY FIXED SCHEDULE FOR 400 LEVEL CLASS:

        MONDAY TO THURSDAY (8am-10am - FIXED):
        - Monday & Wednesday: 
          * 08:00-09:00: Medicine Course
          * 09:00-10:00: Surgery Course
        - Tuesday & Thursday:
          * 08:00-09:00: Surgery Course
          * 09:00-10:00: Medicine Course

        CLINICAL ACTIVITIES (Monday to Friday):
        - 10:00-12:00: Clinical Activities (use courseId: "CLINICAL_ACTIVITIES", lecturer: null)

        AFTER CLINICAL (12pm-5pm):
        - Monday: Chemical Pathology Course (12:00-14:00) + Practicals (14:00-17:00)
        - Tuesday: Medical Microbiology Course (12:00-14:00) + Practicals (14:00-17:00)
        - Wednesday: Hematology Course (12:00-14:00) + Practicals (14:00-17:00)
        - Thursday: Histopathology Course (12:00-14:00) + Practicals (14:00-17:00)

        FRIDAY (8am-5pm):
        - 08:00-10:00: Community Medicine Course
        - 10:00-14:00: Pharmacology Course
        - 14:00-17:00: Pharmacology Practicals

        IMPORTANT RULES:
        1. STRICTLY follow the above schedule - do not deviate.
        2. Find matching courses from the RESOURCES list (e.g., "Medicine", "Surgery", "Chemical Pathology", etc.).
        3. For Practicals periods: use the corresponding course but mark as practical (same courseId).
        4. Clinical Activities periods: use courseId "CLINICAL_ACTIVITIES" with lecturer null.
        5. Match lecturer IDs from the lecturer list who teach these courses.
        6. OUTPUT strict JSON only. Schema:
        {
          "schedule": [
            {
              "day": "Monday",
              "periods": [
              { "courseId": "COURSE_ID", "lecturer": "LECTURER_ID", "startTime": "HH:MM", "endTime": "HH:MM" }
              ]
            }
          ]
        }
        Use the lecturer's id from the lecturer list. Match the courseId with the id from the courses list.
        `;
			else {
				const clinicalSlotInstruction = isClinicalLevel ? `

        CLINICAL ACTIVITIES SLOT (REQUIRED):
        - For ${contextData.className}, you MUST add a "Clinical Activities" period on EACH weekday (Monday to Friday).
        - The clinical slot must be from 10:00 AM to ${clinicalEndTime} (${is500Level ? "3 hours" : "2 hours"}).
        - Use courseId: "CLINICAL_ACTIVITIES" for this special entry (it is not a real course, just a placeholder for clinical activities).
        - Lecturer field can be null or "CLINICAL_SUPERVISOR" for this slot.
        - This slot should be the THIRD period of the day (after 2 regular periods).
        - Example period: { "courseId": "CLINICAL_ACTIVITIES", "lecturer": null, "startTime": "10:00", "endTime": "${clinicalEndTime}" }
        ` : "";
				prompt = `
        You are a University Timetable Scheduler.
        Generate a weekly timetable (Monday to Friday).

        CONTEXT:
        - Class: ${contextData.className}
        - Hours: ${settings.startTime} to ${settings.endTime} (Total ${settings.periods} periods per day).

        RESOURCES:
        - Courses: ${JSON.stringify(contextData.courses)}
        - Lecturers: ${JSON.stringify(contextData.lecturers)}
        - Other Timetables: ${JSON.stringify(allTimeTables)}
        ${clinicalSlotInstruction}

        STRICT RULES:

        1. Assign a Lecturer to every Course period.
        2. Lecturer MUST have the course ID in their courses list.
        3. Break Time/free period after every 2 periods (10 minutes), Lunch time after 5 periods (at 12:00) (30 minutes).
        4. Avoid clashes with other classes (lecturer cannot be in two classes at the same time).
        5. OUTPUT strict JSON only. Schema:
        {
          "schedule": [
            {
              "day": "Monday",
              "periods": [
              { "courseId": "COURSE_ID", "lecturer": "LECTURER_ID", "startTime": "HH:MM", "endTime": "HH:MM" }
              ]
            }
          ]
        }
        Use the lecturer's id from the lecturer list in the response. Not the lecturer's idNumber or name. Match the courseId with the id from the courses list in the response.
        `;
			}
			const activeModel = createGoogleGenerativeAI({ apiKey })("gemini-3-flash-preview");
			const { text } = await generateText({
				prompt,
				model: activeModel
			});
			const cleanJSON = text.replace(/```json/g, "").replace(/```/g, "").replace(/'''json/g, "").replace(/'''/g, "").replace(/`/g, "").trim();
			return JSON.parse(cleanJSON);
		});
		await step.run("save-timetable", async () => {
			await timetable_default$1.findOneAndDelete({
				class: classIdValue,
				academicYear: academicYearIdValue
			});
			const mappedSchedule = (aiSchedule.schedule ?? []).map((day) => ({
				day: day.day,
				periods: (day.periods ?? []).map((period) => {
					const courseIdRaw = period?.courseId;
					if ((typeof courseIdRaw === "string" ? courseIdRaw.trim().toUpperCase() : courseIdRaw) === "CLINICAL_ACTIVITIES") return {
						subject: null,
						lecturer: null,
						startTime: period.startTime,
						endTime: period.endTime,
						isClinical: true
					};
					const isValidObjectId$1 = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
					if (!isValidObjectId$1(String(courseIdRaw))) throw new NonRetriableError(`Invalid subject id returned by AI: ${String(courseIdRaw)}`);
					const lecturerRaw = period?.lecturer;
					const lecturerObjId = isValidObjectId$1(lecturerRaw) ? new mongoose.Types.ObjectId(String(lecturerRaw)) : null;
					return {
						subject: new mongoose.Types.ObjectId(String(courseIdRaw)),
						lecturer: lecturerObjId,
						startTime: period.startTime,
						endTime: period.endTime
					};
				})
			}));
			await timetable_default$1.create({
				class: classIdValue,
				academicYear: academicYearIdValue,
				schedule: mappedSchedule
			});
			if (!await timetable_default$1.findOne({
				class: classIdValue,
				academicYear: academicYearIdValue
			}).populate("schedule.periods.subject", "name code subjects.subjectID").populate("schedule.periods.lecturer", "name email idNumber")) throw new NonRetriableError("Failed to save timetable");
			return {
				success: true,
				classId
			};
		});
		return {
			success: true,
			message: "Timetable generated successfully"
		};
	});
	generateExam = inngest.createFunction({
		id: "Generate-Exam",
		triggers: { event: "exam/generate" }
	}, async ({ event, step }) => {
		const { examId, topic, subjectName, difficulty, count } = event.data;
		const aiExam = await step.run("generate-exam-logic", async () => {
			const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
			if (!apiKey) throw new NonRetriableError("GOOGLE_GENERATIVE_AI_API_KEY is missing! (!-_-)");
			const { text } = await generateText({
				prompt: `
    You are a strict medical Teacher. Create a JSON array of ${count} multiple-choice questions for a Medical School Exam.

      CONTEXT:
    - Subject: ${subjectName}
    - Topic: ${topic}
    - Hours: ${difficulty}

    STRICT JSON SCHEMA (Array of Objects):
    [
      {
        "questionText": "Question string",
        "type": "MCQ",
        "options": [ "Option A", "Option B", "Option C", "Option D", "Option E" ],
        "correctAnswer": "The exact string of the correct option",
        "points": 1
      }
    ]
    RULES:
    1. Output ONLY raw JSON. No Markdown.
    2. Ensure correct answer matches one of the options exactly.
      `,
				model: createGoogleGenerativeAI({ apiKey })("gemini-3-flash-preview")
			});
			const cleanJSON = text.replace(/```json/g, "").replace(/```/g, "").trim();
			return JSON.parse(cleanJSON);
		});
		await step.run("save-exam", async () => {
			const exam = await exam_default$1.findById(examId);
			if (!exam) throw new NonRetriableError(`Exam ${examId} not found!`);
			exam.questions = aiExam;
			exam.isActive = false;
			await exam.save();
			return {
				success: true,
				count: aiExam.length
			};
		});
		return {
			success: true,
			message: "Exam generated successfully"
		};
	});
	generateAttendance = inngest.createFunction({
		id: "Generate-Attendance",
		triggers: { event: "attendance/generate" }
	}, async ({ event, step }) => {
		const { courseId, classId, academicYearId, date } = event.data;
		if (!courseId || !classId || !academicYearId || !date) throw new NonRetriableError("courseId, classId, academicYearId, and date are required");
		const dayMap = {
			0: "Sunday",
			1: "Monday",
			2: "Tuesday",
			3: "Wednesday",
			4: "Thursday",
			5: "Friday",
			6: "Saturday"
		};
		const dateObj = new Date(date);
		if (Number.isNaN(dateObj.getTime())) throw new NonRetriableError("Invalid date format");
		const dayName = dayMap[dateObj.getDay()];
		if (dayName === "Saturday" || dayName === "Sunday") throw new NonRetriableError("Attendance cannot be generated on weekends (Saturday/Sunday)");
		const classData = await step.run("fetch-class-students", async () => {
			const cls = await classes_default$1.findById(classId).populate("students", "_id name");
			if (!cls) throw new NonRetriableError(`Class not found: ${classId}`);
			return cls;
		});
		const studentIds = classData.students.map((s) => s._id);
		const { matchingPeriods } = await step.run("fetch-timetable-schedule", async () => {
			const timetable = await timetable_default$1.findOne({
				class: classId,
				academicYear: academicYearId
			}).populate("schedule.periods.subject", "_id name code").populate("schedule.periods.lecturer", "_id name");
			if (!timetable) throw new NonRetriableError(`NO_TIMETABLE: No timetable found for this class. Please generate a timetable first.`);
			const daySchedule = timetable.schedule.find((d) => d.day?.toLowerCase() === dayName?.toLowerCase());
			if (!daySchedule) throw new NonRetriableError(`NO_SCHEDULE: No schedule found for ${dayName}. The timetable exists but has no periods on this day.`);
			const courseStr = courseId.toString();
			const matchingPeriods$1 = daySchedule.periods.filter((p) => p.subject?._id?.toString() === courseStr);
			if (matchingPeriods$1.length === 0) {
				const availableSubjects = daySchedule.periods.map((p) => p.subject?.name ?? p.subject?.code ?? "Unknown").filter(Boolean);
				throw new NonRetriableError(`NO_PERIOD: No period found for the selected course on ${dayName}. Please verify the course was added to the ${dayName} schedule in the timetable.${availableSubjects.length > 0 ? ` Available courses on ${dayName}: ${[...new Set(availableSubjects)].join(", ")}.` : ""}`);
			}
			return {
				daySchedule,
				matchingPeriods: matchingPeriods$1
			};
		});
		await step.run("check-duplicate", async () => {
			const startOfDay = new Date(dateObj);
			startOfDay.setHours(0, 0, 0, 0);
			const endOfDay = new Date(startOfDay);
			endOfDay.setDate(endOfDay.getDate() + 1);
			return { deletedCount: (await attendance_default$1.deleteMany({
				class: classId,
				course: courseId,
				date: {
					$gte: startOfDay,
					$lt: endOfDay
				}
			})).deletedCount };
		});
		await step.run("create-attendance-records", async () => {
			const lecturer = matchingPeriods[0]?.lecturer?._id ?? null;
			return await Promise.all(studentIds.map((studentId) => attendance_default$1.create({
				student: studentId,
				lecturer,
				course: courseId,
				class: classId,
				academicYear: academicYearId,
				date: dateObj,
				dayOfWeek: dayName,
				status: "present"
			})));
		});
		await step.run("log-activity", async () => {
			await logActivity({
				userId: event.data.userId ?? "system",
				action: "Generated attendance list",
				details: `Attendance list generated for ${classData.name} on ${new Date(date).toDateString()}, course ${courseId}. ${studentIds.length} student(s).`
			});
		});
		return {
			success: true,
			message: `Attendance list generated for ${classData.name} on ${dayName}`,
			count: studentIds.length
		};
	});
	createUsersForBulkUpload = async ({ users, classId, courseIds, userId }) => {
		if (!users || users.length === 0) throw new Error("No users provided.");
		const created = [];
		const skipped = [];
		const errors = [];
		const rolePrefixes = {
			teacher: "UJ0000TE",
			parent: "UJ0000PA",
			admin: "UJ0000AD",
			student: "UJ0000ST"
		};
		const fallbackIdNumbers = {};
		for (const [r, prefix] of Object.entries(rolePrefixes)) {
			const lastUser = await user_default$1.findOne({ idNumber: { $regex: `^${prefix}` } }).sort({ createdAt: -1 }).lean();
			if (lastUser && lastUser.idNumber) fallbackIdNumbers[r] = `${prefix}${(parseInt(lastUser.idNumber.slice(-4)) + 1).toString().padStart(4, "0")}`;
			else fallbackIdNumbers[r] = `${prefix}0001`;
		}
		for (const u of users) try {
			const idNumber = u.idNumber?.trim() || (() => {
				const prefix = {
					student: "UJ0000ST",
					teacher: "UJ0000TE",
					parent: "UJ0000PA",
					admin: "UJ0000AD"
				}[u.role] ?? "UJ0000ST";
				const nextNum = (parseInt(fallbackIdNumbers[u.role]?.slice(-4) || "0") + 1).toString().padStart(4, "0");
				fallbackIdNumbers[u.role] = `${prefix}${nextNum}`;
				return fallbackIdNumbers[u.role];
			})();
			const email = u.email?.trim() || u.name.toLowerCase().replace(/\s+/g, ".") + "@school.edu";
			const studentClasses = u.role === "student" && classId ? classId : void 0;
			const teacherSubject = u.role === "teacher" && courseIds ? courseIds : void 0;
			if (u.idNumber?.trim()) await user_default$1.findOneAndDelete({ idNumber: u.idNumber.trim() });
			await user_default$1.findOneAndDelete({ email });
			const newUser = await user_default$1.create({
				name: u.name,
				email,
				idNumber,
				role: u.role,
				password: "password",
				studentClasses,
				teacherSubject
			});
			if (!newUser) throw new Error("Failed to create user");
			if (u.role === "student" && classId) await classes_default$1.findByIdAndUpdate(classId, { $addToSet: { students: new mongoose.Types.ObjectId(newUser._id) } }, { returnDocument: "after" });
			created.push(newUser.email);
		} catch (err) {
			errors.push(`'${u.name}': ${err.message}`);
		}
		await logActivity({
			userId: userId ?? "system",
			action: "Bulk uploaded users",
			details: `Bulk upload: ${created.length} created, ${skipped.length} skipped, ${errors.length} errors.`
		});
		return {
			created,
			skipped,
			errors
		};
	};
	bulkCreateUsers = inngest.createFunction({
		id: "Bulk-Create-Users",
		triggers: { event: "users/bulk-create" }
	}, async ({ event, step }) => {
		const { users, classId, courseIds, userId } = event.data;
		const results = await step.run("bulk-create-users", async () => createUsersForBulkUpload({
			users,
			classId,
			courseIds,
			userId
		}));
		return {
			success: true,
			created: results.created.length,
			skipped: results.skipped,
			errors: results.errors
		};
	});
	rotationNotify = inngest.createFunction({
		id: "Rotation-Notify",
		triggers: { event: "rotation/notify" }
	}, async ({ event, step }) => {
		const payload = event.data;
		if (!payload?.userId || !payload?.title || !payload?.message) throw new NonRetriableError("Invalid notification payload");
		await step.run("create-notification", async () => {
			const { Notification: Notification$1 } = await import("./notification-DrupIu0s.js");
			await Notification$1.create({
				userId: new mongoose.Types.ObjectId(payload.userId),
				role: "student",
				title: payload.title,
				message: payload.message,
				type: "timetable",
				isRead: false,
				link: payload.metadata?.link || null,
				metadata: payload.metadata || {}
			});
			return { ok: true };
		});
		return { success: true };
	});
	automaticPostingNotification = inngest.createFunction({
		id: "Mordred-Auto-Posting-Assignment",
		triggers: { event: "mordred/auto-posting-assignment" }
	}, async ({ event, step }) => {
		const { studentId, departmentName, hospitalUnitId } = event.data;
		const student = await step.run("fetch-student-profile", async () => {
			return await user_default$1.findById(studentId).select("name email deviceToken");
		});
		if (!student) return {
			success: false,
			error: "Student not found"
		};
		const assignedStaff = await step.run("mordred-assign-supervisor", async () => {
			return await routeTaskToStaff(departmentName, "can_approve_logbooks", hospitalUnitId);
		});
		await step.run("send-push-notifications", async () => {
			console.log(`🤖 MORDRED: Posting established. Notified ${student.name}. Supervisor assigned: ${assignedStaff?.name || "None"}`);
		});
		return {
			success: true,
			supervisorId: assignedStaff?._id
		};
	});
	mordredTicketSentry = inngest.createFunction({
		id: "Mordred-Ticket-Escalation-Sentry",
		triggers: { event: "mordred/ticket-escalation-sentry" }
	}, async ({ event, step }) => {
		const { ticketId, departmentName } = event.data;
		await step.sleep("wait-twelve-hours", "12h");
		const structuralAlertNeeded = await step.run("check-ticket-status", async () => {
			const ticket = await __require("mongoose").model("mordred_tickets").findById(ticketId);
			return ticket && ticket.status === "OPEN" && !ticket.assigned_staff_id;
		});
		if (structuralAlertNeeded) await step.run("escalate-to-super-admin", async () => {
			console.log(`🚨 MORDRED Sentry: Ticket ${ticketId} remained unresolved for 12 hours. Escalaning to Super Admin.`);
		});
		return {
			evaluated: true,
			escalated: structuralAlertNeeded
		};
	});
	whatsappLectureAlert = inngest.createFunction({
		id: "mordred-whatsapp-lecture-alert",
		triggers: { event: "medlog/lecture.updated" }
	}, async ({ event, step }) => {
		const { className, lectureTitle, status, materialUrl, whatsappGroupId } = event.data;
		`${className}${lectureTitle}${status.toUpperCase()}`, materialUrl && `${materialUrl}`;
		await step.run("dispatch-whatsapp-payload", async () => {
			console.log(`📡 MORDRED broadcasted update directly to WhatsApp Group: ${whatsappGroupId}`);
		});
		return { dispatched: true };
	});
	rotationSnapshotScheduler = inngest.createFunction({
		id: "rotation-snapshot-scheduler",
		triggers: { cron: "0 */6 * * *" }
	}, async ({ step }) => {
		const RotationPlan$1 = (await import("./rotationPlan-B0YTYqyS.js")).default;
		const runRotationSnapshot$1 = (await import("./rotationRunner-BGFrmedx.js")).default;
		await step.run("process-rotation-snapshots", async () => {
			const now = /* @__PURE__ */ new Date();
			const plans = await RotationPlan$1.find({}).lean();
			const results = [];
			for (const plan of plans) try {
				const planDoc = await RotationPlan$1.findById(plan._id);
				if (!planDoc) continue;
				const timeline = planDoc.meta && planDoc.meta.timeline || [];
				let anyActive = false;
				for (let i = 0; i < timeline.length; i++) {
					const t = timeline[i];
					const start = new Date(t.startDate);
					const end = new Date(t.endDate);
					if (start <= now && now < end) {
						anyActive = true;
						break;
					}
				}
				if (anyActive) {
					const snap = await runRotationSnapshot$1(String(plan._id), { snapshotTime: now.toISOString() });
					results.push({
						planId: plan._id,
						snapshot: snap
					});
				}
			} catch (err) {
				console.error("Error processing rotation snapshot for plan", plan._id, err);
			}
			return {
				processed: results.length,
				results
			};
		});
		return { success: true };
	});
}));
var inngest_exports = /* @__PURE__ */ __export({
	automaticPostingNotification: () => automaticPostingNotification,
	bulkCreateUsers: () => bulkCreateUsers,
	generateAttendance: () => generateAttendance,
	generateExam: () => generateExam,
	generateTimeTable: () => generateTimeTable,
	inngest: () => inngest,
	mordredTicketSentry: () => mordredTicketSentry
});
var init_inngest = __esmMin((() => {
	init_client();
	init_functions();
}));
init_user();
init_activitieslog();
init_innGenerator();
var Faculty = faculty_default;
var normalizeRole$1 = (role) => {
	if (!role) return void 0;
	const value = String(role).trim().toLowerCase();
	if (value === "unitconsultant" || value === "unitconsultant") return "unitconsultant";
	if (value === "unitresident" || value === "unitresident") return "unitresident";
	if (value === "admin") return "admin";
	if (value === "teacher") return "teacher";
	if (value === "student") return "student";
	if (value === "parent") return "parent";
};
const resolveLoginIdentifier = (payload) => {
	const candidates = [
		payload.credential,
		payload.idNumber,
		payload.matricNumber,
		payload.email
	];
	for (const candidate of candidates) if (typeof candidate === "string") {
		const trimmed = candidate.trim();
		if (trimmed) return trimmed;
	}
	return "";
};
const normalizeLoginIdentifier = (value) => {
	if (typeof value !== "string") return "";
	return value.trim().toLowerCase().replace(/[\s._/-]+/g, "");
};
const identifierMatches = (candidate, target) => {
	const normalizedCandidate = normalizeLoginIdentifier(candidate);
	const normalizedTarget = normalizeLoginIdentifier(target);
	return Boolean(normalizedCandidate && normalizedTarget && normalizedCandidate === normalizedTarget);
};
var findUserByIdentifier = async (identifier) => {
	const trimmedIdentifier = identifier.trim();
	const lookupCandidates = [
		trimmedIdentifier && !trimmedIdentifier.includes("@") ? { idNumber: trimmedIdentifier } : null,
		trimmedIdentifier ? { email: trimmedIdentifier } : null,
		trimmedIdentifier ? { matricNumber: trimmedIdentifier } : null,
		trimmedIdentifier ? { studentId: trimmedIdentifier } : null
	].filter(Boolean);
	let user = null;
	for (const criteria of lookupCandidates) {
		user = await user_default$1.findOne(criteria);
		if (user) return user;
	}
	if (!trimmedIdentifier) return null;
	normalizeLoginIdentifier(trimmedIdentifier);
	return (await user_default$1.find({ $or: [
		{ idNumber: {
			$exists: true,
			$ne: ""
		} },
		{ email: {
			$exists: true,
			$ne: ""
		} },
		{ matricNumber: {
			$exists: true,
			$ne: ""
		} },
		{ studentId: {
			$exists: true,
			$ne: ""
		} }
	] }).limit(200)).find((candidate) => identifierMatches(candidate.idNumber, trimmedIdentifier) || identifierMatches(candidate.matricNumber, trimmedIdentifier) || identifierMatches(candidate.studentId, trimmedIdentifier) || identifierMatches(candidate.email, trimmedIdentifier)) || null;
};
var findDepartment = async (departmentInput) => {
	if (!departmentInput) return null;
	const identifier = String(departmentInput).trim();
	if (mongoose.isValidObjectId(identifier)) {
		const doc$1 = await departments_default.findById(identifier);
		if (doc$1) return doc$1;
	}
	let doc = await departments_default.findOne({ $or: [
		{ code: identifier },
		{ departmentID: identifier },
		{ name: identifier }
	] });
	if (doc) return doc;
	const constantDept = getAllDepartments().find((d) => d.code === identifier || d.departmentID === identifier || d.name === identifier);
	if (!constantDept) return null;
	doc = await departments_default.findOneAndUpdate({ code: constantDept.code }, {
		name: constantDept.name,
		code: constantDept.code,
		departmentID: constantDept.departmentID
	}, {
		upsert: true,
		returnDocument: "after"
	});
	return doc;
};
var findFaculty$1 = async (facultyInput) => {
	if (!facultyInput) return null;
	const identifier = String(facultyInput).trim();
	if (!identifier) return null;
	if (mongoose.isValidObjectId(identifier)) {
		const doc = await Faculty.findById(identifier);
		if (doc) return doc;
	}
	return await Faculty.findOne({ $or: [
		{ code: identifier },
		{ facultyID: identifier },
		{ name: identifier }
	] });
};
var resolveInstitutionName = async (fallback) => {
	if (fallback && String(fallback).trim()) return String(fallback).trim();
	const institution = await institution_default.findOne().select("name shortName").lean().exec();
	return institution?.name || institution?.shortName || process.env.INSTITUTION_NAME || "University";
};
var ensureUniqueInn = async ({ userId, role, idNumber, institutionName }) => {
	const safeRole = normalizeRole$1(role) || "student";
	const candidateIdNumber = idNumber || "";
	const resolvedInstitutionName = await resolveInstitutionName(institutionName);
	const roleQuery = { role: safeRole };
	const roleUsers = await user_default$1.find(roleQuery).select("_id createdAt inn").sort({
		createdAt: 1,
		_id: 1
	}).lean();
	const userOrder = roleUsers.findIndex((entry) => String(entry._id) === String(userId));
	const sequence = userOrder >= 0 ? userOrder + 1 : roleUsers.length + 1;
	let attempt = Math.max(1, sequence);
	while (true) {
		const inn = buildInnNumber({
			institutionName: resolvedInstitutionName,
			idNumber: candidateIdNumber,
			role: safeRole,
			sequence: attempt
		});
		const duplicateQuery = {
			inn,
			role: safeRole,
			_id: { $ne: userId || void 0 }
		};
		if (!await user_default$1.findOne(duplicateQuery).select("_id").lean()) return inn;
		attempt += 1;
	}
};
const backfillMissingInns = async () => {
	try {
		const users = await user_default$1.find({ $or: [
			{ inn: { $exists: false } },
			{ inn: null },
			{ inn: "" }
		] }).select("_id role idNumber createdAt").sort({
			createdAt: 1,
			_id: 1
		}).lean();
		if (!users.length) return { updated: 0 };
		const results = [];
		for (const user of users) {
			const roleUsers = await user_default$1.find({ role: user.role }).select("_id createdAt").sort({
				createdAt: 1,
				_id: 1
			}).lean();
			const position = roleUsers.findIndex((entry) => String(entry._id) === String(user._id));
			position >= 0 ? position + 1 : roleUsers.length + 1;
			const institutionName = await resolveInstitutionName();
			const inn = await ensureUniqueInn({
				userId: String(user._id),
				role: user.role,
				idNumber: String(user.idNumber ?? ""),
				institutionName
			});
			const updated = await user_default$1.findByIdAndUpdate(user._id, { $set: { inn } }, { returnDocument: "after" });
			if (updated) results.push(String(updated._id));
		}
		return { updated: results.length };
	} catch (error) {
		console.error("backfillMissingInns failed:", error);
		return { updated: 0 };
	}
};
const registerUser = async (req, res) => {
	try {
		const { name, email, password, idNumber, role, departmentId, department, studentClasses, teacherSubject, parentStudents, isActive, isSupervisor, supervisorRank, specialties } = req.body;
		const normalizedRole = normalizeRole$1(role);
		if (!normalizedRole) {
			res.status(400).json({
				status: "Error!",
				message: "Invalid user role"
			});
			return;
		}
		const departmentDoc = await findDepartment(departmentId || department || req.body?.departmentCode || req.body?.departmentID);
		const facultyDoc = await findFaculty$1(req.body?.facultyId || req.body?.faculty);
		if ([
			"teacher",
			"unitconsultant",
			"unitresident"
		].includes(normalizedRole) && !departmentDoc) {
			res.status(400).json({
				status: "Error!",
				message: "Staff users must be assigned a valid department"
			});
			return;
		}
		const studentClassesNormalized = Array.isArray(studentClasses) ? studentClasses.length ? studentClasses[0] : void 0 : studentClasses || void 0;
		const studentClassIdFromClassId = req.body?.classId || void 0;
		const finalStudentClass = studentClassesNormalized ?? studentClassIdFromClassId;
		const teacherSubjectNormalized = Array.isArray(teacherSubject) ? teacherSubject : teacherSubject ? [teacherSubject] : [];
		const parentStudentsNormalized = Array.isArray(parentStudents) ? parentStudents : parentStudents ? [parentStudents] : [];
		if (await user_default$1.findOne({ email })) {
			res.status(400).json({
				status: "Error!",
				message: "User already exists"
			});
			return;
		}
		const existingID = await user_default$1.findOne({ idNumber });
		let newIDNumber = idNumber;
		const updateUserIdIfExists = async () => {
			if (existingID) {
				const lastUserWithID = await user_default$1.findOne({ idNumber: { $regex: `^${idNumber.slice(0, -4)}` } }).sort({ createdAt: -1 });
				if (lastUserWithID) {
					const lastIDNumber = lastUserWithID.idNumber;
					newIDNumber = `${lastIDNumber.slice(0, -4)}${(parseInt(lastIDNumber.slice(-4)) + 1).toString().padStart(4, "0")}`;
				}
			} else if (!idNumber) {
				const rolePrefix = role === "admin" ? "UJMBBSAD" : role === "teacher" ? "UJMBBSTE" : role === "student" ? "UJMBBSST" : role === "parent" ? "UJMBBSPA" : role === "unitconsultant" ? "UJMBBSUC" : role === "unitresident" ? "UJMBBSUR" : "UJMBBSST";
				const lastUserWithRolePrefix = await user_default$1.findOne({ idNumber: { $regex: `^${rolePrefix}` } }).sort({ createdAt: -1 });
				if (lastUserWithRolePrefix) {
					const lastIDNumber = lastUserWithRolePrefix.idNumber;
					newIDNumber = `${lastIDNumber.slice(0, -4)}${(parseInt(lastIDNumber.slice(-4)) + 1).toString().padStart(4, "0")}`;
				} else newIDNumber = `${role === "admin" ? "UJ0000AD" : role === "teacher" ? "UJ0000TE" : role === "student" ? "UJ0000ST" : role === "parent" ? "UJ0000PA" : role === "unitconsultant" ? "UJ0000UC" : role === "unitresident" ? "UJ0000UR" : "UJ0000ST"}0001`;
			}
		};
		await updateUserIdIfExists();
		if (existingID) {}
		const institutionName = req.body?.institutionName || req.body?.institution?.name;
		const inn = await ensureUniqueInn({
			role: normalizedRole,
			idNumber: newIDNumber,
			institutionName
		});
		const newUser = await user_default$1.create({
			name,
			email,
			password,
			idNumber: newIDNumber,
			inn,
			role: normalizedRole,
			faculty: facultyDoc ? facultyDoc.name : typeof req.body?.faculty === "string" ? req.body.faculty.trim() : void 0,
			facultyId: facultyDoc ? facultyDoc._id : void 0,
			department: departmentDoc ? departmentDoc.name : typeof department === "string" ? department.trim() : void 0,
			departmentId: departmentDoc ? departmentDoc._id : void 0,
			studentClasses: finalStudentClass,
			teacherSubject: teacherSubjectNormalized,
			parentStudents: parentStudentsNormalized,
			isActive,
			isSupervisor: isSupervisor || false,
			supervisorRank: supervisorRank || 0,
			specialties: Array.isArray(specialties) ? specialties : specialties ? [specialties] : []
		});
		if (newUser) {
			await newUser.populate("studentClasses", "name academicYear");
			await newUser.populate("teacherSubject", "name code");
			if (role === "student" && finalStudentClass) await (init_classes(), __toCommonJS(classes_exports)).default.findByIdAndUpdate(finalStudentClass, { $addToSet: { students: newUser._id } }, { returnDocument: "after" });
			if (role === "supervisor") await (init_classes(), __toCommonJS(classes_exports)).default.findByIdAndUpdate(finalStudentClass, { $addToSet: { supervisors: newUser._id } }, { returnDocument: "after" });
			if (req.user) await logActivity({
				userId: req.user._id.toString(),
				action: "Created user",
				details: `${newUser.name} (${newUser.email}) with role ${newUser.role}, and assigned ID number ${newUser.idNumber}`
			});
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
		} else res.status(400).json({
			status: "Error!",
			message: "Invalid user data"
		});
	} catch (error) {
		res.status(500).json({
			status: "Error!",
			message: "Internal server error",
			error: `${error}`
		});
	}
};
const registerPublic = async (req, res) => {
	try {
		const { name, email, password, idNumber, role, departmentId, department, studentClasses, teacherSubject, parentStudents, isActive } = req.body;
		const normalizedRole = normalizeRole$1(role);
		const allowedRoles = await user_default$1.countDocuments() === 0 ? [
			"admin",
			"teacher",
			"unitconsultant",
			"unitresident"
		] : [
			"student",
			"teacher",
			"parent",
			"unitconsultant",
			"unitresident"
		];
		if (!normalizedRole || !allowedRoles.includes(normalizedRole)) {
			res.status(400).json({ message: "Invalid role for public registration" });
			return;
		}
		const departmentDoc = await findDepartment(departmentId || department || req.body?.departmentCode || req.body?.departmentID);
		const facultyDoc = await findFaculty$1(req.body?.facultyId || req.body?.faculty);
		const isStaffUmbrella = [
			"teacher",
			"unitconsultant",
			"unitresident"
		].includes(normalizedRole);
		if (isStaffUmbrella && !departmentDoc) {
			res.status(400).json({ message: "Staff users must select a valid department" });
			return;
		}
		const approvalState = getRegistrationApprovalState(normalizedRole);
		const needsAdminApproval = requiresAdminApproval(normalizedRole);
		const requestedActiveState = typeof isActive === "boolean" ? isActive : approvalState.isActive;
		const studentClassName = req.body?.studentClassName || void 0;
		const normalizedName = typeof name === "string" ? name.trim() : "";
		if (isStaffUmbrella) {
			const staffTokens = normalizedName.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
			await (async () => {
				const matches = await (init_hospitalStaff(), __toCommonJS(hospitalStaff_exports)).default.find({ isActive: true }).select("name");
				for (const s of matches) {
					const sTokens = String(s.name || "").toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
					if (new Set(sTokens.filter((t) => staffTokens.includes(t))).size >= 2) return true;
				}
				return false;
			})();
		}
		const studentClassNameRaw = studentClassName;
		let studentClassId = Array.isArray(studentClasses) ? studentClasses[0] : studentClasses || req.body?.classId || void 0;
		if (role === "student") {
			const candidate = (studentClassNameRaw || "").trim();
			if (candidate) {
				const ClassModel = (init_classes(), __toCommonJS(classes_exports)).default;
				const normalizedCandidate = String(candidate).toLowerCase().replace(/\s+/g, " ").trim();
				await ClassModel.findOne({ name: { $exists: true } }).lean();
				const mappedAllowed = [
					"400 level",
					"500 level",
					"600 level",
					"final year"
				].find((n) => n === normalizedCandidate) || null;
				if (mappedAllowed) {
					const classMatch2 = await ClassModel.findOne({ name: { $in: [
						"400 level",
						"500 level",
						"600 level",
						"Final year"
					] } }) || await ClassModel.findOne({ name: {
						$regex: `^${mappedAllowed}$`,
						$options: "i"
					} });
					if (classMatch2?._id) studentClassId = classMatch2._id;
				}
			}
		}
		if (await user_default$1.findOne({ email })) {
			res.status(400).json({ message: "User already exists" });
			return;
		}
		const teacherSubjectNormalized = Array.isArray(teacherSubject) ? teacherSubject : teacherSubject ? [teacherSubject] : [];
		const parentStudentsNormalized = Array.isArray(parentStudents) ? parentStudents : parentStudents ? [parentStudents] : [];
		let newIDNumber = idNumber;
		if (!newIDNumber) {
			const rolePrefix = role === "admin" ? "UJ0000AD" : role === "teacher" ? "UJ0000TE" : role === "student" ? "UJ0000ST" : role === "parent" ? "UJ0000PA" : "UJ0000ST";
			const lastUserWithRolePrefix = await user_default$1.findOne({ idNumber: { $regex: `^${rolePrefix}` } }).sort({ createdAt: -1 });
			if (lastUserWithRolePrefix) {
				const lastIDNumber = lastUserWithRolePrefix.idNumber;
				newIDNumber = `${lastIDNumber.slice(0, -4)}${(parseInt(lastIDNumber.slice(-4)) + 1).toString().padStart(4, "0")}`;
			} else newIDNumber = `${rolePrefix}0001`;
		}
		const facultyName = facultyDoc ? facultyDoc.name : typeof req.body?.faculty === "string" ? req.body.faculty.trim() : void 0;
		const facultyIdValue = facultyDoc ? facultyDoc._id : void 0;
		const newUser = await user_default$1.create({
			name,
			email,
			password,
			idNumber: newIDNumber,
			role: normalizedRole,
			faculty: facultyName,
			facultyId: facultyIdValue,
			department: departmentDoc ? departmentDoc.name : typeof department === "string" ? department.trim() : void 0,
			departmentId: departmentDoc ? departmentDoc._id : void 0,
			studentClasses: studentClassId,
			teacherSubject: teacherSubjectNormalized,
			parentStudents: parentStudentsNormalized,
			isActive: requestedActiveState,
			approvalStatus: approvalState.approvalStatus
		});
		if (newUser) {
			await newUser.populate("studentClasses", "name academicYear");
			await newUser.populate("teacherSubject", "name code");
			if (role === "student" && studentClassId) await (init_classes(), __toCommonJS(classes_exports)).default.findByIdAndUpdate(studentClassId, { $addToSet: { students: newUser._id } });
			if (role === "student" && !studentClassId) try {
				const notifications = (await user_default$1.find({ role: "admin" }).select("_id")).map((a) => ({
					userId: a._id,
					role: "admin",
					title: "New student requires class assignment",
					message: `${newUser.name} (${newUser.email}) registered and needs to be assigned to a class.`,
					type: "system",
					isRead: false,
					metadata: { newUserId: newUser._id }
				}));
				if (notifications.length) {
					const inserted = await Notification.insertMany(notifications);
					try {
						for (const doc of inserted) try {
							sendSSE("notification", doc, String(doc.userId));
						} catch (err) {
							console.error("Failed to send SSE for inserted notifications", err);
						}
					} catch (err) {
						console.error("Failed to send SSE for inserted notifications", err);
					}
				}
			} catch (err) {
				console.error("Failed to notify admins about new student:", err);
			}
			if (needsAdminApproval) try {
				const notifications = (await user_default$1.find({ role: "admin" }).select("_id")).map((a) => ({
					userId: a._id,
					role: "admin",
					title: "Pending staff registration",
					message: `${newUser.name} (${newUser.email}) submitted a ${normalizedRole} registration and is waiting for admin approval.`,
					type: "system",
					isRead: false,
					metadata: {
						pendingUserId: newUser._id,
						pendingUserEmail: newUser.email,
						pendingUserName: newUser.name,
						requestedRole: normalizedRole,
						approvalStatus: newUser.approvalStatus
					}
				}));
				if (notifications.length) {
					const inserted = await Notification.insertMany(notifications);
					for (const doc of inserted) try {
						sendSSE("notification", doc, String(doc.userId));
					} catch (err) {
						console.error("Failed to send SSE for pending staff notification", err);
					}
				}
			} catch (err) {
				console.error("Failed to notify admins about pending staff registration:", err);
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
				message: needsAdminApproval ? `User '${newUser.name}' created successfully and is pending admin approval.` : `User '${newUser.name}' created successfully`
			});
			return;
		}
		res.status(400).json({ message: "Invalid user data" });
	} catch (error) {
		console.error("updateUser error:", error);
		const err = error;
		res.status(500).json({
			message: "Server error",
			error: err?.message ?? String(err),
			stack: err?.stack
		});
	}
};
const requestPasswordReset = async (req, res) => {
	try {
		const { identifier } = req.body;
		const trimmedIdentifier = resolveLoginIdentifier({
			credential: identifier,
			idNumber: identifier,
			matricNumber: identifier,
			email: identifier
		}).trim();
		if (!trimmedIdentifier) {
			res.status(400).json({ message: "Enter an email, matriculation number, or staff ID." });
			return;
		}
		const user = await findUserByIdentifier(trimmedIdentifier);
		if (!user) {
			res.status(200).json({ message: "If an account exists for that identifier, a recovery code has been prepared." });
			return;
		}
		const token = generatePasswordResetToken();
		user.passwordResetToken = await hashPasswordResetToken(token);
		user.passwordResetExpiresAt = new Date(Date.now() + 1e3 * 60 * 30);
		user.lastPasswordResetRequestedAt = /* @__PURE__ */ new Date();
		await user.save();
		const responsePayload = {
			message: "A recovery code has been prepared. Continue below to set a new password.",
			resetToken: process.env.NODE_ENV !== "production" ? token : void 0,
			expiresAt: user.passwordResetExpiresAt.toISOString()
		};
		res.status(200).json(responsePayload);
	} catch (error) {
		console.error("requestPasswordReset error:", error);
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const resetPassword = async (req, res) => {
	try {
		const { token, newPassword } = req.body;
		if (!token || !newPassword) {
			res.status(400).json({ message: "Recovery code and a new password are required." });
			return;
		}
		if (String(newPassword).trim().length < 6) {
			res.status(400).json({ message: "Password must be at least 6 characters long." });
			return;
		}
		const usersWithResetToken = await user_default$1.find({
			passwordResetToken: { $ne: null },
			passwordResetExpiresAt: { $gt: /* @__PURE__ */ new Date() }
		});
		let matchedUser = null;
		for (const candidate of usersWithResetToken) if (await verifyPasswordResetToken(String(token), candidate.passwordResetToken)) {
			matchedUser = candidate;
			break;
		}
		if (!matchedUser) {
			res.status(400).json({ message: "The recovery code is invalid or has expired." });
			return;
		}
		matchedUser.password = String(newPassword);
		matchedUser.passwordResetToken = null;
		matchedUser.passwordResetExpiresAt = null;
		matchedUser.lastPasswordResetRequestedAt = null;
		await matchedUser.save();
		res.status(200).json({ message: "Password reset successful. You can sign in with your new password." });
	} catch (error) {
		console.error("resetPassword error:", error);
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const isFirstUser = async (req, res) => {
	try {
		const count = await user_default$1.countDocuments();
		res.status(200).json({
			count,
			isFirst: count === 0
		});
	} catch (error) {
		res.status(500).json({ message: `Server error: ${error}` });
	}
};
const login = async (req, res) => {
	try {
		const { password } = req.body;
		const user = await findUserByIdentifier(resolveLoginIdentifier(req.body).trim());
		if (user && await user.matchPassword(password)) {
			if (user.approvalStatus !== "approved") {
				const message$1 = user.approvalStatus === "pending" ? "Your account is pending admin approval." : user.approvalStatus === "rejected" ? "Your account has been rejected." : "Your account is not approved.";
				res.status(403).json({ message: message$1 });
				return;
			}
			if (!user.isActive) if (user.approvalStatus === "approved" && (user.approvedAt || user.approvedBy)) {
				user.isActive = true;
				await user.save();
			} else {
				res.status(403).json({ message: "Your account is inactive." });
				return;
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
					departmentRole: user.departmentRole
				},
				token
			};
			if (req.user) await logActivity({
				userId: user._id.toString(),
				action: "Login User",
				details: `${user.name} logged in successfully.`
			});
			res.status(201).json(responsePayload);
			return;
		} else {
			res.status(401).json({ message: "Invalid matriculation number, email, or password" });
			return;
		}
	} catch (error) {
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const approvePendingUser = async (req, res) => {
	try {
		const user = await user_default$1.findById(req.params.id);
		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}
		if (user.approvalStatus === "approved" && user.isActive) {
			res.status(200).json({
				message: "User is already approved",
				user
			});
			return;
		}
		user.approvalStatus = "approved";
		user.isActive = true;
		user.approvedAt = user.approvedAt ?? /* @__PURE__ */ new Date();
		user.approvedBy = user.approvedBy ?? req.user?._id ?? null;
		await user.save();
		await Notification.create({
			userId: user._id,
			role: user.role,
			title: "Account approved",
			message: `Your account has been approved. You can now sign in with the password you created during registration.`,
			type: "success",
			isRead: false,
			metadata: { approvedBy: req.user?._id ?? null }
		});
		await sendAccountApprovalEmail({
			to: user.email,
			name: user.name,
			loginUrl: process.env.FRONTEND_URL || "http://localhost:5173/login",
			message: `Hi ${user.name}, your account has been approved. You can now sign in with the password you set during registration.`
		});
		res.status(200).json({
			message: "User approved successfully",
			user: {
				_id: user._id,
				name: user.name,
				email: user.email,
				role: user.role,
				isActive: user.isActive,
				approvalStatus: user.approvalStatus
			}
		});
	} catch (error) {
		console.error("approvePendingUser error:", error);
		res.status(500).json({
			message: "Server error",
			error: error?.message ?? String(error)
		});
	}
};
const updateUser = async (req, res) => {
	try {
		const authReq = req;
		const requestedId = req.params.id;
		const currentUserId = authReq.user?._id?.toString();
		const currentUserRole = authReq.user?.role;
		if (!mongoose.isValidObjectId(requestedId)) {
			res.status(400).json({
				status: "Error!",
				message: "Invalid user id"
			});
			return;
		}
		const isOwnProfile = currentUserId === requestedId;
		if (!isOwnProfile && !(currentUserRole === "admin" || currentUserRole === "teacher")) {
			res.status(403).json({
				status: "Error!",
				message: "You can only update your own profile"
			});
			return;
		}
		const user = await user_default$1.findById(req.params.id);
		if (user) {
			let previousStudentClass = void 0;
			if (user.studentClasses) if (typeof user.studentClasses === "object" && user.studentClasses?._id) previousStudentClass = String(user.studentClasses._id);
			else previousStudentClass = String(user.studentClasses);
			user.name = req.body.name || user.name;
			user.email = req.body.email || user.email;
			user.idNumber = req.body.idNumber || user.idNumber;
			if (req.body.inn !== void 0) user.inn = req.body.inn ? String(req.body.inn).trim() : null;
			else if (!user.inn) {
				const institutionName = req.body?.institutionName || req.body?.institution?.name;
				user.inn = await ensureUniqueInn({
					userId: user._id.toString(),
					role: user.role,
					idNumber: user.idNumber,
					institutionName
				});
			}
			if (req.body.role !== void 0) {
				const normalizedRole = normalizeRole$1(req.body.role);
				if (normalizedRole) user.role = normalizedRole;
			}
			user.isActive = req.body.isActive !== void 0 ? req.body.isActive : user.isActive;
			if (req.body.studentClasses !== void 0 || req.body.classId !== void 0) {
				const incoming = req.body.studentClasses !== void 0 ? req.body.studentClasses : req.body.classId;
				user.studentClasses = Array.isArray(incoming) ? incoming.length ? incoming[0] : null : typeof incoming === "string" ? incoming.trim() || null : incoming ?? null;
			}
			if (req.body.teacherSubject !== void 0) user.teacherSubject = (Array.isArray(req.body.teacherSubject) ? req.body.teacherSubject : req.body.teacherSubject ? [req.body.teacherSubject] : []).filter((subject) => typeof subject !== "string" || subject.trim() !== "");
			if (req.body.parentStudents !== void 0) user.parentStudents = (Array.isArray(req.body.parentStudents) ? req.body.parentStudents : req.body.parentStudents ? [req.body.parentStudents] : []).filter((student) => typeof student !== "string" || student.trim() !== "");
			if (req.body.faculty !== void 0 || req.body.facultyId !== void 0) {
				const facultyInput = req.body.facultyId ?? req.body.faculty;
				if (facultyInput === null || typeof facultyInput === "string" && String(facultyInput).trim() === "") {
					user.facultyId = null;
					user.faculty = null;
				} else {
					const facultyDoc = await findFaculty$1(facultyInput);
					if (facultyDoc) {
						user.facultyId = facultyDoc._id;
						user.faculty = facultyDoc.name;
					} else if (req.body.faculty !== void 0) user.faculty = String(req.body.faculty).trim();
				}
			}
			if (req.body.department !== void 0 || req.body.departmentId !== void 0) {
				const deptInput = req.body.departmentId ?? req.body.department;
				if (deptInput === null || typeof deptInput === "string" && String(deptInput).trim() === "") {
					user.departmentId = null;
					user.department = null;
				} else {
					const deptDoc = await findDepartment(deptInput);
					if (deptDoc) {
						user.departmentId = deptDoc._id;
						user.department = deptDoc.name;
					} else if (req.body.department !== void 0) user.department = String(req.body.department).trim();
				}
			}
			if (req.body.academicStatus !== void 0) user.academicStatus = req.body.academicStatus;
			if (req.body.departmentRole !== void 0) user.departmentRole = req.body.departmentRole;
			if (req.body.isSupervisor !== void 0) user.isSupervisor = req.body.isSupervisor;
			if (req.body.supervisorRank !== void 0) user.supervisorRank = req.body.supervisorRank;
			if (req.body.specialties !== void 0) user.specialties = Array.isArray(req.body.specialties) ? req.body.specialties : [req.body.specialties];
			if (req.body.password) {
				if (isOwnProfile && req.body.currentPassword) {
					if (!await user.matchPassword(req.body.currentPassword)) {
						res.status(400).json({
							status: "Error!",
							message: "Current password is incorrect"
						});
						return;
					}
				}
				user.password = req.body.password;
			}
			if (req.body.profileImage !== void 0) user.profileImage = req.body.profileImage;
			const updatedUser = await user.save();
			const updater = req.user;
			const userId = updater?._id?.toString?.();
			if (user.role === "student" && (req.body.studentClasses !== void 0 || req.body.classId !== void 0)) {
				const ClassModel = (init_classes(), __toCommonJS(classes_exports)).default;
				const oldClass = previousStudentClass;
				let newClass = void 0;
				if (updatedUser.studentClasses) if (typeof updatedUser.studentClasses === "object" && updatedUser.studentClasses?._id) newClass = String(updatedUser.studentClasses._id);
				else newClass = String(updatedUser.studentClasses);
				if (oldClass && oldClass !== newClass && mongoose.isValidObjectId(oldClass)) try {
					await ClassModel.findByIdAndUpdate(oldClass, { $pull: { students: user._id } });
				} catch (err) {
					console.error("Failed to remove student from old class", err);
				}
				if (newClass && newClass !== oldClass && mongoose.isValidObjectId(newClass)) try {
					await ClassModel.findByIdAndUpdate(newClass, { $addToSet: { students: user._id } });
				} catch (err) {
					console.error("Failed to add student to new class", err);
				}
				try {
					await Notification.deleteMany({
						"metadata.newUserId": updatedUser._id,
						type: "system"
					});
				} catch (err) {
					console.error("Failed to clear admin notifications for user assignment:", err);
				}
				try {
					const ClassModel2 = (init_classes(), __toCommonJS(classes_exports)).default;
					const classObj = newClass ? await ClassModel2.findById(newClass).select("name") : null;
					try {
						const notificationRole = updatedUser.role === "unitconsultant" ? "unitconsultant" : updatedUser.role === "unitresident" ? "unitresident" : updatedUser.role;
						const created = await Notification.create({
							userId: updatedUser._id,
							role: notificationRole,
							title: "Assigned to class",
							message: classObj ? `You have been assigned to ${classObj.name}.` : "You have been assigned to a class.",
							type: "info",
							isRead: false,
							metadata: {
								classId: newClass,
								className: classObj?.name || null,
								updatedBy: userId
							}
						});
						try {
							sendSSE("notification", created, String(created.userId));
						} catch (err) {
							console.error("SSE send failed", err);
						}
					} catch (err) {
						console.error("Failed to notify user about class assignment:", err);
					}
				} catch (err) {
					console.error("Failed to notify user about class assignment:", err);
				}
			}
			try {
				const updater$1 = req.user;
				if (!isOwnProfile && updater$1) try {
					const notificationRole = updatedUser.role === "unitconsultant" ? "unitconsultant" : updatedUser.role === "unitresident" ? "unitresident" : updatedUser.role;
					const created = await Notification.create({
						userId: updatedUser._id,
						role: notificationRole,
						title: "Profile updated",
						message: `Your profile was updated by ${updater$1.name || updater$1.email || "an admin"}.`,
						type: "info",
						isRead: false,
						metadata: {
							updatedBy: updater$1._id,
							changes: req.body
						}
					});
					try {
						sendSSE("notification", created, String(created.userId));
					} catch (err) {
						console.error("SSE send failed", err);
					}
				} catch (err) {
					console.error("Failed to create profile-updated notification:", err);
				}
			} catch (err) {
				console.error("Failed to create profile-updated notification:", err);
			}
			if (updater) await logActivity({
				userId,
				action: "Updated user",
				details: `Updated user ${updatedUser.email} (ID: ${updatedUser.idNumber}) successfully.
                    Changes: ${JSON.stringify(req.body)}`
			});
			res.status(200).json({
				_id: updatedUser._id,
				name: updatedUser.name,
				email: updatedUser.email,
				role: updatedUser.role,
				isActive: updatedUser.isActive,
				studentClasses: updatedUser.studentClasses,
				idNumber: updatedUser.idNumber,
				inn: updatedUser.inn,
				profileImage: updatedUser.profileImage,
				parentStudents: updatedUser.parentStudents,
				teacherSubject: updatedUser.teacherSubject,
				academicStatus: updatedUser.academicStatus,
				departmentRole: updatedUser.departmentRole,
				isSupervisor: updatedUser.isSupervisor,
				supervisorRank: updatedUser.supervisorRank,
				specialties: updatedUser.specialties,
				message: `User ${updatedUser.email} (ID: ${updatedUser.idNumber}) updated successfully.`
			});
		} else res.status(404).json({
			status: "Error!",
			message: "User not found"
		});
	} catch (error) {
		console.error("updateUser error:", error);
		const err = error;
		res.status(500).json({
			message: "Server error",
			error: err?.message ?? String(err),
			stack: err?.stack
		});
	}
};
const getUsers = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 100;
		const role = normalizeRole$1(req.query.role);
		const departmentQuery = req.query.department;
		const search = req.query.search;
		const skip = (page - 1) * limit;
		const filter = {};
		if (role && role !== "all" && role !== "") filter.role = role;
		if (departmentQuery && departmentQuery !== "") if (mongoose.isValidObjectId(departmentQuery)) filter.departmentId = departmentQuery;
		else {
			const departmentDoc = await departments_default.findOne({ $or: [
				{ code: departmentQuery },
				{ departmentID: departmentQuery },
				{ name: departmentQuery }
			] });
			if (departmentDoc) filter.departmentId = departmentDoc._id;
			else filter.department = departmentQuery;
		}
		if (search) filter.$or = [
			{ name: {
				$regex: search,
				$options: "i"
			} },
			{ email: {
				$regex: search,
				$options: "i"
			} },
			{ idNumber: {
				$regex: search,
				$options: "i"
			} }
		];
		const [total, users] = await Promise.all([user_default$1.countDocuments(filter), user_default$1.find(filter).select("-password").populate("studentClasses", "_id name").populate("teacherSubject", "_id name code").sort({ createdAt: -1 }).skip(skip).limit(limit)]);
		res.status(200).json({
			users,
			pagination: {
				total,
				page,
				pages: Math.ceil(total / limit),
				limit
			}
		});
	} catch (error) {
		res.status(500).json({
			message: `Server error`,
			error: `${error}`
		});
	}
};
const getUserById = async (req, res) => {
	try {
		const user = await user_default$1.findById(req.params.id).select("-password").populate("studentClasses", "_id name academicYear").populate("teacherSubject", "_id name code").populate("parentStudents", "name email idNumber role studentClasses");
		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}
		res.json(user);
	} catch (error) {
		res.status(500).json({
			message: `Server error`,
			error: `${error}`
		});
	}
};
const deleteUser = async (req, res) => {
	try {
		const user = await user_default$1.findById(req.params.id);
		if (user) {
			await user_default$1.deleteOne({ _id: user._id });
			if (req.user) await logActivity({
				userId: req.user._id.toString(),
				action: "Deleted user",
				details: `Deleted user ${user.name}, email: ${user.email}, id: ${user.idNumber}, successfully!`
			});
			res.status(201).json({ message: `User ${user.email} deleted successfully.` });
		} else {
			res.status(404).json({
				status: "Error!",
				message: "User not found"
			});
			return;
		}
	} catch (error) {
		res.status(500).json({
			status: "Error!",
			message: `Server error: ${error}`
		});
	}
};
const getUserProfile = async (req, res) => {
	try {
		const user = await user_default$1.findById(req.user._id).populate("studentClasses", "name academicYear").populate("teacherSubject", "name code").populate("parentStudents", "name email idNumber role studentClasses");
		if (user) res.json({ user: {
			_id: user._id,
			name: user.name,
			email: user.email,
			role: user.role,
			idNumber: user.idNumber,
			inn: user.inn,
			profileImage: user.profileImage,
			studentClasses: user.studentClasses,
			teacherSubject: user.teacherSubject,
			parentStudents: user.parentStudents,
			academicStatus: user.academicStatus,
			departmentRole: user.departmentRole,
			isSupervisor: user.isSupervisor,
			supervisorRank: user.supervisorRank,
			specialties: user.specialties
		} });
		else res.status(404).json({
			status: "Error!",
			message: "Not authorized"
		});
	} catch (error) {
		res.status(500).json({
			status: "Error!",
			message: `Server error: ${error}`
		});
	}
};
const logoutUser = async (req, res) => {
	try {
		res.cookie("jwt", "", {
			httpOnly: true,
			expires: /* @__PURE__ */ new Date(0)
		});
		res.json({ message: "Logged out successfully" });
	} catch (error) {
		res.status(500).json({
			status: "Error!",
			message: `Server error: ${error}`
		});
	}
};
const bulkUploadUsers = async (req, res) => {
	try {
		const { users, classId, courseIds } = req.body;
		if (!users || users.length === 0) {
			res.status(400).json({
				status: "Error!",
				message: "No users provided."
			});
			return;
		}
		if (users.length > 500) {
			res.status(400).json({
				status: "Error!",
				message: "Maximum 500 users per upload."
			});
			return;
		}
		for (const u of users) {
			if (!u.name || !u.email || !u.role) {
				res.status(400).json({
					status: "Error!",
					message: "Each user entry must have name, email, and role."
				});
				return;
			}
			if (![
				"admin",
				"teacher",
				"student",
				"parent",
				"unitconsultant",
				"unitresident"
			].includes(u.role)) {
				res.status(400).json({
					status: "Error!",
					message: `Invalid role '${u.role}'. Must be admin, teacher, student, parent, unitconsultant, or unitresident.`
				});
				return;
			}
		}
		const { inngest: inngest$1 } = (init_inngest(), __toCommonJS(inngest_exports));
		if (process.env.NODE_ENV !== "production" && !process.env.INNGEST_EVENT_KEY) {
			console.warn("Skipping Inngest in local development because INNGEST_EVENT_KEY is not set.");
			const { createUsersForBulkUpload: createUsersForBulkUpload$1 } = (init_functions(), __toCommonJS(functions_exports));
			const results = await createUsersForBulkUpload$1({
				users,
				classId: classId || void 0,
				courseIds: courseIds || void 0,
				userId: req.user?._id?.toString()
			});
			res.status(200).json({
				status: "Success",
				message: `Bulk upload completed locally. ${results.created.length} user(s) processed.`,
				results
			});
			return;
		}
		try {
			await inngest$1.send({
				name: "users/bulk-create",
				data: {
					users,
					classId: classId || void 0,
					courseIds: courseIds || void 0,
					userId: req.user?._id?.toString()
				}
			});
			res.status(202).json({
				status: "Accepted",
				message: `Bulk upload started. Processing ${users.length} user(s) in the background.`
			});
		} catch (error) {
			const errorString = typeof error?.message === "string" ? error.message : JSON.stringify(error);
			if (process.env.NODE_ENV !== "production" && (!process.env.INNGEST_EVENT_KEY || error?.code === "ConnectionRefused" || String(error?.path || "").includes("8288") || /NO_EVENT_KEY_SET|ECONNREFUSED|ConnectionRefused|connect.*8288/i.test(errorString))) {
				console.warn("Inngest unavailable, falling back to direct bulk upload.", error);
				const { createUsersForBulkUpload: createUsersForBulkUpload$1 } = (init_functions(), __toCommonJS(functions_exports));
				const results = await createUsersForBulkUpload$1({
					users,
					classId: classId || void 0,
					courseIds: courseIds || void 0,
					userId: req.user?._id?.toString()
				});
				res.status(200).json({
					status: "Success",
					message: `Bulk upload completed locally after Inngest fallback. ${results.created.length} user(s) processed.`,
					results
				});
				return;
			}
			res.status(500).json({
				status: "Error!",
				message: `Server error: ${error}`
			});
		}
	} catch (error) {
		res.status(500).json({
			status: "Error!",
			message: `Server error: ${error}`
		});
	}
};
const extractFromPDF = async (req, res) => {
	try {
		if (!req.body || typeof req.body !== "object") {
			res.status(400).json({
				status: "Error!",
				message: "No file data provided."
			});
			return;
		}
		const { base64Data, mimeType } = req.body;
		if (!base64Data) {
			res.status(400).json({
				status: "Error!",
				message: "No file data provided."
			});
			return;
		}
		res.status(501).json({
			status: "Error!",
			message: "PDF text extraction is not yet available. Please use a spreadsheet (.csv or .xlsx) with Name, Email, and ID Number columns."
		});
	} catch (error) {
		res.status(500).json({
			status: "Error!",
			message: `Server error: ${error}`
		});
	}
};
const extractFromImage = async (req, res) => {
	try {
		if (!req.body || typeof req.body !== "object") {
			res.status(400).json({
				status: "Error!",
				message: "No file data provided."
			});
			return;
		}
		const { base64Data, mimeType } = req.body;
		if (!base64Data) {
			res.status(400).json({
				status: "Error!",
				message: "No file data provided."
			});
			return;
		}
		res.status(501).json({
			status: "Error!",
			message: "Image OCR extraction is not yet available. Please use a spreadsheet (.csv or .xlsx) with Name, Email, and ID Number columns."
		});
	} catch (error) {
		res.status(500).json({
			status: "Error!",
			message: `Server error: ${error}`
		});
	}
};
init_user();
const protect = async (req, res, next) => {
	let token;
	if (req.cookies && req.cookies.jwt) token = req.cookies.jwt;
	if (!token && req.headers.authorization) {
		const authHeader = req.headers.authorization;
		if (authHeader.startsWith("Bearer ")) token = authHeader.slice(7);
	}
	if (token) try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = await user_default$1.findById(decoded.userId).select("-password").populate("studentClasses", "_id name").populate("teacherSubject", "_id name code").populate("parentStudents", "_id name email idNumber role studentClasses");
		next();
	} catch (error) {
		console.log(error);
		return res.status(401).json({ message: "Not authorized, token failed" });
	}
	else return res.status(401).json({ message: "Not authorized, no token" });
};
const normalizeRole = (role) => String(role ?? "").trim().toLowerCase().replace(/[\s._-]+/g, "");
const authorize = (roles) => {
	const allowedRoles = roles.map((role) => normalizeRole(role));
	return (req, res, next) => {
		if (!req.user) return res.status(401).json({ message: `Not authorized, no user found!` });
		const userRole$1 = normalizeRole(req.user.role);
		if (!allowedRoles.includes(userRole$1)) return res.status(403).json({ message: `Access denied. User role '${req.user.role}' not allowed to acces this route. Allowed roles: ${roles.join(", ")}` });
		next();
	};
};
var userRoutes = express.Router();
userRoutes.post("/register", protect, authorize(["admin"]), registerUser);
userRoutes.get("/public/is-first", isFirstUser);
userRoutes.post("/public/register", registerPublic);
userRoutes.post("/forgot-password", requestPasswordReset);
userRoutes.post("/reset-password", resetPassword);
userRoutes.post("/login", login);
userRoutes.post("/logout", logoutUser);
userRoutes.get("/profile", protect, getUserProfile);
userRoutes.get("/", protect, authorize([
	"admin",
	"teacher",
	"parent",
	"student",
	"unitconsultant"
]), getUsers);
userRoutes.post("/:id/approve", protect, authorize(["admin"]), approvePendingUser);
userRoutes.get("/:id", protect, authorize([
	"admin",
	"teacher",
	"parent",
	"unitconsultant"
]), getUserById);
userRoutes.patch("/update/:id", protect, updateUser);
userRoutes.put("/update/:id", protect, updateUser);
userRoutes.delete("/delete/:id", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant"
]), deleteUser);
userRoutes.post("/bulk-upload", protect, authorize(["admin"]), bulkUploadUsers);
userRoutes.post("/bulk-upload/extract-pdf", protect, authorize(["admin"]), extractFromPDF);
userRoutes.post("/bulk-upload/extract-image", protect, authorize(["admin"]), extractFromImage);
var user_default = userRoutes;
init_activitieslog$1();
init_user();
const getAllActivities = async (req, res) => {
	try {
		const page = Number(req.query.page) || 1;
		const limit = Number(req.query.limit) || 20;
		const skip = (page - 1) * limit;
		const role = req.query.role;
		const search = req.query.search;
		const filter = {};
		if (role && role !== "all") filter["user.role"] = role;
		if (search) filter.$or = [
			{ "user.name": {
				$regex: search,
				$options: "i"
			} },
			{ action: {
				$regex: search,
				$options: "i"
			} },
			{ details: {
				$regex: search,
				$options: "i"
			} }
		];
		const count = await activitieslog_default$1.countDocuments(filter);
		const logs = await activitieslog_default$1.find(filter).populate("user", "name email role").sort({ createdAt: -1 }).skip(skip).limit(limit);
		res.json({
			logs,
			page,
			pages: Math.ceil(count / limit),
			total: count
		});
	} catch (error) {
		res.status(500).json({
			message: `Server error`,
			error
		});
	}
};
const getRoleStats = async (req, res) => {
	try {
		const active = await user_default$1.aggregate([{ $match: { isActive: true } }, { $group: {
			_id: "$role",
			count: { $sum: 1 }
		} }]);
		const inactive = await user_default$1.aggregate([{ $match: { isActive: false } }, { $group: {
			_id: "$role",
			count: { $sum: 1 }
		} }]);
		const roleMap = {};
		const ensureRole = (r) => {
			if (!roleMap[r]) roleMap[r] = {
				role: r,
				active: 0,
				inactive: 0
			};
		};
		active.forEach((a) => {
			ensureRole(a._id);
			roleMap[a._id].active = a.count;
		});
		inactive.forEach((a) => {
			ensureRole(a._id);
			roleMap[a._id].inactive = a.count;
		});
		[
			"admin",
			"teacher",
			"student",
			"parent",
			"unitconsultant",
			"unitresident"
		].forEach((r) => ensureRole(r));
		const stats = Object.values(roleMap);
		res.json(stats);
	} catch (error) {
		res.status(500).json({
			message: `Server error`,
			error
		});
	}
};
const getWeeklyActivityCounts = async (req, res) => {
	try {
		const weeks = Number(req.query.weeks) || 8;
		const end = /* @__PURE__ */ new Date();
		const start = new Date(end);
		start.setDate(end.getDate() - weeks * 7);
		const results = await activitieslog_default$1.aggregate([
			{ $match: { createdAt: {
				$gte: start,
				$lte: end
			} } },
			{ $lookup: {
				from: "users",
				localField: "user",
				foreignField: "_id",
				as: "user"
			} },
			{ $unwind: "$user" },
			{ $match: { "user.role": "student" } },
			{ $addFields: { actionType: { $switch: {
				branches: [{
					case: { $regexMatch: {
						input: "$action",
						regex: /attendance/i
					} },
					then: "attendance"
				}, {
					case: { $regexMatch: {
						input: "$action",
						regex: /rotation|clinical/i
					} },
					then: "rotation"
				}],
				default: "other"
			} } } },
			{ $group: {
				_id: {
					week: { $dateTrunc: {
						date: "$createdAt",
						unit: "week"
					} },
					type: "$actionType"
				},
				count: { $sum: 1 }
			} },
			{ $sort: { "_id.week": 1 } }
		]);
		const seriesWeeks = [];
		const curr = new Date(start);
		while (curr <= end) {
			seriesWeeks.push(new Date(curr));
			curr.setDate(curr.getDate() + 7);
		}
		const map = /* @__PURE__ */ new Map();
		results.forEach((r) => {
			const wk = new Date(r._id.week).toISOString();
			if (!map.has(wk)) map.set(wk, {
				attendance: 0,
				rotation: 0,
				other: 0
			});
			const entry = map.get(wk);
			if (r._id.type === "attendance") entry.attendance = r.count;
			else if (r._id.type === "rotation") entry.rotation = r.count;
			else entry.other = r.count;
		});
		const out = seriesWeeks.map((d) => {
			const wk = d.toISOString();
			return {
				weekStart: wk,
				...map.get(wk) ?? {
					attendance: 0,
					rotation: 0,
					other: 0
				}
			};
		});
		res.json({ weeks: out });
	} catch (error) {
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
var LogsRouter = express.Router();
LogsRouter.get("/", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), getAllActivities);
LogsRouter.get("/role-stats", protect, authorize(["admin"]), getRoleStats);
LogsRouter.get("/weekly", protect, authorize(["admin"]), getWeeklyActivityCounts);
var activitieslog_default = LogsRouter;
var academicYearSchema = new Schema({
	name: {
		type: String,
		required: true
	},
	fromYear: {
		type: Date,
		required: true
	},
	toYear: {
		type: Date,
		required: true
	},
	isCurrent: {
		type: Boolean,
		default: false
	},
	clockStartDate: {
		type: Date,
		default: null
	},
	clockIsPaused: {
		type: Boolean,
		default: false
	},
	clockPausedAt: {
		type: Date,
		default: null
	},
	clockPhase: {
		type: String,
		default: null
	},
	classClockData: {
		type: Schema.Types.Mixed,
		default: {}
	}
}, { timestamps: true });
academicYearSchema.index({ name: 1 }, { unique: true });
var academicYear_default$1 = mongoose.model("AcademicYear", academicYearSchema);
init_activitieslog();
const createAcademicYear = async (req, res) => {
	try {
		const { name, fromYear, toYear, isCurrent, clockPhase } = req.body;
		if (await academicYear_default$1.findOne({
			fromYear,
			toYear
		})) {
			res.status(400).json({ message: "Academic Year already exists!" });
			return;
		}
		if (isCurrent) await academicYear_default$1.updateMany({ _id: { $ne: null } }, { isCurrent: false });
		const academicYear = await academicYear_default$1.create({
			name,
			fromYear,
			toYear,
			isCurrent: isCurrent || false,
			clockStartDate: fromYear,
			clockIsPaused: false,
			clockPausedAt: null,
			clockPhase: clockPhase ?? null
		});
		await logActivity({
			userId: req.user._id,
			action: `Created academic year ${name}, with ID: ${academicYear._id} and it's ${isCurrent ? "current" : "not current"}`
		});
		res.status(201).json(academicYear);
	} catch (error) {
		res.status(500).json({
			message: "Server Error",
			error: `${error}`
		});
	}
};
const getAllAcademicYears = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const search = req.query.search;
		const query = {};
		if (search) query.name = {
			$regex: search,
			$options: "i"
		};
		const [total, years] = await Promise.all([academicYear_default$1.countDocuments(query), academicYear_default$1.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)]);
		res.json({
			years,
			pagination: {
				total,
				page,
				pages: Math.ceil(total / limit)
			}
		});
	} catch (error) {
		res.status(500).json({
			message: `Server error`,
			error
		});
	}
};
const getCurrentAcademicYear = async (req, res) => {
	try {
		const currentYear = await academicYear_default$1.findOne({ isCurrent: true });
		if (!currentYear) {
			res.status(200).json({
				year: null,
				message: "No current academic year set"
			});
			return;
		}
		res.status(200).json({ year: currentYear });
	} catch (error) {
		res.status(500).json({
			message: "Server Error",
			error: `${error}`
		});
	}
};
const updateAcademicYear = async (req, res) => {
	try {
		const { isCurrent } = req.body;
		if (isCurrent) await academicYear_default$1.updateMany({ _id: { $ne: req.params.id } }, { isCurrent: false });
		const updatedYear = await academicYear_default$1.findByIdAndUpdate(req.params.id, req.body, {
			returnDocument: "after",
			runValidators: true
		});
		await logActivity({
			userId: req.user._id,
			action: `Updated academic year ${updatedYear?.name} with ID: ${updatedYear?._id} and it's ${isCurrent ? "current" : "not current"}`
		});
		if (!updatedYear) res.status(404).json({ message: "Academic Year not found!" });
		res.status(200).json(updatedYear);
	} catch (error) {
		res.status(500).json({
			message: "Server Error",
			error: `${error}`
		});
	}
};
const deleteAcedemicYear = async (req, res) => {
	try {
		const year = await academicYear_default$1.findById(req.params.id);
		if (!year) {
			res.status(404).json({ message: "Academic Year not found!" });
			return;
		}
		if (year.isCurrent) {
			res.status(404).json({ message: "Cannot delete the current active academic year!" });
			return;
		}
		await year.deleteOne();
		await logActivity({
			userId: req.user._id,
			action: `Deleted academic year ${year.name} with ID: ${year._id} and it's ${year.isCurrent ? "current" : "not current"}`
		});
	} catch (error) {
		res.status(500).json({
			message: "Server Error",
			error: `${error}`
		});
	}
};
var academicYearRouter = express.Router();
academicYearRouter.route("/create").post(protect, authorize(["admin"]), createAcademicYear);
academicYearRouter.route("/").get(protect, authorize([
	"admin",
	"teacher",
	"parent",
	"student",
	"unitconsultant",
	"unitresident"
]), getAllAcademicYears);
academicYearRouter.route("/current").get(getCurrentAcademicYear);
academicYearRouter.route("/update/:id").patch(protect, authorize(["admin"]), updateAcademicYear);
academicYearRouter.route("/delete/:id").delete(protect, authorize(["admin"]), deleteAcedemicYear);
var academicYear_default = academicYearRouter;
const LevelPhaseData = {};
const resolveClassLevelFromName = (className) => {
	const normalized = (className ?? "").toLowerCase();
	if (normalized.includes("500") || normalized.includes("fifth")) return "fifth";
	if (normalized.includes("400") || normalized.includes("fourth")) return "fourth";
	if (normalized.includes("300") || normalized.includes("third")) return "third";
	if (normalized.includes("600") || normalized.includes("sixth")) return "sixth";
	if (normalized.includes("final")) return "final";
	return null;
};
const buildPhaseConfigForClassLevel = (classLevel) => {
	if (!classLevel) return {};
	const phaseData = LevelPhaseData[String(classLevel)] ?? {};
	return Object.entries(phaseData).filter(([key]) => key.startsWith("phase")).reduce((acc, [key, value]) => {
		const phaseValue = value;
		acc[key] = {
			name: String(phaseValue?.name ?? ""),
			duration: Number(phaseValue?.duration ?? 0),
			postingType: phaseValue?.postingType ?? null,
			postingId: phaseValue?.postingId ?? null
		};
		return acc;
	}, {});
};
var AcademicClockSchema = new Schema({
	academicYear: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "AcademicYear",
		required: true
	},
	classId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Class",
		required: true
	},
	classLevel: {
		type: String,
		enum: [
			"final",
			"sixth",
			"fifth",
			"fourth",
			"third"
		],
		default: null
	},
	clockStartDate: {
		type: Date,
		default: null
	},
	clockIsPaused: {
		type: Boolean,
		default: false
	},
	clockPausedAt: {
		type: Date,
		default: null
	},
	clockPhase: {
		type: String,
		default: null
	},
	phaseConfig: {
		type: Schema.Types.Mixed,
		default: {}
	}
}, { timestamps: true });
var academicClock_default$1 = mongoose.model("AcademicClock", AcademicClockSchema);
new mongoose.Types.ObjectId("64f8e1c2f1a2b3c4d5e6f7a9"), new mongoose.Types.ObjectId("64f8e1c2f1a2b3c4d5e6f7a8"), new Date((/* @__PURE__ */ new Date()).setMonth((/* @__PURE__ */ new Date()).getMonth() + 4));
init_classes();
init_activitieslog();
const createAcademicClock = async (req, res) => {
	try {
		const { academicYearId, classId, clockStartDate, clockIsPaused, clockPausedAt, clockPhase, classLevel, phaseConfig } = req.body;
		if (!academicYearId || !classId) {
			res.status(400).json({ message: "academicYearId and classId are required" });
			return;
		}
		const [academicYear, classDoc] = await Promise.all([academicYear_default$1.findById(academicYearId), classes_default$1.findById(classId)]);
		if (!academicYear) {
			res.status(404).json({ message: "Academic year not found" });
			return;
		}
		if (!classDoc) {
			res.status(404).json({ message: "Class not found" });
			return;
		}
		if (await academicClock_default$1.findOne({
			academicYear: academicYearId,
			classId
		})) {
			res.status(409).json({ message: "Academic clock already exists for this class and academic year" });
			return;
		}
		const resolvedClassLevel = classLevel ?? resolveClassLevelFromName(classDoc?.name ?? "");
		const useTemplatePhaseConfig = Boolean(req.body?.useTemplatePhaseConfig);
		const resolvedPhaseConfig = phaseConfig ?? (useTemplatePhaseConfig ? buildPhaseConfigForClassLevel(resolvedClassLevel) : {});
		const fallbackStartDate = clockStartDate ?? academicYear?.fromYear ?? null;
		const academicClock = await academicClock_default$1.create({
			academicYear: academicYearId,
			classId,
			clockStartDate: fallbackStartDate,
			clockIsPaused: clockIsPaused ?? false,
			clockPausedAt: clockPausedAt ?? null,
			clockPhase: clockPhase ?? null,
			classLevel: resolvedClassLevel ?? null,
			phaseConfig: resolvedPhaseConfig
		});
		await academicYear_default$1.findByIdAndUpdate(academicYearId, { $set: { [`classClockData.${String(classId)}`]: {
			classId,
			classLevel: academicClock.classLevel ?? null,
			clockStartDate: academicClock.clockStartDate,
			clockIsPaused: academicClock.clockIsPaused,
			clockPausedAt: academicClock.clockPausedAt,
			clockPhase: academicClock.clockPhase,
			phaseConfig: academicClock.phaseConfig
		} } }, { returnDocument: "after" });
		await logActivity({
			userId: req.user?._id,
			action: `Created academic clock for class ${classId} on academic year ${academicYear.name}`
		});
		res.status(201).json(academicClock);
	} catch (error) {
		res.status(500).json({
			message: "Server Error",
			error: `${error}`
		});
	}
};
const getAcademicClocks = async (req, res) => {
	try {
		const query = {};
		if (req.query.academicYearId) query.academicYear = req.query.academicYearId;
		if (req.query.classId) query.classId = req.query.classId;
		const clocks = await academicClock_default$1.find(query).populate("academicYear", "name fromYear toYear isCurrent").populate("classId", "name academicYear");
		res.json({ clocks });
	} catch (error) {
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const getAcademicClockById = async (req, res) => {
	try {
		const academicClock = await academicClock_default$1.findById(req.params.id).populate("academicYear", "name fromYear toYear isCurrent").populate("classId", "name academicYear");
		if (!academicClock) {
			res.status(404).json({ message: "Academic clock not found" });
			return;
		}
		res.json(academicClock);
	} catch (error) {
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const updateAcademicClock = async (req, res) => {
	try {
		const allowedUpdates = [
			"clockStartDate",
			"clockIsPaused",
			"clockPausedAt",
			"clockPhase",
			"classLevel",
			"phaseConfig",
			"academicYear",
			"classId"
		];
		const updateData = {};
		allowedUpdates.forEach((field) => {
			if (field in req.body) updateData[field] = req.body[field];
		});
		if (Object.prototype.hasOwnProperty.call(req.body, "clockStartDate") && req.body.clockStartDate == null) updateData.clockStartDate = null;
		if (Object.prototype.hasOwnProperty.call(req.body, "clockPausedAt") && req.body.clockPausedAt == null) updateData.clockPausedAt = null;
		const academicClock = await academicClock_default$1.findById(req.params.id);
		if (!academicClock) {
			res.status(404).json({ message: "Academic clock not found" });
			return;
		}
		const classDoc = await classes_default$1.findById(academicClock.classId);
		const resolvedClassLevel = typeof req.body.classLevel === "string" && req.body.classLevel ? req.body.classLevel : academicClock.classLevel ?? resolveClassLevelFromName(classDoc?.name ?? "");
		if (resolvedClassLevel && !Object.prototype.hasOwnProperty.call(req.body, "phaseConfig")) updateData.phaseConfig = req.body?.useTemplatePhaseConfig ? buildPhaseConfigForClassLevel(resolvedClassLevel) : {};
		if (resolvedClassLevel && !Object.prototype.hasOwnProperty.call(req.body, "classLevel")) updateData.classLevel = resolvedClassLevel;
		if (updateData.clockIsPaused === false && !Object.prototype.hasOwnProperty.call(req.body, "clockPausedAt")) updateData.clockPausedAt = null;
		const updatedClock = await academicClock_default$1.findByIdAndUpdate(req.params.id, updateData, {
			returnDocument: "after",
			runValidators: true
		});
		if (!updatedClock) {
			res.status(404).json({ message: "Academic clock not found" });
			return;
		}
		await academicYear_default$1.findByIdAndUpdate(updatedClock.academicYear, { $set: { [`classClockData.${String(updatedClock.classId)}`]: {
			classId: updatedClock.classId,
			classLevel: updatedClock.classLevel ?? null,
			clockStartDate: updatedClock.clockStartDate,
			clockIsPaused: updatedClock.clockIsPaused,
			clockPausedAt: updatedClock.clockPausedAt,
			clockPhase: updatedClock.clockPhase,
			phaseConfig: updatedClock.phaseConfig
		} } }, { returnDocument: "after" });
		await logActivity({
			userId: req.user?._id,
			action: `Updated academic clock ${updatedClock._id}`
		});
		res.status(200).json(updatedClock);
	} catch (error) {
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const deleteAcademicClock = async (req, res) => {
	try {
		const academicClock = await academicClock_default$1.findById(req.params.id);
		if (!academicClock) {
			res.status(404).json({ message: "Academic clock not found" });
			return;
		}
		await academicYear_default$1.findByIdAndUpdate(academicClock.academicYear, { $unset: { [`classClockData.${String(academicClock.classId)}`]: "" } }, { returnDocument: "after" });
		await academicClock.deleteOne();
		await logActivity({
			userId: req.user?._id,
			action: `Deleted academic clock ${academicClock._id}`
		});
		res.status(200).json({ message: "Academic clock deleted" });
	} catch (error) {
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const deleteAcademicClockByClass = async (req, res) => {
	try {
		const academicYearId = req.query.academicYearId;
		const classId = req.query.classId;
		if (!academicYearId || !classId) {
			res.status(400).json({ message: "academicYearId and classId are required" });
			return;
		}
		const academicClock = await academicClock_default$1.findOne({
			academicYear: academicYearId,
			classId
		});
		if (!academicClock) {
			res.status(404).json({ message: "Academic clock not found for this class" });
			return;
		}
		await academicYear_default$1.findByIdAndUpdate(academicYearId, { $unset: { [`classClockData.${String(classId)}`]: "" } }, { returnDocument: "after" });
		await academicClock.deleteOne();
		await logActivity({
			userId: req.user?._id,
			action: `Deleted academic clock for class ${classId}`
		});
		res.status(200).json({ message: "Academic clock deleted for class" });
	} catch (error) {
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
init_notification();
var DUPLICATE_WINDOW_MS$1 = 300 * 1e3;
const formatNotificationForRole = (notification, role) => {
	const baseNotification = {
		...notification ?? {},
		title: notification?.title ?? "A new update is ready for you",
		message: notification?.message ?? "A new update is available for your student account.",
		type: notification?.type ?? "info"
	};
	if (role !== "student") return baseNotification;
	const combinedText = `${baseNotification.title} ${baseNotification.message}`.toLowerCase();
	if (baseNotification.type === "attendance" || combinedText.includes("attendance")) return {
		...baseNotification,
		title: "Your attendance update is ready",
		message: baseNotification.message?.trim() ? `Your attendance record has been updated: ${baseNotification.message}` : "Your attendance record has been updated. Please review it in your student portal.",
		type: "info"
	};
	if (baseNotification.type === "timetable" || combinedText.includes("timetable")) return {
		...baseNotification,
		title: "Your timetable has been updated",
		message: baseNotification.message?.trim() ? `Your timetable has been updated: ${baseNotification.message}` : "Your timetable has been updated. Please review it in your student portal.",
		type: "info"
	};
	if (combinedText.includes("class") || combinedText.includes("academic year") || combinedText.includes("academic-year")) return {
		...baseNotification,
		title: "Your class details have been updated",
		message: baseNotification.message?.trim() ? `Your class information has changed: ${baseNotification.message}` : "Your class information has changed. Please review the latest details.",
		type: "info"
	};
	if (combinedText.includes("assignment") || combinedText.includes("posting") || combinedText.includes("rotation")) return {
		...baseNotification,
		title: "A new update is ready for you",
		message: baseNotification.message?.trim() ? `There is a new update for your studies: ${baseNotification.message}` : "There is a new update for your studies. Please check your student portal.",
		type: "info"
	};
	return {
		...baseNotification,
		title: baseNotification.title?.trim() ? baseNotification.title : "A new update is ready for you",
		message: baseNotification.message?.trim() ? baseNotification.message : "A new update is available for your student account.",
		type: "info"
	};
};
const createNotificationIfUnique = async (payload) => {
	const now = /* @__PURE__ */ new Date();
	const duplicateSince = new Date(now.getTime() - DUPLICATE_WINDOW_MS$1);
	const search = {
		userId: payload.userId,
		title: payload.title,
		message: payload.message,
		type: payload.type ?? "system",
		createdAt: { $gte: duplicateSince }
	};
	const existing = await Notification.findOne(search);
	if (existing) return existing;
	return Notification.create({
		userId: payload.userId,
		role: payload.role,
		title: payload.title,
		message: payload.message,
		type: payload.type ?? "system",
		isRead: false,
		link: payload.link,
		metadata: payload.metadata,
		actorName: payload.actorName,
		actorRole: payload.actorRole
	});
};
init_user();
init_classes();
const completeAcademicClockByClass = async (req, res) => {
	try {
		const { academicYearId, classId } = req.body;
		if (!academicYearId || !classId) {
			res.status(400).json({ message: "academicYearId and classId are required" });
			return;
		}
		const year = await academicYear_default$1.findById(academicYearId);
		const className = (await classes_default$1.findById(classId).select("name"))?.name ?? classId;
		const executor = req.user;
		const actorName = executor?.name ?? executor?.email ?? "An administrator";
		const actorRole = executor?.role ?? "admin";
		const adminUsers = await user_default$1.find({
			role: "admin",
			isActive: true
		}).select("_id").lean();
		const clock = await academicClock_default$1.findOne({
			academicYear: academicYearId,
			classId
		});
		const isConfigured = Boolean(clock?.phaseConfig && (Array.isArray(clock.phaseConfig) ? clock.phaseConfig.length > 0 : Object.keys(clock.phaseConfig).length > 0));
		if (!clock || !isConfigured) {
			if (adminUsers.length > 0) await Promise.all(adminUsers.map((user) => createNotificationIfUnique({
				userId: user._id,
				role: "admin",
				title: "Academic Clock Not Configured",
				message: `${actorName} attempted to complete the academic clock for ${className} in ${year?.name ?? academicYearId}, but it has not been configured yet.`,
				type: "system",
				actorName,
				actorRole,
				metadata: {
					academicYearId,
					classId,
					reason: "not_configured"
				}
			})));
			return res.json({
				success: true,
				message: "Academic clock not configured"
			});
		}
		clock.clockIsPaused = true;
		if (!clock.clockPausedAt) clock.clockPausedAt = /* @__PURE__ */ new Date();
		await clock.save();
		if (adminUsers.length > 0) await Promise.all(adminUsers.map((user) => createNotificationIfUnique({
			userId: user._id,
			role: "admin",
			title: "Academic Clock Completed",
			message: `${actorName} completed the academic clock for ${className} in ${year?.name ?? academicYearId}.`,
			type: "system",
			actorName,
			actorRole,
			metadata: {
				academicYearId,
				classId
			}
		})));
		res.json({ success: true });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to complete clock" });
	}
};
var academicClockRouter = express$1.Router();
academicClockRouter.route("/create").post(protect, authorize(["admin"]), createAcademicClock);
academicClockRouter.route("/").get(protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident",
	"student",
	"parent"
]), getAcademicClocks);
academicClockRouter.route("/:id").get(protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident",
	"student",
	"parent"
]), getAcademicClockById);
academicClockRouter.route("/update/:id").patch(protect, authorize(["admin"]), updateAcademicClock);
academicClockRouter.route("/delete/by-class").delete(protect, authorize(["admin"]), deleteAcademicClockByClass);
academicClockRouter.route("/complete/by-class").post(protect, authorize(["admin"]), completeAcademicClockByClass);
academicClockRouter.route("/delete/:id").delete(protect, authorize(["admin"]), deleteAcademicClock);
var academicClock_default = academicClockRouter;
init_classes();
init_user();
init_activitieslog();
const getClassById = async (req, res) => {
	try {
		const cls = await classes_default$1.findById(req.params.id).populate("academicYear", "name").populate("classTeacher", "name email").populate("courses", "name code subjects.name subjects.code subjects.subjectID subjects.lecturer").select("name academicYear classTeacher courses");
		if (!cls) return res.status(404).json({ message: "Class not found" });
		res.json(cls);
	} catch (error) {
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const getStudentsForClass = async (req, res) => {
	try {
		const classId = req.params.id;
		const students = await user_default$1.find({
			studentClasses: classId,
			role: "student"
		}).select("name email idNumber studentClasses");
		res.json({ students });
	} catch (error) {
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const createClass = async (req, res) => {
	try {
		const { name, academicYear, classTeacher, capacity, courses, students } = req.body;
		if (await classes_default$1.findOne({
			name,
			academicYear
		})) return res.status(400).json({ message: `Class with the same name already exists for the specified academic year!` });
		const studentIds = Array.isArray(students) ? students : [];
		const newClass = await classes_default$1.create({
			name,
			academicYear,
			classTeacher,
			capacity,
			courses: Array.isArray(courses) ? courses : [],
			students: studentIds
		});
		if (studentIds.length > 0) await user_default$1.updateMany({
			_id: { $in: studentIds },
			role: "student"
		}, { $set: { studentClasses: newClass._id } });
		await logActivity({
			userId: req.user?._id,
			action: `Created new class: ${newClass.name}`
		});
		res.status(201).json({ newClass });
	} catch (error) {
		res.status(500).json({
			message: `Server error,`,
			error: `${error}`
		});
	}
};
const getAllClasses = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const search = req.query.search;
		const query = {};
		if (search) query.name = {
			$regex: search,
			$options: "i"
		};
		const [total, classes] = await Promise.all([classes_default$1.countDocuments(query), classes_default$1.find(query).populate("academicYear", "name").populate("classTeacher", "name email").populate("courses", "name code subjects._id subjects.subjectUID subjects._id subjects.subjectUID subjects.name subjects.code subjects.subjectID subjects.lecturer").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)]);
		res.json({
			classes,
			pagination: {
				total,
				page,
				pages: Math.ceil(total / limit)
			}
		});
	} catch (error) {
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const updateClass = async (req, res) => {
	try {
		const classId = req.params.id;
		const { name, academicYear, classTeacher, capacity, courses, students } = req.body;
		if (await classes_default$1.findOne({
			name,
			academicYear,
			_id: { $ne: classId }
		})) return res.status(400).json({ message: "Class with this name already exists for the specified academic year" });
		const currentClass = await classes_default$1.findById(classId);
		if (!currentClass) return res.status(404).json({ message: "Class not found!" });
		const oldStudentIds = (currentClass.students ?? []).map(String);
		const newStudentIds = students === void 0 ? oldStudentIds : Array.isArray(students) ? students.map(String) : [];
		const addedStudentIds = newStudentIds.filter((id) => !oldStudentIds.includes(id));
		const removedStudentIds = oldStudentIds.filter((id) => !newStudentIds.includes(id));
		const updateData = {};
		if (name !== void 0) updateData.name = name;
		if (academicYear !== void 0) updateData.academicYear = academicYear;
		if (classTeacher !== void 0) updateData.classTeacher = classTeacher;
		if (capacity !== void 0) updateData.capacity = capacity;
		if (courses !== void 0) updateData.courses = Array.isArray(courses) ? courses : [];
		if (students !== void 0) updateData.students = newStudentIds;
		const updatedClass = await classes_default$1.findByIdAndUpdate(classId, updateData, {
			returnDocument: "after",
			runValidators: true
		});
		if (!updatedClass) return res.status(404).json({ message: "Class not found!" });
		if (addedStudentIds.length > 0) await user_default$1.updateMany({
			_id: { $in: addedStudentIds },
			role: "student"
		}, { $set: { studentClasses: updatedClass._id } });
		if (removedStudentIds.length > 0) await user_default$1.updateMany({
			_id: { $in: removedStudentIds },
			role: "student"
		}, { $set: { studentClasses: null } });
		await logActivity({
			userId: req.user.id,
			action: `Updated class: ${updatedClass?.name}`
		});
		res.status(200).json(updatedClass);
	} catch (error) {
		res.status(500).json({
			message: `Server error`,
			error: `${error}`
		});
	}
};
const deleteClass = async (req, res) => {
	try {
		const deletedClass = await classes_default$1.findByIdAndDelete(req.params.id);
		const userId = req.user._id;
		await logActivity({
			userId,
			action: `Deleted ${deletedClass?.name} Class`
		});
		if (!deletedClass) return res.status(404).json({ message: `Class not found! - ${userId} Is ${deletedClass}.` });
		res.json({ message: `Class removed!` });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
const removeCourseFromClass = async (req, res) => {
	try {
		const { classId, courseId } = req.params;
		const cls = await classes_default$1.findById(classId);
		if (!cls) return res.status(404).json({ message: "Class not found" });
		const beforeCount = (cls.courses ?? []).length;
		cls.courses = (cls.courses ?? []).filter((c) => String(c) !== String(courseId));
		if (beforeCount === (cls.courses ?? []).length) return res.status(404).json({ message: "Course not found in this class" });
		await cls.save();
		const userId = req.user?._id;
		if (userId) await logActivity({
			userId,
			action: `Removed course ${courseId} from class ${cls.name}`
		});
		return res.json({
			message: "Course removed from class",
			classId: cls._id,
			courses: cls.courses
		});
	} catch (error) {
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
var classRouter = express.Router();
classRouter.post("/create", protect, authorize(["admin"]), createClass);
classRouter.get("/", protect, authorize([
	"admin",
	"teacher",
	"parent",
	"student",
	"unitconsultant",
	"unitresident"
]), getAllClasses);
classRouter.get("/:id", protect, authorize([
	"admin",
	"teacher",
	"student",
	"parent",
	"unitconsultant",
	"unitresident"
]), getClassById);
classRouter.get("/:id/students", protect, authorize([
	"admin",
	"teacher",
	"student",
	"parent",
	"unitconsultant",
	"unitresident"
]), getStudentsForClass);
classRouter.patch("/update/:id", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), updateClass);
classRouter.delete("/delete/:id", protect, authorize(["admin"]), deleteClass);
classRouter.delete("/:classId/courses/:courseId", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), removeCourseFromClass);
var classes_default = classRouter;
var StudentClassMembershipSchema = new Schema({
	classID: {
		type: Schema.Types.ObjectId,
		ref: "Class",
		required: true
	},
	students: [{
		type: Schema.Types.ObjectId,
		ref: "User",
		default: []
	}]
}, { _id: false });
var CourseSubjectSchema = new Schema({
	subjectUID: {
		type: String,
		required: true,
		trim: true,
		default: () => new mongoose.Types.ObjectId().toHexString()
	},
	name: {
		type: String,
		required: true,
		trim: true
	},
	code: {
		type: String,
		trim: true,
		default: null
	},
	subjectID: {
		type: String,
		required: true,
		trim: true
	},
	date: {
		type: Date,
		default: null
	},
	startTime: {
		type: String,
		trim: true,
		default: null
	},
	endTime: {
		type: String,
		trim: true,
		default: null
	},
	unit: {
		type: Schema.Types.ObjectId,
		ref: "Unit",
		required: false,
		default: null
	},
	lecturer: [{
		type: Schema.Types.ObjectId,
		ref: "User",
		default: []
	}],
	isActive: {
		type: Boolean,
		default: true
	},
	semester: {
		type: String,
		trim: true,
		default: null
	},
	students: [{
		type: Schema.Types.ObjectId,
		ref: "User",
		default: []
	}]
}, { timestamps: true });
var CourseSchema = new Schema({
	name: {
		type: String,
		required: true,
		trim: true
	},
	code: {
		type: String,
		required: true,
		unique: true
	},
	courseID: {
		type: String,
		required: true,
		trim: true
	},
	semester: {
		type: String,
		required: false,
		trim: true,
		default: null
	},
	year: {
		type: String,
		required: false,
		trim: true,
		default: null
	},
	department: {
		type: Schema.Types.ObjectId,
		ref: "Department",
		required: true,
		index: true
	},
	unit: {
		type: Schema.Types.ObjectId,
		ref: "Unit",
		required: false,
		index: true,
		default: null
	},
	lecturer: [{
		type: Schema.Types.ObjectId,
		ref: "User",
		default: []
	}],
	isActive: {
		type: Boolean,
		default: true
	},
	studentClasses: {
		type: [StudentClassMembershipSchema],
		default: []
	},
	subjects: {
		type: [CourseSubjectSchema],
		default: []
	},
	academicYear: {
		type: Schema.Types.ObjectId,
		ref: "AcademicYear",
		required: false,
		index: true
	}
}, { timestamps: true });
CourseSchema.index({
	courseID: 1,
	academicYear: 1,
	department: 1
}, { unique: true });
var courses_default$1 = mongoose.model("Course", CourseSchema);
var UnitSchema = new Schema({
	name: {
		type: String,
		required: [true, "Unit name required"],
		trim: true
	},
	code: {
		type: String,
		required: [true, "Unit code required"],
		trim: true
	},
	unitID: {
		type: String,
		required: [true, "Unit ID required"],
		trim: true
	},
	department: {
		type: Schema.Types.ObjectId,
		ref: "Department",
		required: true
	},
	supervisor: {
		type: Schema.Types.ObjectId,
		ref: "User",
		default: null
	},
	courses: [{
		type: Schema.Types.ObjectId,
		ref: "Course"
	}]
}, { timestamps: true });
UnitSchema.index({
	name: 1,
	unitID: 1
}, { unique: true });
var units_default = mongoose.model("Unit", UnitSchema);
var subjectSchema = new Schema({
	name: {
		type: String,
		required: true,
		trim: true
	},
	code: {
		type: String,
		trim: true,
		default: null
	},
	courseID: {
		type: String,
		required: true,
		trim: true
	},
	lecturer: [{
		type: Schema.Types.ObjectId,
		ref: "User"
	}],
	isActive: {
		type: Boolean,
		default: true
	}
}, { timestamps: true });
subjectSchema.index({
	name: 1,
	courseID: 1
}, { unique: true });
var subjects_default = mongoose.model("Subjects", subjectSchema);
init_activitieslog();
init_user();
init_classes();
var isObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(value);
var findOrCreateDepartment = async (identifier) => {
	if (!identifier) return null;
	let departmentDoc = null;
	if (isObjectId(identifier)) departmentDoc = await departments_default.findById(identifier);
	if (!departmentDoc) departmentDoc = await departments_default.findOne({ code: identifier });
	if (!departmentDoc) departmentDoc = await departments_default.findOne({ departmentID: identifier });
	if (!departmentDoc) {
		const constantsDept = getAllDepartments().find((d) => d.code === identifier || d.departmentID === identifier || d.name === identifier);
		if (constantsDept) departmentDoc = await departments_default.findOneAndUpdate({ code: constantsDept.code }, {
			name: constantsDept.name,
			code: constantsDept.code,
			departmentID: constantsDept.departmentID
		}, {
			upsert: true,
			returnDocument: "after"
		});
	}
	return departmentDoc;
};
var findFaculty = async (identifier) => {
	if (!identifier) return null;
	let facultyDoc = null;
	const trimmed = String(identifier).trim();
	if (!trimmed) return null;
	if (isObjectId(trimmed)) facultyDoc = await faculty_default.findById(trimmed);
	if (!facultyDoc) facultyDoc = await faculty_default.findOne({ code: trimmed });
	if (!facultyDoc) facultyDoc = await faculty_default.findOne({ facultyID: trimmed });
	if (!facultyDoc) facultyDoc = await faculty_default.findOne({ name: trimmed });
	return facultyDoc;
};
var normalizeCourseCode = (departmentCode, code) => {
	const raw = String(code ?? "").trim().toUpperCase().replace(/\s+/g, " ");
	const numberPart = raw.replace(/^[A-Z]{3}\s*/i, "").trim();
	if (!numberPart) return `${departmentCode} 000`;
	if ((/* @__PURE__ */ new RegExp(`^${departmentCode}\\s\\d{3}$`)).test(raw)) return raw;
	return `${departmentCode} ${numberPart.padStart(3, "0")}`.trim();
};
var isValidCourseCode = (departmentCode, code) => {
	const raw = String(code ?? "").trim().toUpperCase();
	return (/* @__PURE__ */ new RegExp(`^${departmentCode}\\s\\d{3}$`)).test(raw);
};
var deriveUnitCode = (name) => String(name).trim().split(/\s+/).map((segment) => segment.charAt(0)).join("").slice(0, 4).toUpperCase() || "UNIT";
var normalizeSubjectDateValue = (value) => {
	if (value === null || value === void 0 || String(value).trim() === "") return null;
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
	const raw = String(value).trim();
	if (!raw) return null;
	const slashMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
	if (slashMatch) {
		const [, part1, part2, part3] = slashMatch;
		const day = Number(part1);
		const month = Number(part2);
		let year = Number(part3);
		if (year < 100) year += year > 50 ? 1900 : 2e3;
		const candidate = new Date(year, month - 1, day);
		if (!Number.isNaN(candidate.getTime()) && candidate.getDate() === day) return candidate;
	}
	const parsed = new Date(raw);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};
var normalizeSubjectTimeValue = (value) => {
	if (value === null || value === void 0) return null;
	const raw = String(value).trim();
	if (!raw) return null;
	const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
	if (!match) return null;
	let hour = Number(match[1]);
	const minutes = Number(match[2] ?? "0");
	const period = String(match[3] ?? "").toLowerCase();
	if (hour < 0 || hour > 23 || minutes < 0 || minutes > 59) return null;
	if (period === "pm" && hour < 12) hour += 12;
	if (period === "am" && hour === 12) hour = 0;
	return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};
var normalizeSubjectTimeWindow = (startTime, endTime) => {
	const normalizedStart = normalizeSubjectTimeValue(startTime);
	const normalizedEnd = normalizeSubjectTimeValue(endTime);
	if (normalizedStart && normalizedEnd) return {
		startTime: normalizedStart,
		endTime: normalizedEnd
	};
	if (normalizedStart) return {
		startTime: normalizedStart,
		endTime: null
	};
	if (normalizedEnd) return {
		startTime: null,
		endTime: normalizedEnd
	};
	return {
		startTime: null,
		endTime: null
	};
};
var getNormalizedDepartmentValue = (value) => {
	if (!value) return "";
	if (typeof value === "string") return value.trim().toLowerCase();
	if (typeof value === "object") {
		const obj = value;
		return String(obj._id ?? obj.code ?? obj.departmentID ?? obj.name ?? "").trim().toLowerCase();
	}
	return "";
};
var isUserInDepartment = (user, departmentDoc) => {
	if (!user || !departmentDoc) return false;
	const userDept = getNormalizedDepartmentValue(user.department);
	return new Set([
		String(departmentDoc._id).trim().toLowerCase(),
		String(departmentDoc.code).trim().toLowerCase(),
		String(departmentDoc.departmentID).trim().toLowerCase(),
		String(departmentDoc.name).trim().toLowerCase()
	]).has(userDept);
};
var normalizeLecturerName = (value) => {
	return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
};
var generateSubjectUID = (subject) => {
	if (subject && typeof subject.subjectUID === "string" && subject.subjectUID.trim() !== "") return String(subject.subjectUID).trim();
	return new mongoose.Types.ObjectId().toHexString();
};
var normalizeSubjectNameValue = (value) => {
	return String(value ?? "").trim().normalize("NFC").replace(/\u00A0/g, " ").replace(/â|â|Ã¢ÂÂ|Ã¢ÂÂ|–|—/g, "-").replace(/â|â|Ã¢ÂÂ|Ã¢ÂÂ|“|”/g, "\"").replace(/â|â|Ã¢ÂÂ|Ã¢ÂÂ|‘|’/g, "'").replace(/\s+/g, " ").toLowerCase();
};
var normalizeSubjectText = (value) => {
	return String(value ?? "").normalize("NFC").replace(/\u00A0/g, " ").replace(/â|â|Ã¢ÂÂ|Ã¢ÂÂ|–|—/g, "-").replace(/â|â|Ã¢ÂÂ|Ã¢ÂÂ|“|”/g, "\"").replace(/â|â|Ã¢ÂÂ|Ã¢ÂÂ|‘|’/g, "'").replace(/\s+/g, " ").trim();
};
var normalizeSubjectCodeValue = (value) => String(value ?? "").trim().toLowerCase();
var generateSubjectCodeFromCourse = (courseCode, index) => {
	const courseCodeText = String(courseCode ?? "").trim().replace(/\s+/g, " ");
	const match = courseCodeText.match(/^(.*?)(\d+)$/);
	if (match) {
		const prefix = match[1].trim();
		const baseNumber = Number(match[2]);
		return `${prefix} ${String(baseNumber + index + 1).padStart(3, "0")}`.trim();
	}
	return `${courseCodeText} ${String(index + 1).padStart(3, "0")}`;
};
var normalizeClassIdValue = (value) => {
	if (!value) return void 0;
	if (typeof value === "string") return value;
	if (typeof value === "object") {
		if (typeof value._id === "string") return value._id;
		if (typeof value.id === "string") return value.id;
	}
};
var getClassCourseDocuments = async (classId) => {
	if (!isObjectId(classId)) return null;
	return await classes_default$1.findById(classId).populate({
		path: "courses",
		select: "name code courseID lecturer isActive subjects department unit",
		populate: [
			{
				path: "department",
				select: "name departmentID code head"
			},
			{
				path: "unit",
				select: "name unitID code"
			},
			{
				path: "lecturer",
				select: "name email"
			},
			{
				path: "subjects.lecturer",
				select: "name email"
			}
		]
	});
};
var validateDepartmentLecturers = async (lecturerIds, departmentDoc) => {
	if (!Array.isArray(lecturerIds) || lecturerIds.length === 0) return null;
	const users = await user_default$1.find({
		_id: { $in: lecturerIds },
		role: { $in: ["teacher", "admin"] }
	});
	if (users.length !== lecturerIds.length) return "Some selected lecturers were not found or do not have teacher/admin roles.";
	const invalid = users.find((user) => !isUserInDepartment(user, departmentDoc));
	if (invalid) return `Lecturer ${invalid.name ?? invalid.email ?? invalid._id} is not assigned to department ${departmentDoc.name}.`;
	return null;
};
var normalizeName = (input) => {
	if (!input) return "";
	return String(input).trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/(^\.|\.$)/g, "");
};
var getRoleIdPrefix = (role) => {
	if (role === UserRole.ADMIN) return UserIDs.ADMINID.slice(0, -4);
	if (role === UserRole.TEACHER) return UserIDs.TEACHERID.slice(0, -4);
	if (role === UserRole.STUDENT) return UserIDs.STUDENTID.slice(0, -4);
	if (role === UserRole.PARENT) return UserIDs.PARENTID.slice(0, -4);
	if (role === UserRole.UNITCONSULTANT) return UserIDs.UNITCONSULTANTID.slice(0, -4);
	if (role === UserRole.UNITRESIDENT) return UserIDs.UNITRESIDENTID.slice(0, -4);
	return UserIDs.STUDENTID.slice(0, -4);
};
var roleIdCounterCache = {};
var generateUniqueUserIdNumber = async (role) => {
	const prefix = getRoleIdPrefix(role);
	if (roleIdCounterCache[role] == null) {
		const lastUser = await user_default$1.findOne({ idNumber: { $regex: `^${prefix}` } }).sort({ idNumber: -1 }).select("idNumber").lean();
		let nextNumber$1 = 1;
		if (lastUser?.idNumber) {
			const suffix = lastUser.idNumber.slice(-4);
			const parsed = Number.parseInt(suffix, 10);
			if (!Number.isNaN(parsed)) nextNumber$1 = parsed + 1;
		}
		roleIdCounterCache[role] = nextNumber$1;
	}
	const nextNumber = roleIdCounterCache[role] ?? 1;
	roleIdCounterCache[role] = nextNumber + 1;
	return `${prefix}${String(nextNumber).padStart(4, "0")}`;
};
var findExistingTeacherByName = async (name, departmentDoc) => {
	if (!name) return null;
	const normalized = String(name).trim();
	return await user_default$1.findOne({
		role: "teacher",
		name: {
			$regex: `^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$$`,
			$options: "i"
		},
		department: departmentDoc?.name ? {
			$regex: `^${String(departmentDoc.name).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$$`,
			$options: "i"
		} : { $exists: true }
	});
};
var generateTeacherEmail = async (name) => {
	const base = normalizeName(name) || `teacher${Date.now()}`;
	const domain = process.env.EMAIL_DOMAIN || "school.edu";
	let candidate = `${base}@${domain}`;
	let suffix = 1;
	while (await user_default$1.exists({ email: candidate })) {
		candidate = `${base}${suffix}@${domain}`;
		suffix += 1;
	}
	return candidate;
};
var findOrCreateTeacherAccount = async (lecturerName, departmentDoc, courseId) => {
	if (!lecturerName || !departmentDoc) return null;
	const sanitizedName = String(lecturerName).trim();
	if (!sanitizedName) return null;
	const existingTeacher = await findExistingTeacherByName(sanitizedName, departmentDoc);
	if (existingTeacher) {
		await user_default$1.findByIdAndUpdate(existingTeacher._id, { $addToSet: {
			teacherCourses: courseId,
			teacherSubject: courseId
		} }, { returnDocument: "after" });
		return String(existingTeacher._id);
	}
	const email = await generateTeacherEmail(sanitizedName);
	const password = `Teach${Math.random().toString(36).slice(2, 8)}`;
	const idNumber = await generateUniqueUserIdNumber(UserRole.TEACHER);
	const newTeacher = await user_default$1.create({
		name: sanitizedName,
		email,
		password,
		role: "teacher",
		department: departmentDoc.name,
		departmentId: departmentDoc._id,
		teacherCourses: [courseId],
		teacherSubject: [courseId],
		isActive: true,
		idNumber
	});
	return String(newTeacher._id);
};
var findOrCreateUnit = async (departmentDoc, unitIdentifier) => {
	if (!unitIdentifier) return null;
	const unitName = String(unitIdentifier).trim();
	if (!unitName) return null;
	let unitDoc = null;
	if (isObjectId(unitName)) unitDoc = await units_default.findById(unitName);
	if (!unitDoc) unitDoc = await units_default.findOne({
		name: unitName,
		department: departmentDoc._id
	});
	if (!unitDoc) {
		const counter = Math.floor(Math.random() * 900) + 100;
		unitDoc = await units_default.create({
			name: unitName,
			code: deriveUnitCode(unitName),
			unitID: `${departmentDoc.code}-${deriveUnitCode(unitName)}-${counter}`,
			department: departmentDoc._id,
			supervisor: void 0,
			courses: []
		});
	}
	if (String(unitDoc.department) !== String(departmentDoc._id)) return null;
	return unitDoc;
};
var syncUnitsFromConstants = async () => {
	const departments = getAllDepartments();
	await Promise.all(departments.map(async (constDept) => {
		const unitData = getDepartmentUnitsByCode(constDept.code);
		if (!unitData) return;
		const departmentDoc = await departments_default.findOne({ code: constDept.code });
		if (!departmentDoc) return;
		const normalizeUnitName = (unitEntry) => typeof unitEntry === "string" ? String(unitEntry).trim() : unitEntry && typeof unitEntry.name === "string" ? unitEntry.name.trim() : "";
		const unitNames = [...unitData.units.active.map(normalizeUnitName), ...unitData.units.reserve.map(normalizeUnitName)].filter(Boolean);
		await Promise.all(unitNames.map(async (name, index) => {
			const cleanName = String(name).trim();
			if (!cleanName) return;
			await units_default.findOneAndUpdate({
				name: cleanName,
				department: departmentDoc._id
			}, {
				name: cleanName,
				code: deriveUnitCode(cleanName),
				unitID: `${constDept.code}-${deriveUnitCode(cleanName)}-${index + 1}`,
				department: departmentDoc._id
			}, { upsert: true });
		}));
	}));
};
const createCourse = async (req, res) => {
	try {
		const { name, code, courseID, department, unit, semester, year, isActive, studentClasses, lecturer } = req.body;
		const { academicYearId } = req.body;
		if (!name || !code || !courseID || !department || !semester || !academicYearId) return res.status(400).json({ message: "Missing required fields (name, code, courseID, department, semester, academicYearId)." });
		const departmentDoc = await findOrCreateDepartment(department);
		if (!departmentDoc) return res.status(404).json({ message: `Department not found for identifier=${department}` });
		if (String(courseID).trim().toUpperCase() !== String(departmentDoc.code).trim().toUpperCase()) return res.status(400).json({ message: `Course Group ID must match the selected department code (${departmentDoc.code}).` });
		const normalizedCode = normalizeCourseCode(departmentDoc.code, code);
		if (!isValidCourseCode(departmentDoc.code, normalizedCode)) return res.status(400).json({ message: `Course code must use the selected department code and three digits, e.g. ${departmentDoc.code} 501.` });
		const unitValue = unit && String(unit).trim() !== "" ? unit : null;
		if (unitValue) {
			const unitDoc = await units_default.findById(unitValue);
			if (!unitDoc) return res.status(404).json({ message: `Unit not found for id=${unitValue}` });
			if (String(unitDoc.department) !== String(departmentDoc._id)) return res.status(400).json({ message: `Unit ${unitDoc.name} does not belong to department ${departmentDoc.name}` });
		}
		if (!await academicYear_default$1.findById(academicYearId)) return res.status(404).json({ message: `AcademicYear not found for id=${academicYearId}` });
		const lecturerValidationError = await validateDepartmentLecturers(Array.isArray(lecturer) ? lecturer : [], departmentDoc);
		if (lecturerValidationError) return res.status(400).json({ message: lecturerValidationError });
		if (await courses_default$1.findOne({
			name: String(name).trim(),
			code: normalizedCode,
			department: departmentDoc._id
		})) return res.status(400).json({ message: `Course with name "${name}", code "${normalizedCode}", and department "${departmentDoc.name}" already exists.` });
		const created = await courses_default$1.create({
			name,
			code: normalizedCode,
			courseID: departmentDoc.code,
			department: departmentDoc._id,
			unit: unitValue,
			academicYear: academicYearId,
			semester: semester ?? null,
			year: year ?? null,
			isActive: Boolean(isActive ?? true),
			studentClasses: Array.isArray(studentClasses) ? studentClasses : [],
			lecturer: Array.isArray(lecturer) ? lecturer : [],
			subjects: []
		});
		const userId = req.user?._id;
		if (userId) await logActivity({
			userId,
			action: `Course ${created.name} (${created.courseID}) created.`
		});
		return res.status(201).json(created);
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const addCourseSubject = async (req, res) => {
	try {
		const { courseId } = req.params;
		const { subject } = req.body;
		if (!subject?.subjectID || !subject?.name) return res.status(400).json({ message: "Missing subject payload. Expected subject: { subjectID, name, code?, lecturer?, isActive?, students? }" });
		const topLevelCourse = await courses_default$1.findById(courseId);
		if (!topLevelCourse) return res.status(404).json({ message: `Course ${courseId} not found` });
		const departmentDoc = await departments_default.findById(topLevelCourse.department);
		if (!departmentDoc) return res.status(404).json({ message: `Parent course department not found.` });
		if (String(subject.subjectID).trim() !== String(departmentDoc.departmentID).trim()) return res.status(400).json({ message: `Subject ID must match the course department identifier (${departmentDoc.departmentID}).` });
		const lecturerIds = Array.isArray(subject?.lecturer) ? subject.lecturer : [];
		const subjectLecturerError = await validateDepartmentLecturers(lecturerIds, departmentDoc);
		if (subjectLecturerError) return res.status(400).json({ message: subjectLecturerError });
		const studentIds = Array.isArray(subject?.students) ? subject.students : [];
		const subjectDate = normalizeSubjectDateValue(subject?.date);
		const subjectTimeWindow = normalizeSubjectTimeWindow(subject?.startTime, subject?.endTime);
		const subjectUID = generateSubjectUID(subject);
		if ((topLevelCourse.subjects ?? []).some((s) => String(s.subjectUID) === String(subjectUID) || String(s.name).trim().toLowerCase() === String(subject.name).trim().toLowerCase() && String(s.code ?? "").trim().toLowerCase() === String(subject.code ?? "").trim().toLowerCase())) return res.status(400).json({ message: `A subject with this identifier or matching name/code already exists for this course.` });
		topLevelCourse.subjects.push({
			subjectUID,
			name: subject.name,
			code: subject.code ?? null,
			subjectID: subject.subjectID,
			unit: subject.unit ?? null,
			lecturer: lecturerIds,
			isActive: Boolean(subject.isActive ?? true),
			semester: subject.semester ?? null,
			date: subjectDate,
			startTime: subjectTimeWindow.startTime,
			endTime: subjectTimeWindow.endTime,
			students: studentIds
		});
		await topLevelCourse.save();
		const userId = req.user?._id;
		if (userId) await logActivity({
			userId,
			action: `Added subject ${subject.subjectID} to course ${topLevelCourse.name} (${topLevelCourse.courseID}).`
		});
		return res.status(200).json(topLevelCourse);
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const bulkUploadCourseSubjects = async (req, res) => {
	try {
		const { courseId } = req.params;
		const { subjects } = req.body;
		if (!Array.isArray(subjects) || subjects.length === 0) return res.status(400).json({ message: "Subject rows are required for bulk upload." });
		const topLevelCourse = await courses_default$1.findById(courseId);
		if (!topLevelCourse) return res.status(404).json({ message: `Course ${courseId} not found` });
		const departmentDoc = await departments_default.findById(topLevelCourse.department);
		if (!departmentDoc) return res.status(404).json({ message: `Parent course department not found.` });
		const departmentTeacherDocs = await user_default$1.find({
			role: "teacher",
			$or: [{ departmentId: departmentDoc._id }, { department: departmentDoc.name }]
		}).select("_id name email").lean();
		const existingDepartmentTeacherNameLookup = /* @__PURE__ */ new Map();
		const existingDepartmentTeacherEmailLookup = /* @__PURE__ */ new Map();
		for (const teacher of departmentTeacherDocs) {
			const normalizedName = normalizeLecturerName(String(teacher.name ?? ""));
			if (normalizedName) existingDepartmentTeacherNameLookup.set(normalizedName, String(teacher._id));
			if (typeof teacher.email === "string" && teacher.email.trim()) existingDepartmentTeacherEmailLookup.set(teacher.email.trim().toLowerCase(), String(teacher._id));
		}
		const payloadLecturerIds = /* @__PURE__ */ new Set();
		for (const row of subjects) if (Array.isArray(row?.lecturer)) for (const rawId of row.lecturer) {
			const candidateId = String(rawId ?? "").trim();
			if (candidateId) payloadLecturerIds.add(candidateId);
		}
		const initialValidLecturerUsers = payloadLecturerIds.size > 0 ? await user_default$1.find({
			_id: { $in: Array.from(payloadLecturerIds) },
			role: { $in: ["teacher", "admin"] },
			$or: [{ departmentId: departmentDoc._id }, { department: departmentDoc.name }]
		}).select("_id") : [];
		const teacherLookupCache = /* @__PURE__ */ new Map();
		const initialValidLecturerIds = new Set(initialValidLecturerUsers.map((userDoc) => String(userDoc._id)));
		for (const id of payloadLecturerIds) teacherLookupCache.set(id, initialValidLecturerIds.has(id) ? id : null);
		const teacherLookup = async (lecturerIds) => {
			const normalized = (Array.isArray(lecturerIds) ? lecturerIds : []).map((id) => String(id).trim()).filter(Boolean);
			const missingIds = normalized.filter((id) => !teacherLookupCache.has(id));
			if (missingIds.length > 0) {
				const validUsers = await user_default$1.find({
					_id: { $in: missingIds },
					role: { $in: ["teacher", "admin"] },
					$or: [{ departmentId: departmentDoc._id }, { department: departmentDoc.name }]
				}).select("_id");
				const foundIds = new Set(validUsers.map((userDoc) => String(userDoc._id)));
				missingIds.forEach((id) => {
					teacherLookupCache.set(id, foundIds.has(id) ? id : null);
				});
			}
			return normalized.filter((id) => teacherLookupCache.get(id));
		};
		const teacherCache = /* @__PURE__ */ new Map();
		const buildTeacherCacheKey = (lecturerName) => {
			const normalizedName = normalizeLecturerName(lecturerName);
			return `${String(departmentDoc?.name ?? "").trim().toLowerCase()}::${normalizedName}`;
		};
		const resolveSubjectLecturers = async (row) => {
			const lecturerIds = Array.isArray(row.lecturer) ? row.lecturer : [];
			if (lecturerIds.some((value) => String(value ?? "").trim() !== "")) return await teacherLookup(lecturerIds);
			if (row.createTeacher) {
				const lecturerName = String(row.lecturerName ?? "").trim();
				if (!lecturerName) return null;
				const cacheKey = buildTeacherCacheKey(lecturerName);
				if (teacherCache.has(cacheKey)) return [teacherCache.get(cacheKey)];
				const normalizedName = normalizeLecturerName(lecturerName);
				const existingTeacherId = existingDepartmentTeacherNameLookup.get(normalizedName);
				if (existingTeacherId) {
					teacherCache.set(cacheKey, existingTeacherId);
					return [existingTeacherId];
				}
				const createdTeacherId = await findOrCreateTeacherAccount(lecturerName, departmentDoc, topLevelCourse._id);
				if (createdTeacherId) teacherCache.set(cacheKey, createdTeacherId);
				return createdTeacherId ? [createdTeacherId] : [];
			}
			return [];
		};
		const normalizeSubjectName = (value) => normalizeSubjectNameValue(value);
		const normalizeSubjectCode = (value) => normalizeSubjectCodeValue(value);
		const existingSubjects = Array.isArray(topLevelCourse.subjects) ? topLevelCourse.subjects : [];
		const existingNameSet = /* @__PURE__ */ new Set();
		const existingCodeSet = /* @__PURE__ */ new Set();
		for (const subject of existingSubjects) {
			const normalizedName = normalizeSubjectName(subject.name);
			const normalizedCode = normalizeSubjectCode(subject.code ?? null);
			if (normalizedName) existingNameSet.add(normalizedName);
			if (normalizedCode) existingCodeSet.add(normalizedCode);
		}
		const pendingSubjects = [];
		const uploadNameMap = /* @__PURE__ */ new Map();
		const uploadCodeMap = /* @__PURE__ */ new Map();
		const getExistingSubjectCodeSuffixes = () => {
			const match = String(topLevelCourse.code ?? "").trim().replace(/\s+/g, " ").match(/^(.*?)(\d+)$/);
			if (!match) return 0;
			const baseNumber = Number(match[2]);
			const suffixes = existingSubjects.map((subject) => String(subject.code ?? "").trim()).map((subjectCode) => {
				const codeMatch = subjectCode.match(/^(.*?)(\d+)$/);
				if (!codeMatch) return null;
				const prefix = codeMatch[1].trim();
				const number = Number(codeMatch[2]);
				return prefix === match[1].trim() ? number - baseNumber : null;
			}).filter((suffix) => typeof suffix === "number" && suffix >= 1);
			return suffixes.length === 0 ? 0 : Math.max(...suffixes);
		};
		let nextGeneratedSubjectIndex = getExistingSubjectCodeSuffixes();
		const results = {
			created: 0,
			skipped: 0,
			replaced: 0,
			errors: []
		};
		for (let index = 0; index < subjects.length; index += 1) {
			const row = subjects[index];
			const rowNumber = index + 1;
			if (!row || typeof row !== "object") {
				results.errors.push({
					row: rowNumber,
					message: "Invalid row payload."
				});
				results.skipped += 1;
				continue;
			}
			const rawName = String(row.name ?? "");
			const normalizedName = normalizeSubjectName(rawName);
			const normalizedCode = normalizeSubjectCode(row.code ? String(row.code) : null);
			const trimmedID = String(row.subjectID ?? departmentDoc.departmentID ?? "").trim();
			if (!rawName.trim() || !trimmedID) {
				results.errors.push({
					row: rowNumber,
					message: "Missing required subject name or subject ID."
				});
				results.skipped += 1;
				continue;
			}
			if (trimmedID !== String(departmentDoc.departmentID).trim()) {
				results.errors.push({
					row: rowNumber,
					message: `Subject ID must match the course department identifier (${departmentDoc.departmentID}).`
				});
				results.skipped += 1;
				continue;
			}
			const subjectDate = normalizeSubjectDateValue(row.date);
			const subjectTimeWindow = normalizeSubjectTimeWindow(row.startTime, row.endTime);
			const subjectLecturerIds = await resolveSubjectLecturers(row);
			if (subjectLecturerIds === null) {
				results.errors.push({
					row: rowNumber,
					message: "Lecturer name is required to create a new teacher account."
				});
				results.skipped += 1;
				continue;
			}
			const subjectLecturerError = await validateDepartmentLecturers(subjectLecturerIds, departmentDoc);
			if (subjectLecturerError) {
				results.errors.push({
					row: rowNumber,
					message: subjectLecturerError
				});
				results.skipped += 1;
				continue;
			}
			if (normalizedName && uploadNameMap.has(normalizedName)) {
				const previousIndex = uploadNameMap.get(normalizedName);
				pendingSubjects[previousIndex].keep = false;
				results.replaced += 1;
			}
			if (normalizedCode && uploadCodeMap.has(normalizedCode)) {
				const previousIndex = uploadCodeMap.get(normalizedCode);
				if (pendingSubjects[previousIndex]?.keep) {
					pendingSubjects[previousIndex].keep = false;
					results.replaced += 1;
				}
			}
			pendingSubjects.push({
				row,
				rowNumber,
				keep: true,
				normalizedName,
				normalizedCode,
				subjectLecturerIds,
				subjectDate,
				subjectTimeWindow
			});
			if (normalizedName) uploadNameMap.set(normalizedName, pendingSubjects.length - 1);
			if (normalizedCode) uploadCodeMap.set(normalizedCode, pendingSubjects.length - 1);
		}
		const newSubjects = pendingSubjects.filter((entry) => entry.keep).map((entry) => {
			const row = entry.row;
			const name = normalizeSubjectText(String(row.name ?? ""));
			const rawCode = row.code ? String(row.code) : null;
			let code = rawCode ? normalizeSubjectText(rawCode) : null;
			const subjectID = normalizeSubjectText(String(row.subjectID ?? departmentDoc.departmentID ?? "")).trim();
			const isActive = row.isActive === false ? false : true;
			if (!code && topLevelCourse.code) {
				code = generateSubjectCodeFromCourse(topLevelCourse.code, nextGeneratedSubjectIndex);
				nextGeneratedSubjectIndex += 1;
			}
			return {
				subjectUID: generateSubjectUID({
					subjectID,
					name,
					code
				}),
				name,
				code: code || null,
				subjectID,
				unit: row.unit ?? null,
				lecturer: Array.isArray(entry.subjectLecturerIds) ? entry.subjectLecturerIds : [],
				isActive,
				semester: row.semester ?? null,
				date: entry.subjectDate,
				startTime: entry.subjectTimeWindow.startTime,
				endTime: entry.subjectTimeWindow.endTime,
				students: Array.isArray(row.students) ? row.students : []
			};
		});
		const combinedSubjects = [...existingSubjects, ...newSubjects];
		const keptByName = /* @__PURE__ */ new Set();
		const keptByCode = /* @__PURE__ */ new Set();
		const dedupedSubjects = [];
		for (let index = combinedSubjects.length - 1; index >= 0; index -= 1) {
			const subject = combinedSubjects[index];
			const normalizedName = normalizeSubjectName(subject.name);
			const normalizedCode = normalizeSubjectCode(subject.code ?? null);
			const duplicateByName = normalizedName && keptByName.has(normalizedName);
			const duplicateByCode = normalizedCode && keptByCode.has(normalizedCode);
			if (duplicateByName || duplicateByCode) {
				if (subject._id) results.replaced += 1;
				continue;
			}
			if (normalizedName) keptByName.add(normalizedName);
			if (normalizedCode) keptByCode.add(normalizedCode);
			dedupedSubjects.push(subject);
		}
		topLevelCourse.subjects = dedupedSubjects.reverse();
		await topLevelCourse.save();
		const userId = req.user?._id;
		if (userId) await logActivity({
			userId,
			action: `Bulk uploaded ${results.created} subjects into course ${topLevelCourse.name} (${topLevelCourse.courseID}).`
		});
		return res.json({
			message: "Bulk subject upload processed",
			results
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const deleteEmbeddedSubject = async (req, res) => {
	try {
		const { courseId, subjectId } = req.params;
		const topLevelCourse = await courses_default$1.findById(courseId);
		if (!topLevelCourse) return res.status(404).json({ message: `Course ${courseId} not found` });
		let subdoc = topLevelCourse.subjects.id ? topLevelCourse.subjects.id(subjectId) : null;
		if (!subdoc) subdoc = (topLevelCourse.subjects ?? []).find((s) => String(s._id) === String(subjectId) || String(s.subjectUID) === String(subjectId) || String(s.subjectID) === String(subjectId) || String(s.name) === String(subjectId) || String(s.code ?? "") === String(subjectId));
		if (!subdoc) return res.status(404).json({ message: `Subject ${subjectId} not found in course ${courseId}` });
		const removed = {
			_id: String(subdoc._id),
			name: subdoc.name,
			code: subdoc.code ?? null,
			subjectID: subdoc.subjectID ?? null
		};
		if (!await courses_default$1.findOneAndUpdate({
			_id: topLevelCourse._id,
			"subjects._id": removed._id
		}, { $pull: { subjects: { _id: removed._id } } }, { new: true })) return res.status(404).json({ message: `Subject ${subjectId} not found in course ${courseId}` });
		try {
			await subjects_default.deleteMany({
				courseID: topLevelCourse.courseID,
				$or: [{ name: removed.name }, { code: removed.code ?? "" }]
			});
		} catch (e) {
			console.warn("Subjects cascade delete failed", e);
		}
		const userId = req.user?._id;
		if (userId) await logActivity({
			userId,
			action: `Deleted subject ${removed.name} from course ${topLevelCourse.name} (${topLevelCourse.courseID}).`
		});
		return res.json({
			message: "Subject removed",
			subject: removed,
			course: topLevelCourse
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const bulkDeleteCourseSubjects = async (req, res) => {
	try {
		const { courseId } = req.params;
		const { subjectIds } = req.body;
		if (!Array.isArray(subjectIds) || subjectIds.length === 0) return res.status(400).json({ message: "subjectIds array is required." });
		const validIds = subjectIds.map((id) => String(id).trim()).filter(Boolean);
		if (validIds.length === 0) return res.status(400).json({ message: "subjectIds cannot be empty." });
		const course = await courses_default$1.findById(courseId).select("courseID name");
		if (!course) return res.status(404).json({ message: `Course ${courseId} not found` });
		const oldCourse = await courses_default$1.findById(courseId).select("subjects").lean();
		const removedSubjects = Array.isArray(oldCourse?.subjects) ? oldCourse.subjects.filter((subject) => validIds.includes(String(subject._id))) : [];
		await courses_default$1.updateOne({ _id: courseId }, { $pull: { subjects: { _id: { $in: validIds } } } });
		if (removedSubjects.length > 0) {
			const deleteConditions = removedSubjects.map((removed) => ({
				courseID: course.courseID,
				$or: [{ name: removed.name }, { code: removed.code ?? "" }]
			}));
			await subjects_default.deleteMany({ $or: deleteConditions });
		}
		const userId = req.user?._id;
		if (userId) await logActivity({
			userId,
			action: `Bulk deleted ${removedSubjects.length} subject${removedSubjects.length === 1 ? "" : "s"} from course ${course.name} (${course.courseID}).`
		});
		return res.json({
			courseId,
			courseName: course.name,
			courseCode: course.courseID,
			message: `Deleted ${removedSubjects.length} subject${removedSubjects.length === 1 ? "" : "s"}.`,
			deleted: removedSubjects.length
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const createCourseSubject = async (req, res) => {
	try {
		const { name, code, courseID, department, unit, isActive, studentClasses, lecturer, subject, semester, year, academicYearId } = req.body;
		if (!name || !code || !courseID || !department) return res.status(400).json({ message: "Missing required fields (name, code, courseID, department)." });
		if (!subject?.subjectID || !subject?.name) return res.status(400).json({ message: "Missing subject payload. Expected subject: { subjectID, name, code?, lecturer?, isActive?, students? }" });
		const departmentDoc = await findOrCreateDepartment(department);
		if (!departmentDoc) return res.status(404).json({ message: `Department not found for identifier=${department}` });
		const unitValue = unit && String(unit).trim() !== "" ? unit : null;
		if (unitValue) {
			const unitDoc = await units_default.findById(unitValue);
			if (!unitDoc) return res.status(404).json({ message: `Unit not found for id=${unitValue}` });
			if (String(unitDoc.department) !== String(departmentDoc._id)) return res.status(400).json({ message: `Unit ${unitDoc.name} does not belong to department ${departmentDoc.name}` });
		}
		const topLevelCourse = await courses_default$1.findOne({
			courseID,
			department: departmentDoc._id,
			unit: unitValue,
			academicYear: academicYearId ?? null
		});
		const courseLecturerValidationError = await validateDepartmentLecturers(Array.isArray(lecturer) ? lecturer : [], departmentDoc);
		if (courseLecturerValidationError) return res.status(400).json({ message: courseLecturerValidationError });
		if (String(subject.subjectID).trim() !== String(departmentDoc.departmentID).trim()) return res.status(400).json({ message: `Subject ID must match the selected department identifier (${departmentDoc.departmentID}).` });
		const subjectLecturerIds = Array.isArray(subject?.lecturer) ? subject.lecturer : [];
		const subjectLecturerValidationError = await validateDepartmentLecturers(subjectLecturerIds, departmentDoc);
		if (subjectLecturerValidationError) return res.status(400).json({ message: subjectLecturerValidationError });
		const subjectUID = generateSubjectUID(subject);
		const studentIds = Array.isArray(subject?.students) ? subject.students : [];
		if (!topLevelCourse) {
			const created = await courses_default$1.create({
				name,
				code,
				courseID,
				department: departmentDoc._id,
				unit: unitValue,
				academicYear: academicYearId ?? null,
				semester: semester ?? null,
				year: year ?? null,
				isActive: Boolean(isActive ?? true),
				studentClasses: Array.isArray(studentClasses) ? studentClasses : [],
				lecturer: Array.isArray(lecturer) ? lecturer : [],
				subjects: [{
					subjectUID,
					name: subject.name,
					code: subject.code ?? null,
					subjectID: subject.subjectID,
					unit: subject.unit ?? null,
					lecturer: subjectLecturerIds,
					isActive: Boolean(subject.isActive ?? true),
					semester: subject.semester ?? null,
					students: studentIds
				}]
			});
			const userId$1 = req.user?._id;
			if (userId$1) await logActivity({
				userId: userId$1,
				action: `Course ${created.name} (${created.courseID}) created and subject ${subject.subjectID} added.`
			});
			return res.status(201).json(created);
		}
		if ((topLevelCourse.subjects ?? []).some((s) => String(s.subjectUID) === String(subjectUID) || String(s.name).trim().toLowerCase() === String(subject.name).trim().toLowerCase() && String(s.code ?? "").trim().toLowerCase() === String(subject.code ?? "").trim().toLowerCase())) return res.status(400).json({ message: `A subject with this identifier or matching name/code already exists for this course.` });
		topLevelCourse.name = name;
		topLevelCourse.code = code;
		topLevelCourse.isActive = Boolean(isActive ?? topLevelCourse.isActive);
		if (academicYearId) topLevelCourse.academicYear = academicYearId;
		if (Array.isArray(studentClasses)) topLevelCourse.studentClasses = studentClasses;
		if (Array.isArray(lecturer)) topLevelCourse.lecturer = lecturer;
		topLevelCourse.subjects.push({
			subjectUID,
			name: subject.name,
			code: subject.code ?? null,
			subjectID: subject.subjectID,
			unit: subject.unit ?? null,
			lecturer: subjectLecturerIds,
			isActive: Boolean(subject.isActive ?? true),
			semester: subject.semester ?? null,
			students: studentIds
		});
		await topLevelCourse.save();
		const userId = req.user?._id;
		if (userId) await logActivity({
			userId,
			action: `Added subject ${subject.subjectID} to course ${topLevelCourse.name} (${topLevelCourse.courseID}).`
		});
		return res.status(200).json(topLevelCourse);
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const getAllCourseSubjects = async (req, res) => {
	try {
		const userId = req.user?._id;
		const userRole$1 = req.user?.role;
		const search = req.query.search;
		const classIdQuery = req.query.class ?? req.query.classId;
		const query = {};
		if (search) query.$or = [
			{ name: {
				$regex: search,
				$options: "i"
			} },
			{ code: {
				$regex: search,
				$options: "i"
			} },
			{ courseID: {
				$regex: search,
				$options: "i"
			} },
			{ "subjects.subjectID": {
				$regex: search,
				$options: "i"
			} },
			{ "subjects.name": {
				$regex: search,
				$options: "i"
			} },
			{ "subjects.code": {
				$regex: search,
				$options: "i"
			} }
		];
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		if (req.query.topLevel === "true") {
			if (classIdQuery || userRole$1 === "student") {
				let effectiveClassId = classIdQuery;
				if (userRole$1 === "student") effectiveClassId = normalizeClassIdValue(req.user?.studentClasses) || effectiveClassId;
				if (effectiveClassId) {
					let classCourses = (await getClassCourseDocuments(effectiveClassId))?.courses ?? [];
					const seen = /* @__PURE__ */ new Set();
					classCourses = classCourses.filter((course) => {
						const key = `${String(course.name).trim().toLowerCase()}-${String(course.code).trim().toLowerCase()}-${String(course.department?._id ?? course.department ?? "")}`;
						if (seen.has(key)) return false;
						seen.add(key);
						return true;
					});
					const total$2 = classCourses.length;
					return res.json({
						courses: classCourses,
						pagination: {
							total: total$2,
							page,
							pages: Math.ceil(total$2 / limit)
						}
					});
				}
			}
			const [total$1, courses] = await Promise.all([courses_default$1.countDocuments(query), courses_default$1.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("department", "name departmentID code head").populate("unit", "name unitID code")]);
			return res.json({
				courses,
				pagination: {
					total: total$1,
					page,
					pages: Math.ceil(total$1 / limit)
				}
			});
		}
		const flattened = [];
		let topLevelCourses = [];
		if (classIdQuery || userRole$1 === "student") {
			let effectiveClassId = classIdQuery;
			if (userRole$1 === "student") effectiveClassId = normalizeClassIdValue(req.user?.studentClasses) || effectiveClassId;
			if (effectiveClassId) topLevelCourses = (await getClassCourseDocuments(effectiveClassId))?.courses ?? [];
		}
		if (topLevelCourses.length === 0) if (userRole$1 === "teacher") topLevelCourses = await courses_default$1.find({
			...query,
			"subjects.lecturer": userId
		}).sort({ createdAt: -1 });
		else if (userRole$1 === "student") topLevelCourses = [];
		else topLevelCourses = await courses_default$1.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("department", "name departmentID code head").populate("unit", "name unitID code");
		for (const c of topLevelCourses) {
			const subjects = c?.subjects ?? [];
			for (const s of subjects) {
				if (search) {
					if (!(String(s?.name ?? "").toLowerCase().includes(search.toLowerCase()) || String(s?.code ?? "").toLowerCase().includes(search.toLowerCase()) || String(s?.subjectID ?? "").toLowerCase().includes(search.toLowerCase()) || String(c?.name ?? "").toLowerCase().includes(search.toLowerCase()) || String(c?.code ?? "").toLowerCase().includes(search.toLowerCase()))) continue;
				}
				if (userRole$1 === "teacher") {
					if (!(Array.isArray(s?.lecturer) ? s.lecturer : []).some((lid) => String(lid) === String(userId))) continue;
				}
				const lecturerData = Array.isArray(s?.lecturer) ? s.lecturer : [];
				flattened.push({
					_id: String(s?._id ?? s?.subjectID ?? ""),
					name: s?.name,
					code: s?.code,
					isActive: Boolean(s?.isActive ?? true),
					teacher: lecturerData.map((lect) => typeof lect === "object" && lect !== null ? {
						_id: String(lect._id ?? ""),
						name: lect.name ?? ""
					} : {
						_id: String(lect),
						name: ""
					}),
					course: {
						_id: String(c?._id ?? ""),
						name: c?.name,
						code: c?.code
					},
					department: c?.department ? {
						_id: String(c.department._id ?? ""),
						name: c.department.name,
						code: c.department.code,
						head: c.department.head
					} : null
				});
			}
		}
		const total = flattened.length;
		return res.json({
			courses: flattened,
			pagination: {
				total,
				page,
				pages: Math.ceil(total / limit)
			}
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const getCourseById = async (req, res) => {
	try {
		const course = await courses_default$1.findById(req.params.courseId).populate("department", "name departmentID code head").populate("unit", "name unitID code").populate("lecturer", "name email").populate("subjects.lecturer", "name email");
		if (!course) return res.status(404).json({ message: "Course not found" });
		return res.json(course);
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const getCourseMeta = async (req, res) => {
	try {
		await syncDepartmentsFromConstants();
		const departments = await departments_default.find({}).select("name departmentID code").sort({ name: 1 });
		const units = await units_default.find({}).select("name unitID code department").sort({ name: 1 });
		const academicYears = await academicYear_default$1.find({}).select("name").sort({ name: 1 });
		return res.json({
			departments,
			units,
			academicYears
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const updateCourseSubjects = async (req, res) => {
	try {
		const { name, isActive, code, courseID, department, semester, year, unit, academicYearId, subjects, lecturer } = req.body;
		const updateData = {
			name,
			isActive,
			code,
			courseID,
			department,
			semester,
			year
		};
		if (unit !== void 0) updateData.unit = unit === "" ? null : unit;
		if (academicYearId) updateData.academicYear = academicYearId;
		if (lecturer !== void 0) updateData.lecturer = Array.isArray(lecturer) ? lecturer : [];
		if (subjects !== void 0) updateData.subjects = (Array.isArray(subjects) ? subjects : []).map((subject) => ({
			name: subject.name,
			code: subject.code ?? null,
			subjectID: subject.subjectID ?? subject.code ?? "",
			lecturer: Array.isArray(subject.lecturer) ? subject.lecturer : [],
			students: Array.isArray(subject.students) ? subject.students : [],
			isActive: Boolean(subject.isActive ?? true),
			semester: subject.semester ?? null,
			date: normalizeSubjectDateValue(subject.date)
		}));
		const updated = await courses_default$1.findByIdAndUpdate(req.params.id, updateData, {
			returnDocument: "after",
			runValidators: true
		});
		const userId = req.user?._id;
		if (userId) await logActivity({
			userId,
			action: `Course ${updated?.name} was updated successfully.`
		});
		if (!updated) return res.status(404).json({ message: `Course with ID ${req.params.id} not found!` });
		return res.json(updated);
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const deleteCourseSubjects = async (req, res) => {
	try {
		const deleted = await courses_default$1.findByIdAndDelete(req.params.id);
		if (!deleted) return res.status(404).json({ message: `Course with ID ${req.params.id} not found!` });
		await subjects_default.deleteMany({ courseID: deleted.courseID });
		const userId = req.user?._id;
		if (userId) await logActivity({
			userId,
			action: `Course ${deleted.name} was deleted successfully.`
		});
		return res.json({
			message: `Course ${deleted.name} deleted successfully.`,
			courseId: deleted._id
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const deduplicateClassCourses = async (req, res) => {
	try {
		const classes = await classes_default$1.find({}, "name courses");
		let totalDeduplicated = 0;
		let classesUpdated = 0;
		for (const cls of classes) {
			const courseIds = (cls.courses ?? []).map((c) => String(c));
			const uniqueIds = Array.from(new Set(courseIds));
			if (uniqueIds.length < courseIds.length) {
				const removed = courseIds.length - uniqueIds.length;
				totalDeduplicated += removed;
				cls.courses = uniqueIds;
				await cls.save();
				classesUpdated++;
			}
		}
		return res.json({
			message: `Deduplication complete. Updated ${classesUpdated} classes, removed ${totalDeduplicated} duplicate entries.`,
			classesUpdated,
			totalDeduplicated
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const bulkUploadCourses = async (req, res) => {
	try {
		const payload = req.body;
		if (!Array.isArray(payload?.courses) || payload.courses.length === 0) return res.status(400).json({ message: "courses array is required for bulk upload." });
		const results = {
			created: 0,
			skipped: 0,
			errors: []
		};
		for (let index = 0; index < payload.courses.length; index += 1) {
			const row = payload.courses[index];
			const rowNumber = index + 1;
			if (!row) {
				results.errors.push({
					row: rowNumber,
					message: "Missing course row."
				});
				continue;
			}
			if (!row.name || !row.code || !row.courseID || !row.department || !row.unit || !row.semester || !row.academicYearId) {
				results.errors.push({
					row: rowNumber,
					message: "Missing required course fields."
				});
				continue;
			}
			const departmentDoc = await findOrCreateDepartment(row.department);
			if (!departmentDoc) {
				results.errors.push({
					row: rowNumber,
					message: `Department not found: ${row.department}`
				});
				continue;
			}
			if (String(row.courseID).trim().toUpperCase() !== String(departmentDoc.code).trim().toUpperCase()) {
				results.errors.push({
					row: rowNumber,
					message: `Course Group ID must match department code ${departmentDoc.code}.`
				});
				continue;
			}
			const normalizedCode = normalizeCourseCode(departmentDoc.code, row.code);
			if (!normalizedCode || !isValidCourseCode(departmentDoc.code, normalizedCode)) {
				results.errors.push({
					row: rowNumber,
					message: `Course code must be formatted as ${departmentDoc.code} 501.`
				});
				continue;
			}
			const unitDoc = await findOrCreateUnit(departmentDoc, row.unit);
			if (!unitDoc) {
				results.errors.push({
					row: rowNumber,
					message: `Unit not found or invalid for department ${departmentDoc.name}: ${row.unit}`
				});
				continue;
			}
			if (!await academicYear_default$1.findById(row.academicYearId)) {
				results.errors.push({
					row: rowNumber,
					message: `Academic year not found for id ${row.academicYearId}`
				});
				continue;
			}
			if (await courses_default$1.findOne({
				courseID: departmentDoc.code,
				department: departmentDoc._id,
				unit: unitDoc._id,
				academicYear: row.academicYearId
			})) {
				results.skipped += 1;
				continue;
			}
			const yearValue = row.year ? String(row.year).trim() : void 0;
			await courses_default$1.create({
				name: row.name,
				code: normalizedCode,
				courseID: departmentDoc.code,
				department: departmentDoc._id,
				unit: unitDoc._id,
				academicYear: row.academicYearId,
				semester: row.semester,
				year: yearValue,
				isActive: true,
				studentClasses: [],
				lecturer: Array.isArray(row.lecturer) ? row.lecturer : row.lecturer ? [String(row.lecturer)] : [],
				subjects: []
			});
			results.created += 1;
		}
		const userId = req.user?._id;
		if (userId) await logActivity({
			userId,
			action: `Bulk uploaded ${results.created} courses from spreadsheet`
		});
		return res.json({
			message: "Bulk upload processed",
			results
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const seedDepartments = async (req, res) => {
	try {
		if (req.user?.role !== "admin") return res.status(403).json({ message: "Only admins can seed departments" });
		const departmentsData = getAllDepartments();
		const results = await Promise.all(departmentsData.map((dept) => departments_default.findOneAndUpdate({ code: dept.code }, {
			name: dept.name,
			code: dept.code,
			departmentID: dept.departmentID
		}, {
			upsert: true,
			returnDocument: "after"
		})));
		const userId = req.user?._id;
		if (userId) await logActivity({
			userId,
			action: `Seeded ${results.length} departments from constants`
		});
		return res.json({
			message: `Successfully seeded ${results.length} departments`,
			departments: results
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
var syncDepartmentsFromConstants = async () => {
	const constantDepartments = getAllDepartments();
	await Promise.all(constantDepartments.map(async (constDept) => {
		await departments_default.findOneAndUpdate({ code: constDept.code }, {
			name: constDept.name,
			code: constDept.code,
			departmentID: constDept.departmentID
		}, { upsert: true });
	}));
	await syncUnitsFromConstants();
};
const getAvailableDepartments = async (req, res) => {
	try {
		await syncDepartmentsFromConstants();
		let departments = await departments_default.find({}).sort({ name: 1 });
		if (!departments.length) {
			const constantDepartments = getAllDepartments().map((dept) => ({
				_id: dept.departmentID,
				...dept
			}));
			return res.json({ departments: constantDepartments });
		}
		return res.json({ departments });
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
var normalizeDepartmentPayload = (raw) => {
	const name = String(raw?.name || raw?.departmentName || raw?.["Department Name"] || "").trim();
	const code = String(raw?.code || raw?.departmentCode || raw?.["Department Code"] || "").trim().toUpperCase();
	const departmentID = String(raw?.departmentID || raw?.departmentId || raw?.["Department ID"] || raw?.["department id"] || "").trim();
	const head = String(raw?.head || raw?.departmentHead || "").trim();
	const facultyId = String(raw?.facultyId || raw?.facultyID || raw?.["Faculty ID"] || raw?.["faculty id"] || "").trim();
	return {
		name,
		code,
		departmentID,
		head: head || void 0,
		facultyId: facultyId || void 0
	};
};
const createDepartment = async (req, res) => {
	try {
		const { name, code, departmentID, head, facultyId } = req.body;
		if (!name || !code || !departmentID) return res.status(400).json({ message: "Department name, code, and departmentID are required." });
		const normalizedName = String(name).trim();
		const normalizedCode = String(code).trim().toUpperCase();
		const normalizedDepartmentID = String(departmentID).trim();
		if (await departments_default.findOne({ $or: [
			{ code: normalizedCode },
			{ departmentID: normalizedDepartmentID },
			{ name: normalizedName }
		] })) return res.status(409).json({ message: "A department with that code, ID, or name already exists." });
		let resolvedFacultyId;
		if (facultyId !== void 0 && facultyId !== null && String(facultyId).trim()) {
			const facultyDoc = await findFaculty(String(facultyId));
			if (!facultyDoc) return res.status(400).json({ message: "Faculty not found." });
			resolvedFacultyId = facultyDoc._id.toString();
		}
		const department = await departments_default.create({
			name: normalizedName,
			code: normalizedCode,
			departmentID: normalizedDepartmentID,
			head: head && mongoose.isValidObjectId(head) ? head : void 0,
			facultyId: resolvedFacultyId
		});
		const userId = req.user?._id;
		if (userId) await logActivity({
			userId,
			action: `Created department ${department.name} (${department.code})`
		});
		return res.status(201).json(department);
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const updateDepartment = async (req, res) => {
	try {
		const department = await departments_default.findById(req.params.id);
		if (!department) return res.status(404).json({ message: "Department not found" });
		const { name, code, departmentID, head, facultyId } = req.body;
		const updateData = {};
		if (name !== void 0) updateData.name = String(name).trim();
		if (code !== void 0) updateData.code = String(code).trim().toUpperCase();
		if (departmentID !== void 0) updateData.departmentID = String(departmentID).trim();
		if (head !== void 0) updateData.head = head && mongoose.isValidObjectId(head) ? head : null;
		if (facultyId !== void 0) if (facultyId === null || String(facultyId).trim() === "") updateData.facultyId = null;
		else {
			const facultyDoc = await findFaculty(String(facultyId));
			if (!facultyDoc) return res.status(400).json({ message: "Faculty not found." });
			updateData.facultyId = facultyDoc._id;
		}
		if (updateData.name || updateData.code || updateData.departmentID) {
			if (await departments_default.findOne({
				_id: { $ne: department._id },
				$or: [
					...updateData.code ? [{ code: updateData.code }] : [],
					...updateData.departmentID ? [{ departmentID: updateData.departmentID }] : [],
					...updateData.name ? [{ name: updateData.name }] : []
				]
			})) return res.status(409).json({ message: "Another department with the same name, code, or departmentID already exists." });
		}
		Object.assign(department, updateData);
		const updated = await department.save();
		const userId = req.user?._id;
		if (userId) await logActivity({
			userId,
			action: `Updated department ${updated.name} (${updated.code})`
		});
		return res.json(updated);
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const deleteDepartment = async (req, res) => {
	try {
		const deleted = await departments_default.findByIdAndDelete(req.params.id);
		if (!deleted) return res.status(404).json({ message: "Department not found" });
		await departments_default.updateMany({ facultyId: deleted._id }, { $unset: { facultyId: "" } });
		const userId = req.user?._id;
		if (userId) await logActivity({
			userId,
			action: `Deleted department ${deleted.name} (${deleted.code})`
		});
		return res.json({ message: `Department ${deleted.name} deleted successfully.` });
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const bulkUploadDepartments = async (req, res) => {
	try {
		const payload = req.body;
		if (!Array.isArray(payload?.departments) || payload.departments.length === 0) return res.status(400).json({ message: "departments array is required for bulk upload." });
		const results = {
			created: 0,
			updated: 0,
			skipped: 0,
			errors: []
		};
		for (let index = 0; index < payload.departments.length; index += 1) {
			const row = normalizeDepartmentPayload(payload.departments[index]);
			const rowNumber = index + 1;
			if (!row.name || !row.code || !row.departmentID) {
				results.errors.push({
					row: rowNumber,
					message: "Missing required department fields."
				});
				results.skipped += 1;
				continue;
			}
			let resolvedFacultyId;
			if (row.facultyId) {
				const facultyDoc = await findFaculty(row.facultyId);
				if (!facultyDoc) {
					results.errors.push({
						row: rowNumber,
						message: "Faculty not found for row."
					});
					results.skipped += 1;
					continue;
				}
				resolvedFacultyId = facultyDoc._id.toString();
			}
			const filter = { $or: [{ code: row.code }, { departmentID: row.departmentID }] };
			const existing = await departments_default.findOne(filter);
			if (existing) {
				await departments_default.findByIdAndUpdate(existing._id, {
					name: row.name,
					code: row.code,
					departmentID: row.departmentID,
					head: row.head && mongoose.isValidObjectId(row.head) ? row.head : existing.head,
					...resolvedFacultyId !== void 0 ? { facultyId: resolvedFacultyId } : {}
				});
				results.updated += 1;
				continue;
			}
			await departments_default.create({
				name: row.name,
				code: row.code,
				departmentID: row.departmentID,
				head: row.head && mongoose.isValidObjectId(row.head) ? row.head : void 0,
				facultyId: resolvedFacultyId
			});
			results.created += 1;
		}
		const userId = req.user?._id;
		if (userId) await logActivity({
			userId,
			action: `Bulk uploaded ${results.created} departments from spreadsheet`
		});
		return res.json({
			message: "Bulk upload processed",
			results
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const getDepartmentConstants = async (req, res) => {
	try {
		return res.json({
			departments: getAllDepartments(),
			departmentUnits: DEPARTMENT_UNITS,
			departmentCourses: DEPARTMENT_COURSES
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const getFaculties = async (req, res) => {
	try {
		const faculties = await faculty_default.find({}).sort({ name: 1 });
		return res.json({ faculties });
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const getFacultyDepartments = async (req, res) => {
	try {
		const facultyId = req.params.id;
		if (!mongoose.isValidObjectId(facultyId)) return res.status(400).json({ message: "Invalid faculty id." });
		const faculty = await faculty_default.findById(facultyId);
		if (!faculty) return res.status(404).json({ message: "Faculty not found." });
		const departments = await departments_default.find({ facultyId: faculty._id }).sort({ name: 1 });
		return res.json({
			faculty,
			departments
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const createDepartmentUnderFaculty = async (req, res) => {
	try {
		const facultyId = req.params.id;
		if (!mongoose.isValidObjectId(facultyId)) return res.status(400).json({ message: "Invalid faculty id." });
		const faculty = await faculty_default.findById(facultyId);
		if (!faculty) return res.status(404).json({ message: "Faculty not found." });
		const { name, code, departmentID, head } = req.body;
		if (!name || !code || !departmentID) return res.status(400).json({ message: "Department name, code, and departmentID are required." });
		const normalizedName = String(name).trim();
		const normalizedCode = String(code).trim().toUpperCase();
		const normalizedDepartmentID = String(departmentID).trim();
		if (await departments_default.findOne({ $or: [
			{ code: normalizedCode },
			{ departmentID: normalizedDepartmentID },
			{ name: normalizedName }
		] })) return res.status(409).json({ message: "A department with that code, ID, or name already exists." });
		const department = await departments_default.create({
			name: normalizedName,
			code: normalizedCode,
			departmentID: normalizedDepartmentID,
			head: head && mongoose.isValidObjectId(head) ? head : void 0,
			facultyId: faculty._id
		});
		const userId = req.user?._id;
		if (userId) await logActivity({
			userId,
			action: `Created department ${department.name} (${department.code}) under faculty ${faculty.name}`
		});
		return res.status(201).json(department);
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const deleteDepartmentUnderFaculty = async (req, res) => {
	try {
		const { facultyId, id } = req.params;
		if (!mongoose.isValidObjectId(facultyId) || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid faculty or department id." });
		const faculty = await faculty_default.findById(facultyId);
		if (!faculty) return res.status(404).json({ message: "Faculty not found." });
		const deleted = await departments_default.findOneAndDelete({
			_id: id,
			facultyId: faculty._id
		});
		if (!deleted) return res.status(404).json({ message: "Department not found under this faculty." });
		const userId = req.user?._id;
		if (userId) await logActivity({
			userId,
			action: `Deleted department ${deleted.name} (${deleted.code}) under faculty ${faculty.name}`
		});
		return res.json({ message: `Department ${deleted.name} deleted successfully.` });
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const createFaculty = async (req, res) => {
	try {
		const { name, code, facultyID, head } = req.body;
		if (!name || !code || !facultyID) return res.status(400).json({ message: "Faculty name, code, and facultyID are required." });
		const normalizedName = String(name).trim();
		const normalizedCode = String(code).trim().toUpperCase();
		const normalizedFacultyID = String(facultyID).trim();
		if (await faculty_default.findOne({ $or: [
			{ code: normalizedCode },
			{ facultyID: normalizedFacultyID },
			{ name: normalizedName }
		] })) return res.status(409).json({ message: "A faculty with that code, facultyID, or name already exists." });
		const faculty = await faculty_default.create({
			name: normalizedName,
			code: normalizedCode,
			facultyID: normalizedFacultyID,
			head: head && mongoose.isValidObjectId(head) ? head : void 0
		});
		const userId = req.user?._id;
		if (userId) await logActivity({
			userId,
			action: `Created faculty ${faculty.name} (${faculty.code})`
		});
		return res.status(201).json(faculty);
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const updateFaculty = async (req, res) => {
	try {
		const faculty = await faculty_default.findById(req.params.id);
		if (!faculty) return res.status(404).json({ message: "Faculty not found" });
		const { name, code, facultyID, head } = req.body;
		const updateData = {};
		if (name !== void 0) updateData.name = String(name).trim();
		if (code !== void 0) updateData.code = String(code).trim().toUpperCase();
		if (facultyID !== void 0) updateData.facultyID = String(facultyID).trim();
		if (head !== void 0) updateData.head = head && mongoose.isValidObjectId(head) ? head : null;
		if (updateData.name || updateData.code || updateData.facultyID) {
			if (await faculty_default.findOne({
				_id: { $ne: faculty._id },
				$or: [
					...updateData.code ? [{ code: updateData.code }] : [],
					...updateData.facultyID ? [{ facultyID: updateData.facultyID }] : [],
					...updateData.name ? [{ name: updateData.name }] : []
				]
			})) return res.status(409).json({ message: "Another faculty with the same name, code, or facultyID already exists." });
		}
		Object.assign(faculty, updateData);
		const updated = await faculty.save();
		const userId = req.user?._id;
		if (userId) await logActivity({
			userId,
			action: `Updated faculty ${updated.name} (${updated.code})`
		});
		return res.json(updated);
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const deleteFaculty = async (req, res) => {
	try {
		const deleted = await faculty_default.findByIdAndDelete(req.params.id);
		if (!deleted) return res.status(404).json({ message: "Faculty not found" });
		await departments_default.updateMany({ facultyId: deleted._id }, { $unset: { facultyId: "" } });
		const userId = req.user?._id;
		if (userId) await logActivity({
			userId,
			action: `Deleted faculty ${deleted.name} (${deleted.code})`
		});
		return res.json({ message: `Faculty ${deleted.name} deleted successfully.` });
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
var courseRouter = express.Router();
courseRouter.route("/").post(protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), createCourse);
courseRouter.route("/meta").get(protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), getCourseMeta);
courseRouter.route("/create").post(protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), createCourseSubject);
courseRouter.route("/departments").get(getAvailableDepartments).post(protect, authorize(["admin"]), createDepartment);
courseRouter.route("/department-constants").get(protect, getDepartmentConstants);
courseRouter.route("/:courseId/subjects").post(protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), addCourseSubject);
courseRouter.route("/:courseId/subjects/bulk-upload").post(protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), bulkUploadCourseSubjects);
courseRouter.route("/:courseId/subjects/bulk-delete").delete(protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), bulkDeleteCourseSubjects);
courseRouter.route("/:courseId/subjects/:subjectId").delete(protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), deleteEmbeddedSubject);
courseRouter.route("/faculties").get(protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), getFaculties).post(protect, authorize(["admin"]), createFaculty);
courseRouter.route("/faculties/:id/departments").get(protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), getFacultyDepartments).post(protect, authorize(["admin"]), createDepartmentUnderFaculty);
courseRouter.route("/faculties/:facultyId/departments/:id").delete(protect, authorize(["admin"]), deleteDepartmentUnderFaculty);
courseRouter.route("/faculties/:id").patch(protect, authorize(["admin"]), updateFaculty).delete(protect, authorize(["admin"]), deleteFaculty);
courseRouter.route("/:courseId").get(protect, authorize([
	"admin",
	"teacher",
	"student",
	"unitconsultant",
	"unitresident"
]), getCourseById);
courseRouter.route("/deduplicate-classes").post(protect, authorize(["admin"]), deduplicateClassCourses);
courseRouter.route("/departments/bulk-upload").post(protect, authorize(["admin"]), bulkUploadDepartments);
courseRouter.route("/departments/:id").patch(protect, authorize(["admin"]), updateDepartment).delete(protect, authorize(["admin"]), deleteDepartment);
courseRouter.route("/seed/departments").post(protect, authorize(["admin"]), seedDepartments);
courseRouter.route("/faculties").get(protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), getFaculties).post(protect, authorize(["admin"]), createFaculty);
courseRouter.route("/faculties/:id/departments").get(protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), getFacultyDepartments).post(protect, authorize(["admin"]), createDepartmentUnderFaculty);
courseRouter.route("/faculties/:facultyId/departments/:id").delete(protect, authorize(["admin"]), deleteDepartmentUnderFaculty);
courseRouter.route("/faculties/:id").patch(protect, authorize(["admin"]), updateFaculty).delete(protect, authorize(["admin"]), deleteFaculty);
courseRouter.route("/department-constants").get(protect, getDepartmentConstants);
courseRouter.route("/bulk-upload").post(protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), bulkUploadCourses);
courseRouter.route("/").get(protect, authorize([
	"admin",
	"teacher",
	"student",
	"unitconsultant",
	"unitresident"
]), getAllCourseSubjects);
courseRouter.route("/delete/:id").delete(protect, authorize(["admin"]), deleteCourseSubjects);
courseRouter.route("/update/:id").patch(protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), updateCourseSubjects);
var courses_default = courseRouter;
new Schema({});
var RotationActivitiesSchema = new Schema({
	numberOfWeeks: {
		type: Number,
		default: 0
	},
	numberOfConsultantWardRound: {
		type: Number,
		default: 0
	},
	numberOfClinics: {
		type: Number,
		default: 0
	},
	numberOfResidentWardRound: {
		type: Number,
		default: 0
	},
	numberOfCallDuty: {
		type: Number,
		default: 0
	},
	numberOfTheatreDays: {
		type: Number,
		default: 0
	}
}, { _id: false });
var PatientClerkedSchema = new Schema({
	patientName: { type: String },
	diagnosis: { type: String },
	clerkedAt: {
		type: Date,
		default: () => /* @__PURE__ */ new Date()
	},
	notes: { type: String }
}, { _id: false });
const procredureAction = {
	performed: "performed",
	assisted: "assisted",
	watched: "watched"
};
var ProceduresWatchedAssistedOrPerformedSchema = new Schema({
	procedureName: {
		type: String,
		required: true,
		default: ""
	},
	action: {
		type: String,
		enum: Object.values(procredureAction),
		required: true,
		default: procredureAction.watched
	},
	date: {
		type: Date,
		default: () => /* @__PURE__ */ new Date(),
		required: true
	},
	notes: {
		type: String,
		default: ""
	}
}, { _id: false });
var PracticalsPerformedSchema = new Schema({
	practicalName: {
		type: String,
		required: true,
		default: ""
	},
	coursseId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Course",
		required: true
	},
	performedAt: {
		type: Date,
		default: () => /* @__PURE__ */ new Date(),
		required: true
	},
	notes: {
		type: String,
		default: ""
	}
}, { _id: false });
var UnitActivitiesSchema = new Schema({
	unitId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Unit",
		required: true
	},
	activities: {
		type: RotationActivitiesSchema,
		default: () => ({})
	},
	patientsClerked: {
		type: [PatientClerkedSchema],
		default: []
	},
	proceduresWatchedAssistedOrPerformed: {
		type: [ProceduresWatchedAssistedOrPerformedSchema],
		default: []
	}
}, { _id: false });
var ClinicalRotationsSchema = new Schema({
	name: {
		type: String,
		required: true
	},
	description: {
		type: String,
		default: ""
	},
	department: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Department",
		required: true
	},
	supervisor: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		default: null
	},
	currentPosting: {
		type: String,
		required: true
	},
	postingType: {
		type: String,
		required: true
	},
	postingPhase: {
		type: String,
		required: true
	},
	isActive: {
		type: Boolean,
		default: true
	},
	practicalActivities: {
		type: [PracticalsPerformedSchema],
		default: []
	},
	unitActivities: {
		type: [UnitActivitiesSchema],
		default: []
	},
	class: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Class",
		required: true
	},
	unit: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Unit",
		required: true
	},
	totalPoints: {
		type: Number,
		default: 320
	},
	startDate: {
		type: Date,
		required: true
	},
	endDate: {
		type: Date,
		required: true
	}
});
var clinicalRotation_default = mongoose.model("ClinicalRotations", ClinicalRotationsSchema);
var DayEntrySchema = new Schema({
	time: {
		type: String,
		default: ""
	},
	procedure: {
		type: String,
		default: ""
	},
	procedures: {
		type: [String],
		default: []
	},
	diagnosis: {
		type: String,
		default: ""
	},
	supervisor: {
		type: String,
		default: ""
	},
	hours: {
		type: Number,
		default: 0
	},
	location: {
		type: String,
		default: ""
	},
	outcome: {
		type: String,
		default: ""
	},
	weekNumber: { type: Number },
	date: { type: Date },
	dayName: { type: String },
	attendanceStatus: {
		type: String,
		enum: [
			"present",
			"absent",
			"late",
			"excused"
		],
		default: "present"
	},
	notes: {
		type: String,
		default: ""
	}
}, { _id: true });
var TutorialEntrySchema = new Schema({
	topic: {
		type: String,
		required: true
	},
	date: { type: Date },
	presenter: {
		type: String,
		default: ""
	},
	notes: {
		type: String,
		default: ""
	}
}, { _id: true });
var PersonalEntrySchema = new Schema({
	activity: {
		type: String,
		required: true
	},
	date: { type: Date },
	notes: {
		type: String,
		default: ""
	}
}, { _id: true });
new Schema({
	student: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true
	},
	rotation: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "ClinicalRotation",
		required: true
	},
	academicYear: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "AcademicYear",
		required: true
	},
	date: {
		type: Date,
		required: true
	},
	callDuty: {
		type: [DayEntrySchema],
		default: []
	},
	clinicDays: {
		type: [DayEntrySchema],
		default: []
	},
	theatreDays: {
		type: [DayEntrySchema],
		default: []
	},
	cwrDays: {
		type: [DayEntrySchema],
		default: []
	},
	rwrDays: {
		type: [DayEntrySchema],
		default: []
	},
	other: {
		type: [DayEntrySchema],
		default: []
	},
	presentationTutorials: {
		type: [TutorialEntrySchema],
		default: []
	},
	personal: {
		type: [PersonalEntrySchema],
		default: []
	},
	notes: {
		type: String,
		default: ""
	}
}, { timestamps: true });
const StudentLogbookEntryType = {
	tutorialAndDemonstrations: "tutorialAndDemonstrations",
	clinicalActivities: "clinicalActivities",
	clinicalProcedures: "clinicalProcedures",
	clinicalPatientPresentations: "clinicalPatientPresentations"
};
let studentLogbookEntryType_ = /* @__PURE__ */ function(studentLogbookEntryType_$1) {
	studentLogbookEntryType_$1["tutorialAndDemonstrations"] = "tutorialAndDemonstrations";
	studentLogbookEntryType_$1["clinicalActivities"] = "clinicalActivities";
	studentLogbookEntryType_$1["clinicalProcedures"] = "clinicalProcedures";
	studentLogbookEntryType_$1["clinicalPatientPresentations"] = "clinicalPatientPresentations";
	return studentLogbookEntryType_$1;
}({});
mongoose.Types.ObjectId, String, Date, mongoose.Types.ObjectId, Boolean, mongoose.Types.ObjectId, mongoose.Types.ObjectId, mongoose.Types.ObjectId, String, Date, mongoose.Types.ObjectId, Boolean, mongoose.Types.ObjectId, mongoose.Types.ObjectId, String, Date, mongoose.Types.ObjectId, Boolean, mongoose.Types.ObjectId, String, mongoose.Types.ObjectId, String, String, mongoose.Types.ObjectId, String, mongoose.Types.ObjectId, String, String, Date, mongoose.Types.ObjectId, Boolean, mongoose.Types.ObjectId, mongoose.Types.ObjectId;
var StudentLogBookSchema = new Schema({
	rotationId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "ClinicalRotation",
		required: true
	},
	postingId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "PostingAndRotation",
		required: true
	},
	academicYearId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "AcademicYear",
		required: true
	},
	studentId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true
	},
	type: {
		type: String,
		enum: Object.values(StudentLogbookEntryType),
		required: true
	},
	details: {
		type: Schema.Types.Mixed,
		enum: Object.values(studentLogbookEntryType_),
		required: true,
		default: {}
	},
	attendanceStatus: {
		type: String,
		enum: [
			"present",
			"absent",
			"late",
			"excused"
		],
		default: "present"
	}
}, { timestamps: true });
mongoose.model("StudentLogBook", StudentLogBookSchema);
init_activitieslog();
init_inngest();
init_timetable();
init_classes();
init_user();
init__500LevelTimetable();
const generateTimeTable$1 = async (req, res) => {
	try {
		const { classId, academicYear, academicYearId, settings } = req.body;
		const classIdValue = classId?._id ?? classId?.id ?? classId;
		const academicYearValue = academicYearId ?? academicYear?._id ?? academicYear?.id ?? academicYear;
		if (!classIdValue || !academicYearValue || !settings) return res.status(400).json({ message: "classId, academicYear, and settings are required" });
		const classData = await classes_default$1.findById(classIdValue);
		if (!classData) return res.status(404).json({ message: "Class not found" });
		const enhancedSettings = {
			...settings,
			className: classData.name
		};
		if (settings && settings.fast) {
			const generated = await fastGenerateAndSave(classIdValue, academicYearValue, enhancedSettings);
			const userId$1 = req.user._id;
			await logActivity({
				userId: userId$1,
				action: `Generated timetable (fast) for class ID: ${classIdValue}`
			});
			return res.status(200).json({
				message: "Timetable generated (fast)",
				schedule: generated.schedule
			});
		}
		await inngest.send({
			name: "generate/timetable",
			data: {
				classId: classIdValue,
				academicYear,
				academicYearId: academicYearValue,
				settings: enhancedSettings
			}
		});
		const userId = req.user._id;
		await logActivity({
			userId,
			action: `Requested timetable generation for class ID: ${classId} `
		});
		res.status(200).json({ message: `Timetable generation initiated` });
	} catch (error) {
		res.status(500).json({
			message: `Serve error`,
			error
		});
	}
};
const getTimetable = async (req, res) => {
	try {
		const timetable = await timetable_default$1.findOne({ class: req.params.classId }).populate({
			path: "schedule.periods.subject",
			select: "name code courseID subjects.name subjects.code subjects.subjectID subjects.date subjects.startTime subjects.endTime subjects.lecturer",
			populate: {
				path: "subjects.lecturer",
				select: "name email"
			}
		}).populate("schedule.periods.lecturer", "name email");
		if (!timetable) return res.status(404).json({ message: "Timetable not found!" });
		res.json({ schedule: timetable.schedule });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
const addPeriod = async (req, res) => {
	try {
		const { classId } = req.params;
		const { day, period } = req.body;
		if (!day || !period || !period.subject || !period.startTime || !period.endTime) {
			res.status(400).json({ message: "day and period (subject, startTime, endTime) are required" });
			return;
		}
		const timetable = await timetable_default$1.findOne({ class: classId });
		if (!timetable) {
			res.status(404).json({ message: "Timetable not found for this class" });
			return;
		}
		const dayIndex = timetable.schedule.findIndex((d) => d.day.toLowerCase() === day.toLowerCase());
		if (dayIndex === -1) timetable.schedule.push({
			day,
			periods: [period]
		});
		else timetable.schedule[dayIndex].periods.push(period);
		await timetable.save();
		const updated = await timetable_default$1.findById(timetable._id).populate("schedule.periods.subject", "name code subjects.subjectID").populate("schedule.periods.lecturer", "name email");
		await logActivity({
			userId: req.user._id,
			action: `Added period to timetable`,
			details: `Class ${classId}, day ${day}, subject ${period.subject}`
		});
		res.status(201).json({ schedule: updated?.schedule });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
const updatePeriod = async (req, res) => {
	try {
		const { classId } = req.params;
		const { dayIndex, periodIndex, period } = req.body;
		if (dayIndex === void 0 || periodIndex === void 0 || !period) {
			res.status(400).json({ message: "dayIndex, periodIndex, and period are required" });
			return;
		}
		const timetable = await timetable_default$1.findOne({ class: classId });
		if (!timetable) {
			res.status(404).json({ message: "Timetable not found for this class" });
			return;
		}
		if (dayIndex < 0 || dayIndex >= timetable.schedule.length) {
			res.status(400).json({ message: "Invalid dayIndex" });
			return;
		}
		const daySchedule = timetable.schedule[dayIndex];
		if (periodIndex < 0 || periodIndex >= daySchedule?.periods.length) {
			res.status(400).json({ message: "Invalid periodIndex" });
			return;
		}
		daySchedule.periods[periodIndex] = {
			...daySchedule?.periods[periodIndex],
			...period
		};
		await timetable.save();
		const updated = await timetable_default$1.findById(timetable._id).populate("schedule.periods.subject", "name code subjects.subjectID").populate("schedule.periods.lecturer", "name email");
		await logActivity({
			userId: req.user._id,
			action: `Updated timetable period`,
			details: `Class ${classId}, day ${dayIndex}, period ${periodIndex}`
		});
		res.status(200).json({ schedule: updated?.schedule });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
const deletePeriod = async (req, res) => {
	try {
		const { classId } = req.params;
		const { dayIndex, periodIndex } = req.body;
		if (dayIndex === void 0 || periodIndex === void 0) {
			res.status(400).json({ message: "dayIndex and periodIndex are required" });
			return;
		}
		const timetable = await timetable_default$1.findOne({ class: classId });
		if (!timetable) {
			res.status(404).json({ message: "Timetable not found for this class" });
			return;
		}
		if (dayIndex < 0 || dayIndex >= timetable.schedule.length) {
			res.status(400).json({ message: "Invalid dayIndex" });
			return;
		}
		const daySchedule = timetable.schedule[dayIndex];
		if (periodIndex < 0 || periodIndex >= daySchedule?.periods.length) {
			res.status(400).json({ message: "Invalid periodIndex" });
			return;
		}
		daySchedule?.periods.splice(periodIndex, 1);
		await timetable.save();
		const updated = await timetable_default$1.findById(timetable._id).populate("schedule.periods.subject", "name code subjects.subjectID").populate("schedule.periods.lecturer", "name email");
		await logActivity({
			userId: req.user._id,
			action: `Deleted timetable period`,
			details: `Class ${classId}, day ${dayIndex}, period ${periodIndex}`
		});
		res.status(200).json({ schedule: updated?.schedule });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
async function fastGenerateAndSave(classId, academicYearId, settings) {
	const is400Level = /^400\s*level/i.test(settings?.className || "");
	const is500Level = /^500\s*level/i.test(settings?.className || "");
	if (is400Level) return await generate400LevelSchedule(classId, academicYearId, settings);
	if (is500Level) return await generate500LevelSchedule(classId, academicYearId, settings);
	const cls = await classes_default$1.findById(classId).populate("courses");
	if (!cls) throw new Error("Class not found");
	const courses = (cls.courses || []).map((c) => ({
		id: String(c._id),
		name: c.name
	}));
	const teachers = await user_default$1.find({ role: "teacher" }).select("_id name teacherSubject");
	const teachersByCourse = {};
	for (const t of teachers) {
		const subs = Array.isArray(t.teacherSubject) ? t.teacherSubject : [];
		for (const s of subs) {
			const key = String(s);
			teachersByCourse[key] = teachersByCourse[key] || [];
			teachersByCourse[key].push(String(t._id));
		}
	}
	const days = [
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday"
	];
	const periodsPerDay = Number(settings?.periods) || 5;
	const parseHM = (h) => {
		const [hh, mm] = h.split(":").map(Number);
		return hh * 60 + mm;
	};
	const fmt = (mins) => {
		return `${Math.floor(mins / 60).toString().padStart(2, "0")}:${(mins % 60).toString().padStart(2, "0")}`;
	};
	let start = parseHM(settings?.startTime || "08:00");
	let end = parseHM(settings?.endTime || "16:00");
	const total = Math.max(1, periodsPerDay);
	const slotLength = Math.floor((end - start) / total) || 60;
	const schedule = [];
	const allSlots = [];
	for (const day of days) {
		let cur = start;
		for (let p = 0; p < periodsPerDay; p++) {
			const s = fmt(cur);
			cur += slotLength;
			const e = fmt(cur);
			allSlots.push({
				day,
				startTime: s,
				endTime: e
			});
		}
	}
	let courseIdx = 0;
	for (const day of days) {
		const dayPeriods = [];
		for (let p = 0; p < periodsPerDay; p++) {
			const course = courses.length ? courses[courseIdx % courses.length] : null;
			let lecturerId = null;
			if (course && teachersByCourse[course.id] && teachersByCourse[course.id].length) {
				const list = teachersByCourse[course.id];
				lecturerId = list[courseIdx % list.length] || null;
			}
			const slot = allSlots.find((s) => s.day === day && s.startTime === fmt(start + p * slotLength));
			const startTime = slot ? slot.startTime : fmt(start + p * slotLength);
			const endTime = slot ? slot.endTime : fmt(start + (p + 1) * slotLength);
			dayPeriods.push({
				subject: course ? new mongoose.Types.ObjectId(course.id) : null,
				lecturer: lecturerId ? new mongoose.Types.ObjectId(lecturerId) : null,
				startTime,
				endTime
			});
			courseIdx++;
		}
		schedule.push({
			day,
			periods: dayPeriods
		});
	}
	await timetable_default$1.findOneAndDelete({
		class: classId,
		academicYear: academicYearId
	});
	await timetable_default$1.create({
		class: classId,
		academicYear: academicYearId,
		schedule
	});
	return {
		success: true,
		schedule: (await timetable_default$1.findOne({
			class: classId,
			academicYear: academicYearId
		}).populate("schedule.periods.subject", "name code subjects.subjectID").populate("schedule.periods.lecturer", "name email idNumber"))?.schedule ?? schedule
	};
}
async function generate500LevelSchedule(classId, academicYearId, settings) {
	const cls = await classes_default$1.findById(classId).populate("courses");
	if (!cls) throw new Error("Class not found");
	const academicYearDoc = await (await import("./academicYear-32nr2z7x.js")).default.findById(academicYearId);
	const clockPhase = academicYearDoc?.clockPhase ?? settings?.clockPhase ?? "phase1";
	console.log(`[500-Level Timetable] Generating for class: ${cls.name}, phase: ${clockPhase}, from DB: ${academicYearDoc?.clockPhase ?? "N/A"}, from settings: ${settings?.clockPhase ?? "N/A"}`);
	const teachers = await user_default$1.find({ role: "teacher" }).select("_id teacherSubject");
	const teachersByCourse = {};
	for (const t of teachers) {
		const subs = Array.isArray(t.teacherSubject) ? t.teacherSubject.map(String) : [];
		for (const s of subs) {
			teachersByCourse[s] = teachersByCourse[s] || [];
			teachersByCourse[s].push(String(t._id));
		}
	}
	const getLecturerForCourseId = (courseDbId) => {
		if (!courseDbId) return null;
		const list = teachersByCourse[courseDbId] ?? [];
		return list.length ? list[0] : null;
	};
	const schedule = build500LevelTimetablePlan(clockPhase, cls.courses).map(({ day, periods }) => ({
		day,
		periods: periods.map((period) => {
			const course = period.courseCode ? resolve500LevelCourse(cls.courses, period.courseCode) : null;
			const courseDbId = course?._id ? String(course._id) : null;
			const lecturerId = getLecturerForCourseId(courseDbId);
			return {
				subject: courseDbId ? new mongoose.Types.ObjectId(courseDbId) : void 0,
				lecturer: lecturerId ? new mongoose.Types.ObjectId(lecturerId) : void 0,
				startTime: period.startTime,
				endTime: period.endTime,
				...period.kind === "clinical" ? { isClinical: true } : {},
				...period.kind === "optional" || period.isOptional ? {
					isOptional: true,
					displayLabel: period.displayLabel ?? (period.kind === "optional" ? "Optional Activity" : void 0)
				} : {}
			};
		})
	}));
	await timetable_default$1.findOneAndDelete({
		class: classId,
		academicYear: academicYearId
	});
	await timetable_default$1.create({
		class: classId,
		academicYear: academicYearId,
		schedule
	});
	return {
		success: true,
		schedule: (await timetable_default$1.findOne({
			class: classId,
			academicYear: academicYearId
		}).populate("schedule.periods.subject", "name code subjects.subjectID").populate("schedule.periods.lecturer", "name email idNumber"))?.schedule ?? schedule
	};
}
async function generate400LevelSchedule(classId, academicYearId, settings) {
	const cls = await classes_default$1.findById(classId).populate("courses");
	if (!cls) throw new Error("Class not found");
	const coursesByName = /* @__PURE__ */ new Map();
	const courseMap = /* @__PURE__ */ new Map();
	for (const course of cls.courses) {
		const courseObj = course;
		const courseName = courseObj.name?.toLowerCase() ?? "";
		const courseId = String(courseObj._id ?? course);
		if (courseName) {
			coursesByName.set(courseName, courseId);
			courseMap.set(courseObj.name, courseId);
		}
	}
	const teachers = await user_default$1.find({ role: "teacher" }).select("_id name teacherSubject");
	const teachersByCourse = {};
	for (const t of teachers) {
		const subs = Array.isArray(t.teacherSubject) ? t.teacherSubject : [];
		for (const s of subs) {
			const key = String(s);
			teachersByCourse[key] = teachersByCourse[key] || [];
			teachersByCourse[key].push(String(t._id));
		}
	}
	const getLecturerForCourse = (courseId) => {
		const lecturers = teachersByCourse[courseId] || [];
		return lecturers.length > 0 ? lecturers[0] : null;
	};
	const schedule = [
		{
			day: "Monday",
			periods: [
				{
					subject: coursesByName.get("medicine") ? new mongoose.Types.ObjectId(coursesByName.get("medicine")) : null,
					lecturer: coursesByName.get("medicine") ? getLecturerForCourse(coursesByName.get("medicine")) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("medicine"))) : null : null,
					startTime: "08:00",
					endTime: "09:00"
				},
				{
					subject: coursesByName.get("surgery") ? new mongoose.Types.ObjectId(coursesByName.get("surgery")) : null,
					lecturer: coursesByName.get("surgery") ? getLecturerForCourse(coursesByName.get("surgery")) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("surgery"))) : null : null,
					startTime: "09:00",
					endTime: "10:00"
				},
				{
					subject: null,
					lecturer: null,
					startTime: "10:00",
					endTime: "12:00",
					isClinical: true
				},
				{
					subject: coursesByName.get("chemical pathology") ? new mongoose.Types.ObjectId(coursesByName.get("chemical pathology")) : null,
					lecturer: coursesByName.get("chemical pathology") ? getLecturerForCourse(coursesByName.get("chemical pathology")) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("chemical pathology"))) : null : null,
					startTime: "12:00",
					endTime: "14:00"
				},
				{
					subject: coursesByName.get("chemical pathology") ? new mongoose.Types.ObjectId(coursesByName.get("chemical pathology")) : null,
					lecturer: coursesByName.get("chemical pathology") ? getLecturerForCourse(coursesByName.get("chemical pathology")) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("chemical pathology"))) : null : null,
					startTime: "14:00",
					endTime: "17:00"
				}
			]
		},
		{
			day: "Tuesday",
			periods: [
				{
					subject: coursesByName.get("surgery") ? new mongoose.Types.ObjectId(coursesByName.get("surgery")) : null,
					lecturer: coursesByName.get("surgery") ? getLecturerForCourse(coursesByName.get("surgery")) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("surgery"))) : null : null,
					startTime: "08:00",
					endTime: "09:00"
				},
				{
					subject: coursesByName.get("medicine") ? new mongoose.Types.ObjectId(coursesByName.get("medicine")) : null,
					lecturer: coursesByName.get("medicine") ? getLecturerForCourse(coursesByName.get("medicine")) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("medicine"))) : null : null,
					startTime: "09:00",
					endTime: "10:00"
				},
				{
					subject: null,
					lecturer: null,
					startTime: "10:00",
					endTime: "12:00",
					isClinical: true
				},
				{
					subject: coursesByName.get("medical microbiology") ? new mongoose.Types.ObjectId(coursesByName.get("medical microbiology")) : null,
					lecturer: coursesByName.get("medical microbiology") ? getLecturerForCourse(coursesByName.get("medical microbiology")) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("medical microbiology"))) : null : null,
					startTime: "12:00",
					endTime: "14:00"
				},
				{
					subject: coursesByName.get("medical microbiology") ? new mongoose.Types.ObjectId(coursesByName.get("medical microbiology")) : null,
					lecturer: coursesByName.get("medical microbiology") ? getLecturerForCourse(coursesByName.get("medical microbiology")) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("medical microbiology"))) : null : null,
					startTime: "14:00",
					endTime: "17:00"
				}
			]
		},
		{
			day: "Wednesday",
			periods: [
				{
					subject: coursesByName.get("medicine") ? new mongoose.Types.ObjectId(coursesByName.get("medicine")) : null,
					lecturer: coursesByName.get("medicine") ? getLecturerForCourse(coursesByName.get("medicine")) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("medicine"))) : null : null,
					startTime: "08:00",
					endTime: "09:00"
				},
				{
					subject: coursesByName.get("surgery") ? new mongoose.Types.ObjectId(coursesByName.get("surgery")) : null,
					lecturer: coursesByName.get("surgery") ? getLecturerForCourse(coursesByName.get("surgery")) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("surgery"))) : null : null,
					startTime: "09:00",
					endTime: "10:00"
				},
				{
					subject: null,
					lecturer: null,
					startTime: "10:00",
					endTime: "12:00",
					isClinical: true
				},
				{
					subject: coursesByName.get("hematology") ? new mongoose.Types.ObjectId(coursesByName.get("hematology")) : null,
					lecturer: coursesByName.get("hematology") ? getLecturerForCourse(coursesByName.get("hematology")) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("hematology"))) : null : null,
					startTime: "12:00",
					endTime: "14:00"
				},
				{
					subject: coursesByName.get("hematology") ? new mongoose.Types.ObjectId(coursesByName.get("hematology")) : null,
					lecturer: coursesByName.get("hematology") ? getLecturerForCourse(coursesByName.get("hematology")) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("hematology"))) : null : null,
					startTime: "14:00",
					endTime: "17:00"
				}
			]
		},
		{
			day: "Thursday",
			periods: [
				{
					subject: coursesByName.get("surgery") ? new mongoose.Types.ObjectId(coursesByName.get("surgery")) : null,
					lecturer: coursesByName.get("surgery") ? getLecturerForCourse(coursesByName.get("surgery")) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("surgery"))) : null : null,
					startTime: "08:00",
					endTime: "09:00"
				},
				{
					subject: coursesByName.get("medicine") ? new mongoose.Types.ObjectId(coursesByName.get("medicine")) : null,
					lecturer: coursesByName.get("medicine") ? getLecturerForCourse(coursesByName.get("medicine")) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("medicine"))) : null : null,
					startTime: "09:00",
					endTime: "10:00"
				},
				{
					subject: null,
					lecturer: null,
					startTime: "10:00",
					endTime: "12:00",
					isClinical: true
				},
				{
					subject: coursesByName.get("histopathology") ? new mongoose.Types.ObjectId(coursesByName.get("histopathology")) : null,
					lecturer: coursesByName.get("histopathology") ? getLecturerForCourse(coursesByName.get("histopathology")) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("histopathology"))) : null : null,
					startTime: "12:00",
					endTime: "14:00"
				},
				{
					subject: coursesByName.get("histopathology") ? new mongoose.Types.ObjectId(coursesByName.get("histopathology")) : null,
					lecturer: coursesByName.get("histopathology") ? getLecturerForCourse(coursesByName.get("histopathology")) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("histopathology"))) : null : null,
					startTime: "14:00",
					endTime: "17:00"
				}
			]
		},
		{
			day: "Friday",
			periods: [
				{
					subject: coursesByName.get("community medicine") ? new mongoose.Types.ObjectId(coursesByName.get("community medicine")) : null,
					lecturer: coursesByName.get("community medicine") ? getLecturerForCourse(coursesByName.get("community medicine")) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("community medicine"))) : null : null,
					startTime: "08:00",
					endTime: "10:00"
				},
				{
					subject: coursesByName.get("pharmacology") ? new mongoose.Types.ObjectId(coursesByName.get("pharmacology")) : null,
					lecturer: coursesByName.get("pharmacology") ? getLecturerForCourse(coursesByName.get("pharmacology")) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("pharmacology"))) : null : null,
					startTime: "10:00",
					endTime: "14:00"
				},
				{
					subject: coursesByName.get("pharmacology") ? new mongoose.Types.ObjectId(coursesByName.get("pharmacology")) : null,
					lecturer: coursesByName.get("pharmacology") ? getLecturerForCourse(coursesByName.get("pharmacology")) ? new mongoose.Types.ObjectId(getLecturerForCourse(coursesByName.get("pharmacology"))) : null : null,
					startTime: "14:00",
					endTime: "17:00"
				}
			]
		}
	];
	await timetable_default$1.findOneAndDelete({
		class: classId,
		academicYear: academicYearId
	});
	await timetable_default$1.create({
		class: classId,
		academicYear: academicYearId,
		schedule
	});
	return {
		success: true,
		schedule: (await timetable_default$1.findOne({
			class: classId,
			academicYear: academicYearId
		}).populate("schedule.periods.subject", "name code subjects.subjectID").populate("schedule.periods.lecturer", "name email idNumber"))?.schedule ?? schedule
	};
}
var timeRouter = express.Router();
timeRouter.post("/generate", protect, authorize(["admin"]), generateTimeTable$1);
timeRouter.get("/:classId", protect, getTimetable);
timeRouter.post("/:classId/periods", protect, authorize(["admin"]), addPeriod);
timeRouter.put("/:classId/periods", protect, authorize(["admin"]), updatePeriod);
timeRouter.delete("/:classId/periods", protect, authorize(["admin"]), deletePeriod);
var timetable_default = timeRouter;
var submissionSchema = new Schema({
	exam: {
		type: Schema.Types.ObjectId,
		ref: "Exam",
		required: true
	},
	student: {
		type: Schema.Types.ObjectId,
		ref: "User",
		required: true
	},
	answers: [{
		questionId: String,
		answer: String
	}],
	score: {
		type: Number,
		default: 0
	},
	submittedAt: {
		type: Date,
		default: Date.now
	}
});
submissionSchema.index({
	exam: 1,
	student: 1
}, { unique: true });
var submission_default = mongoose.model("Submission", submissionSchema);
init_activitieslog();
init_inngest();
init_exam();
const triggerExamGeneration = async (req, res) => {
	try {
		const { title, subject, class: classId, duration, dueDate, topic, difficulty, count } = req.body;
		const subjectDoc = await courses_default$1.findById(subject);
		if (!subjectDoc) return res.status(404).json({ message: `Subject not found!` });
		const lecturerId = req.user._id;
		const draftExam = await exam_default$1.create({
			title: title || `Auto-Generated ${topic}`,
			subject,
			class: classId,
			lecturer: lecturerId,
			duration: duration || 60,
			dueDate: dueDate || new Date(Date.now() + 10080 * 60 * 1e3),
			isActive: false,
			questions: []
		});
		const userId = req.user._id;
		await logActivity({
			userId,
			action: `User triggered exam generation: ${draftExam._id}`
		});
		await inngest.send({
			name: "exam/generate",
			data: {
				examId: draftExam._id,
				topic,
				subjectName: subjectDoc?.name,
				difficulty: difficulty || "Medium",
				count: typeof count === "number" ? count : count ? Number(count) : 10
			}
		});
		return res.status(202).json({
			message: `Exam generation started`,
			examId: draftExam._id
		});
	} catch (error) {
		return res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const deleteExam = async (req, res) => {
	try {
		const examId = req.params.id;
		const user = req.user;
		const exam = await exam_default$1.findById(examId);
		if (!exam) return res.status(404).json({ message: "Exam not found!" });
		if (user.role !== "admin" && exam.lecturer.toString() !== user._id.toString()) return res.status(401).json({ message: "Not authorized to delete this exam!" });
		await exam_default$1.findByIdAndDelete(examId);
		await logActivity({
			userId: user._id,
			action: `User ${user._id} deleted exam ${examId}`
		});
		return res.json({ message: "Exam deleted" });
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
};
const getExams = async (req, res) => {
	try {
		const user = req.user;
		let query = {};
		if (user.role === "student") {
			const studentClassId = user.studentClasses?.[0]?._id || user.studentClass?._id || user.StudentClass?._id || user.StudentClass || user.studentClass;
			if (!studentClassId) return res.json([]);
			try {
				await exam_default$1.deleteMany({
					class: studentClassId,
					dueDate: { $lt: /* @__PURE__ */ new Date() }
				});
			} catch (err) {
				console.warn("Failed to cleanup expired exams for class", studentClassId, err);
			}
			query = {
				class: studentClassId,
				isActive: true,
				dueDate: { $gte: /* @__PURE__ */ new Date() }
			};
		} else if (user.role === "teacher") query = { lecturer: user._id };
		const exams = await exam_default$1.find(query).populate("subject", "name subjects.subjectID").populate("class", "name section").select("-questions.correctAnswer");
		res.json(exams);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
const getExamById = async (req, res) => {
	try {
		const examId = req.params.id;
		const user = req.user;
		let query = exam_default$1.findById(examId).populate("subject", "name code subjects.subjectID").populate("class", "name section").populate("lecturer", "name email idNumber");
		if (user.role === "teacher" || user.role === "admin") query = query.select("+questions.correctAnswer");
		const exam = await query;
		if (!exam) return res.status(404).json({ message: `Exam not found!` });
		if (user.role === "student" && exam.class.toString() !== user.studentClass.toString()) {
			if ((exam.class._id ? exam.class._id.toString() : exam.class.toString()) !== (user.studentClass ? user.studentClass.toString() : "")) return res.status(403).json({ message: `You are not authorized to view this exam!` });
		}
		res.json(exam);
	} catch (error) {
		console.error(error);
		if (error.name === "CastError") return res.status(400).json({ message: `Invalid Exam ID!` });
		return res.status(500).json({ message: `Internal server error!` });
	}
};
const toggleExamStatus = async (req, res) => {
	try {
		const examId = req.params.id;
		const user = req.user;
		const exam = await exam_default$1.findById(examId);
		if (!exam) return res.status(404).json({ message: "Exam not found!" });
		if (user.role !== "admin" && exam.lecturer.toString() !== user._id.toString()) return res.status(401).json({ message: `Not authorized to modify this exam!` });
		exam.isActive = !exam.isActive;
		await exam.save();
		const userId = req.user._id;
		await logActivity({
			userId,
			action: `User ${userId} toggled exam status!`
		});
		res.json({
			message: `Exam is now ${exam.isActive ? "Active" : "Inactive"}`,
			_id: exam._id,
			isActive: exam.isActive
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
const submitExam = async (req, res) => {
	try {
		const { answers } = req.body;
		const studentId = req.user._id;
		const examId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id || "";
		if (!examId) return res.status(400).json({ message: "Exam ID is required" });
		if (await submission_default.findOne({
			exam: examId,
			student: studentId
		})) return res.status(400).json({ message: `You have already submitted this exam!` });
		const exam = await exam_default$1.findById(examId).select("+questions.correctAnswers");
		if (!exam) return res.status(404).json({ message: `Exam not found!` });
		let score = 0;
		let totalPoints = 0;
		exam.questions.forEach((question) => {
			totalPoints += question.points;
			const studentAns = answers.find((a) => a.questionId === question._id.toString());
			if (studentAns && studentAns.answer === question.correctAnswer) score += question.points;
		});
		const examObjectId = new mongoose.Types.ObjectId(examId);
		const studentObjectId = new mongoose.Types.ObjectId(studentId);
		await submission_default.create({
			exam: examObjectId,
			student: studentObjectId,
			answers,
			score
		});
		const userId = req.user._id;
		await logActivity({
			userId,
			action: `User ${userId} submitted an exam!`
		});
		res.status(201).json({
			message: `Exam ${examId} submitted successfully`,
			score,
			total: totalPoints
		});
	} catch (error) {
		res.status(500).json({ message: `${error.message}` });
	}
};
const getExamResult = async (req, res) => {
	try {
		const studentId = req.user._id;
		const examId = req.params.id;
		const submission = await submission_default.findOne({
			exam: examId,
			student: studentId
		}).populate({
			path: "exam",
			select: "title questions._id questions.correctAnswers"
		});
		if (!submission) return res.status(404).json({ message: `No submission found!` });
		res.json(submission);
	} catch (error) {
		res.status(500).json({ messgae: `${error.message}` });
	}
};
var examRouter = express.Router();
examRouter.post("/generate", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), triggerExamGeneration);
examRouter.post("/:id/submit", protect, authorize(["admin", "student"]), submitExam);
examRouter.patch("/:id/status", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), toggleExamStatus);
examRouter.delete("/:id", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), deleteExam);
examRouter.get("/:id/result", protect, authorize([
	"admin",
	"teacher",
	"student",
	"unitconsultant",
	"unitresident"
]), getExamResult);
examRouter.get("/:id", protect, authorize([
	"admin",
	"teacher",
	"student",
	"unitconsultant",
	"unitresident"
]), getExamById);
examRouter.get("/", protect, authorize([
	"admin",
	"teacher",
	"student",
	"unitconsultant",
	"unitresident"
]), getExams);
var exam_default = examRouter;
var AcademicSessionSchema = new Schema({
	name: {
		type: String,
		required: [true, "Academic session name is required"]
	},
	startsAt: {
		type: Date,
		required: [true, "Session start date is required"]
	},
	endsAt: {
		type: Date,
		required: [true, "Session end date is required"]
	},
	isCurrent: {
		type: Boolean,
		default: false
	}
}, { timestamps: true });
AcademicSessionSchema.index({ name: 1 }, { unique: true });
var academicSession_default = mongoose.model("AcademicSession", AcademicSessionSchema);
var SemesterSchema = new Schema({
	name: {
		type: String,
		required: [true, "Semester name is required"]
	},
	academicSession: {
		type: Schema.Types.ObjectId,
		ref: "AcademicSession",
		required: [true, "Academic session reference is required"]
	},
	order: {
		type: Number,
		required: true,
		default: 1
	},
	isActive: {
		type: Boolean,
		default: true
	},
	startsAt: {
		type: Date,
		default: null
	},
	endsAt: {
		type: Date,
		default: null
	}
}, { timestamps: true });
SemesterSchema.index({
	academicSession: 1,
	order: 1
}, { unique: true });
var semester_default = mongoose.model("Semester", SemesterSchema);
var GroupSchema = new Schema({
	groupId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Class"
	},
	group: { type: Schema.Types.Mixed },
	assigned: {
		type: [{
			startDate: Date,
			endDate: Date
		}],
		default: []
	}
}, { _id: false });
var PostingSchema$1 = new Schema({
	postingName: {
		type: String,
		required: true
	},
	startDate: { type: Date },
	endDate: { type: Date },
	meta: {
		type: Schema.Types.Mixed,
		default: {}
	},
	groups: {
		type: [GroupSchema],
		default: []
	},
	createdAt: {
		type: Date,
		default: () => /* @__PURE__ */ new Date()
	}
}, { collection: "postingsandrotations" });
var postingsAndRotations_default = mongoose.model("PostingAndRotation", PostingSchema$1);
init_activitieslog$1();
init_exam();
init_classes();
init_user();
var getTodayName = () => (/* @__PURE__ */ new Date()).toLocaleDateString("en-us", { weekday: "long" });
var formatClockPhaseLabel = (clockPhase, phaseConfig) => {
	if (!clockPhase) return null;
	const phaseName = phaseConfig?.[clockPhase]?.name;
	if (phaseName) return `${clockPhase.replace("phase", "Phase ")} · ${phaseName}`;
	return `${clockPhase.replace("phase", "Phase ")}`;
};
const buildAcademicOverviewPayload = ({ sessionsCount, semestersCount, classesCount, coursesCount, assessmentsCount, activeAcademicYearName, currentSemesterLabel, isPostingCalendar, classSummaries }) => ({
	sessions: sessionsCount,
	semesters: semestersCount,
	classes: classesCount,
	courses: coursesCount,
	assessments: assessmentsCount,
	details: {
		activeAcademicYear: activeAcademicYearName ?? null,
		currentSemester: isPostingCalendar ? classSummaries?.find((summary) => summary.phaseLabel)?.phaseLabel ?? currentSemesterLabel ?? null : currentSemesterLabel ?? null,
		classes: (classSummaries ?? []).map((summary) => ({
			name: summary.name,
			courseCount: summary.courseCount ?? 0,
			assessmentCount: summary.assessmentCount ?? 0,
			phaseLabel: summary.phaseLabel ?? null
		}))
	}
});
const buildClinicalOverviewPayload = ({ postingsCount, departmentsCount, unitsCount, teamsCount, rotationsCount, postingSummaries, rotationTeamSummaries, rotationSummaries }) => ({
	postings: postingsCount,
	departments: departmentsCount,
	units: unitsCount,
	teams: teamsCount,
	rotations: rotationsCount,
	details: {
		postings: (postingSummaries ?? []).map((summary) => ({
			className: summary.className,
			phaseLabel: summary.phaseLabel ?? null,
			hasSchedule: summary.hasSchedule ?? false
		})),
		rotationTeams: (rotationTeamSummaries ?? []).map((summary) => ({
			className: summary.className,
			teamCount: summary.teamCount ?? 0
		})),
		rotations: (rotationSummaries ?? []).map((summary) => ({
			className: summary.className,
			name: summary.name,
			dateRange: summary.dateRange,
			duration: summary.duration
		}))
	}
});
const getDashboradStats = async (req, res) => {
	try {
		const user = req.user;
		let stats = {};
		const activityQuery = user.role === "admin" ? {} : { user: user._id };
		const formattedActivity = (await activitieslog_default$1.find(activityQuery).sort({ createdAt: -1 }).limit(5).populate("user", "name")).map((log) => `${log.user.name}: ${log.action} (${new Date(log.createdAt).toLocaleDateString([], {
			hour: "2-digit",
			minute: "2-digit"
		})})`);
		if (user.role === "admin") stats = {
			totalStudents: await user_default$1.countDocuments({ role: "student" }),
			totalParents: await user_default$1.countDocuments({ role: "parent" }),
			totalStaff: await user_default$1.countDocuments({ role: "teacher" }),
			activeSession: (await academicYear_default$1.findOne({ isCurrent: true }))?.name || "N/A",
			recentActivities: formattedActivity
		};
		else if (user.role === "teacher") {
			const myClassessCount = await classes_default$1.countDocuments({ classTeacher: user._id });
			const myExamsIds = (await exam_default$1.find({ teacher: user._id }).select("_id")).map((exam) => exam._id);
			const pendingGrading = await submission_default.countDocuments({
				exam: { $in: myExamsIds },
				score: 0
			});
			getTodayName();
			stats = {
				myClassessCount,
				pendingGrading,
				nextClass: " Pediatrics = 500 Level",
				nextClassTime: "08:00 AM",
				recentActivities: formattedActivity
			};
		} else if (user.role === "student") {
			const nextExam = await exam_default$1.findOne({
				class: user.studentClass,
				dueDate: { $gte: /* @__PURE__ */ new Date() }
			}).sort({ dueDate: 1 });
			stats = {
				myAttendance: "98%",
				pendingAssignments: await exam_default$1.countDocuments({
					class: user.studentClass,
					isActive: true,
					dueDate: { $gte: /* @__PURE__ */ new Date() }
				}),
				nextExam,
				nextExamDate: nextExam ? new Date(nextExam.dueDate).toLocaleDateString() : "",
				recentActivities: formattedActivity
			};
		}
		res.json(stats);
	} catch (error) {
		res.status(500).json({ message: `Server error: ${error}` });
	}
};
const getAdminOverview = async (req, res) => {
	try {
		const now = /* @__PURE__ */ new Date();
		const [sessionsCount, semestersCount, classesCount, coursesCount, assessmentsCount, departmentsCount, unitsCount, postings, rotations, currentAcademicYear, institution] = await Promise.all([
			academicSession_default.countDocuments({ isCurrent: true }),
			semester_default.countDocuments(),
			classes_default$1.countDocuments(),
			courses_default$1.countDocuments(),
			exam_default$1.countDocuments({ isActive: true }),
			departments_default.countDocuments(),
			units_default.countDocuments(),
			postingsAndRotations_default.find({}).lean(),
			clinicalRotation_default.find({}).lean(),
			academicYear_default$1.findOne({ isCurrent: true }).lean(),
			institution_default.findOne({}).lean()
		]);
		postings.filter((posting) => {
			const hasStart = posting.startDate;
			const hasEnd = posting.endDate;
			if (!hasStart && !hasEnd) return true;
			const start = hasStart ? new Date(posting.startDate) : null;
			const end = hasEnd ? new Date(posting.endDate) : null;
			if (start && end) return now >= start && now <= end;
			if (start) return now >= start;
			if (end) return now <= end;
			return true;
		}).length;
		rotations.filter((rotation) => {
			if (rotation.isActive === false) return false;
			const hasStart = rotation.startDate;
			const hasEnd = rotation.endDate;
			if (!hasStart && !hasEnd) return true;
			const start = hasStart ? new Date(rotation.startDate) : null;
			const end = hasEnd ? new Date(rotation.endDate) : null;
			if (start && end) return now >= start && now <= end;
			if (start) return now >= start;
			if (end) return now <= end;
			return true;
		}).length;
		const teamCount = postings.reduce((total, posting) => {
			return total + (Array.isArray(posting.groups) ? posting.groups.length : 0);
		}, 0);
		const currentAcademicClasses = currentAcademicYear?._id ? await classes_default$1.find({ academicYear: currentAcademicYear._id }).lean() : [];
		const academicClocks = currentAcademicYear?._id ? await academicClock_default$1.find({ academicYear: currentAcademicYear._id }).lean() : [];
		const academicClockByClassId = new Map(academicClocks.map((clock) => [String(clock.classId), clock]));
		const postingSummaries = currentAcademicClasses.filter((classDoc) => academicClockByClassId.has(String(classDoc._id))).map((classDoc) => {
			const academicClock = academicClockByClassId.get(String(classDoc._id));
			const phaseLabel = academicClock?.clockPhase ? formatClockPhaseLabel(academicClock.clockPhase, academicClock.phaseConfig) : null;
			const hasSchedule = postings.some((posting) => {
				return Array.isArray(posting.groups) && posting.groups.some((group) => String(group.groupId) === String(classDoc._id));
			});
			return {
				className: classDoc.name,
				phaseLabel,
				hasSchedule
			};
		});
		const rotationTeamSummaries = currentAcademicClasses.map((classDoc) => {
			const teamCountForClass = postings.reduce((total, posting) => {
				if (!Array.isArray(posting.groups)) return total;
				return total + posting.groups.filter((group) => String(group.groupId) === String(classDoc._id)).length;
			}, 0);
			return {
				className: classDoc.name,
				teamCount: teamCountForClass
			};
		}).filter((summary) => summary.teamCount > 0);
		const activeRotationsForClasses = rotations.filter((rotation) => {
			if (rotation.isActive === false) return false;
			const hasStart = rotation.startDate;
			const hasEnd = rotation.endDate;
			if (!hasStart && !hasEnd) return true;
			const start = hasStart ? new Date(rotation.startDate) : null;
			const end = hasEnd ? new Date(rotation.endDate) : null;
			if (start && end) return now >= start && now <= end;
			if (start) return now >= start;
			if (end) return now <= end;
			return true;
		});
		const rotationSummaries = currentAcademicClasses.flatMap((classDoc) => {
			return activeRotationsForClasses.filter((rotation) => String(rotation.class) === String(classDoc._id)).map((rotation) => {
				const start = rotation.startDate ? new Date(rotation.startDate) : null;
				const end = rotation.endDate ? new Date(rotation.endDate) : null;
				const duration = start && end ? `${Math.round((end.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24 * 7))} weeks` : "Open-ended";
				return {
					className: classDoc.name,
					name: rotation.name || "Clinical rotation",
					dateRange: start && end ? `${start.toLocaleDateString()} → ${end.toLocaleDateString()}` : "Dates pending",
					duration
				};
			});
		});
		const activeSemester = institution?.academicSession ? await semester_default.findOne({
			academicSession: institution.academicSession,
			isActive: true
		}).sort({ order: 1 }).lean() : null;
		const isPostingCalendar = String(institution?.academicCalendarType ?? "").toLowerCase().includes("posting") || String(institution?.academicCalendarType ?? "").toLowerCase().includes("clinical");
		const classSummaries = currentAcademicYear?._id ? await Promise.all((await classes_default$1.find({ academicYear: currentAcademicYear._id }).lean()).map(async (classDoc) => {
			const [courseCount, assessmentCount, academicClock] = await Promise.all([
				courses_default$1.countDocuments({
					academicYear: currentAcademicYear._id,
					isActive: true,
					studentClasses: { $elemMatch: { classID: classDoc._id } }
				}),
				exam_default$1.countDocuments({
					class: classDoc._id,
					isActive: true
				}),
				academicClock_default$1.findOne({
					academicYear: currentAcademicYear._id,
					classId: classDoc._id
				}).lean()
			]);
			return {
				name: classDoc.name,
				courseCount,
				assessmentCount,
				phaseLabel: academicClock?.clockPhase ? formatClockPhaseLabel(academicClock.clockPhase, academicClock.phaseConfig) : null
			};
		})) : [];
		const academicPayload = buildAcademicOverviewPayload({
			sessionsCount,
			semestersCount,
			classesCount,
			coursesCount,
			assessmentsCount,
			activeAcademicYearName: currentAcademicYear?.name ?? null,
			currentSemesterLabel: activeSemester?.name ?? null,
			isPostingCalendar,
			classSummaries
		});
		const clinicalPayload = buildClinicalOverviewPayload({
			postingsCount: postingSummaries.length,
			departmentsCount,
			unitsCount,
			teamsCount: teamCount,
			rotationsCount: activeRotationsForClasses.length,
			postingSummaries,
			rotationTeamSummaries,
			rotationSummaries
		});
		res.json({
			academic: academicPayload,
			clinical: clinicalPayload
		});
	} catch (error) {
		res.status(500).json({ message: `Server error: ${error}` });
	}
};
var dashBoardRouter = express.Router();
dashBoardRouter.get("/stats", protect, getDashboradStats);
dashBoardRouter.get("/overview", protect, getAdminOverview);
var dashboard_default = dashBoardRouter;
var eventBus = new EventEmitter();
function emitSystemEvent$1(eventName, data) {
	const payload = {
		source: "backend",
		name: eventName,
		timestamp: (/* @__PURE__ */ new Date()).toISOString(),
		data
	};
	eventBus.emit(eventName, payload);
}
init_notification();
init_user();
var DUPLICATE_WINDOW_MS = 300 * 1e3;
const createNotificationIfUnique$1 = async (payload) => {
	const now = /* @__PURE__ */ new Date();
	const duplicateSince = new Date(now.getTime() - DUPLICATE_WINDOW_MS);
	const search = {
		userId: payload.userId,
		title: payload.title,
		message: payload.message,
		type: payload.type ?? "system",
		createdAt: { $gte: duplicateSince }
	};
	const existing = await Notification.findOne(search);
	if (existing) return existing;
	return Notification.create({
		userId: payload.userId,
		role: payload.role,
		title: payload.title,
		message: payload.message,
		type: payload.type ?? "system",
		isRead: false,
		link: payload.link,
		metadata: payload.metadata,
		actorName: payload.actorName,
		actorRole: payload.actorRole
	});
};
const createNotificationAndEmitEvent = async (payload) => {
	const notification = await createNotificationIfUnique$1(payload);
	emitSystemEvent$1("notification.created", {
		notificationId: notification._id.toString(),
		userId: payload.userId.toString(),
		role: payload.role,
		type: payload.type ?? "system",
		title: payload.title
	});
	return notification;
};
const createSystemAlertForAdmins = async (payload) => {
	const roles = Array.isArray(payload.roles) && payload.roles.length > 0 ? payload.roles : ["admin"];
	const users = await user_default$1.find({
		role: { $in: roles },
		isActive: true
	}).select("_id role").lean();
	if (!users || users.length === 0) return [];
	return await Promise.all(users.map((user) => createNotificationAndEmitEvent({
		userId: user._id,
		role: user.role || "admin",
		title: payload.title,
		message: payload.message,
		type: payload.type ?? "warning",
		link: payload.link,
		metadata: payload.metadata,
		actorName: payload.actorName,
		actorRole: payload.actorRole
	})));
};
init_attendance();
init_user();
init_activitieslog();
init_inngest();
init_classes();
const generateAttendanceForClassSession = async (req, res) => {
	try {
		const { courseId, classId, academicYearId, date, subjectId } = req.body;
		const requester = req.user._id;
		if (!courseId || !classId || !academicYearId || !date || !subjectId) return res.status(400).json({ message: "courseId, classId, academicYearId, subjectId, and date are required." });
		const dateObj = new Date(date);
		const dayName = {
			0: "Sunday",
			1: "Monday",
			2: "Tuesday",
			3: "Wednesday",
			4: "Thursday",
			5: "Friday",
			6: "Saturday"
		}[dateObj.getDay()];
		if (dayName === "Saturday" || dayName === "Sunday") return res.status(400).json({ message: "Attendance cannot be generated on weekends." });
		const course = await courses_default$1.findById(courseId).populate({
			path: "subjects.lecturer",
			select: "_id name email departmentRole"
		});
		if (!course) return res.status(404).json({ message: "Course not found." });
		const matchingSubject = (course.subjects ?? []).find((subject) => {
			return String(subject._id) === String(subjectId) || String(subject.subjectUID) === String(subjectId) || String(subject.subjectID) === String(subjectId) || String(subject.name) === String(subjectId) || String(subject.code ?? "") === String(subjectId);
		});
		if (!matchingSubject) return res.status(404).json({ message: "Subject not found in selected course." });
		const classDoc = await classes_default$1.findById(classId).populate("students", "_id");
		if (!classDoc) return res.status(404).json({ message: "Class not found." });
		const lecturer = (Array.isArray(matchingSubject.lecturer) ? matchingSubject.lecturer[0]?._id ?? matchingSubject.lecturer[0] : null) ?? requester;
		const startOfDay = new Date(dateObj);
		startOfDay.setHours(0, 0, 0, 0);
		const endOfDay = new Date(startOfDay);
		endOfDay.setDate(endOfDay.getDate() + 1);
		if (await attendance_default$1.findOne({
			class: classId,
			course: courseId,
			subject: matchingSubject._id,
			date: {
				$gte: startOfDay,
				$lt: endOfDay
			}
		})) return res.status(409).json({ message: "Attendance records already exist for this class, course, subject, and date." });
		const studentIds = (classDoc.students ?? []).map((student) => student._id ?? student);
		const attendanceRecords = await Promise.all(studentIds.map(async (studentId) => {
			return await attendance_default$1.create({
				student: studentId,
				lecturer,
				course: courseId,
				subject: matchingSubject._id,
				class: classId,
				academicYear: academicYearId,
				date: dateObj,
				dayOfWeek: dayName,
				status: "present"
			});
		}));
		await logActivity({
			userId: lecturer,
			action: "Generated attendance for class session",
			details: `Generated attendance for course ID: ${courseId}, subject ID: ${String(matchingSubject._id)}, class ID: ${classId} on ${new Date(date).toDateString()}`
		});
		if (lecturer) try {
			await createNotificationAndEmitEvent({
				userId: typeof lecturer === "string" ? new mongoose.Types.ObjectId(lecturer) : lecturer,
				role: "teacher",
				title: "Attendance session prepared",
				message: `Attendance for ${matchingSubject.name ?? matchingSubject.code ?? "the selected subject"} on ${dateObj.toDateString()} for ${classDoc.name} has been generated and is ready for review.`,
				type: "attendance",
				link: "/attendance",
				actorRole: "admin"
			});
		} catch (err) {
			console.warn("Failed to send attendance notification to lecturer", err);
		}
		emitSystemEvent("attendance.session.generated", {
			classId,
			courseId,
			subjectId: String(matchingSubject._id),
			lecturer: String(lecturer),
			date: dateObj.toISOString(),
			studentCount: studentIds.length
		});
		res.status(201).json({
			message: "Attendance generated for class session",
			attendanceRecords
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const recordAttendance = async (req, res) => {
	try {
		const { student, course, class: classId, academicYear, status, notes } = req.body;
		const lecturer = req.user._id;
		if (!student || !course || !classId || !academicYear || !status) return res.status(400).json({ message: "Missing required attendance fields." });
		const record = await attendance_default$1.create({
			student,
			lecturer,
			course,
			class: classId,
			academicYear,
			status,
			notes
		});
		await logActivity({
			userId: lecturer,
			action: "Recorded attendance",
			details: `Attendance for student ${student} on ${new Date(record.date).toDateString()} set to ${status}`
		});
		emitSystemEvent("attendance.recorded", {
			attendanceId: String(record._id),
			student: String(student),
			lecturer: String(lecturer),
			status,
			date: record.date.toISOString()
		});
		res.status(201).json(record);
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const getMyAttendanceSummary = async (req, res) => {
	try {
		const userId = req.user._id;
		if (req.user.role === "student") {
			const stats$1 = await attendance_default$1.aggregate([{ $match: { student: userId } }, { $group: {
				_id: "$status",
				count: { $sum: 1 }
			} }]);
			const records$1 = await attendance_default$1.find({ student: userId }).populate("course", "name code courseID subjects").populate("subject", "name code subjectID subjectUID").populate("class", "name").populate("lecturer", "name email").sort({ date: -1 }).limit(50);
			res.json({
				stats: stats$1,
				records: records$1
			});
			return;
		}
		const stats = await attendance_default$1.aggregate([{ $match: { lecturer: userId } }, { $group: {
			_id: "$status",
			count: { $sum: 1 }
		} }]);
		const records = await attendance_default$1.find({ lecturer: userId }).populate("course", "name code courseID subjects").populate("subject", "name code subjectID subjectUID").populate("class", "name").populate("student", "name idNumber email").populate("lecturer", "name email").populate("approvedBy", "name email").sort({ date: -1 }).limit(50);
		res.json({
			stats,
			records
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const getStudentAttendanceSummary = async (req, res) => {
	try {
		const { studentId } = req.params;
		const stats = await attendance_default$1.aggregate([{ $match: { student: studentId } }, { $group: {
			_id: "$status",
			count: { $sum: 1 }
		} }]);
		const records = await attendance_default$1.find({ student: studentId }).populate("course", "name code courseID subjects").populate("subject", "name code subjectID subjectUID").populate("class", "name").populate("lecturer", "name email").sort({ date: -1 }).limit(50);
		res.json({
			stats,
			records
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const getStudentNotificationsSummary = async (req, res) => {
	try {
		const userId = req.user._id;
		const classId = (await import("./user-C0j6eLOt.js").then((m) => m.default.findById(userId).select("studentClasses name")))?.studentClasses;
		if (!classId) return res.json({
			className: null,
			academicYear: null,
			timetable: [],
			todayLectures: [],
			totalAttended: 0,
			totalClasses: 0,
			percentage: 0,
			weeklyAlerts: []
		});
		const ClassModel = (await import("./classes-BOb_qIIH.js")).default;
		const Timetable = (await import("./timetable-BEhE5mQp.js")).default;
		const cls = await ClassModel.findById(classId).populate("academicYear", "name").select("name academicYear");
		const timetable = await Timetable.findOne({ class: classId }).select("schedule");
		const todayName = [
			"Sunday",
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday"
		][(/* @__PURE__ */ new Date()).getDay()];
		const todaySchedule = timetable?.schedule.find((s) => s.day === todayName);
		(todaySchedule?.periods ?? []).map((p) => ({
			subject: p.subject,
			lecturer: p.lecturer,
			startTime: p.startTime,
			endTime: p.endTime
		}));
		const subjectIds = /* @__PURE__ */ new Set();
		const lecturerIds = /* @__PURE__ */ new Set();
		const addIdsFromPeriods = (periods) => {
			for (const p of periods || []) {
				if (p?.subject) subjectIds.add(String(p.subject));
				if (p?.lecturer) lecturerIds.add(String(p.lecturer));
			}
		};
		addIdsFromPeriods(todaySchedule?.periods ?? []);
		for (const s of timetable?.schedule ?? []) addIdsFromPeriods(s.periods ?? []);
		const subjectsArr = subjectIds.size ? await courses_default$1.find({ _id: { $in: Array.from(subjectIds) } }).select("name") : [];
		const lecturersArr = lecturerIds.size ? await user_default$1.find({ _id: { $in: Array.from(lecturerIds) } }).select("name") : [];
		const subjMap = new Map(subjectsArr.map((c) => [String(c._id), {
			_id: c._id,
			name: c.name
		}]));
		const lectMap = new Map(lecturersArr.map((u) => [String(u._id), {
			_id: u._id,
			name: u.name
		}]));
		const resolvePeriod = (p) => ({
			subject: p?.subject && subjMap.get(String(p.subject)) ? subjMap.get(String(p.subject)) : p.subject,
			lecturer: p?.lecturer && lectMap.get(String(p.lecturer)) ? lectMap.get(String(p.lecturer)) : p.lecturer,
			startTime: p?.startTime,
			endTime: p?.endTime
		});
		const resolvedTodayLectures = (todaySchedule?.periods ?? []).map(resolvePeriod);
		const now = /* @__PURE__ */ new Date();
		const dayOfWeek = now.getDay();
		const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
		const monday = new Date(now);
		monday.setDate(now.getDate() + diffToMon);
		monday.setHours(0, 0, 0, 0);
		const friday = new Date(monday);
		friday.setDate(monday.getDate() + 4);
		friday.setHours(23, 59, 59, 999);
		const weekAttendance = await attendance_default$1.find({
			student: userId,
			date: {
				$gte: monday,
				$lte: friday
			}
		}).select("status course date dayOfWeek lecturer");
		const totalAttended = await attendance_default$1.countDocuments({
			student: userId,
			status: { $in: [
				"present",
				"late",
				"excused"
			] }
		});
		const totalClasses = await attendance_default$1.countDocuments({ student: userId });
		const attendanceMap = /* @__PURE__ */ new Map();
		weekAttendance.forEach((a) => {
			const key = `${a.course?._id ?? a.course}-${a.dayOfWeek}`;
			attendanceMap.set(key, a.status);
		});
		const weeklyAlerts = [
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday"
		].map((day) => {
			return {
				day,
				lectures: ((timetable?.schedule.find((s) => s.day === day))?.periods ?? []).map((p) => {
					const key = `${p.subject?._id ?? p.subject}-${day}`;
					const resolved = resolvePeriod(p);
					return {
						subject: resolved.subject,
						lecturer: resolved.lecturer,
						startTime: resolved.startTime,
						endTime: resolved.endTime,
						status: attendanceMap.get(key) ?? null
					};
				})
			};
		});
		res.json({
			className: cls?.name ?? null,
			academicYear: cls?.academicYear?.name ?? null,
			timetable: timetable?.schedule ?? [],
			todayDay: todayName,
			todayLectures: resolvedTodayLectures,
			totalAttended,
			totalClasses,
			percentage: totalClasses > 0 ? Math.round(totalAttended / totalClasses * 100) : 0,
			weeklyAlerts
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const getCourseClassAttendance = async (req, res) => {
	try {
		const userId = req.user._id;
		const formattedSummary = (await attendance_default$1.aggregate([
			{ $match: { lecturer: userId } },
			{ $group: {
				_id: {
					course: "$course",
					class: "$class"
				},
				present: { $sum: { $cond: [
					{ $eq: ["$status", "present"] },
					1,
					0
				] } },
				absent: { $sum: { $cond: [
					{ $eq: ["$status", "absent"] },
					1,
					0
				] } },
				late: { $sum: { $cond: [
					{ $eq: ["$status", "late"] },
					1,
					0
				] } },
				excused: { $sum: { $cond: [
					{ $eq: ["$status", "excused"] },
					1,
					0
				] } }
			} },
			{ $lookup: {
				from: "courses",
				localField: "_id.course",
				foreignField: "_id",
				as: "course"
			} },
			{ $unwind: "$course" },
			{ $lookup: {
				from: "classes",
				localField: "_id.class",
				foreignField: "_id",
				as: "class"
			} },
			{ $unwind: "$class" },
			{ $project: {
				_id: 0,
				course: 1,
				class: 1,
				present: 1,
				absent: 1,
				late: 1,
				excused: 1
			} }
		])).map((item) => ({
			courseName: item.course.name,
			className: item.class.name,
			present: item.present,
			absent: item.absent,
			late: item.late,
			excused: item.excused
		}));
		return res.json(formattedSummary);
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const approveExcusedAbsence = async (req, res) => {
	try {
		const { attendanceId } = req.params;
		const userId = req.user._id;
		const attendanceRecord = await attendance_default$1.findById(attendanceId);
		if (!attendanceRecord) return res.status(404).json({ message: "Attendance record not found" });
		if (attendanceRecord.status !== "excused") return res.status(400).json({ message: "Only excused absences can be approved" });
		attendanceRecord.approvedBy = userId;
		await attendanceRecord.save();
		await logActivity({
			userId,
			action: "Approved excused absence",
			details: `Approved excused absence for attendance record ID: ${attendanceId}`
		});
		res.json({
			message: "Excused absence approved successfully",
			attendanceRecord
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const getStudentAttendanceRecords = async (req, res) => {
	try {
		const { studentId } = req.params;
		const { startDate, endDate, status, page = 1, limit = 20 } = req.query;
		const filter = { student: studentId };
		if (startDate || endDate) {
			filter.date = {};
			if (startDate) filter.date.$gte = new Date(startDate);
			if (endDate) filter.date.$lte = new Date(endDate);
		}
		if (status) filter.status = status;
		const records = await attendance_default$1.find(filter).populate("course", "name code courseID subjects").populate("subject", "name code subjectID subjectUID").populate("class", "name").populate("lecturer", "name email").sort({ date: -1 }).skip((+page - 1) * +limit).limit(+limit);
		const total = await attendance_default$1.countDocuments(filter);
		res.json({
			records,
			total,
			page: +page,
			limit: +limit
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const getClassSessionAttendance = async (req, res) => {
	try {
		const { classId, courseId, date, subjectId } = req.query;
		if (!classId || !courseId || !date) {
			res.status(400).json({ message: "classId, courseId, and date are required." });
			return;
		}
		const dateObj = new Date(date);
		dateObj.setHours(0, 0, 0, 0);
		const nextDay = new Date(dateObj);
		nextDay.setDate(nextDay.getDate() + 1);
		const filter = {
			class: classId,
			course: courseId,
			date: {
				$gte: dateObj,
				$lt: nextDay
			}
		};
		if (subjectId) filter.subject = subjectId;
		const records = await attendance_default$1.find(filter).populate("student", "name email idNumber").populate("course", "name code subjects.subjectID").populate("subject", "name code subjectID subjectUID").populate("class", "name").populate("lecturer", "name email").sort({ "student.name": 1 });
		res.json({ records });
	} catch (error) {
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const bulkUpdateAttendance = async (req, res) => {
	try {
		const { updates } = req.body;
		if (!Array.isArray(updates) || updates.length === 0) {
			res.status(400).json({ message: "updates array is required." });
			return;
		}
		const userId = req.user._id;
		const results = await Promise.all(updates.map(async ({ attendanceId, status, notes, lecturerApproval, hodApproval }) => {
			if (!await attendance_default$1.findById(attendanceId)) return null;
			const updateData = {};
			if (status !== void 0) updateData.status = status;
			if (notes !== void 0) updateData.notes = notes;
			if (lecturerApproval !== void 0) {
				updateData.lecturerApproval = lecturerApproval;
				updateData.lecturerApprovalDate = /* @__PURE__ */ new Date();
			}
			if (hodApproval !== void 0) {
				updateData.hodApproval = hodApproval;
				updateData.hodApprovalDate = /* @__PURE__ */ new Date();
			}
			return await attendance_default$1.findByIdAndUpdate(attendanceId, updateData, {
				returnDocument: "after",
				runValidators: true
			});
		}));
		await logActivity({
			userId,
			action: "Bulk updated attendance statuses",
			details: `Updated ${results.length} attendance record(s)`
		});
		res.json({
			message: "Attendance updated",
			results
		});
	} catch (error) {
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const triggerAttendanceGeneration = async (req, res) => {
	try {
		const { courseId, classId, academicYearId, date, subjectId } = req.body;
		if (!courseId || !classId || !academicYearId || !date || !subjectId) {
			res.status(400).json({ message: "courseId, classId, academicYearId, subjectId, and date are required." });
			return;
		}
		if (process.env.NODE_ENV !== "production" && !process.env.INNGEST_EVENT_KEY) {
			console.warn("Skipping Inngest in local development because INNGEST_EVENT_KEY is not set.");
			return await generateAttendanceForClassSession(req, res);
		}
		const userId = req.user._id?.toString();
		await inngest.send({
			name: "attendance/generate",
			data: {
				courseId,
				classId,
				academicYearId,
				date,
				subjectId,
				userId
			}
		});
		res.status(202).json({
			message: "Attendance generation started.",
			status: "processing"
		});
	} catch (error) {
		const errorString = typeof error?.message === "string" ? error.message : JSON.stringify(error);
		if (process.env.NODE_ENV !== "production" && (!process.env.INNGEST_EVENT_KEY || error?.code === "ConnectionRefused" || String(error?.path || "").includes("8288") || /NO_EVENT_KEY_SET|ECONNREFUSED|ConnectionRefused|connect.*8288/i.test(errorString))) {
			console.warn("Inngest unavailable, falling back to direct attendance generation.", error);
			return await generateAttendanceForClassSession(req, res);
		}
		console.error("Attendance generation failed:", error);
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const checkTimetableExists = async (req, res) => {
	try {
		const { classId, academicYearId } = req.query;
		if (!classId || !academicYearId) {
			res.status(400).json({ message: "classId and academicYearId are required." });
			return;
		}
		const timetable = await (await import("./timetable-BEhE5mQp.js")).default.findOne({
			class: classId,
			academicYear: academicYearId
		}).select("_id");
		res.json({ exists: !!timetable });
	} catch (error) {
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const deleteAttendanceSession = async (req, res) => {
	try {
		const { classId, courseId, date, subjectId } = req.query;
		if (!classId || !courseId || !date) {
			res.status(400).json({ message: "classId, courseId, and date are required." });
			return;
		}
		const dateObj = new Date(date);
		dateObj.setHours(0, 0, 0, 0);
		const nextDay = new Date(dateObj);
		nextDay.setDate(nextDay.getDate() + 1);
		const filter = {
			class: classId,
			course: courseId,
			date: {
				$gte: dateObj,
				$lt: nextDay
			}
		};
		if (subjectId) filter.subject = subjectId;
		const result = await attendance_default$1.deleteMany(filter);
		if (result.deletedCount === 0) return res.status(404).json({ message: "No attendance records found for the requested session." });
		await logActivity({
			userId: req.user._id,
			action: "Deleted attendance session",
			details: `Deleted ${result.deletedCount} attendance record(s) for class ${classId}, course ${courseId}, date ${new Date(date).toDateString()}${subjectId ? `, subject ${subjectId}` : ""}`
		});
		res.json({
			message: "Attendance session deleted",
			deletedCount: result.deletedCount
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const deleteAttendanceRecords = async (req, res) => {
	try {
		const { attendanceIds } = req.body;
		if (!Array.isArray(attendanceIds) || attendanceIds.length === 0) return res.status(400).json({ message: "attendanceIds array is required." });
		const result = await attendance_default$1.deleteMany({ _id: { $in: attendanceIds } });
		await logActivity({
			userId: req.user._id,
			action: "Deleted attendance records",
			details: `Deleted ${result.deletedCount} attendance record(s).`
		});
		res.json({
			message: "Attendance records deleted",
			deletedCount: result.deletedCount
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const getAllAttendanceLists = async (req, res) => {
	try {
		const userId = req.user._id;
		const userRole$1 = req.user.role;
		const { classId, courseId, date } = req.query;
		const filter = {};
		if (classId) filter.class = classId;
		if (courseId) filter.course = courseId;
		if (date) {
			const dateObj = new Date(date);
			dateObj.setHours(0, 0, 0, 0);
			const nextDay = new Date(dateObj);
			nextDay.setDate(nextDay.getDate() + 1);
			filter.date = {
				$gte: dateObj,
				$lt: nextDay
			};
		}
		if (userRole$1 !== "admin") filter.lecturer = userId;
		const enrichedRecords = (await attendance_default$1.find(filter).populate("course", "name code courseID subjects").populate("subject", "name code subjectID subjectUID").populate("class", "name").populate("student", "name idNumber email").populate("lecturer", "name email").populate("approvedBy", "name email").sort({ date: -1 })).map((record) => {
			const courseDoc = record.course;
			const subjectId = record.subject ? String(record.subject) : "";
			const matchingSubject = courseDoc?.subjects?.find((subject) => {
				return String(subject?._id) === subjectId || String(subject?.subjectUID) === subjectId || String(subject?.subjectID) === subjectId || String(subject?.code ?? "") === subjectId;
			});
			const resolvedSubject = matchingSubject ? {
				_id: matchingSubject._id,
				name: matchingSubject.name,
				code: matchingSubject.code,
				subjectID: matchingSubject.subjectID,
				subjectUID: matchingSubject.subjectUID
			} : null;
			const subjectName = resolvedSubject?.name || (record.subject && typeof record.subject === "object" ? record.subject.name : null) || "Untitled subject";
			const courseName = courseDoc?.name || "Attendance session";
			const dateLabel = new Date(record.date).toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric"
			});
			return {
				...record.toObject(),
				subject: resolvedSubject || record.subject,
				sessionName: `${courseName} • ${subjectName} • ${dateLabel}`
			};
		});
		res.json({ records: enrichedRecords });
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const getSubjectsAttendance = async (req, res) => {
	try {
		const userId = req.user._id;
		const summary = await attendance_default$1.aggregate([
			{ $match: { lecturer: userId } },
			{ $group: {
				_id: "$course",
				present: { $sum: { $cond: [
					{ $eq: ["$status", "present"] },
					1,
					0
				] } },
				absent: { $sum: { $cond: [
					{ $eq: ["$status", "absent"] },
					1,
					0
				] } },
				late: { $sum: { $cond: [
					{ $eq: ["$status", "late"] },
					1,
					0
				] } },
				excused: { $sum: { $cond: [
					{ $eq: ["$status", "excused"] },
					1,
					0
				] } }
			} },
			{ $lookup: {
				from: "courses",
				localField: "_id",
				foreignField: "_id",
				as: "course"
			} },
			{ $unwind: "$course" },
			{ $project: {
				_id: 1,
				subject: [{
					name: "$course.name",
					code: "$course.code"
				}],
				present: 1,
				absent: 1,
				late: 1,
				excused: 1
			} }
		]);
		res.json({ summary });
	} catch (error) {
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const getClassesAttendanceStatus = async (req, res) => {
	try {
		const ClassModel = (await import("./classes-BOb_qIIH.js")).default;
		const Timetable = (await import("./timetable-BEhE5mQp.js")).default;
		const classes = await ClassModel.find().populate("academicYear", "name").select("name academicYear courses").sort({ name: 1 });
		const classesWithStatus = await Promise.all(classes.map(async (cls) => {
			const [timetable, attendanceStats] = await Promise.all([Timetable.findOne({ class: cls._id }).select("_id"), attendance_default$1.aggregate([{ $match: { class: cls._id } }, { $group: {
				_id: "$status",
				count: { $sum: 1 }
			} }])]);
			const statusMap = {};
			attendanceStats.forEach((s) => {
				statusMap[s._id] = s.count;
			});
			return {
				classId: cls._id,
				className: cls.name,
				academicYear: cls.academicYear?.name ?? "N/A",
				timetableStatus: !!timetable ? "active" : "not set",
				present: statusMap.present ?? 0,
				absent: statusMap.absent ?? 0,
				late: statusMap.late ?? 0,
				excused: statusMap.excused ?? 0
			};
		}));
		res.json({ classes: classesWithStatus });
	} catch (error) {
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
const getWeeklyCourseAttendance = async (req, res) => {
	try {
		const userId = req.user._id;
		const userRole$1 = req.user.role;
		const now = /* @__PURE__ */ new Date();
		const dayOfWeek = now.getDay();
		const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
		const monday = new Date(now);
		monday.setDate(now.getDate() + diffToMon);
		monday.setHours(0, 0, 0, 0);
		const friday = new Date(monday);
		friday.setDate(monday.getDate() + 4);
		friday.setHours(23, 59, 59, 999);
		const matchFilter = { date: {
			$gte: monday,
			$lte: friday
		} };
		if (userRole$1 !== "admin") matchFilter.lecturer = userId;
		const raw = await attendance_default$1.aggregate([
			{ $match: matchFilter },
			{ $group: {
				_id: {
					course: "$course",
					dayOfWeek: "$dayOfWeek"
				},
				present: { $sum: { $cond: [
					{ $eq: ["$status", "present"] },
					1,
					0
				] } },
				absent: { $sum: { $cond: [
					{ $eq: ["$status", "absent"] },
					1,
					0
				] } },
				late: { $sum: { $cond: [
					{ $eq: ["$status", "late"] },
					1,
					0
				] } },
				excused: { $sum: { $cond: [
					{ $eq: ["$status", "excused"] },
					1,
					0
				] } }
			} },
			{ $lookup: {
				from: "courses",
				localField: "_id.course",
				foreignField: "_id",
				as: "courseDoc"
			} },
			{ $unwind: "$courseDoc" },
			{ $project: {
				_id: 0,
				courseId: "$_id.course",
				courseName: "$courseDoc.name",
				courseCode: "$courseDoc.code",
				dayOfWeek: "$_id.dayOfWeek",
				present: 1,
				absent: 1,
				late: 1,
				excused: 1
			} },
			{ $sort: {
				courseName: 1,
				dayOfWeek: 1
			} }
		]);
		res.json({
			records: raw,
			weekStart: monday.toISOString(),
			weekEnd: friday.toISOString()
		});
	} catch (error) {
		res.status(500).json({
			message: "Server error",
			error
		});
	}
};
var attendanceRouter = express.Router();
attendanceRouter.post("/record", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), recordAttendance);
attendanceRouter.get("/me", protect, getMyAttendanceSummary);
attendanceRouter.get("/me/summary", protect, getMyAttendanceSummary);
attendanceRouter.post("/approve-excused/:attendanceId", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), approveExcusedAbsence);
attendanceRouter.get("/courses/:courseId/classes/:classId", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), getCourseClassAttendance);
attendanceRouter.get("/students/:studentId", protect, authorize([
	"admin",
	"teacher",
	"parent",
	"student"
]), getStudentAttendanceRecords);
attendanceRouter.get("/student/:studentId/summary", protect, authorize([
	"admin",
	"teacher",
	"parent"
]), getStudentAttendanceSummary);
attendanceRouter.post("/generate", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), triggerAttendanceGeneration);
attendanceRouter.get("/session", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), getClassSessionAttendance);
attendanceRouter.delete("/session", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), deleteAttendanceSession);
attendanceRouter.delete("/records", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), deleteAttendanceRecords);
attendanceRouter.patch("/bulk", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), bulkUpdateAttendance);
attendanceRouter.get("/timetable-check", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), checkTimetableExists);
attendanceRouter.get("/subjects", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), getSubjectsAttendance);
attendanceRouter.get("/lists", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), getAllAttendanceLists);
attendanceRouter.get("/status", protect, authorize([
	"admin",
	"teacher",
	"parent"
]), getClassesAttendanceStatus);
attendanceRouter.get("/weekly", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), getWeeklyCourseAttendance);
attendanceRouter.get("/student-notifications", protect, authorize(["student"]), getStudentNotificationsSummary);
var attendance_default = attendanceRouter;
init_notification();
var router$4 = Router();
router$4.get("/", protect, async (req, res) => {
	try {
		const user = req.user;
		if (!user) return res.status(401).json({ error: "Unauthorized" });
		const page = Math.max(1, parseInt(String(req.query.page)) || 1);
		const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit)) || 20));
		const skip = (page - 1) * limit;
		const [notifications, total] = await Promise.all([Notification.find({ userId: user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), Notification.countDocuments({ userId: user._id })]);
		const formattedNotifications = notifications.map((notification) => formatNotificationForRole(notification, user.role));
		res.json({
			notifications: formattedNotifications,
			total,
			page,
			pages: Math.ceil(total / limit)
		});
	} catch (err) {
		console.error("GET /notifications error:", err);
		res.status(500).json({ error: "Failed to fetch notifications" });
	}
});
router$4.get("/unread-count", protect, async (req, res) => {
	try {
		const user = req.user;
		if (!user) return res.status(401).json({ error: "Unauthorized" });
		const count = await Notification.countDocuments({
			userId: user._id,
			isRead: false
		});
		res.json({ count });
	} catch (err) {
		console.error("GET /notifications/unread-count error:", err);
		res.status(500).json({ error: "Failed to fetch unread count" });
	}
});
router$4.get("/system", protect, async (req, res) => {
	try {
		const user = req.user;
		if (!user) return res.status(401).json({ error: "Unauthorized" });
		const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit)) || 100));
		const notifications = await Notification.find(user.role === "student" ? { userId: user._id } : {}).sort({ createdAt: -1 }).limit(limit).lean();
		const seen = /* @__PURE__ */ new Map();
		for (const n of notifications) {
			const key = `${n.type}:${new Date(n.createdAt).toISOString()}`;
			if (!seen.has(key)) seen.set(key, n);
		}
		const deduped = Array.from(seen.values()).map((n) => {
			const formatted = formatNotificationForRole(n, user.role);
			return {
				...n,
				...formatted,
				unreadForUser: String(n.userId) === String(user._id) && n.isRead === false
			};
		});
		res.json({ notifications: deduped });
	} catch (err) {
		console.error("GET /notifications/system error:", err);
		res.status(500).json({ error: "Failed to fetch system notifications" });
	}
});
router$4.patch("/:id/read", protect, async (req, res) => {
	try {
		const user = req.user;
		if (!user) return res.status(401).json({ error: "Unauthorized" });
		const updated = await Notification.findOneAndUpdate({
			_id: req.params.id,
			userId: user._id
		}, { isRead: true }, { returnDocument: "after" });
		if (!updated) return res.status(404).json({ error: "Notification not found" });
		res.json({ notification: updated });
	} catch (err) {
		console.error("PATCH /notifications/:id/read error:", err);
		res.status(500).json({ error: "Failed to mark notification as read" });
	}
});
router$4.patch("/read-all", protect, async (req, res) => {
	try {
		const user = req.user;
		if (!user) return res.status(401).json({ error: "Unauthorized" });
		await Notification.updateMany({
			userId: user._id,
			isRead: false
		}, { isRead: true });
		res.json({ success: true });
	} catch (err) {
		console.error("PATCH /notifications/read-all error:", err);
		res.status(500).json({ error: "Failed to mark all as read" });
	}
});
router$4.delete("/:id", protect, async (req, res) => {
	try {
		const user = req.user;
		if (!user) return res.status(401).json({ error: "Unauthorized" });
		let deleted;
		if (user.role === "admin" || user.role === "teacher") deleted = await Notification.findOneAndDelete({ _id: req.params.id });
		else deleted = await Notification.findOneAndDelete({
			_id: req.params.id,
			userId: user._id
		});
		if (!deleted) return res.status(404).json({ error: "Notification not found" });
		res.json({ success: true });
	} catch (err) {
		console.error("DELETE /notifications/:id error:", err);
		res.status(500).json({ error: "Failed to delete notification" });
	}
});
router$4.get("/stream", protect, async (req, res) => {
	try {
		addSSEClient(req, res);
	} catch (err) {
		console.error("Failed to add SSE client", err);
		try {
			res.status(500).end();
		} catch {}
	}
});
var notification_default = router$4;
var for500LevelPostings_default = express.Router();
var rotationPlan_exports = /* @__PURE__ */ __export({ default: () => rotationPlan_default });
var GroupRefSchema, PostingSchema, RotationPlanSchema, RotationPlan, rotationPlan_default;
var init_rotationPlan = __esmMin((() => {
	GroupRefSchema = new Schema({
		groupId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Class"
		},
		group: { type: Schema.Types.Mixed },
		assigned: {
			type: [{
				startDate: Date,
				endDate: Date
			}],
			default: []
		},
		supervisorName: { type: String },
		supervisor: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		}
	}, { _id: false });
	PostingSchema = new Schema({
		name: {
			type: String,
			required: true
		},
		spinBase: { type: String },
		spin: { type: String },
		category: { type: String },
		startDate: { type: Date },
		endDate: { type: Date },
		groups: {
			type: [GroupRefSchema],
			default: []
		},
		meta: {
			type: Schema.Types.Mixed,
			default: {}
		}
	}, { _id: false });
	RotationPlanSchema = new Schema({
		name: { type: String },
		class: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Class"
		},
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		postings: {
			type: [PostingSchema],
			default: []
		},
		groups: {
			type: [Schema.Types.Mixed],
			default: []
		},
		meta: {
			type: Schema.Types.Mixed,
			default: {}
		},
		createdAt: {
			type: Date,
			default: () => /* @__PURE__ */ new Date()
		},
		updatedAt: {
			type: Date,
			default: () => /* @__PURE__ */ new Date()
		}
	}, { collection: "rotationplans" });
	RotationPlanSchema.pre("save", function() {
		this.updatedAt = /* @__PURE__ */ new Date();
	});
	RotationPlan = mongoose.model("RotationPlan", RotationPlanSchema);
	rotationPlan_default = RotationPlan;
}));
init_rotationPlan();
var STOP_WORDS = new Set([
	"department",
	"dept",
	"unit",
	"of",
	"the",
	"and",
	"&",
	"a",
	"an"
]);
function normalizeString(input) {
	if (!input || typeof input !== "string") return "";
	let s = input.toLowerCase().trim();
	s = s.replace(/[^a-z0-9\s&]+/g, "");
	s = s.replace(/\s+/g, " ");
	return s.trim();
}
function buildVariants(input) {
	const normalized = normalizeString(input);
	if (!normalized) return [];
	const variants = /* @__PURE__ */ new Set();
	variants.add(normalized);
	const withoutPrefix = normalized.replace(/^department\s+of\s+|^dept\.?\s+|^unit\s+/i, "").trim();
	if (withoutPrefix) variants.add(withoutPrefix);
	const compact = normalized.replace(/\s+/g, "");
	if (compact) variants.add(compact);
	const compactWithoutPrefix = withoutPrefix.replace(/\s+/g, "");
	if (compactWithoutPrefix) variants.add(compactWithoutPrefix);
	const commaClean = normalized.replace(/&/g, " ").replace(/\s+/g, " ").trim();
	if (commaClean) {
		variants.add(commaClean);
		variants.add(commaClean.replace(/\s+/g, ""));
	}
	const importantTokens = commaClean.split(/\s+/).filter(Boolean).filter((token) => !STOP_WORDS.has(token));
	if (importantTokens.length) {
		variants.add(importantTokens.join(" "));
		variants.add(importantTokens.join(""));
		variants.add(importantTokens.map((token) => token[0]).join(""));
	}
	return Array.from(variants);
}
function hasAliasMatch(identifier, department) {
	const identifierVariants = buildVariants(identifier);
	if (!identifierVariants.length) return false;
	const docVariants = new Set([
		...buildVariants(department.name || ""),
		...buildVariants(department.code || ""),
		...buildVariants(department.departmentID || "")
	]);
	for (const variant of identifierVariants) if (docVariants.has(variant)) return true;
	return false;
}
async function resolveDepartmentByIdentifier(identifier) {
	if (!identifier) return null;
	normalizeString(identifier);
	const query = [{ departmentID: identifier }, { code: identifier }];
	if (mongoose.Types.ObjectId.isValid(identifier)) query.unshift({ _id: identifier });
	const byId = await departments_default.findOne({ $or: query }).lean();
	if (byId) return byId;
	const all = await departments_default.find({}).lean();
	for (const d of all) if (hasAliasMatch(identifier, d)) return d;
	return null;
}
var SupervisorPoolSchema = new mongoose.Schema({
	key: {
		type: String,
		required: true,
		unique: true
	},
	candidates: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "User"
	}],
	pointer: {
		type: Number,
		default: 0
	},
	updatedAt: {
		type: Date,
		default: Date.now
	}
});
var supervisorPool_default = mongoose.model("SupervisorPool", SupervisorPoolSchema);
async function selectSupervisorRoundRobin(key, candidateIds) {
	if (!key) return null;
	if (!Array.isArray(candidateIds) || candidateIds.length === 0) return null;
	const objIds = candidateIds.map((id) => new mongoose.Types.ObjectId(id));
	let pool = await supervisorPool_default.findOne({ key });
	if (!pool) pool = await supervisorPool_default.create({
		key,
		candidates: objIds,
		pointer: 0
	});
	else {
		const poolIds = (pool.candidates || []).map((c) => String(c));
		const incomingIds = candidateIds.map(String);
		if (poolIds.length !== incomingIds.length || poolIds.some((p, i) => p !== incomingIds[i])) {
			pool.candidates = objIds;
			pool.pointer = 0;
		}
	}
	const idx = pool.pointer % pool.candidates.length;
	const selected = String(pool.candidates[idx]);
	pool.pointer = (pool.pointer + 1) % pool.candidates.length;
	pool.updatedAt = /* @__PURE__ */ new Date();
	await pool.save();
	return selected;
}
init_classes();
init_user();
function addDays(d, days) {
	const out = new Date(d);
	out.setDate(out.getDate() + days);
	return out;
}
function splitIntoBuckets(items, bucketCount) {
	if (bucketCount <= 0) return [{
		groupIndex: 0,
		studentIds: items
	}];
	const buckets = [];
	const base = Math.floor(items.length / bucketCount);
	let cursor = 0;
	for (let index = 0; index < bucketCount; index++) {
		const size = index === bucketCount - 1 ? items.length - cursor : base;
		buckets.push({
			groupIndex: index,
			studentIds: items.slice(cursor, cursor + size)
		});
		cursor += size;
	}
	return buckets;
}
var isValidObjectId = (value) => {
	return mongoose.Types.ObjectId.isValid(value);
};
var resolveDepartmentDocument = async (identifier) => {
	if (!identifier) return null;
	const doc = await resolveDepartmentByIdentifier(identifier);
	if (doc) return doc;
	if (isValidObjectId(identifier)) {
		const byId = await departments_default.findById(identifier).lean();
		if (byId) return byId;
	}
	return departments_default.findOne({ $or: [
		{ code: identifier },
		{ departmentID: identifier },
		{ name: identifier }
	] }).lean();
};
var resolveUnitMap = async (identifiers) => {
	if (!identifiers.length) return /* @__PURE__ */ new Map();
	const query = [];
	const objectIds = identifiers.filter(isValidObjectId).map((id) => new mongoose.Types.ObjectId(id));
	if (objectIds.length) query.push({ _id: { $in: objectIds } });
	query.push({ unitID: { $in: identifiers } });
	query.push({ code: { $in: identifiers } });
	query.push({ name: { $in: identifiers } });
	const units = await units_default.find({ $or: query }).populate("supervisor", "name email role supervisorRank department departmentId departmentRole academicStatus isSupervisor").lean();
	const map = /* @__PURE__ */ new Map();
	units.forEach((unit) => {
		map.set(String(unit._id), unit);
		if (unit.unitID) map.set(String(unit.unitID), unit);
		if (unit.code) map.set(String(unit.code), unit);
		if (unit.name) map.set(String(unit.name), unit);
	});
	return map;
};
var normalizeUnitIds = (identifiers) => {
	if (!Array.isArray(identifiers)) return [];
	return identifiers.filter((id) => typeof id === "string" && id.trim().length > 0).map((id) => id.trim());
};
var rotateLeft = (items, n) => {
	if (!Array.isArray(items) || items.length === 0) return items.slice();
	const r = n % items.length;
	return items.slice(r).concat(items.slice(0, r));
};
var getDepartmentDurationDays = (dept) => {
	if (typeof dept.departmentDurationDays === "number") return Math.max(0, dept.departmentDurationDays);
	return Math.max(0, Number(dept.departmentDurationWeeks) || 0) * 7;
};
var getUnitDurationDays = (dept) => {
	if (typeof dept.unitDurationDays === "number") return Math.max(1, dept.unitDurationDays);
	return Math.max(1, Number(dept.unitDurationWeeks) || 1) * 7;
};
var rankSupervisorCandidates = (users) => {
	return users.slice().sort((a, b) => {
		const rankA = typeof a.supervisorRank === "number" ? a.supervisorRank : -1;
		const rankB = typeof b.supervisorRank === "number" ? b.supervisorRank : -1;
		if (rankA !== rankB) return rankB - rankA;
		if (a.departmentRole && b.departmentRole) return String(a.departmentRole).localeCompare(String(b.departmentRole));
		return String(a.name || "").localeCompare(String(b.name || ""));
	});
};
var getSupervisorName = async (supervisorId) => {
	if (!supervisorId) return null;
	try {
		return (await user_default$1.findById(supervisorId).select("name").lean())?.name || null;
	} catch (err) {
		console.warn("Failed to resolve supervisor name for id", supervisorId, err);
		return null;
	}
};
var findDepartmentSupervisors = async (departmentDoc) => {
	if (!departmentDoc) return [];
	const q = {
		isSupervisor: true,
		role: { $in: [
			"unitconsultant",
			"unitresident",
			"teacher",
			"consultant",
			"head",
			"staff"
		] },
		$or: [
			{ departmentId: departmentDoc._id },
			{ department: departmentDoc.name },
			{ department: departmentDoc.code },
			{ department: departmentDoc.departmentID }
		]
	};
	return user_default$1.find(q).lean();
};
var findUnitSupervisor = async (unit, departmentDoc) => {
	if (!unit) return null;
	if (unit.supervisor) {
		const supervisor = await user_default$1.findById(unit.supervisor).lean();
		if (supervisor) return String(supervisor._id);
	}
	const query = {
		isSupervisor: true,
		role: { $in: [
			"unitconsultant",
			"unitresident",
			"teacher",
			"consultant",
			"head",
			"staff"
		] },
		$or: []
	};
	if (unit.name) query.$or.push({ specialties: unit.name });
	if (unit.code) query.$or.push({ specialties: unit.code });
	if (unit.unitID) query.$or.push({ specialties: unit.unitID });
	if (departmentDoc) {
		query.$or.push({ departmentId: departmentDoc._id });
		query.$or.push({ department: departmentDoc.name });
		query.$or.push({ department: departmentDoc.code });
		query.$or.push({ department: departmentDoc.departmentID });
	}
	if (!query.$or.length) delete query.$or;
	const candidates = await user_default$1.find(query).lean();
	const candidateIds = candidates.map((c) => String(c._id));
	if (candidateIds.length === 0) return null;
	const poolKey = unit && unit._id ? `unit:${String(unit._id)}` : departmentDoc && departmentDoc._id ? `department:${String(departmentDoc._id)}` : null;
	if (poolKey) try {
		const selected = await selectSupervisorRoundRobin(poolKey, candidateIds);
		if (selected) return selected;
	} catch (e) {
		console.warn("Round-robin supervisor selection failed", e);
	}
	const ranked = rankSupervisorCandidates(candidates);
	return ranked.length ? String(ranked[0]._id) : null;
};
var findBestDepartmentSupervisor = async (departmentDoc) => {
	const candidates = await findDepartmentSupervisors(departmentDoc);
	const candidateIds = candidates.map((c) => String(c._id));
	if (candidateIds.length === 0) return null;
	try {
		const selected = await selectSupervisorRoundRobin(`department:${String(departmentDoc._id)}`, candidateIds);
		if (selected) return selected;
	} catch (e) {
		console.warn("Round-robin department supervisor selection failed", e);
	}
	const ranked = rankSupervisorCandidates(candidates);
	return ranked.length ? String(ranked[0]._id) : null;
};
async function generateKrystaSchedule(opts) {
	const { classId, name, startDate, endDate, departments, createdBy, phaseId, phaseName, postingScheduleId } = opts;
	const cls = await classes_default$1.findById(classId).lean();
	if (!cls) throw new Error("Class not found");
	const studentIds = Array.isArray(cls.students) ? cls.students.map((s) => String(s)) : [];
	const numDepartments = departments.length;
	if (numDepartments === 0) throw new Error("At least one department is required for schedule generation");
	const deptGroups = splitIntoBuckets(studentIds, numDepartments);
	const timeline = [];
	const unvisitedUnits = [];
	const unvisitedUnitGroups = [];
	const unassignedWindows = [];
	const groupSupervisorMap = /* @__PURE__ */ new Map();
	const phases = [];
	const phaseDurationDays = Math.max(...departments.map((dept) => Math.max(0, Number(dept.departmentDurationWeeks) || 0) * 7), 1);
	let phaseStart = new Date(startDate);
	for (let phaseIndex = 0; phaseIndex < numDepartments; phaseIndex++) {
		const phaseDepartments = [];
		for (let deptSlotIndex = 0; deptSlotIndex < numDepartments; deptSlotIndex++) {
			const dept = departments[deptSlotIndex];
			const useUnits = dept.useUnits !== false;
			const activeUnits = normalizeUnitIds(dept.activeUnitIds);
			const departmentDurationDays = getDepartmentDurationDays(dept);
			const unitDurationDays = getUnitDurationDays(dept);
			const assignedGroupIndex = (deptSlotIndex + phaseIndex) % numDepartments;
			const departmentGroup = deptGroups[assignedGroupIndex];
			const departmentDoc = await resolveDepartmentDocument(dept.departmentId);
			const departmentSupervisorId = await findBestDepartmentSupervisor(departmentDoc);
			const departmentSupervisorName = await getSupervisorName(departmentSupervisorId);
			const unitMap = useUnits ? await resolveUnitMap(activeUnits) : /* @__PURE__ */ new Map();
			const departmentName = departmentDoc?.name || null;
			const departmentCode = departmentDoc?.code || null;
			const departmentIdentifier = departmentDoc?.departmentID || dept.departmentId || null;
			const studentCount = Array.isArray(departmentGroup.studentIds) ? departmentGroup.studentIds.length : 0;
			const unitCount = Math.max(1, activeUnits.length);
			const unitGroupCount = Math.max(1, Math.ceil(studentCount / unitCount));
			const unitGroups = useUnits ? splitIntoBuckets(departmentGroup.studentIds, unitGroupCount) : [];
			if (useUnits && activeUnits.length > 0) {
				const numUnitWindows = Math.max(1, Math.floor(departmentDurationDays / unitDurationDays));
				const groupAssignedUnits = [];
				for (let g = 0; g < unitGroups.length; g++) {
					const assigned = [];
					for (let j = 0; j < numUnitWindows; j++) {
						const idx = (g * numUnitWindows + j) % activeUnits.length;
						assigned.push(activeUnits[idx]);
					}
					groupAssignedUnits.push(assigned);
				}
				for (let windowIndex = 0; windowIndex < numUnitWindows; windowIndex++) {
					const windowStart = addDays(phaseStart, windowIndex * unitDurationDays);
					const windowEnd = addDays(windowStart, unitDurationDays);
					for (let unitGroupIndex = 0; unitGroupIndex < unitGroups.length; unitGroupIndex++) {
						const unitGroup = unitGroups[unitGroupIndex];
						const assignedUnitId = groupAssignedUnits[unitGroupIndex][windowIndex] ?? null;
						const unitDoc = assignedUnitId ? unitMap.get(assignedUnitId) || null : null;
						const unitName = unitDoc?.name || assignedUnitId || null;
						const unitCode = unitDoc?.code || null;
						const unitIdentifier = unitDoc?.unitID || assignedUnitId || null;
						const supervisorId = await findUnitSupervisor(unitDoc, departmentDoc) || departmentSupervisorId;
						const supervisorName = supervisorId ? await getSupervisorName(supervisorId) || departmentSupervisorName : departmentSupervisorName;
						const existingSupervisor = groupSupervisorMap.get(assignedGroupIndex);
						if (!existingSupervisor || !existingSupervisor.supervisorName && supervisorName) groupSupervisorMap.set(assignedGroupIndex, {
							supervisorId: supervisorId || null,
							supervisorName
						});
						const orderedStudents = rotateLeft(unitGroup.studentIds, windowIndex);
						const unitIndex = assignedUnitId ? activeUnits.indexOf(assignedUnitId) : 0;
						timeline.push({
							phaseIndex,
							departmentIndex: deptSlotIndex,
							departmentId: dept.departmentId,
							departmentName,
							departmentCode,
							departmentID: departmentIdentifier,
							departmentGroupIndex: assignedGroupIndex,
							unitGroupIndex,
							unitIndex,
							unitId: unitDoc?._id ? String(unitDoc._id) : assignedUnitId,
							unitName,
							unitCode,
							unitIdentifier,
							studentIds: orderedStudents,
							startDate: windowStart.toISOString(),
							endDate: windowEnd.toISOString(),
							supervisorId,
							supervisorName,
							departmentSupervisorId,
							departmentSupervisorName
						});
						if (!supervisorId) {
							unassignedWindows.push({
								phaseIndex,
								departmentIndex: deptSlotIndex,
								departmentId: dept.departmentId,
								departmentGroupIndex: assignedGroupIndex,
								unitGroupIndex,
								unitId: assignedUnitId,
								startDate: windowStart.toISOString(),
								endDate: windowEnd.toISOString(),
								studentIds: orderedStudents
							});
							console.warn("No supervisor found for unit window", {
								departmentId: dept.departmentId,
								unitId: assignedUnitId,
								phaseIndex,
								departmentIndex: deptSlotIndex,
								unitGroupIndex
							});
						}
					}
				}
				for (let g = 0; g < unitGroups.length; g++) {
					const used = Array.from(new Set(groupAssignedUnits[g].filter(Boolean)));
					const unused = activeUnits.filter((u) => !used.includes(u));
					if (unused.length) unvisitedUnits.push({
						departmentIndex: deptSlotIndex,
						unitIds: unused
					});
					unvisitedUnitGroups.push({
						departmentIndex: deptSlotIndex,
						unitGroupIndex: g,
						usedUnitIds: used,
						unusedUnitIds: unused
					});
				}
			} else {
				const windowStart = new Date(phaseStart);
				const windowEnd = addDays(phaseStart, departmentDurationDays);
				const supervisorName = departmentSupervisorName;
				const existingSupervisor = groupSupervisorMap.get(assignedGroupIndex);
				if (!existingSupervisor || !existingSupervisor.supervisorName && supervisorName) groupSupervisorMap.set(assignedGroupIndex, {
					supervisorId: departmentSupervisorId || null,
					supervisorName
				});
				timeline.push({
					phaseIndex,
					departmentIndex: deptSlotIndex,
					departmentId: dept.departmentId,
					departmentName,
					departmentCode,
					departmentID: departmentIdentifier,
					departmentGroupIndex: assignedGroupIndex,
					unitGroupIndex: 0,
					unitIndex: 0,
					unitId: null,
					studentIds: departmentGroup.studentIds,
					startDate: windowStart.toISOString(),
					endDate: windowEnd.toISOString(),
					supervisorId: departmentSupervisorId,
					supervisorName,
					departmentSupervisorId,
					departmentSupervisorName
				});
				if (!departmentSupervisorId) {
					unassignedWindows.push({
						phaseIndex,
						departmentIndex: deptSlotIndex,
						departmentId: dept.departmentId,
						departmentGroupIndex: assignedGroupIndex,
						unitGroupIndex: 0,
						unitId: null,
						startDate: windowStart.toISOString(),
						endDate: windowEnd.toISOString(),
						studentIds: departmentGroup.studentIds
					});
					console.warn("No department supervisor found for department window", {
						departmentId: dept.departmentId,
						phaseIndex,
						departmentIndex: deptSlotIndex
					});
				}
			}
			phaseDepartments.push({
				departmentIndex: deptSlotIndex,
				departmentId: dept.departmentId,
				departmentGroupIndex: assignedGroupIndex,
				studentIds: departmentGroup.studentIds,
				departmentSupervisorId,
				useUnits,
				departmentDurationDays,
				unitDurationDays,
				activeUnitIds: activeUnits
			});
		}
		phases.push({
			phaseIndex,
			phaseName: `Phase ${phaseIndex + 1}`,
			startDate: phaseStart.toISOString(),
			endDate: addDays(phaseStart, phaseDurationDays).toISOString(),
			departments: phaseDepartments
		});
		phaseStart = addDays(phaseStart, phaseDurationDays);
	}
	const rotationPlan = {
		name,
		class: classId,
		createdBy: createdBy ? new mongoose.Types.ObjectId(createdBy) : void 0,
		postings: [{
			name,
			startDate: new Date(startDate),
			endDate: new Date(endDate),
			groups: deptGroups.map((g) => {
				const supervisorInfo = groupSupervisorMap.get(g.groupIndex) || {
					supervisorId: null,
					supervisorName: null
				};
				return {
					groupId: null,
					group: {
						students: g.studentIds,
						name: `Group ${g.groupIndex + 1}`
					},
					supervisor: supervisorInfo.supervisorId,
					supervisorName: supervisorInfo.supervisorName || void 0
				};
			}),
			meta: {
				krysta: true,
				departments,
				timelineCount: timeline.length,
				timeline,
				phaseId,
				phaseName,
				postingScheduleId
			}
		}],
		groups: deptGroups,
		meta: {
			krysta: true,
			timeline,
			phases,
			unvisitedUnits,
			unvisitedUnitGroups,
			unassignedWindows,
			phaseId,
			phaseName,
			postingScheduleId
		}
	};
	if (unassignedWindows.length > 0) try {
		await createSystemAlertForAdmins({
			title: `KRYSTA schedule generated with ${unassignedWindows.length} unassigned supervisor window${unassignedWindows.length === 1 ? "" : "s"}`,
			message: `The generated schedule "${name}" contains ${unassignedWindows.length} timeline window${unassignedWindows.length === 1 ? "" : "s"} without an assigned supervisor. Please review and assign supervisors before publishing the posting schedule.`,
			type: "warning",
			metadata: {
				krysta: true,
				scheduleName: name,
				phaseId,
				phaseName,
				postingScheduleId,
				missingWindowCount: unassignedWindows.length,
				sampleWindows: unassignedWindows.slice(0, 10)
			}
		});
	} catch (err) {
		console.warn("Failed to send missing supervisor alert", err);
	}
	return rotationPlan;
}
var krystaGenerator_default = generateKrystaSchedule;
async function runRotationSnapshot(planId, opts = {}) {
	const plan = await rotationPlan_default.findById(planId);
	if (!plan) throw new Error("RotationPlan not found");
	const timeline = plan.meta && plan.meta.timeline || [];
	const snapshotTime = opts.snapshotTime ? new Date(opts.snapshotTime) : /* @__PURE__ */ new Date();
	let windowsToSnapshot = [];
	if (typeof opts.windowIndex === "number") {
		const w = timeline[opts.windowIndex];
		if (!w) throw new Error("Invalid windowIndex");
		windowsToSnapshot = [{
			index: opts.windowIndex,
			window: w
		}];
	} else for (let i = 0; i < timeline.length; i++) {
		const t = timeline[i];
		const start = new Date(t.startDate);
		const end = new Date(t.endDate);
		if (start <= snapshotTime && snapshotTime < end) windowsToSnapshot.push({
			index: i,
			window: t
		});
	}
	const snapshot = {
		createdAt: snapshotTime,
		windows: windowsToSnapshot
	};
	const meta = plan.meta || {};
	meta.snapshots = Array.isArray(meta.snapshots) ? meta.snapshots : [];
	meta.snapshots.push(snapshot);
	plan.meta = meta;
	await plan.save();
	return snapshot;
}
var rotationRunner_default;
var init_rotationRunner = __esmMin((() => {
	rotationRunner_default = runRotationSnapshot;
}));
init_rotationPlan();
init_user();
init_rotationRunner();
const createRotationSchedule = async (req, res) => {
	try {
		const payload = req.body || {};
		payload.createdBy = req.user?._id;
		if (payload.generateWith === "krysta" || payload.krysta === true || Array.isArray(payload.departments)) {
			if (!payload.class) return res.status(400).json({ message: "Missing class id for schedule generation" });
			if (!Array.isArray(payload.departments) || payload.departments.length === 0) return res.status(400).json({ message: "At least one department is required for schedule generation" });
			try {
				const planObj = await krystaGenerator_default({
					classId: payload.class,
					name: payload.name || "Krysta Rotation",
					startDate: payload.startDate || (/* @__PURE__ */ new Date()).toISOString(),
					endDate: payload.endDate || (/* @__PURE__ */ new Date()).toISOString(),
					departments: payload.departments || [],
					createdBy: payload.createdBy,
					phaseId: payload.phaseId,
					phaseName: payload.phaseName,
					postingScheduleId: payload.postingScheduleId
				});
				const doc$1 = await rotationPlan_default.create(planObj);
				return res.status(201).json(doc$1);
			} catch (gErr) {
				console.error("Krysta generation failed", gErr);
				return res.status(500).json({
					message: gErr?.message || "Generation failed",
					error: String(gErr)
				});
			}
		}
		const doc = await rotationPlan_default.create(payload);
		res.status(201).json(doc);
	} catch (err) {
		console.error("createRotationSchedule error", err);
		res.status(500).json({
			message: "Server error",
			error: String(err)
		});
	}
};
const listRotationSchedules = async (req, res) => {
	try {
		const { classId, query, page = 1, limit = 50 } = req.query;
		const filter = {};
		if (classId) filter.class = classId;
		if (query) filter.name = {
			$regex: String(query),
			$options: "i"
		};
		const docs = await rotationPlan_default.find(filter).sort({ createdAt: -1 }).skip((+page - 1) * +limit).limit(+limit).lean();
		const total = await rotationPlan_default.countDocuments(filter);
		res.json({
			schedules: docs,
			total,
			page: +page,
			limit: +limit
		});
	} catch (err) {
		console.error("listRotationSchedules error", err);
		res.status(500).json({
			message: "Server error",
			error: String(err)
		});
	}
};
const getRotationScheduleById = async (req, res) => {
	try {
		const { id } = req.params;
		const doc = await rotationPlan_default.findById(id).lean();
		if (!doc) return res.status(404).json({ message: "Schedule not found" });
		res.json(doc);
	} catch (err) {
		console.error("getRotationScheduleById error", err);
		res.status(500).json({
			message: "Server error",
			error: String(err)
		});
	}
};
const deleteRotationSchedule = async (req, res) => {
	try {
		const { id } = req.params;
		if (!await rotationPlan_default.findByIdAndDelete(id).lean()) return res.status(404).json({ message: "Schedule not found" });
		res.json({ message: "Schedule deleted" });
	} catch (err) {
		console.error("deleteRotationSchedule error", err);
		res.status(500).json({
			message: "Server error",
			error: String(err)
		});
	}
};
var getSupervisorNameById = async (supervisorId) => {
	if (!supervisorId) return null;
	return (await user_default$1.findById(supervisorId).select("name").lean())?.name || null;
};
const assignSupervisorToWindow = async (req, res) => {
	try {
		const { id } = req.params;
		const { windowIndex, supervisorId } = req.body;
		if (typeof windowIndex !== "number" && !req.body.matching) return res.status(400).json({ message: "Missing windowIndex or matching criteria" });
		const plan = await rotationPlan_default.findById(id);
		if (!plan) return res.status(404).json({ message: "Schedule not found" });
		const timeline = plan.meta && plan.meta.timeline || [];
		const supervisorName = await getSupervisorNameById(supervisorId || null);
		if (typeof windowIndex === "number") {
			if (!timeline[windowIndex]) return res.status(400).json({ message: "Invalid windowIndex" });
			timeline[windowIndex].supervisorId = supervisorId;
			timeline[windowIndex].supervisorName = supervisorName;
		} else if (req.body.matching) {
			const m = req.body.matching || {};
			for (let i = 0; i < timeline.length; i++) {
				const t = timeline[i];
				let ok = true;
				if (m.departmentIndex !== void 0) ok = ok && t.departmentIndex === m.departmentIndex;
				if (m.departmentGroupIndex !== void 0) ok = ok && t.departmentGroupIndex === m.departmentGroupIndex;
				if (m.unitGroupIndex !== void 0) ok = ok && t.unitGroupIndex === m.unitGroupIndex;
				if (ok) {
					t.supervisorId = supervisorId;
					t.supervisorName = supervisorName;
				}
			}
		}
		plan.meta = {
			...plan.meta || {},
			timeline
		};
		const postings = plan.postings || [];
		for (const p of postings) {
			p.meta = {
				...p.meta || {},
				timeline
			};
			const groups = p.groups || [];
			for (let i = 0; i < groups.length; i++) {
				const g = groups[i];
				let supervisorForGroup = null;
				let supervisorNameForGroup = null;
				for (const t of timeline) if (t.departmentGroupIndex === i && t.supervisorId) {
					supervisorForGroup = t.supervisorId;
					supervisorNameForGroup = t.supervisorName || null;
					break;
				}
				if (supervisorForGroup) {
					g.supervisor = supervisorForGroup;
					g.supervisorName = supervisorNameForGroup || void 0;
				}
			}
		}
		await plan.save();
		res.json({
			message: "Supervisor assigned",
			id,
			timeline
		});
	} catch (err) {
		console.error("assignSupervisorToWindow error", err);
		res.status(500).json({
			message: "Server error",
			error: String(err)
		});
	}
};
const getStudentAssignments = async (req, res) => {
	try {
		const { studentId } = req.query;
		if (!studentId) return res.status(400).json({ message: "Missing studentId" });
		const schedules = await rotationPlan_default.find({}).sort({ createdAt: -1 }).limit(200).lean();
		const assignments = {};
		for (const s of schedules) {
			const postings = s.postings || [];
			for (const p of postings) {
				const groups = p.groups || [];
				for (const g of groups) {
					const groupObj = g.group || {};
					if ((Array.isArray(groupObj.students) ? groupObj.students : []).some((st) => String(st) === String(studentId) || st && st._id && String(st._id) === String(studentId))) assignments[p.name || "Posting"] = {
						groupName: groupObj.name || g.groupId || "Group",
						supervisorName: g.supervisorName || ""
					};
				}
			}
		}
		res.json({ assignments });
	} catch (err) {
		console.error("getStudentAssignments error", err);
		res.status(500).json({
			message: "Server error",
			error: String(err)
		});
	}
};
const getStudentCurrentSchedule = async (req, res) => {
	try {
		const { studentId } = req.params;
		if (!studentId) return res.status(400).json({ message: "Missing studentId" });
		const schedules = await rotationPlan_default.find({}).sort({ createdAt: -1 }).limit(200).lean();
		const now = /* @__PURE__ */ new Date();
		const current = [];
		for (const s of schedules) {
			const timeline = s.meta && s.meta.timeline || [];
			for (let i = 0; i < timeline.length; i++) {
				const t = timeline[i];
				const start = new Date(t.startDate);
				const end = new Date(t.endDate);
				if ((Array.isArray(t.studentIds) ? t.studentIds : []).some((st) => String(st) === String(studentId))) {
					if (start <= now && now < end) current.push({
						scheduleId: s._id,
						postingName: s.postings?.[0]?.name || s.name,
						windowIndex: i,
						window: t,
						schedule: {
							_id: s._id,
							postings: s.postings || [],
							meta: s.meta || {}
						}
					});
				}
			}
		}
		res.json({ current });
	} catch (err) {
		console.error("getStudentCurrentSchedule error", err);
		res.status(500).json({
			message: "Server error",
			error: String(err)
		});
	}
};
const getStudentUpcomingSchedule = async (req, res) => {
	try {
		const { studentId } = req.params;
		const limit = Number(req.query.limit || 5);
		if (!studentId) return res.status(400).json({ message: "Missing studentId" });
		const schedules = await rotationPlan_default.find({}).sort({ createdAt: -1 }).limit(200).lean();
		const now = /* @__PURE__ */ new Date();
		const upcoming = [];
		for (const s of schedules) {
			const timeline = s.meta && s.meta.timeline || [];
			for (let i = 0; i < timeline.length; i++) {
				const t = timeline[i];
				const start = new Date(t.startDate);
				if ((Array.isArray(t.studentIds) ? t.studentIds : []).some((st) => String(st) === String(studentId))) {
					if (start > now) upcoming.push({
						scheduleId: s._id,
						postingName: s.postings?.[0]?.name || s.name,
						windowIndex: i,
						window: t
					});
				}
			}
		}
		upcoming.sort((a, b) => new Date(a.window.startDate).getTime() - new Date(b.window.startDate).getTime());
		res.json({ upcoming: upcoming.slice(0, limit) });
	} catch (err) {
		console.error("getStudentUpcomingSchedule error", err);
		res.status(500).json({
			message: "Server error",
			error: String(err)
		});
	}
};
const getStudentScheduleHistory = async (req, res) => {
	try {
		const { studentId } = req.params;
		const limit = Number(req.query.limit || 50);
		if (!studentId) return res.status(400).json({ message: "Missing studentId" });
		const schedules = await rotationPlan_default.find({}).sort({ createdAt: -1 }).limit(200).lean();
		const now = /* @__PURE__ */ new Date();
		const history = [];
		for (const s of schedules) {
			const timeline = s.meta && s.meta.timeline || [];
			for (let i = 0; i < timeline.length; i++) {
				const t = timeline[i];
				const end = new Date(t.endDate);
				if ((Array.isArray(t.studentIds) ? t.studentIds : []).some((st) => String(st) === String(studentId))) {
					if (end <= now) history.push({
						scheduleId: s._id,
						postingName: s.postings?.[0]?.name || s.name,
						windowIndex: i,
						window: t
					});
				}
			}
		}
		history.sort((a, b) => new Date(b.window.startDate).getTime() - new Date(a.window.startDate).getTime());
		res.json({ history: history.slice(0, limit) });
	} catch (err) {
		console.error("getStudentScheduleHistory error", err);
		res.status(500).json({
			message: "Server error",
			error: String(err)
		});
	}
};
const runRotationRunner = async (req, res) => {
	try {
		const { id } = req.params;
		const { snapshotTime, windowIndex } = req.body;
		const snap = await rotationRunner_default(id, {
			snapshotTime,
			windowIndex
		});
		res.json({
			message: "Snapshot persisted",
			snapshot: snap
		});
	} catch (err) {
		console.error("runRotationRunner error", err);
		res.status(500).json({
			message: "Server error",
			error: String(err)
		});
	}
};
const listScheduleSupervisors = async (req, res) => {
	try {
		const { id } = req.params;
		const plan = await rotationPlan_default.findById(id).lean();
		if (!plan) return res.status(404).json({ message: "Schedule not found" });
		const timeline = plan.meta && plan.meta.timeline || [];
		const supervisors = {};
		for (const t of timeline) if (t.supervisorId) {
			const key = `dept_${t.departmentIndex}_group_${t.departmentGroupIndex}`;
			if (!supervisors[key]) supervisors[key] = {
				departmentIndex: t.departmentIndex,
				departmentGroupIndex: t.departmentGroupIndex,
				supervisorId: t.supervisorId,
				supervisorName: t.supervisorName || null
			};
		}
		res.json({
			id,
			supervisors: Object.values(supervisors)
		});
	} catch (err) {
		console.error("listScheduleSupervisors error", err);
		res.status(500).json({
			message: "Server error",
			error: String(err)
		});
	}
};
const listScheduleEvents = async (req, res) => {
	try {
		const { classId, start, end } = req.query;
		if (!classId) return res.status(400).json({ message: "Missing classId" });
		const startDate = start ? new Date(start) : null;
		const endDate = end ? new Date(end) : null;
		const plans = await rotationPlan_default.find({ class: classId }).lean();
		const events = [];
		for (const p of plans) {
			const timeline = p.meta && p.meta.timeline || [];
			for (let i = 0; i < timeline.length; i++) {
				const t = timeline[i];
				const s = t.startDate ? new Date(t.startDate) : null;
				const e = t.endDate ? new Date(t.endDate) : null;
				if (startDate && endDate && s && e) {
					if (!(e > startDate && s < endDate)) continue;
				}
				events.push({
					id: `${p._id}-${i}`,
					scheduleId: p._id,
					postingId: p.postings?.[0]?.postingId || null,
					postingName: p.postings?.[0]?.name || p.name,
					startDate: t.startDate,
					endDate: t.endDate,
					supervisorId: t.supervisorId || null,
					supervisorName: t.supervisorName || null,
					status: t.supervisorId ? "assigned" : "upcoming"
				});
			}
		}
		res.json({ events });
	} catch (err) {
		console.error("listScheduleEvents error", err);
		res.status(500).json({
			message: "Server error",
			error: String(err)
		});
	}
};
const updateWindowInSchedule = async (req, res) => {
	try {
		const { id, index } = req.params;
		const payload = req.body || {};
		const plan = await rotationPlan_default.findById(id);
		if (!plan) return res.status(404).json({ message: "Schedule not found" });
		const idx = Number(index);
		const timeline = plan.meta && plan.meta.timeline || [];
		if (isNaN(idx) || idx < 0 || idx >= timeline.length) return res.status(400).json({ message: "Invalid window index" });
		const window = timeline[idx];
		if (payload.startDate !== void 0) window.startDate = payload.startDate;
		if (payload.endDate !== void 0) window.endDate = payload.endDate;
		if (payload.supervisorId !== void 0) {
			window.supervisorId = payload.supervisorId;
			window.supervisorName = await getSupervisorNameById(payload.supervisorId || null);
			const groupIndex = typeof window.departmentGroupIndex === "number" ? window.departmentGroupIndex : null;
			if (groupIndex !== null) {
				const postings = plan.postings || [];
				for (const p of postings) {
					p.meta = {
						...p.meta || {},
						timeline
					};
					const groups = p.groups || [];
					if (groups[groupIndex]) {
						groups[groupIndex].supervisor = payload.supervisorId;
						groups[groupIndex].supervisorName = window.supervisorName || void 0;
					}
				}
			}
		}
		if (payload.markComplete) window.completed = true;
		if (payload.status !== void 0) window.status = payload.status;
		plan.meta = {
			...plan.meta || {},
			timeline
		};
		await plan.save();
		return res.json({
			message: "Window updated",
			window
		});
	} catch (err) {
		console.error("updateWindowInSchedule error", err);
		res.status(500).json({
			message: "Server error",
			error: String(err)
		});
	}
};
const updateRotationSchedule = async (req, res) => {
	try {
		const { id } = req.params;
		const updates = req.body || {};
		const plan = await rotationPlan_default.findById(id);
		if (!plan) return res.status(404).json({ message: "Schedule not found" });
		Object.assign(plan, updates);
		await plan.save();
		res.json(plan);
	} catch (err) {
		console.error("updateRotationSchedule error", err);
		res.status(500).json({
			message: "Server error",
			error: String(err)
		});
	}
};
const updatePostingInSchedule = async (req, res) => {
	try {
		const { id, postingName } = req.params;
		const updates = req.body || {};
		const plan = await rotationPlan_default.findById(id);
		if (!plan) return res.status(404).json({ message: "Schedule not found" });
		const name = decodeURIComponent(postingName);
		const postings = plan.postings || [];
		const idx = postings.findIndex((p) => String(p.name) === String(name) || String(p.postingId) === String(name));
		if (idx === -1) return res.status(404).json({ message: "Posting not found" });
		Object.assign(postings[idx], updates);
		plan.postings = postings;
		await plan.save();
		res.json({
			message: "Posting updated",
			posting: postings[idx]
		});
	} catch (err) {
		console.error("updatePostingInSchedule error", err);
		res.status(500).json({
			message: "Server error",
			error: String(err)
		});
	}
};
const deletePostingFromSchedule = async (req, res) => {
	try {
		const { id, postingName } = req.params;
		const plan = await rotationPlan_default.findById(id);
		if (!plan) return res.status(404).json({ message: "Schedule not found" });
		const name = decodeURIComponent(postingName);
		const postings = plan.postings || [];
		const idx = postings.findIndex((p) => String(p.name) === String(name) || String(p.postingId) === String(name));
		if (idx === -1) return res.status(404).json({ message: "Posting not found" });
		postings.splice(idx, 1);
		plan.postings = postings;
		await plan.save();
		res.json({
			message: "Posting deleted",
			id,
			postingName: name
		});
	} catch (err) {
		console.error("deletePostingFromSchedule error", err);
		res.status(500).json({
			message: "Server error",
			error: String(err)
		});
	}
};
var router$3 = express.Router();
router$3.post("/", protect, authorize(["admin", "teacher"]), createRotationSchedule);
router$3.get("/", protect, listRotationSchedules);
router$3.get("/events", protect, listScheduleEvents);
router$3.patch("/:id/windows/:index", protect, authorize(["admin", "teacher"]), updateWindowInSchedule);
router$3.patch("/:id", protect, authorize(["admin", "teacher"]), updateRotationSchedule);
router$3.patch("/:id/postings/:postingName", protect, authorize(["admin", "teacher"]), updatePostingInSchedule);
router$3.delete("/:id/postings/:postingName", protect, authorize(["admin", "teacher"]), deletePostingFromSchedule);
if (process.env.NODE_ENV === "development") router$3.get("/debug/first", async (req, res) => {
	try {
		const doc = await (init_rotationPlan(), __toCommonJS(rotationPlan_exports)).default.findOne({}).lean();
		if (!doc) return res.status(404).json({ message: "No rotation schedules found" });
		return res.status(200).json({ schedule: doc });
	} catch (err) {
		console.error("debug schedule fetch error", err);
		return res.status(500).json({
			message: "Server error",
			error: String(err)
		});
	}
});
router$3.get("/student-assignments", protect, getStudentAssignments);
router$3.get("/student/:studentId/current", protect, getStudentCurrentSchedule);
router$3.get("/student/:studentId/upcoming", protect, getStudentUpcomingSchedule);
router$3.get("/student/:studentId/history", protect, getStudentScheduleHistory);
router$3.get("/:id", protect, getRotationScheduleById);
router$3.get("/:id/supervisors", protect, listScheduleSupervisors);
router$3.delete("/:id", protect, authorize(["admin", "teacher"]), deleteRotationSchedule);
router$3.post("/:id/assign-supervisor", protect, authorize(["admin", "teacher"]), assignSupervisorToWindow);
router$3.post("/:id/run", protect, authorize(["admin", "teacher"]), runRotationRunner);
var rotationSchedules_default = router$3;
var logbookEntry_default = express.Router();
var HospitalUnitSchema = new Schema({
	name: {
		type: String,
		required: true,
		trim: true
	},
	department: {
		type: String,
		required: true,
		trim: true
	},
	category: {
		type: String,
		enum: ["academic", "clinical"],
		required: true
	},
	description: { type: String },
	supervisors: [{
		type: mongoose.Types.ObjectId,
		ref: "HospitalStaff"
	}],
	isActive: {
		type: Boolean,
		default: true
	}
}, { timestamps: true });
HospitalUnitSchema.index({
	department: 1,
	category: 1
});
var hospitalUnit_default = mongoose.model("HospitalUnit", HospitalUnitSchema, "hospital_units");
init_hospitalStaff();
const createHospitalUnit = async (req, res) => {
	try {
		const { name, department, category, umbrella, description, supervisors } = req.body;
		if (!name || !department || !category || !umbrella) return res.status(400).json({ error: "Missing required fields: name, department, category, umbrella." });
		const unit = await hospitalUnit_default.create({
			name,
			department,
			category,
			umbrella,
			description,
			supervisors: supervisors || []
		});
		return res.status(201).json({
			message: "Hospital unit created successfully.",
			unit
		});
	} catch (error) {
		console.error("Error creating hospital unit:", error);
		return res.status(500).json({ error: "Failed to create hospital unit." });
	}
};
const listHospitalUnits = async (req, res) => {
	try {
		const limit = Math.min(parseInt(req.query.limit) || 20, 100);
		const skip = parseInt(req.query.skip) || 0;
		const department = req.query.department;
		const category = req.query.category;
		const umbrella = req.query.umbrella;
		const filter = { isActive: true };
		if (department) filter.department = new RegExp(department, "i");
		if (category) filter.category = category;
		if (umbrella) filter.umbrella = umbrella;
		const seededUnits = await hospitalUnit_default.find(filter).populate("supervisors", "name designation").sort({
			department: 1,
			name: 1
		}).limit(limit).skip(skip).lean();
		const total = await hospitalUnit_default.countDocuments(filter);
		const fallbackUnits = getAllDepartmentUnits().flatMap((departmentRecord) => {
			const departmentName = departmentRecord?.name;
			return [...Array.isArray(departmentRecord?.units?.active) ? departmentRecord.units.active : [], ...Array.isArray(departmentRecord?.units?.reserve) ? departmentRecord.units.reserve : []].map((entry) => {
				const unitName = typeof entry === "string" ? entry : entry?.name ?? "Unnamed Unit";
				const unitId = typeof entry === "string" ? entry : entry?.id ?? unitName;
				return {
					_id: String(unitId),
					name: String(unitName),
					department: String(departmentName ?? ""),
					departmentName: String(departmentName ?? ""),
					category: "clinical",
					isActive: true,
					supervisors: [],
					description: `Synthetic unit from ${departmentName ?? "department"}`
				};
			});
		});
		const normalizedDepartment = department?.trim().toLowerCase();
		const normalizedCategory = category?.trim().toLowerCase();
		const filteredFallbackUnits = fallbackUnits.filter((unit) => {
			const matchesDepartment = !normalizedDepartment || String(unit.department).toLowerCase().includes(normalizedDepartment);
			const matchesCategory = !normalizedCategory || String(unit.category).toLowerCase() === normalizedCategory;
			return matchesDepartment && matchesCategory;
		});
		if (seededUnits.length === 0) {
			const pagedFallbackUnits = filteredFallbackUnits.slice(skip, skip + limit);
			return res.status(200).json({
				units: pagedFallbackUnits,
				total: filteredFallbackUnits.length,
				page: Math.floor(skip / limit) + 1,
				pages: Math.max(1, Math.ceil(filteredFallbackUnits.length / limit))
			});
		}
		return res.status(200).json({
			units: seededUnits,
			total,
			page: Math.floor(skip / limit) + 1,
			pages: Math.max(1, Math.ceil(total / limit))
		});
	} catch (error) {
		console.error("Error listing hospital units:", error);
		return res.status(500).json({ error: "Failed to list hospital units." });
	}
};
const getHospitalUnit = async (req, res) => {
	try {
		const { unitId } = req.params;
		const unit = await hospitalUnit_default.findById(unitId).populate("supervisors", "name designation fileNumber");
		if (!unit) return res.status(404).json({ error: "Hospital unit not found." });
		return res.status(200).json({ unit });
	} catch (error) {
		console.error("Error fetching hospital unit:", error);
		return res.status(500).json({ error: "Failed to fetch hospital unit." });
	}
};
const updateHospitalUnit = async (req, res) => {
	try {
		const { unitId } = req.params;
		const { name, description, supervisors, isActive } = req.body;
		const unit = await hospitalUnit_default.findByIdAndUpdate(unitId, {
			name,
			description,
			supervisors,
			isActive
		}, { returnDocument: "after" });
		if (!unit) return res.status(404).json({ error: "Hospital unit not found." });
		return res.status(200).json({
			message: "Hospital unit updated successfully.",
			unit
		});
	} catch (error) {
		console.error("Error updating hospital unit:", error);
		return res.status(500).json({ error: "Failed to update hospital unit." });
	}
};
const createHospitalStaff = async (req, res) => {
	try {
		const { fileNumber, name, qualification, designation, systemRole, department, assignedUnits, email, phone, canApproveLogbooks } = req.body;
		if (!fileNumber || !name || !designation || !department) return res.status(400).json({ error: "Missing required fields: fileNumber, name, designation, department." });
		const staff = await hospitalStaff_default.create({
			fileNumber,
			name,
			qualification,
			designation,
			systemRole: systemRole || "CONSULTANT",
			department,
			assignedUnits: assignedUnits || [],
			email,
			phone,
			canApproveLogbooks: canApproveLogbooks !== false
		});
		return res.status(201).json({
			message: "Hospital staff created successfully.",
			staff
		});
	} catch (error) {
		if (error.code === 11e3) return res.status(400).json({ error: "File number already exists." });
		console.error("Error creating hospital staff:", error);
		return res.status(500).json({ error: "Failed to create hospital staff." });
	}
};
const listHospitalStaff = async (req, res) => {
	try {
		const limit = Math.min(parseInt(req.query.limit) || 20, 100);
		const skip = parseInt(req.query.skip) || 0;
		const department = req.query.department;
		const designation = req.query.designation;
		const systemRole = req.query.systemRole;
		const filter = { isActive: true };
		if (department) filter.department = new RegExp(department, "i");
		if (designation) filter.designation = designation;
		if (systemRole) filter.systemRole = systemRole;
		const total = await hospitalStaff_default.countDocuments(filter);
		const staff = await hospitalStaff_default.find(filter).populate("assignedUnits", "name department category").sort({ fileNumber: 1 }).limit(limit).skip(skip);
		return res.status(200).json({
			staff,
			total,
			page: Math.floor(skip / limit) + 1,
			pages: Math.ceil(total / limit)
		});
	} catch (error) {
		console.error("Error listing hospital staff:", error);
		return res.status(500).json({ error: "Failed to list hospital staff." });
	}
};
const getHospitalStaff = async (req, res) => {
	try {
		const { staffId } = req.params;
		const staff = await hospitalStaff_default.findById(staffId).populate("assignedUnits", "name department category umbrella");
		if (!staff) return res.status(404).json({ error: "Staff member not found." });
		return res.status(200).json({ staff });
	} catch (error) {
		console.error("Error fetching hospital staff:", error);
		return res.status(500).json({ error: "Failed to fetch hospital staff." });
	}
};
const updateHospitalStaff = async (req, res) => {
	try {
		const { staffId } = req.params;
		const { assignedUnits, email, phone, isActive, canApproveLogbooks } = req.body;
		const staff = await hospitalStaff_default.findByIdAndUpdate(staffId, {
			assignedUnits,
			email,
			phone,
			isActive,
			canApproveLogbooks
		}, { returnDocument: "after" });
		if (!staff) return res.status(404).json({ error: "Staff member not found." });
		return res.status(200).json({
			message: "Hospital staff updated successfully.",
			staff
		});
	} catch (error) {
		console.error("Error updating hospital staff:", error);
		return res.status(500).json({ error: "Failed to update hospital staff." });
	}
};
const bulkImportStaff = async (req, res) => {
	try {
		const { staffData } = req.body;
		if (!Array.isArray(staffData)) return res.status(400).json({ error: "staffData must be an array." });
		const results = {
			created: 0,
			failed: 0,
			errors: []
		};
		for (const data of staffData) try {
			await hospitalStaff_default.updateOne({ fileNumber: data.fileNumber }, { $setOnInsert: {
				name: data.name,
				qualification: data.qualification,
				designation: data.designation,
				department: data.department,
				systemRole: data.systemRole || "CONSULTANT",
				email: data.email,
				phone: data.phone,
				canApproveLogbooks: true
			} }, { upsert: true });
			results.created++;
		} catch (err) {
			results.failed++;
			results.errors.push({
				fileNumber: data.fileNumber,
				error: err instanceof Error ? err.message : "Unknown error"
			});
		}
		return res.status(200).json({
			message: "Bulk import completed.",
			...results
		});
	} catch (error) {
		console.error("Error bulk importing staff:", error);
		return res.status(500).json({ error: "Failed to bulk import staff." });
	}
};
var router$2 = Router();
router$2.post("/units", protect, authorize(["admin"]), createHospitalUnit);
router$2.get("/units", protect, listHospitalUnits);
router$2.get("/units/:unitId", protect, getHospitalUnit);
router$2.patch("/units/:unitId", protect, authorize(["admin"]), updateHospitalUnit);
router$2.post("/staff", protect, authorize(["admin"]), createHospitalStaff);
router$2.get("/staff", protect, listHospitalStaff);
router$2.get("/staff/:staffId", protect, getHospitalStaff);
router$2.patch("/staff/:staffId", protect, authorize(["admin"]), updateHospitalStaff);
router$2.post("/staff/bulk-import", protect, authorize(["admin"]), bulkImportStaff);
var hospitalData_default = router$2;
var ActivityEntrySchema = new Schema({
	student: {
		type: mongoose.Types.ObjectId,
		ref: "User",
		required: true
	},
	rotation: {
		type: mongoose.Types.ObjectId,
		ref: "ClinicalRotation",
		required: true
	},
	unit: {
		type: mongoose.Types.ObjectId,
		ref: "HospitalUnit"
	},
	supervisor: {
		type: mongoose.Types.ObjectId,
		ref: "HospitalStaff"
	},
	umbrellaCategory: {
		type: String,
		enum: ["MEDICINE", "SURGERY"],
		required: true
	},
	entryDate: {
		type: Date,
		required: true,
		validate: {
			validator: function(v) {
				const day = v.getDay();
				return day !== 0 && day !== 6;
			},
			message: "Clinical activity entries can only be documented for Monday through Friday."
		}
	},
	clinicsAttended: {
		type: Boolean,
		default: false
	},
	wardRoundsAttended: {
		type: String,
		enum: [
			"NONE",
			"RESIDENT_ROUND",
			"CONSULTANT_ROUND",
			"BOTH"
		],
		default: "NONE"
	},
	callDutyCompleted: {
		type: Boolean,
		default: false
	},
	surgicalMetrics: {
		theatreDaysCount: {
			type: Number,
			default: 0
		},
		casesObserved: [{ type: String }],
		casesAssisted: [{ type: String }]
	},
	medicalMetrics: { proceduresWitnessedOrDone: [{ type: String }] },
	approvalStatus: {
		type: String,
		enum: [
			"pending",
			"approved",
			"rejected"
		],
		default: "pending"
	},
	approvedBy: {
		type: mongoose.Types.ObjectId,
		ref: "HospitalStaff"
	},
	approvedByRole: {
		type: String,
		enum: ["RESIDENT", "CONSULTANT"]
	},
	approvedAt: { type: Date },
	rejectionReason: { type: String },
	notes: { type: String },
	attachments: [{ type: String }]
}, { timestamps: true });
ActivityEntrySchema.index({
	student: 1,
	entryDate: -1
});
ActivityEntrySchema.index({
	rotation: 1,
	approvalStatus: 1
});
ActivityEntrySchema.index({
	unit: 1,
	umbrellaCategory: 1
});
ActivityEntrySchema.index({
	approvalStatus: 1,
	supervisor: 1
});
ActivityEntrySchema.index({
	entryDate: 1,
	approvalStatus: 1
});
var activityEntry_default$1 = mongoose.model("ActivityEntry", ActivityEntrySchema, "activity_entries");
init_hospitalStaff();
init_rotationPlan();
var ActivityLogbookService = class {
	isWeekday(date) {
		const day = date.getDay();
		return day !== 0 && day !== 6;
	}
	validateUmbrellaRequirements(payload) {
		if (payload.umbrellaCategory === "SURGERY") {
			if (!payload.surgicalMetrics) return {
				valid: false,
				error: "Surgical category postings require theatre metrics (cases observed/assisted)."
			};
			if (payload.surgicalMetrics.casesObserved.length === 0 && payload.surgicalMetrics.casesAssisted.length === 0) return {
				valid: false,
				error: "At least one case observation or case assistance record is required for surgical postings."
			};
		} else if (payload.umbrellaCategory === "MEDICINE") {
			if (!payload.medicalMetrics) return {
				valid: false,
				error: "Medical category postings require procedure records."
			};
			if (payload.medicalMetrics.proceduresWitnessedOrDone.length === 0) return {
				valid: false,
				error: "At least one procedure record is required for medical postings."
			};
		}
		return { valid: true };
	}
	async submitActivityEntry(payload) {
		try {
			const entryDate = new Date(payload.entryDate);
			if (!this.isWeekday(entryDate)) return {
				success: false,
				error: "Clinical activity entries can only be submitted for Monday through Friday."
			};
			const umbrellaCheck = this.validateUmbrellaRequirements(payload);
			if (!umbrellaCheck.valid) return {
				success: false,
				error: umbrellaCheck.error
			};
			if (!await mongoose.connection.collection("users").findOne({ _id: new mongoose.Types.ObjectId(payload.student) })) return {
				success: false,
				error: "Student not found."
			};
			const rotationId = payload.rotation;
			let rotationFound = null;
			try {
				rotationFound = await mongoose.connection.collection("clinical_rotations").findOne({ _id: new mongoose.Types.ObjectId(rotationId) });
			} catch (err) {
				rotationFound = null;
			}
			if (!rotationFound) {
				if (!await rotationPlan_default.findOne({ _id: new mongoose.Types.ObjectId(rotationId) }).lean()) return {
					success: false,
					error: "Clinical rotation not found."
				};
			}
			let unit = null;
			if (payload.unit) {
				unit = await hospitalUnit_default.findById(payload.unit);
				if (!unit) return {
					success: false,
					error: "Hospital unit not found."
				};
			}
			return {
				success: true,
				entryId: (await activityEntry_default$1.create({
					student: payload.student,
					rotation: payload.rotation,
					...payload.unit ? { unit: payload.unit } : {},
					supervisor: payload.supervisor,
					umbrellaCategory: payload.umbrellaCategory,
					entryDate,
					clinicsAttended: payload.clinicsAttended,
					wardRoundsAttended: payload.wardRoundsAttended,
					callDutyCompleted: payload.callDutyCompleted,
					surgicalMetrics: payload.surgicalMetrics,
					medicalMetrics: payload.medicalMetrics,
					notes: payload.notes,
					approvalStatus: "pending"
				}))._id.toString()
			};
		} catch (error) {
			console.error("Error submitting activity entry:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to submit activity entry."
			};
		}
	}
	async approveActivityEntry(entryId, staffId, role) {
		try {
			const entry = await activityEntry_default$1.findById(entryId);
			if (!entry) return {
				success: false,
				error: "Activity entry not found."
			};
			if (entry.approvalStatus === "approved") return {
				success: false,
				error: "This entry has already been approved."
			};
			const staff = await hospitalStaff_default.findById(staffId);
			if (!staff) return {
				success: false,
				error: "Staff member not found."
			};
			if (!staff.canApproveLogbooks) return {
				success: false,
				error: "This staff member does not have permission to approve logbook entries."
			};
			if (entry.unit) {
				if (!staff.assignedUnits.some((unitId) => unitId.toString() === entry.unit?.toString())) return {
					success: false,
					error: "This staff member is not assigned to the unit where this activity occurred."
				};
			}
			entry.approvalStatus = "approved";
			entry.approvedBy = new mongoose.Types.ObjectId(staffId);
			entry.approvedByRole = role;
			entry.approvedAt = /* @__PURE__ */ new Date();
			await entry.save();
			return { success: true };
		} catch (error) {
			console.error("Error approving activity entry:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to approve activity entry."
			};
		}
	}
	async rejectActivityEntry(entryId, staffId, rejectionReason) {
		try {
			const entry = await activityEntry_default$1.findById(entryId);
			if (!entry) return {
				success: false,
				error: "Activity entry not found."
			};
			if (entry.approvalStatus === "approved") return {
				success: false,
				error: "Cannot reject an already-approved entry."
			};
			if (!await hospitalStaff_default.findById(staffId)) return {
				success: false,
				error: "Staff member not found."
			};
			entry.approvalStatus = "rejected";
			entry.rejectionReason = rejectionReason;
			entry.approvedBy = new mongoose.Types.ObjectId(staffId);
			entry.approvedAt = /* @__PURE__ */ new Date();
			await entry.save();
			return { success: true };
		} catch (error) {
			console.error("Error rejecting activity entry:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to reject activity entry."
			};
		}
	}
	async getPendingEntriesForStaff(staffId, limit = 20, skip = 0) {
		try {
			const staff = await hospitalStaff_default.findById(staffId);
			if (!staff) return {
				success: false,
				error: "Staff member not found."
			};
			const total = await activityEntry_default$1.countDocuments({
				unit: { $in: staff.assignedUnits },
				approvalStatus: "pending"
			});
			return {
				success: true,
				entries: await activityEntry_default$1.find({
					unit: { $in: staff.assignedUnits },
					approvalStatus: "pending"
				}).populate("student", "name email").populate("rotation", "rotationName rotationType").populate("unit", "name department").sort({ entryDate: -1 }).limit(limit).skip(skip),
				total
			};
		} catch (error) {
			console.error("Error fetching pending entries:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to fetch pending entries."
			};
		}
	}
	async getStudentRotationLogbook(studentId, rotationId) {
		try {
			const query = {
				student: studentId,
				approvalStatus: "approved"
			};
			if (rotationId) query.rotation = rotationId;
			return {
				success: true,
				entries: await activityEntry_default$1.find(query).populate("unit", "name department umbrellaCategory").populate("approvedBy", "name designation").sort({ entryDate: 1 })
			};
		} catch (error) {
			console.error("Error fetching logbook:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to fetch logbook."
			};
		}
	}
	async getStudentLogbookAll(studentId, rotationId) {
		try {
			const query = { student: studentId };
			if (rotationId) query.rotation = rotationId;
			return {
				success: true,
				entries: await activityEntry_default$1.find(query).populate("unit", "name department umbrellaCategory").populate("approvedBy", "name designation").sort({ entryDate: 1 })
			};
		} catch (error) {
			console.error("Error fetching student logbook (all statuses):", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to fetch logbook."
			};
		}
	}
};
var activityLogbookService_default = new ActivityLogbookService();
const createActivityEntry = async (req, res) => {
	try {
		const { student, rotation, unit, umbrellaCategory, entryDate, clinicsAttended, wardRoundsAttended, callDutyCompleted, surgicalMetrics, medicalMetrics, notes } = req.body;
		const studentId = student || req.user?._id;
		if (!studentId) return res.status(400).json({ error: "Student ID is required." });
		const result = await activityLogbookService_default.submitActivityEntry({
			student: studentId,
			rotation,
			unit,
			umbrellaCategory,
			entryDate,
			clinicsAttended,
			wardRoundsAttended,
			callDutyCompleted,
			surgicalMetrics,
			medicalMetrics,
			notes
		});
		if (!result.success) return res.status(400).json({ error: result.error });
		return res.status(201).json({
			message: "Activity entry submitted successfully.",
			entryId: result.entryId
		});
	} catch (error) {
		console.error("Error creating activity entry:", error);
		return res.status(500).json({ error: "Failed to create activity entry." });
	}
};
const getPendingEntries = async (req, res) => {
	try {
		const staffId = req.user?._id;
		if (!staffId) return res.status(401).json({ error: "Unauthorized." });
		const limit = Math.min(parseInt(req.query.limit) || 20, 100);
		const skip = parseInt(req.query.skip) || 0;
		const result = await activityLogbookService_default.getPendingEntriesForStaff(staffId, limit, skip);
		if (!result.success) return res.status(400).json({ error: result.error });
		return res.status(200).json({
			entries: result.entries,
			total: result.total
		});
	} catch (error) {
		console.error("Error fetching pending entries:", error);
		return res.status(500).json({ error: "Failed to fetch pending entries." });
	}
};
const getStudentLogbook = async (req, res) => {
	try {
		const { studentId, rotationId } = req.params;
		const result = await activityLogbookService_default.getStudentRotationLogbook(studentId, rotationId);
		if (!result.success) return res.status(400).json({ error: result.error });
		return res.status(200).json({ entries: result.entries });
	} catch (error) {
		console.error("Error fetching logbook:", error);
		return res.status(500).json({ error: "Failed to fetch logbook." });
	}
};
const getStudentLogbookAll = async (req, res) => {
	try {
		const { studentId, rotationId } = req.params;
		const result = await activityLogbookService_default.getStudentLogbookAll(studentId, rotationId);
		if (!result.success) return res.status(400).json({ error: result.error });
		return res.status(200).json({ entries: result.entries });
	} catch (error) {
		console.error("Error fetching student logbook (all statuses):", error);
		return res.status(500).json({ error: "Failed to fetch logbook." });
	}
};
const approveActivityEntry = async (req, res) => {
	try {
		const { entryId } = req.params;
		const staffId = req.user?._id;
		const userRole$1 = req.user?.role;
		if (!staffId) return res.status(401).json({ error: "Unauthorized." });
		if (userRole$1 !== "unitconsultant" && userRole$1 !== "unitresident") return res.status(403).json({ error: "Only clinical staff can approve entries." });
		const approverRole = userRole$1 === "unitconsultant" ? "CONSULTANT" : "RESIDENT";
		const result = await activityLogbookService_default.approveActivityEntry(entryId, staffId, approverRole);
		if (!result.success) return res.status(400).json({ error: result.error });
		return res.status(200).json({ message: "Activity entry approved successfully." });
	} catch (error) {
		console.error("Error approving activity entry:", error);
		return res.status(500).json({ error: "Failed to approve activity entry." });
	}
};
const rejectActivityEntry = async (req, res) => {
	try {
		const { entryId } = req.params;
		const { rejectionReason } = req.body;
		const staffId = req.user?._id;
		const userRole$1 = req.user?.role;
		if (!staffId) return res.status(401).json({ error: "Unauthorized." });
		if (userRole$1 !== "unitconsultant" && userRole$1 !== "unitresident") return res.status(403).json({ error: "Only clinical staff can reject entries." });
		if (!rejectionReason) return res.status(400).json({ error: "Rejection reason is required." });
		const result = await activityLogbookService_default.rejectActivityEntry(entryId, staffId, rejectionReason);
		if (!result.success) return res.status(400).json({ error: result.error });
		return res.status(200).json({ message: "Activity entry rejected." });
	} catch (error) {
		console.error("Error rejecting activity entry:", error);
		return res.status(500).json({ error: "Failed to reject activity entry." });
	}
};
const getActivityEntry = async (req, res) => {
	try {
		const { entryId } = req.params;
		if (!mongoose.Types.ObjectId.isValid(entryId)) return res.status(400).json({ error: "Invalid entry ID." });
		const entry = await activityEntry_default$1.findById(entryId).populate("student", "name email idNumber").populate("rotation", "rotationName rotationType rotationUnit").populate("unit", "name department umbrellaCategory").populate("approvedBy", "name designation");
		if (!entry) return res.status(404).json({ error: "Activity entry not found." });
		return res.status(200).json({ entry });
	} catch (error) {
		console.error("Error fetching activity entry:", error);
		return res.status(500).json({ error: "Failed to fetch activity entry." });
	}
};
const listActivityEntries = async (req, res) => {
	try {
		const limit = Math.min(parseInt(req.query.limit) || 20, 100);
		const skip = parseInt(req.query.skip) || 0;
		const status = req.query.status;
		const studentId = req.query.studentId;
		const unitId = req.query.unitId;
		const filter = {};
		if (status) filter.approvalStatus = status;
		if (studentId) filter.student = studentId;
		if (unitId) filter.unit = unitId;
		const total = await activityEntry_default$1.countDocuments(filter);
		const entries = await activityEntry_default$1.find(filter).populate("student", "name email").populate("unit", "name department").populate("approvedBy", "name designation").sort({ entryDate: -1 }).limit(limit).skip(skip);
		return res.status(200).json({
			entries,
			total,
			page: Math.floor(skip / limit) + 1,
			pages: Math.ceil(total / limit)
		});
	} catch (error) {
		console.error("Error listing activity entries:", error);
		return res.status(500).json({ error: "Failed to list activity entries." });
	}
};
var router$1 = Router();
router$1.post("/", protect, createActivityEntry);
router$1.get("/", protect, authorize(["admin", "teacher"]), listActivityEntries);
router$1.get("/pending", protect, authorize(["unitconsultant", "unitresident"]), getPendingEntries);
router$1.get("/:entryId", protect, getActivityEntry);
router$1.get("/logbook/:studentId", protect, getStudentLogbook);
router$1.get("/logbook/:studentId/:rotationId", protect, getStudentLogbook);
router$1.get("/student/:studentId", protect, getStudentLogbookAll);
router$1.get("/student/:studentId/:rotationId", protect, getStudentLogbookAll);
router$1.post("/:entryId/approve", protect, authorize(["unitconsultant", "unitresident"]), approveActivityEntry);
router$1.post("/:entryId/reject", protect, authorize(["unitconsultant", "unitresident"]), rejectActivityEntry);
var activityEntry_default = router$1;
var AttendanceSettingsSchema = new Schema({
	lectureAttendance: {
		type: Boolean,
		default: true
	},
	clinicalAttendance: {
		type: Boolean,
		default: true
	},
	seminarAttendance: {
		type: Boolean,
		default: true
	},
	verificationMethods: {
		qrCode: {
			type: Boolean,
			default: false
		},
		bluetooth: {
			type: Boolean,
			default: false
		},
		gps: {
			type: Boolean,
			default: false
		},
		administratorApproval: {
			type: Boolean,
			default: false
		}
	},
	minimumAttendancePercentage: {
		type: Number,
		default: 75
	},
	gracePeriodMinutes: {
		type: Number,
		default: 10
	},
	attendanceWindowMinutes: {
		type: Number,
		default: 120
	}
}, { timestamps: true });
var attendanceSettings_default = mongoose.model("AttendanceSettings", AttendanceSettingsSchema);
var AssessmentSettingsSchema = new Schema({
	mcq: {
		type: Boolean,
		default: true
	},
	essay: {
		type: Boolean,
		default: true
	},
	osce: {
		type: Boolean,
		default: true
	},
	longCase: {
		type: Boolean,
		default: true
	},
	shortCase: {
		type: Boolean,
		default: true
	},
	continuousAssessment: {
		type: Boolean,
		default: true
	},
	passMark: {
		type: Number,
		default: 50
	},
	gradingScale: {
		type: [String],
		default: [
			"A",
			"B",
			"C",
			"D",
			"F"
		]
	}
}, { timestamps: true });
var assessmentSettings_default = mongoose.model("AssessmentSettings", AssessmentSettingsSchema);
var BrandingSettingsSchema = new Schema({
	logoUrl: {
		type: String,
		default: ""
	},
	faviconUrl: {
		type: String,
		default: ""
	},
	coverImageUrl: {
		type: String,
		default: ""
	},
	primaryColor: {
		type: String,
		default: "#2563eb"
	},
	accentColor: {
		type: String,
		default: "#4f46e5"
	}
}, { timestamps: true });
var brandingSettings_default = mongoose.model("BrandingSettings", BrandingSettingsSchema);
var ApplicationSettingsSchema = new Schema({
	defaultLanguage: {
		type: String,
		default: "en"
	},
	allowPublicRegistration: {
		type: Boolean,
		default: false
	},
	timezone: {
		type: String,
		default: "UTC"
	},
	dateFormat: {
		type: String,
		default: "YYYY-MM-DD"
	},
	extra: {
		type: Schema.Types.Mixed,
		default: {}
	}
}, { timestamps: true });
var applicationSettings_default = mongoose.model("ApplicationSettings", ApplicationSettingsSchema);
init_user();
init_classes();
var DEFAULT_DEPARTMENT_NAMES = [
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
	"Histopathology"
];
var sanitizeCode = (name) => name.replace(/\s+&\s+/g, "-").replace(/[^A-Za-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toUpperCase();
var parseSessionRange = (value) => {
	const cleaned = String(value || "").trim();
	const match = cleaned.match(/(\d{4})\s*[\/-]\s*(\d{4})/);
	if (!match) {
		const now = /* @__PURE__ */ new Date();
		return {
			name: cleaned || `${now.getFullYear()}/${now.getFullYear() + 1}`,
			startsAt: new Date(now.getFullYear(), 0, 1),
			endsAt: new Date(now.getFullYear() + 1, 11, 31)
		};
	}
	const [, fromYear, toYear] = match;
	return {
		name: `${fromYear}/${toYear}`,
		startsAt: new Date(Number(fromYear), 0, 1),
		endsAt: new Date(Number(toYear), 11, 31)
	};
};
var getYearRangeFromSession = (value) => {
	const info = parseSessionRange(value);
	return {
		name: info.name,
		fromYear: info.startsAt,
		toYear: info.endsAt
	};
};
var buildUserIdNumber = (role, index) => {
	return `${role === UserRole.STUDENT ? "STU" : role === UserRole.TEACHER ? "TCH" : role === UserRole.UNITCONSULTANT ? "UC" : role === UserRole.UNITRESIDENT ? "UR" : "ADM"}-${String(index).padStart(3, "0")}-${Date.now()}`;
};
var cachedInstitution = null;
var lastCacheTime = 0;
var CACHE_TTL = 300 * 1e3;
const getSetupStatus = async (_req, res) => {
	const requestLabel = `${_req.method} ${_req.originalUrl || "/api/setup/status"}`;
	console.info(`[CONTROLLER] enter getSetupStatus for ${requestLabel}`);
	try {
		const now = Date.now();
		if (cachedInstitution && now - lastCacheTime < CACHE_TTL) {
			console.info(`[CONTROLLER] getSetupStatus cache hit for ${requestLabel}`);
			return res.status(200).json({
				configured: Boolean(cachedInstitution.data),
				institution: cachedInstitution.data
			});
		}
		const start = Date.now();
		console.info("Request /api/setup/status: received (cache miss)");
		const institution = await institution_default.findOne().select("name shortName type country state city addressLine1 addressLine2 contactEmail phone website description academicCalendarType timezone logoUrl backgroundImageUrl brandingSettings attendanceSettings").lean().exec().then((value) => value);
		let brandingSettings = {
			primaryColor: "#2563eb",
			accentColor: "#4f46e5"
		};
		let attendanceSettings = { minimumAttendancePercentage: 75 };
		if (institution?.brandingSettings) {
			const branding = await Promise.race([brandingSettings_default.findById(institution.brandingSettings).select("primaryColor accentColor").lean().exec(), new Promise((resolve) => setTimeout(() => resolve(null), 1e3))]);
			if (branding && typeof branding === "object" && branding !== null) {
				const brandingData = branding;
				brandingSettings = {
					primaryColor: brandingData.primaryColor || "#2563eb",
					accentColor: brandingData.accentColor || "#4f46e5"
				};
			}
		}
		if (institution?.attendanceSettings) {
			const settings = await Promise.race([attendanceSettings_default.findById(institution.attendanceSettings).select("minimumAttendancePercentage").lean().exec(), new Promise((resolve) => setTimeout(() => resolve(null), 1e3))]);
			if (settings && typeof settings === "object" && settings !== null) {
				const settingsData = settings;
				const numericThreshold = Number(settingsData.minimumAttendancePercentage ?? 75);
				attendanceSettings = { minimumAttendancePercentage: Number.isFinite(numericThreshold) ? numericThreshold : 75 };
			}
		}
		const duration = Date.now() - start;
		console.info(`[CONTROLLER] getSetupStatus db query completed in ${duration}ms for ${requestLabel}`);
		const response = {
			configured: Boolean(institution),
			institution: institution ? {
				name: institution.name,
				shortName: institution.shortName,
				type: institution.type,
				country: institution.country,
				state: institution.state,
				city: institution.city,
				addressLine1: institution.addressLine1 || "",
				addressLine2: institution.addressLine2 || "",
				contactEmail: institution.contactEmail || "",
				phone: institution.phone || "",
				website: institution.website || "",
				description: institution.description || "",
				academicCalendarType: institution.academicCalendarType,
				timezone: institution.timezone,
				logoUrl: institution.logoUrl || "",
				backgroundImageUrl: institution.backgroundImageUrl || "",
				brandingSettings,
				attendanceSettings
			} : null
		};
		cachedInstitution = { data: response.institution };
		lastCacheTime = now;
		console.info(`[CONTROLLER] exit getSetupStatus configured=${Boolean(institution)} duration=${duration}ms for ${requestLabel}`);
		res.status(200).json(response);
	} catch (error) {
		console.error(`[CONTROLLER] getSetupStatus error for ${requestLabel}:`, error.message);
		res.status(500).json({
			status: "Error",
			message: "Unable to determine setup status."
		});
	}
};
var sanitizeSetupString = (value) => String(value ?? "").trim();
const buildInstitutionUpdateOptions = () => ({
	returnDocument: "after",
	runValidators: true
});
const updateSetup = async (req, res) => {
	const requestLabel = `${req.method} ${req.originalUrl || "/api/setup"}`;
	console.info(`[CONTROLLER] enter updateSetup for ${requestLabel}`);
	try {
		const { institutionProfile, brandingSettings } = req.body;
		if (!institutionProfile && !brandingSettings) return res.status(400).json({
			status: "Error",
			message: "No setup data provided to update."
		});
		const existingInstitution = await institution_default.findOne().exec();
		if (!existingInstitution) return res.status(404).json({
			status: "Error",
			message: "Institution has not been configured yet."
		});
		const institutionUpdates = {};
		if (institutionProfile && typeof institutionProfile === "object") {
			for (const field of [
				"name",
				"shortName",
				"type",
				"country",
				"state",
				"city",
				"addressLine1",
				"addressLine2",
				"contactEmail",
				"phone",
				"website",
				"description",
				"academicCalendarType",
				"timezone",
				"logoUrl",
				"backgroundImageUrl"
			]) if (Object.prototype.hasOwnProperty.call(institutionProfile, field)) institutionUpdates[field] = sanitizeSetupString(institutionProfile[field]);
		}
		let brandingData = null;
		if (brandingSettings && typeof brandingSettings === "object") {
			const brandingUpdate = {};
			if (brandingSettings.primaryColor !== void 0) brandingUpdate.primaryColor = sanitizeSetupString(brandingSettings.primaryColor);
			if (brandingSettings.accentColor !== void 0) brandingUpdate.accentColor = sanitizeSetupString(brandingSettings.accentColor);
			if (Object.keys(brandingUpdate).length > 0) if (existingInstitution.brandingSettings) brandingData = await brandingSettings_default.findByIdAndUpdate(existingInstitution.brandingSettings, brandingUpdate, buildInstitutionUpdateOptions()).lean().exec();
			else {
				const createdBranding = await brandingSettings_default.create([brandingUpdate]);
				if (createdBranding?.[0]?._id) {
					institutionUpdates.brandingSettings = createdBranding[0]._id;
					brandingData = createdBranding[0];
				}
			}
		}
		if (Object.keys(institutionUpdates).length > 0) await institution_default.findByIdAndUpdate(existingInstitution._id, institutionUpdates, buildInstitutionUpdateOptions()).exec();
		cachedInstitution = null;
		lastCacheTime = 0;
		const updatedInstitution = await institution_default.findById(existingInstitution._id).select("name shortName type country state city addressLine1 addressLine2 contactEmail phone website description academicCalendarType timezone logoUrl backgroundImageUrl brandingSettings").lean().exec();
		if (!updatedInstitution) return res.status(500).json({
			status: "Error",
			message: "Unable to load updated institution."
		});
		if (!brandingData && updatedInstitution.brandingSettings) brandingData = await brandingSettings_default.findById(updatedInstitution.brandingSettings).select("primaryColor accentColor").lean().exec();
		res.status(200).json({
			status: "Success",
			institution: {
				name: updatedInstitution.name,
				shortName: updatedInstitution.shortName,
				type: updatedInstitution.type,
				country: updatedInstitution.country,
				state: updatedInstitution.state,
				city: updatedInstitution.city,
				addressLine1: updatedInstitution.addressLine1 || "",
				addressLine2: updatedInstitution.addressLine2 || "",
				contactEmail: updatedInstitution.contactEmail || "",
				phone: updatedInstitution.phone || "",
				website: updatedInstitution.website || "",
				description: updatedInstitution.description || "",
				academicCalendarType: updatedInstitution.academicCalendarType,
				timezone: updatedInstitution.timezone,
				logoUrl: updatedInstitution.logoUrl || "",
				backgroundImageUrl: updatedInstitution.backgroundImageUrl || "",
				brandingSettings: brandingData ? {
					primaryColor: brandingData.primaryColor || "#2563eb",
					accentColor: brandingData.accentColor || "#4f46e5"
				} : {
					primaryColor: "#2563eb",
					accentColor: "#4f46e5"
				}
			}
		});
	} catch (error) {
		console.error(`[CONTROLLER] updateSetup error for ${requestLabel}:`, error.message);
		res.status(500).json({
			status: "Error",
			message: "Unable to update setup settings."
		});
	}
};
const createInitialSetup = async (req, res) => {
	const requestLabel = `${req.method} ${req.originalUrl || "/api/setup"}`;
	console.info(`[CONTROLLER] enter createInitialSetup for ${requestLabel}`);
	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		if (await institution_default.findOne().session(session)) {
			await session.abortTransaction();
			console.info(`[CONTROLLER] createInitialSetup abort: already configured for ${requestLabel}`);
			return res.status(409).json({
				status: "Error",
				message: "The application has already been configured."
			});
		}
		const { institutionProfile, academicStructure, clinicalStructure, attendanceConfiguration, assessmentConfiguration, brandingSettings, administrator, applicationSettings, staffUsers = [], students = [] } = req.body;
		if (!institutionProfile || !academicStructure || !administrator) {
			await session.abortTransaction();
			return res.status(400).json({
				status: "Error",
				message: "Missing required setup payload."
			});
		}
		const sessionInfo = parseSessionRange(academicStructure.academicSession || academicStructure.academicYear || "");
		const academicSessionDoc = await academicSession_default.create([{
			name: sessionInfo.name,
			startsAt: sessionInfo.startsAt,
			endsAt: sessionInfo.endsAt,
			isCurrent: true
		}], {
			session,
			ordered: true
		});
		const academicYearInfo = getYearRangeFromSession(academicStructure.academicYear || academicStructure.academicSession || "");
		const academicYearDoc = await academicYear_default$1.create([{
			name: academicYearInfo.name,
			fromYear: academicYearInfo.fromYear,
			toYear: academicYearInfo.toYear,
			isCurrent: true
		}], {
			session,
			ordered: true
		});
		const semesterOptions = Array.isArray(academicStructure.semesters) && academicStructure.semesters.length ? academicStructure.semesters : ["First Semester", "Second Semester"];
		const semesterDocs = await semester_default.create(semesterOptions.map((semesterName, index) => ({
			name: semesterName,
			academicSession: academicSessionDoc[0]._id,
			order: index + 1,
			isActive: true
		})), {
			session,
			ordered: true
		});
		const attendanceDoc = await attendanceSettings_default.create([{
			lectureAttendance: Boolean(attendanceConfiguration?.lectureAttendance),
			clinicalAttendance: Boolean(attendanceConfiguration?.clinicalAttendance),
			seminarAttendance: Boolean(attendanceConfiguration?.seminarAttendance),
			verificationMethods: {
				qrCode: Boolean(attendanceConfiguration?.verificationMethods?.qrCode),
				bluetooth: Boolean(attendanceConfiguration?.verificationMethods?.bluetooth),
				gps: Boolean(attendanceConfiguration?.verificationMethods?.gps),
				administratorApproval: Boolean(attendanceConfiguration?.verificationMethods?.administratorApproval)
			},
			minimumAttendancePercentage: Number(attendanceConfiguration?.minimumAttendancePercentage ?? 75),
			gracePeriodMinutes: Number(attendanceConfiguration?.gracePeriodMinutes ?? 10),
			attendanceWindowMinutes: Number(attendanceConfiguration?.attendanceWindowMinutes ?? 120)
		}], {
			session,
			ordered: true
		});
		const assessmentDoc = await assessmentSettings_default.create([{
			mcq: Boolean(assessmentConfiguration?.mcq),
			essay: Boolean(assessmentConfiguration?.essay),
			osce: Boolean(assessmentConfiguration?.osce),
			longCase: Boolean(assessmentConfiguration?.longCase),
			shortCase: Boolean(assessmentConfiguration?.shortCase),
			continuousAssessment: Boolean(assessmentConfiguration?.continuousAssessment),
			passMark: Number(assessmentConfiguration?.passMark ?? 50),
			gradingScale: Array.isArray(assessmentConfiguration?.gradingScale) ? assessmentConfiguration.gradingScale : [
				"A",
				"B",
				"C",
				"D",
				"F"
			]
		}], {
			session,
			ordered: true
		});
		const brandingDoc = await brandingSettings_default.create([{
			logoUrl: String(brandingSettings?.logoUrl || ""),
			faviconUrl: String(brandingSettings?.faviconUrl || ""),
			coverImageUrl: String(brandingSettings?.coverImageUrl || ""),
			primaryColor: String(brandingSettings?.primaryColor || "#2563eb"),
			accentColor: String(brandingSettings?.accentColor || "#4f46e5")
		}], {
			session,
			ordered: true
		});
		const applicationSettingsDoc = await applicationSettings_default.create([{
			defaultLanguage: String(applicationSettings?.defaultLanguage || "en"),
			allowPublicRegistration: Boolean(applicationSettings?.allowPublicRegistration ?? false),
			timezone: String(applicationSettings?.timezone || institutionProfile.timezone || "UTC"),
			dateFormat: String(applicationSettings?.dateFormat || "YYYY-MM-DD"),
			extra: applicationSettings?.extra || {}
		}], {
			session,
			ordered: true
		});
		const departmentNames = Array.isArray(clinicalStructure?.defaultDepartments) && clinicalStructure.defaultDepartments.length ? clinicalStructure.defaultDepartments : DEFAULT_DEPARTMENT_NAMES;
		const departments = [];
		for (const departmentName of departmentNames) {
			const existingDepartment = await departments_default.findOne({ name: departmentName }).session(session);
			if (existingDepartment) {
				departments.push(existingDepartment);
				continue;
			}
			const code = sanitizeCode(departmentName).slice(0, 8);
			const departmentID = `${code}-${(/* @__PURE__ */ new Date()).getFullYear()}`;
			const doc = await departments_default.create([{
				name: departmentName,
				code,
				departmentID
			}], {
				session,
				ordered: true
			});
			departments.push(doc[0]);
		}
		const unitItems = Array.isArray(clinicalStructure?.defaultUnits) ? clinicalStructure.defaultUnits : [];
		const units = [];
		for (const item of unitItems) {
			const department = departments.find((dept) => dept.name === item.departmentName || dept.departmentID === item.departmentId);
			if (!department) continue;
			const existingUnit = await units_default.findOne({
				name: item.name,
				department: department._id
			}).session(session);
			if (existingUnit) {
				units.push(existingUnit);
				continue;
			}
			const code = sanitizeCode(item.name).slice(0, 8);
			const unitID = `${code}-${(/* @__PURE__ */ new Date()).getFullYear()}`;
			const unitDoc = await units_default.create([{
				name: item.name,
				code,
				unitID,
				department: department._id
			}], {
				session,
				ordered: true
			});
			units.push(unitDoc[0]);
			await departments_default.findByIdAndUpdate(department._id, { $addToSet: { units: unitDoc[0]._id } }, { session });
		}
		const adminPayload = {
			name: `${administrator.firstName || ""} ${administrator.lastName || ""}`.trim(),
			email: administrator.email,
			password: administrator.password,
			idNumber: administrator.idNumber || `ADMIN-${Date.now()}`,
			role: UserRole.ADMIN,
			isActive: true,
			approvalStatus: "approved",
			profileImage: administrator.profileImage || null
		};
		const [adminUserDoc] = await user_default$1.create([adminPayload], {
			session,
			ordered: true
		});
		const classPayloads = Array.isArray(academicStructure.classes) && academicStructure.classes.length ? academicStructure.classes : [{
			name: "500 Level",
			capacity: 120
		}];
		const createdClasses = [];
		for (const classItem of classPayloads) {
			const className = classItem.name || "500 Level";
			const matchingStaff = Array.isArray(staffUsers) ? staffUsers.find((person) => person.role === UserRole.TEACHER && person.className === className) : null;
			const classDoc = await classes_default$1.create([{
				name: className,
				academicYear: academicYearDoc[0]._id,
				classTeacher: matchingStaff ? null : null,
				capacity: Number(classItem.capacity ?? 120)
			}], {
				session,
				ordered: true
			});
			createdClasses.push(classDoc[0]);
		}
		const createdStaffUsers = [];
		for (const [index, person] of staffUsers.entries()) {
			const departmentName = person.departmentName || person.department || "Medicine";
			const department = departments.find((item) => item.name === departmentName) || departments[0];
			const unitName = person.unitName || person.unit || null;
			const unit = unitName ? await units_default.findOne({
				name: unitName,
				department: department?._id
			}).session(session) : null;
			const userDoc = await user_default$1.create([{
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
				profileImage: person.profileImage || null
			}], {
				session,
				ordered: true
			});
			createdStaffUsers.push(userDoc[0]);
			if (person.role === UserRole.TEACHER && person.className) {
				const assignedClass = createdClasses.find((item) => item.name === person.className);
				if (assignedClass) await classes_default$1.findByIdAndUpdate(assignedClass._id, { classTeacher: userDoc[0]._id }, { session });
			}
			if (unit && person.role !== UserRole.STUDENT) await user_default$1.findByIdAndUpdate(userDoc[0]._id, { $set: { specialties: Array.from(new Set([...userDoc[0].specialties || [], unit.name])) } }, { session });
		}
		const createdStudents = [];
		for (const [index, person] of students.entries()) {
			const departmentName = person.departmentName || person.department || "Medicine";
			const department = departments.find((item) => item.name === departmentName) || departments[0];
			const className = person.className || classPayloads[0]?.name || "500 Level";
			const targetClass = createdClasses.find((item) => item.name === className) || createdClasses[0];
			const userDoc = await user_default$1.create([{
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
				profileImage: person.profileImage || null
			}], {
				session,
				ordered: true
			});
			createdStudents.push(userDoc[0]);
			if (targetClass) await classes_default$1.findByIdAndUpdate(targetClass._id, { $addToSet: { students: userDoc[0]._id } }, { session });
		}
		for (const classItem of createdClasses) {
			const classLevel = resolveClassLevelFromName(classItem.name);
			await academicClock_default$1.create([{
				academicYear: academicYearDoc[0]._id,
				classId: classItem._id,
				classLevel,
				clockStartDate: academicYearDoc[0].fromYear,
				phaseConfig: buildPhaseConfigForClassLevel(classLevel)
			}], {
				session,
				ordered: true
			});
		}
		const institution = await institution_default.create([{
			name: institutionProfile.name,
			shortName: institutionProfile.shortName,
			type: institutionProfile.type,
			country: institutionProfile.country,
			state: institutionProfile.state,
			city: institutionProfile.city,
			addressLine1: String(institutionProfile.addressLine1 || ""),
			addressLine2: String(institutionProfile.addressLine2 || ""),
			contactEmail: String(institutionProfile.contactEmail || ""),
			phone: String(institutionProfile.phone || ""),
			website: String(institutionProfile.website || ""),
			description: String(institutionProfile.description || ""),
			academicCalendarType: institutionProfile.academicCalendarType,
			timezone: institutionProfile.timezone,
			addressLine1: String(institutionProfile.addressLine1 || ""),
			addressLine2: String(institutionProfile.addressLine2 || ""),
			contactEmail: String(institutionProfile.contactEmail || ""),
			phone: String(institutionProfile.phone || ""),
			website: String(institutionProfile.website || ""),
			description: String(institutionProfile.description || ""),
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
			administratorUser: adminUserDoc._id
		}], {
			session,
			ordered: true
		});
		await session.commitTransaction();
		session.endSession();
		console.info(`[CONTROLLER] exit createInitialSetup success for ${requestLabel}`);
		res.status(201).json({
			status: "Success",
			message: "Initial system setup completed.",
			institution: institution[0],
			created: {
				academicSession: academicSessionDoc[0],
				academicYear: academicYearDoc[0],
				classes: createdClasses,
				staff: createdStaffUsers,
				students: createdStudents
			}
		});
	} catch (error) {
		console.error(`[CONTROLLER] createInitialSetup error for ${requestLabel}:`, error.message);
		await session.abortTransaction();
		session.endSession();
		res.status(500).json({
			status: "Error",
			message: "Could not complete initial setup.",
			error: error.message
		});
	}
};
var setupRouter = express.Router();
setupRouter.get("/status", getSetupStatus);
setupRouter.post("/", createInitialSetup);
setupRouter.patch("/", updateSetup);
var setup_default = setupRouter;
var MordredMessageSchema = new Schema({
	user_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true
	},
	chat_token: {
		type: String,
		default: null
	},
	sender: {
		type: String,
		enum: [
			"student",
			"mordred_ai",
			"staff"
		],
		required: true
	},
	text: {
		type: String,
		required: true
	},
	is_saved: {
		type: Boolean,
		default: false
	},
	expires_at: {
		type: Date,
		default: () => new Date(Date.now() + 720 * 60 * 1e3)
	}
}, { timestamps: true });
MordredMessageSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
var mordredMessenger_default = mongoose.model("MordredMessage", MordredMessageSchema);
var MordredLogSchema = new Schema({
	logType: {
		type: String,
		enum: ["API_FAILURE", "SYSTEM_METRIC"],
		required: true
	},
	message: {
		type: String,
		required: true
	},
	details: {
		type: String,
		required: true
	},
	resolved: {
		type: Boolean,
		default: false
	}
}, { timestamps: true });
var mordredLog_default = mongoose.model("MordredLog", MordredLogSchema);
const buildMordredFallbackResponse = (reason, message$1, studentContext$1, userRole$1) => {
	const department = studentContext$1?.department ? ` for ${String(studentContext$1.department)}` : "";
	const roleHint = userRole$1 === "student" ? "I’ve noted your message and can help again once the service is back." : "I’ve noted your request and can assist again once the service is back.";
	return {
		_id: `mordred-fallback-${Date.now()}`,
		sender: "mordred_ai",
		text: `I’m unable to reach the AI service right now, so I’m falling back to a safe response.${department} Reason: ${reason || "the chat service is temporarily unavailable"}. Your message "${message$1}" was received. ${roleHint}`,
		is_ticket_created: false,
		systemAction: void 0,
		fallbackUsed: true
	};
};
init_mordredEngine();
init_client();
init_attendance();
init_user();
var permittedInsightRoles = new Set([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident",
	"parent",
	"student"
]);
var systemActionType = z.enum([
	"NONE",
	"UPDATE_PROFILE",
	"REQUEST_ROLE_CHANGE",
	"CREATE_USER",
	"DELETE_USER",
	"SEND_ALERT",
	"ESCALATE_TO_ADMIN"
]);
var isAdminRole = (role) => normalizeRole(role) === "admin";
var isInsightRole = (role) => permittedInsightRoles.has(normalizeRole(role));
var handleAdminSystemAction = async (action, user) => {
	if (!action || action.actionType === "NONE") return "";
	console.log(`MORDRED system action requested by admin ${user?.email || user?._id}:`, action);
	switch (action.actionType) {
		case "UPDATE_PROFILE": return ` System action prepared: update profile request recorded.`;
		case "REQUEST_ROLE_CHANGE": return ` System action prepared: role change request recorded.`;
		case "CREATE_USER": return ` System action prepared: user creation workflow flagged.`;
		case "DELETE_USER": return ` System action prepared: user deletion workflow flagged.`;
		case "SEND_ALERT": return ` System action prepared: alert dispatch request recorded.`;
		case "ESCALATE_TO_ADMIN": return ` System action prepared: escalation workflow queued.`;
		default: return "";
	}
};
const saveChatMessage = async (req, res) => {
	try {
		const { messageId, uniqueToken } = req.body;
		if (!await mordredMessenger_default.findOneAndUpdate({
			_id: messageId,
			user_id: req.user._id
		}, { $set: {
			is_saved: true,
			chat_token: uniqueToken,
			expires_at: null
		} }, { returnDocument: "after" })) return res.status(404).json({ message: "Message link not found." });
		return res.status(200).json({
			success: true,
			message: "Secured by MORDRED."
		});
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
};
const getCourseSummary = async (req, res) => {
	try {
		const { courseId } = req.body;
		if (!courseId) return res.status(400).json({ message: "courseId is required" });
		const course = await courses_default$1.findById(courseId).populate("department", "name").populate("unit", "name");
		if (!course) return res.status(404).json({ message: "Course not found" });
		const user = req.user;
		const studentClassName = Array.isArray(user?.studentClasses) ? typeof user.studentClasses[0] === "object" ? String(user.studentClasses[0]?.name ?? "your class") : String(user.studentClasses[0] ?? "your class") : typeof user?.studentClasses === "object" ? String(user.studentClasses?.name ?? "your class") : String(user?.studentClasses ?? "your class");
		const departmentName = String(course.department?.name ?? "");
		const semesterLabel = course.semester ? ` It is offered in semester ${course.semester}.` : "";
		const courseTitle = `${course.name} (${course.code})`;
		const buildFallbackText = () => {
			return [
				`MORDRED AI says: ${courseTitle} is a key course for ${studentClassName}${departmentName ? ` in the ${departmentName} department` : ""}.${semesterLabel}`,
				`It helps students in ${studentClassName} build strong foundations and make sense of how the subject connects to their current learning goals.`,
				`This course is designed to support your class with real classroom relevance and future study readiness.`,
				`You will gain knowledge that ties directly into your timetable, assessments, and the broader program for ${studentClassName}.`,
				`The syllabus focuses on practical understanding, giving you a clear reason why this course is important to your academic progress.`
			].sort(() => Math.random() - .5).slice(0, 5).join("\n");
		};
		const apiKey = (process.env.AI_GATEWAY_API_KEY || process.env.GEMINI_API_KEY || "").trim();
		if (!apiKey) {
			console.warn("⚠️ MORDRED Configuration Warning: AI credentials are missing. Using course-summary fallback.");
			return res.status(200).json({
				_id: `mordred-course-summary-fallback-${Date.now()}`,
				sender: "mordred_ai",
				text: buildFallbackText(),
				fallbackUsed: true
			});
		}
		const models = {
			geminiAI: "google/gemini-3.5-pro",
			openAI: "openai/gpt-5.5"
		};
		try {
			createGoogleGenerativeAI({ apiKey });
			const { text } = await generateText({
				model: process.env.MORDRED_MODEL || models.geminiAI,
				prompt: `You are MORDRED, a concise academic assistant for medical students. Provide a 5-6 line summary explaining why the course ${courseTitle} is important for students in ${studentClassName}${departmentName ? ` of the ${departmentName} department` : ""}.${semesterLabel} Keep the tone supportive, clear, and focused on student relevance. Start the response with \"MORDRED AI says:\" and do not exceed six lines.`,
				temperature: .4,
				max_tokens: 220
			});
			const summaryText = String(text ?? "").trim() || buildFallbackText();
			const normalizedText = summaryText.startsWith("MORDRED AI says:") ? summaryText : `MORDRED AI says: ${summaryText}`;
			return res.status(200).json({
				_id: new mongoose.Types.ObjectId(),
				sender: "mordred_ai",
				text: normalizedText,
				fallbackUsed: false
			});
		} catch (error) {
			console.error("⚠️ Course summary AI request failed, returning fallback text.", error);
			return res.status(200).json({
				_id: `mordred-course-summary-fallback-${Date.now()}`,
				sender: "mordred_ai",
				text: buildFallbackText(),
				fallbackUsed: true
			});
		}
	} catch (error) {
		console.error("Course summary route failed:", error);
		return res.status(500).json({ message: error.message || "Server error" });
	}
};
const mordredsWords = async (req, res) => {
	try {
		const { message: message$1, studentContext: studentContext$1 } = req.body;
		const userRole$1 = String(req.user?.role ?? "").trim().toLowerCase();
		const canExecuteSystemActions = isAdminRole(userRole$1);
		const apiKey = (process.env.AI_GATEWAY_API_KEY || process.env.GEMINI_API_KEY || "").trim();
		if (!apiKey) {
			console.warn("⚠️ MORDRED Configuration Warning: AI credentials are missing. Using fallback response.");
			return res.status(200).json(buildMordredFallbackResponse("missing credentials", message$1, studentContext$1, userRole$1));
		}
		const models = {
			geminiAI: "google/gemini-3.5-pro",
			openAI: "openai/gpt-5.5",
			anthropicAI: "anthropic/claude-fable-5",
			xAI: "xai/grok-4.5",
			ossAI: "moonshotai/kimi-k2.7-code"
		};
		try {
			createGoogleGenerativeAI({ apiKey })(process.env.MORDRED_MODEL || "gemini-2.0-flash");
			const vercelModel = models.geminiAI;
			const { object: mordredDecision } = await generateObject({
				model: vercelModel,
				system: `
        You are MORDRED (Medlog Operational Rotation, Dialogue, & Record Engagement Director).
        Your persona is a vigilant, polite, and clinically precise digital steward.
        
        Your job is to read student messages and do one of two things:
        1. ANSWER directly if it's a general question about medical school policies, rotations, or tips.
        2. ESCALATE by creating a ticket if they are reporting a software bug, hardware issue, missing attendance logs, or a direct complaint that requires human admin intervention.
        // We provide a strict schema to ensure MORDRED's responses are machine-readable and actionable and also limit the scope of the AI's responses to avoid hallucinations or irrelevant answers, and each student can only have one active ticket at a time, so MORDRED should check for existing tickets before creating a new one. and Limit ANSWERS to 5 per student per day to avoid spam and ensure quality responses.
        3. The schema is designed to ensure that MORDRED's responses are structured and actionable, allowing the backend to process them effectively.
        4. If the student is asking about attendance, logbook issues, or timetable conflicts, MORDRED should always escalate to a human staff member and not attempt to answer directly.
        5. If the student is asking about general questions, MORDRED should answer directly and not escalate.
        6. If the student is asking about a bug or issue, MORDRED should escalate to a human staff member and not answer directly.
        7. If the student is asking about a timetable conflict, MORDRED should escalate to a human staff member and not answer directly.
        8. MORDRED should always be polite, professional, and concise in its responses, and should never provide medical advice or diagnosis.
        9. MORDRED should always check for existing tickets before creating a new one, and should only create a new ticket if there are no existing tickets for the student.
        10. MORDRED should always limit ANSWERS to 5 per student per day to avoid spam and ensure quality responses.
        
        user: 
        User ID: ${req.user._id}. 
        User Name: ${req.user.name}. 
        User Email: ${req.user.email}. 
        User Role: ${userRole$1}. 
        User Permissions: ${canExecuteSystemActions ? "admin system actions allowed" : "non-admin profile/role requests only"}. 
        Student Department: ${studentContext$1.department}. 
        Student Rotation Unit: ${studentContext$1.rotationUnit}. 
        Student Rotation Start Date: ${studentContext$1.rotationStartDate}. 
        Student Rotation End Date: ${studentContext$1.rotationEndDate}.,
        input: 'Student says: "${message$1}". Student Current Rotation Context: ${JSON.stringify(studentContext$1)}.',
        `,
				schema: z.object({
					reply: z.string().describe("Your conversational response back to the student."),
					shouldEscalate: z.boolean().describe("Set to true ONLY if a human staff member needs to fix a bug, logbook issue, or attendance error."),
					issueCategory: z.enum([
						"NONE",
						"ATTENDANCE_BUG",
						"LOGBOOK_ERROR",
						"TIMETABLE_CONFLICT",
						"OTHER"
					]).describe("The classification category of the problem."),
					systemAction: z.object({
						actionType: systemActionType,
						details: z.string().optional()
					}).optional().describe("Structured system action request. Only admins may execute real system actions.")
				}),
				prompt: `Student says: "${message$1}". Student Current Rotation Context: ${JSON.stringify(studentContext$1)}`
			});
			const systemAction = mordredDecision.systemAction ?? { actionType: "NONE" };
			if (!canExecuteSystemActions && systemAction.actionType !== "NONE") {
				mordredDecision.reply = `As a non-admin user, I cannot execute system-level changes. ${mordredDecision.reply}`;
				systemAction.actionType = "NONE";
				systemAction.details = void 0;
			}
			if (mordredDecision.shouldEscalate) try {
				const assignedStaff = await routeTaskToStaff(studentContext$1.department, "is_available_for_escalations", req.user._id);
				await inngest.send({
					name: "mordred/ticket.created",
					data: {
						ticketId: req.user._id,
						departmentName: studentContext$1.department,
						assignedTo: assignedStaff?._id || "SUPER_ADMIN"
					}
				});
				mordredDecision.reply += ` [System Notice: I have flagged this anomaly and routed a ticket to ${assignedStaff?.name || "the admin desk"}.]`;
				const actorName = "MORDRED AI";
				const notificationMessage = `MORDRED flagged an anomaly for ${req.user?.name || req.user?.email || "A user"} and routed a ticket to ${assignedStaff?.name || "the admin desk"}.`;
				const adminUsers = await user_default$1.find({
					role: "admin",
					isActive: true
				}).select("_id").lean();
				if (adminUsers.length > 0) await Promise.all(adminUsers.map((admin) => createNotificationIfUnique({
					userId: admin._id,
					role: "admin",
					title: "MORDRED Alert: Anomaly Ticket Routed",
					message: notificationMessage,
					type: "system",
					actorName,
					actorRole: "admin",
					metadata: {
						studentId: req.user?._id,
						assignedStaffId: assignedStaff?._id,
						issueCategory: mordredDecision.issueCategory
					}
				})));
			} catch (escalationError) {
				console.error("⚠️ MORDRED escalation flow failed, continuing with fallback response.", escalationError);
			}
			let adminActionNote = "";
			if (canExecuteSystemActions && systemAction.actionType !== "NONE") adminActionNote = await handleAdminSystemAction(systemAction, req.user);
			return res.status(200).json({
				_id: new mongoose.Types.ObjectId(),
				sender: "mordred_ai",
				text: `${mordredDecision.reply}${adminActionNote}`.trim(),
				is_ticket_created: mordredDecision.shouldEscalate,
				systemAction: canExecuteSystemActions ? systemAction : void 0
			});
		} catch (error) {
			console.error("⚠️ MORDRED AI request failed, returning a safe fallback response.", error);
			return res.status(200).json(buildMordredFallbackResponse(error?.message || "AI request failed", message$1, studentContext$1, userRole$1));
		}
	} catch (error) {
		if (error.message.includes("API key") || error.message.includes("identity")) await mordredLog_default.create({
			logType: "API_FAILURE",
			message: "Google Gemini Authentication Failure",
			details: error.message
		});
		return res.status(200).json(buildMordredFallbackResponse(error?.message || "unexpected error", message, studentContext, userRole));
	}
};
const trackMordredPerformance = async (req, res) => {
	try {
		const staffMetrics = await user_default$1.aggregate([{ $match: { role: { $in: [
			"teacher",
			"unitconsultant",
			"unitresident"
		] } } }, { $group: {
			_id: null,
			totalActiveLoad: { $sum: "$mordred_rules.current_active_load" },
			totalCapacity: { $sum: "$mordred_rules.max_ticket_capacity" }
		} }]);
		const automaticReplies = await mordredMessenger_default.countDocuments({ is_saved: false });
		const escalatedSavedTickets = await mordredMessenger_default.countDocuments({ is_saved: true });
		const criticalFailures = await mordredLog_default.find({
			logType: "API_FAILURE",
			resolved: false
		}).sort({ createdAt: -1 });
		return res.status(200).json({
			automationScore: automaticReplies,
			escalationScore: escalatedSavedTickets,
			currentStaffWorkload: staffMetrics[0] || {
				totalActiveLoad: 0,
				totalCapacity: 0
			},
			criticalFailures
		});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};
const createPostingAttendanceAlert = async (req, res) => {
	try {
		const user = req.user;
		const payload = req.body ?? {};
		if (!user?._id) return res.status(401).json({ message: "Authentication required." });
		const targetUserId = payload.studentId ? new mongoose.Types.ObjectId(String(payload.studentId)) : user._id;
		const overallPercent = Number(payload.overallPercent ?? 0);
		const activeLocationTitle = String(payload.activeLocationTitle || "Active unit").trim();
		const activeLocationValue = String(payload.activeLocationValue || "Current posting").trim();
		const message$1 = `Your posting attendance is below the expected target at ${overallPercent}%. ${activeLocationTitle}: ${activeLocationValue}. ${String(payload.note || "Please attend the next scheduled session to stay on track.").trim()}`;
		const notification = await createNotificationIfUnique({
			userId: targetUserId,
			role: "student",
			title: "Posting attendance needs attention",
			message: message$1,
			type: "attendance",
			metadata: {
				source: "posting-attendance-alert",
				activeLocationTitle,
				activeLocationValue,
				overallPercent
			},
			actorName: user.name || "MORDRED",
			actorRole: "student"
		});
		return res.status(200).json({
			success: true,
			notification,
			insight: {
				id: notification?._id?.toString() ?? `attendance-alert-${Date.now()}`,
				type: "WARNING",
				targetUser: user.name || "You",
				message: message$1,
				timestamp: "Just Now"
			}
		});
	} catch (error) {
		console.error("Failed to create posting attendance alert", error);
		return res.status(500).json({ message: error.message || "Unable to create attendance alert." });
	}
};
const dynamicAIInsights = async (req, res) => {
	try {
		if (!isInsightRole(String(req.user?.role ?? "").trim().toLowerCase())) return res.status(403).json({ message: "Access denied. MORDRED insights are only available to admin, teacher, unitconsultant, unitresident, and parent users." });
		const dynamicInsights = [];
		const criticalFailures = await mordredLog_default.find({
			logType: "API_FAILURE",
			resolved: false
		}).limit(2);
		for (const failure of criticalFailures) dynamicInsights.push({
			id: failure._id.toString(),
			type: "CRITICAL",
			targetUser: "System Admin",
			message: `System Anomaly: ${failure.message} (${failure.details})`,
			timestamp: "Just Now"
		});
		const lowAttendanceStudents = await user_default$1.find({
			role: "student",
			isActive: true,
			"attendance_percentage.clinical": { $lt: 75 }
		}).limit(2).select("name attendance_percentage department");
		for (const student of lowAttendanceStudents) {
			const attendanceClinical = student.attendance_percentage?.clinical ?? "unknown";
			dynamicInsights.push({
				id: student._id.toString(),
				type: "WARNING",
				targetUser: "Clinical Coordinators",
				message: `Attendance Alert: ${student.name}'s clinical attendance in ${student.department || "Wards"} has dropped to ${attendanceClinical}%. Action required.`,
				timestamp: "Calculated Recently"
			});
		}
		const missedRotationsCount = await attendance_default$1.countDocuments({
			status: "absent",
			createdAt: { $gte: /* @__PURE__ */ new Date(Date.now() - 1440 * 60 * 1e3) }
		});
		if (missedRotationsCount > 0) dynamicInsights.push({
			id: "missed_rotation_summary",
			type: "INFO",
			targetUser: "Faculty Records",
			message: `Logbook Audit: ${missedRotationsCount} mandatory clinical rotation check-ins were missed by students today.`,
			timestamp: "Daily Summary"
		});
		if (dynamicInsights.length === 0) dynamicInsights.push({
			id: "clean_slate",
			type: "INFO",
			targetUser: "All Staff",
			message: "MORDRED Engine Audit complete. No system flags, lecture absences, or attendance warnings detected.",
			timestamp: "Just Now"
		});
		return res.status(200).json({ insights: dynamicInsights });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};
var mordredAIRouter = express.Router();
mordredAIRouter.post("/save-message", protect, saveChatMessage);
mordredAIRouter.post("/chat/handle", protect, mordredsWords);
mordredAIRouter.get("/admin/diagnostics", protect, authorize(["admin"]), trackMordredPerformance);
mordredAIRouter.post("/insights/attendance-alert", protect, authorize([
	"student",
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident",
	"parent"
]), createPostingAttendanceAlert);
mordredAIRouter.get("/insights", protect, authorize([
	"student",
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident",
	"parent"
]), dynamicAIInsights);
mordredAIRouter.post("/course-summary", protect, authorize([
	"student",
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident",
	"parent"
]), getCourseSummary);
var mordred_default = mordredAIRouter;
var AttendanceRecordSchema = new Schema({
	student: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true
	},
	status: {
		type: String,
		enum: [
			"present",
			"absent",
			"late",
			"excused",
			"on-leave"
		],
		default: "absent"
	},
	checkInTime: {
		type: Date,
		default: null
	},
	checkOutTime: {
		type: Date,
		default: null
	},
	duration: {
		type: Number,
		default: null
	},
	notes: {
		type: String,
		default: ""
	}
}, { _id: true });
var ClinicalAttendanceSchema = new Schema({
	activityType: {
		type: String,
		enum: [
			"ward_round",
			"clinic",
			"theatre",
			"call_duty",
			"simulation",
			"procedure",
			"practical"
		],
		required: true
	},
	title: {
		type: String,
		required: true
	},
	description: {
		type: String,
		default: ""
	},
	date: {
		type: Date,
		required: true
	},
	startTime: {
		type: Date,
		required: true
	},
	endTime: {
		type: Date,
		default: null
	},
	duration: {
		type: Number,
		default: null
	},
	unit: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Unit",
		required: false,
		default: null
	},
	unitLabel: {
		type: String,
		default: ""
	},
	department: {
		type: String,
		default: ""
	},
	location: {
		type: String,
		default: ""
	},
	room: {
		type: String,
		default: ""
	},
	supervisor: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true
	},
	attendees: [AttendanceRecordSchema],
	expectedStudents: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "User"
	}],
	status: {
		type: String,
		enum: [
			"planned",
			"ongoing",
			"completed",
			"cancelled"
		],
		default: "planned"
	},
	checkInMethod: {
		type: String,
		enum: [
			"manual",
			"qr_code",
			"biometric"
		],
		default: "manual"
	},
	requiresApproval: {
		type: Boolean,
		default: false
	},
	approvedBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		default: null
	},
	approvalDate: {
		type: Date,
		default: null
	},
	clinicalRotation: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "ClinicalRotation",
		default: null
	},
	academicYear: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "AcademicYear",
		required: true
	},
	presentCount: {
		type: Number,
		default: 0
	},
	absentCount: {
		type: Number,
		default: 0
	},
	lateCount: {
		type: Number,
		default: 0
	},
	excusedCount: {
		type: Number,
		default: 0
	},
	patientCount: {
		type: Number,
		default: 0
	},
	proceduresPerformed: [{
		type: String,
		default: ""
	}],
	learningOutcomes: [{
		type: String,
		default: ""
	}],
	feedback: {
		type: String,
		default: ""
	},
	createdBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true
	}
}, { timestamps: true });
ClinicalAttendanceSchema.index({
	date: 1,
	unit: 1
});
ClinicalAttendanceSchema.index({
	supervisor: 1,
	date: -1
});
ClinicalAttendanceSchema.index({ academicYear: 1 });
ClinicalAttendanceSchema.index({
	"attendees.student": 1,
	date: -1
});
ClinicalAttendanceSchema.index({ status: 1 });
var clinicalAttendance_default$1 = mongoose.model("ClinicalAttendance", ClinicalAttendanceSchema);
var normalizeToken = (value) => {
	if (typeof value !== "string") return "";
	return value.trim().toLowerCase().replace(/^department of\s+/, "").replace(/\s+/g, " ").trim();
};
const normalizeLabel = (value) => normalizeToken(value);
const resolveMatchingUnitIds = (unitNames, departmentNames, hospitalUnits) => {
	const normalizedUnitNames = unitNames.map((value) => normalizeLabel(value)).filter(Boolean);
	const normalizedDepartmentNames = departmentNames.map((value) => normalizeLabel(value)).filter(Boolean);
	const seenIds = /* @__PURE__ */ new Set();
	const matchedIds = [];
	const hospitalNameIndex = /* @__PURE__ */ new Map();
	const hospitalDepartmentIndex = /* @__PURE__ */ new Map();
	hospitalUnits.forEach((unit) => {
		const unitId = String(unit._id);
		const unitName = normalizeLabel(unit.name);
		const departmentName = normalizeLabel(unit.department);
		if (unitName) {
			const buckets = hospitalNameIndex.get(unitName) ?? [];
			buckets.push(unitId);
			hospitalNameIndex.set(unitName, buckets);
		}
		if (departmentName) {
			const buckets = hospitalDepartmentIndex.get(departmentName) ?? [];
			buckets.push(unitId);
			hospitalDepartmentIndex.set(departmentName, buckets);
		}
	});
	normalizedUnitNames.forEach((candidateLabel) => {
		for (const [unitLabel, unitIds] of hospitalNameIndex.entries()) if (unitLabel === candidateLabel || unitLabel.includes(candidateLabel) || candidateLabel.includes(unitLabel)) unitIds.forEach((unitId) => {
			if (!seenIds.has(unitId)) {
				seenIds.add(unitId);
				matchedIds.push(unitId);
			}
		});
	});
	normalizedDepartmentNames.forEach((candidateLabel) => {
		for (const [departmentLabel, unitIds] of hospitalDepartmentIndex.entries()) if (departmentLabel === candidateLabel || departmentLabel.includes(candidateLabel) || candidateLabel.includes(departmentLabel)) unitIds.forEach((unitId) => {
			if (!seenIds.has(unitId)) {
				seenIds.add(unitId);
				matchedIds.push(unitId);
			}
		});
	});
	return matchedIds;
};
async function deriveClinicalSessionSeedFromClass(input) {
	const academicYearId = input.academicYearId?.trim() || "";
	const explicitUnitIds = Array.isArray(input.unitIds) ? input.unitIds.filter(Boolean).map((value) => String(value)) : [];
	if (explicitUnitIds.length > 0) return {
		academicYearId,
		unitIds: explicitUnitIds
	};
	const unitNames = Array.isArray(input.unitNames) ? input.unitNames.filter((value) => typeof value === "string" && value.trim().length > 0) : [];
	const departmentNames = Array.isArray(input.departmentNames) ? input.departmentNames.filter((value) => typeof value === "string" && value.trim().length > 0) : [];
	if ([...unitNames, ...departmentNames].length === 0) return {
		academicYearId,
		unitIds: []
	};
	return {
		academicYearId,
		unitIds: resolveMatchingUnitIds(unitNames, departmentNames, await hospitalUnit_default.find({ isActive: true }).select("_id name department").lean())
	};
}
function buildClinicalAttendanceFilter(query = {}) {
	const filter = {};
	if (query.unit) filter.unit = query.unit;
	if (query.supervisor) filter.supervisor = query.supervisor;
	if (query.status) {
		const statuses = (Array.isArray(query.status) ? query.status.join(",") : String(query.status)).split(",").map((value) => value.trim()).filter(Boolean);
		if (statuses.length > 1) filter.status = { $in: statuses };
		else if (statuses.length === 1) filter.status = statuses[0];
	}
	if (query.academicYear) filter.academicYear = query.academicYear;
	if (query.startDate || query.endDate) {
		filter.date = {};
		if (query.startDate) filter.date.$gte = new Date(String(query.startDate));
		if (query.endDate) filter.date.$lte = new Date(String(query.endDate));
	}
	return filter;
}
var QrOtpSchema = new mongoose.Schema({
	otp: {
		type: String,
		required: true,
		index: true,
		unique: true
	},
	payload: {
		type: String,
		required: true
	},
	expiresAt: {
		type: Date,
		required: true,
		index: true
	},
	createdAt: {
		type: Date,
		default: () => /* @__PURE__ */ new Date()
	}
}, { timestamps: false });
var qrOtp_default = mongoose.models.QrOtp || mongoose.model("QrOtp", QrOtpSchema);
var SECRET_ENV = process.env.QR_SIGNING_SECRET || process.env.JWT_SECRET || "medlog-lms-quiet-secret";
function normalizePayload(payload) {
	return JSON.stringify(payload);
}
function createSignedQrPayload(payload) {
	const body = normalizePayload(payload);
	const signature = crypto.createHmac("sha256", SECRET_ENV).update(body).digest("hex");
	return JSON.stringify({
		data: payload,
		signature
	});
}
function verifySignedQrPayload(token) {
	try {
		const parsed = JSON.parse(token);
		if (!parsed || typeof parsed !== "object" || !parsed.data || typeof parsed.signature !== "string") return null;
		if (crypto.createHmac("sha256", SECRET_ENV).update(normalizePayload(parsed.data)).digest("hex") !== parsed.signature) return null;
		return parsed.data;
	} catch {
		return null;
	}
}
function getInstitutionIdentityReference(source) {
	const inn = source.inn?.toString().trim();
	if (inn) return inn;
	const idNumber = source.idNumber?.toString().trim();
	if (idNumber) return idNumber;
	return source.email?.toString().trim() || "unknown";
}
init_rotationPlan();
const resolveClinicalSessionPosting = async (postingId, classId, deps = {}) => {
	if (!postingId) return null;
	const findClinicalRotationById = deps.findClinicalRotationById ?? ((id) => clinicalRotation_default.findById(id).select("_id").lean());
	const findRotationPlans = deps.findRotationPlans ?? (async (id) => {
		if (id) return rotationPlan_default.find({ class: id }).select("postings _id").lean();
		return rotationPlan_default.find({}).select("postings _id").lean();
	});
	if (await findClinicalRotationById(postingId)) return {
		postingId,
		source: "clinical-rotation"
	};
	const normalizedPostingId = String(postingId).trim();
	const rotationPlans = await findRotationPlans(classId);
	for (const rotationPlan of rotationPlans) {
		if (String(rotationPlan?._id) === normalizedPostingId) return {
			postingId,
			source: "rotation-plan-posting"
		};
		if ((rotationPlan?.postings || []).find((posting) => String(posting?._id) === normalizedPostingId)) return {
			postingId,
			source: "rotation-plan-posting"
		};
	}
	return null;
};
init_user();
init_classes();
init_rotationPlan();
var OTP_RATE_LIMIT_WINDOW_MS = 6e4;
var OTP_RATE_LIMIT_MAX_REQUESTS = 8;
var otpRateLimitStore = /* @__PURE__ */ new Map();
var cleanupExpiredOtpEntries = async () => {
	try {
		await qrOtp_default.deleteMany({ expiresAt: { $lte: /* @__PURE__ */ new Date() } });
	} catch {}
};
var enforceOtpRateLimit = (req) => {
	const key = `${req.ip ?? "unknown"}:${req.userId ?? "anonymous"}`;
	const now = Date.now();
	const bucket = otpRateLimitStore.get(key);
	if (!bucket || now >= bucket.resetAt) {
		otpRateLimitStore.set(key, {
			count: 1,
			resetAt: now + OTP_RATE_LIMIT_WINDOW_MS
		});
		return true;
	}
	if (bucket.count >= OTP_RATE_LIMIT_MAX_REQUESTS) return false;
	bucket.count += 1;
	otpRateLimitStore.set(key, bucket);
	return true;
};
const createClinicalAttendanceSession = async (req, res) => {
	try {
		const { activityType, title, description, date, startTime, endTime, unit, location, room, supervisor, expectedStudents, checkInMethod, requiresApproval, clinicalRotation, academicYear, classId, learningOutcomes } = req.body;
		const { department } = req.body;
		const currentAcademicYear = await academicYear_default$1.findOne({ isCurrent: true }).select("_id").lean();
		const activeAcademicYearId = academicYear || currentAcademicYear?._id?.toString() || "";
		let resolvedUnitId = unit || "";
		let derivedUnitIds = [];
		let resolvedUnitLabel = "";
		if (classId) {
			if (!await classes_default$1.findById(classId).select("_id academicYear").lean()) return res.status(404).json({
				success: false,
				message: "Class not found"
			});
			const schedules = await rotationPlan_default.find({ class: classId }).select("postings meta").lean();
			const postingUnitNames = /* @__PURE__ */ new Set();
			const postingDepartmentNames = /* @__PURE__ */ new Set();
			const addUnitName = (value) => {
				if (typeof value === "string") {
					const unitName = value.trim();
					if (unitName) postingUnitNames.add(unitName);
					return;
				}
				if (value && typeof value === "object") {
					const objectValue = value;
					if (typeof objectValue.name === "string" && objectValue.name.trim()) {
						addUnitName(objectValue.name);
						return;
					}
					if (typeof objectValue.unitName === "string" && objectValue.unitName.trim()) {
						addUnitName(objectValue.unitName);
						return;
					}
					if (typeof objectValue.departmentName === "string" && objectValue.departmentName.trim()) {
						postingDepartmentNames.add(objectValue.departmentName.trim());
						return;
					}
					if (typeof objectValue.department === "string" && objectValue.department.trim()) {
						postingDepartmentNames.add(objectValue.department.trim());
						return;
					}
					if (typeof objectValue._id === "string" && objectValue._id.trim()) {
						addUnitName(objectValue._id);
						return;
					}
					if (typeof objectValue.id === "string" && objectValue.id.trim()) {
						addUnitName(objectValue.id);
						return;
					}
					if (typeof objectValue.toString === "function") {
						const stringValue = objectValue.toString();
						if (typeof stringValue === "string" && stringValue.trim() && stringValue !== "[object Object]") addUnitName(stringValue);
					}
				}
			};
			for (const schedule of schedules) {
				const timeline = Array.isArray(schedule?.meta?.timeline) ? schedule.meta.timeline : [];
				for (const window of timeline) {
					addUnitName(window?.unitName || window?.unitId);
					addUnitName(window?.departmentName || window?.department || window?.departmentCode);
				}
				const postings = Array.isArray(schedule.postings) ? schedule.postings : [];
				for (const posting of postings) {
					const groups = Array.isArray(posting?.groups) ? posting.groups : [];
					const postingDepartments = Array.isArray(posting?.meta?.departments) ? posting.meta.departments : [];
					for (const dept of postingDepartments) addUnitName(dept?.departmentName || dept?.department || dept?.departmentCode);
					for (const group of groups) {
						const groupData = group?.group || group || {};
						addUnitName(groupData.unitName || groupData.unit?.name || groupData.name || groupData.unit);
						addUnitName(groupData.departmentName || groupData.department || groupData.departmentCode);
					}
				}
			}
			derivedUnitIds = (await deriveClinicalSessionSeedFromClass({
				academicYearId: activeAcademicYearId,
				unitNames: Array.from(postingUnitNames),
				departmentNames: Array.from(postingDepartmentNames)
			})).unitIds;
			if (!resolvedUnitId && derivedUnitIds.length > 0) resolvedUnitId = derivedUnitIds[0];
			if (derivedUnitIds.length > 0) {
				if (!resolvedUnitId && !department) resolvedUnitId = derivedUnitIds[0];
				else if (resolvedUnitId && !derivedUnitIds.includes(String(resolvedUnitId))) return res.status(400).json({
					success: false,
					message: "The selected unit is not part of the current class posting schedule"
				});
			}
		}
		if (clinicalRotation) {
			if (!await resolveClinicalSessionPosting(clinicalRotation, classId)) console.warn("Clinical attendance session created without a resolved posting reference", {
				clinicalRotation,
				classId
			});
		}
		if (!activityType || !title || !date || !startTime || !resolvedUnitId && !department || !supervisor || !clinicalRotation) return res.status(400).json({
			success: false,
			message: "Missing required fields: activityType, title, date, startTime, supervisor, posting, and either unit or department"
		});
		if (!await user_default$1.findById(supervisor)) return res.status(404).json({
			success: false,
			message: "Supervisor not found"
		});
		let unitExists = null;
		if (resolvedUnitId) {
			const normalizedUnitId = String(resolvedUnitId).trim();
			const maybeObjectId = normalizedUnitId.length === 24 && /^[a-fA-F0-9]{24}$/.test(normalizedUnitId) ? normalizedUnitId : null;
			if (maybeObjectId) unitExists = await hospitalUnit_default.findById(maybeObjectId).lean();
			else {
				const escapedUnitId = normalizedUnitId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
				unitExists = await hospitalUnit_default.findOne({ $or: [
					{ code: normalizedUnitId },
					{ id: normalizedUnitId },
					{ name: normalizedUnitId },
					{ name: { $regex: new RegExp(escapedUnitId, "i") } }
				] }).lean();
			}
			if (!unitExists) resolvedUnitLabel = normalizedUnitId;
		}
		if (!await academicYear_default$1.findById(activeAcademicYearId)) return res.status(404).json({
			success: false,
			message: "Academic year not found"
		});
		const clinicalAttendance = new clinicalAttendance_default$1({
			activityType,
			title,
			description,
			date: new Date(date),
			startTime: new Date(startTime),
			endTime: endTime ? new Date(endTime) : null,
			unit: unitExists ? unitExists._id : null,
			unitLabel: resolvedUnitLabel || "",
			department: department || "",
			location,
			room,
			supervisor,
			expectedStudents: expectedStudents || [],
			checkInMethod: checkInMethod || "manual",
			requiresApproval: requiresApproval || false,
			clinicalRotation: clinicalRotation || null,
			academicYear: activeAcademicYearId,
			learningOutcomes: learningOutcomes || [],
			createdBy: req.user?._id,
			status: "planned"
		});
		await clinicalAttendance.save();
		await clinicalAttendance.populate([
			{
				path: "supervisor",
				select: "firstName lastName email"
			},
			{
				path: "unit",
				select: "name"
			},
			{
				path: "createdBy",
				select: "firstName lastName"
			}
		]);
		emitSystemEvent$1("clinicalAttendance.session.created", {
			sessionId: clinicalAttendance._id.toString(),
			academicYear: activeAcademicYearId,
			classId: classId || null,
			unitId: unitExists?._id?.toString() || null,
			supervisor: supervisor.toString()
		});
		res.status(201).json({
			success: true,
			message: "Clinical attendance session created successfully",
			data: clinicalAttendance
		});
	} catch (error) {
		console.error("Error creating clinical attendance session:", error);
		res.status(500).json({
			success: false,
			message: "Error creating clinical attendance session",
			error: error.message
		});
	}
};
const checkInStudent = async (req, res) => {
	try {
		const { sessionId, studentId, notes } = req.body;
		if (!sessionId || !studentId) return res.status(400).json({
			success: false,
			message: "Missing required fields: sessionId, studentId"
		});
		const session = await clinicalAttendance_default$1.findById(sessionId);
		if (!session) return res.status(404).json({
			success: false,
			message: "Clinical attendance session not found"
		});
		const existingRecord = session.attendees.find((attendee) => attendee.student.toString() === studentId);
		if (existingRecord && existingRecord.checkInTime) return res.status(400).json({
			success: false,
			message: "Student already checked in"
		});
		const checkInTime = /* @__PURE__ */ new Date();
		const status = checkInTime > session.startTime ? "late" : "present";
		if (existingRecord) {
			existingRecord.checkInTime = checkInTime;
			existingRecord.status = status;
			existingRecord.notes = notes || existingRecord.notes;
		} else session.attendees.push({
			student: studentId,
			status,
			checkInTime,
			notes
		});
		await session.save();
		emitSystemEvent$1("clinicalAttendance.student.checkedIn", {
			sessionId,
			studentId,
			status,
			checkInTime: checkInTime.toISOString()
		});
		res.status(200).json({
			success: true,
			message: "Student checked in successfully",
			data: session
		});
	} catch (error) {
		console.error("Error during check-in:", error);
		res.status(500).json({
			success: false,
			message: "Error during check-in",
			error: error.message
		});
	}
};
const checkOutStudent = async (req, res) => {
	try {
		const { sessionId, studentId } = req.body;
		if (!sessionId || !studentId) return res.status(400).json({
			success: false,
			message: "Missing required fields: sessionId, studentId"
		});
		const session = await clinicalAttendance_default$1.findById(sessionId);
		if (!session) return res.status(404).json({
			success: false,
			message: "Clinical attendance session not found"
		});
		const attendeeRecord = session.attendees.find((attendee) => attendee.student.toString() === studentId);
		if (!attendeeRecord) return res.status(404).json({
			success: false,
			message: "Student not found in this session"
		});
		const checkOutTime = /* @__PURE__ */ new Date();
		attendeeRecord.checkOutTime = checkOutTime;
		if (attendeeRecord.checkInTime) {
			const durationMs = checkOutTime.getTime() - attendeeRecord.checkInTime.getTime();
			attendeeRecord.duration = Math.round(durationMs / 6e4);
		}
		if (!session.endTime) {
			session.endTime = checkOutTime;
			const durationMs = checkOutTime.getTime() - session.startTime.getTime();
			session.duration = Math.round(durationMs / 6e4);
		}
		await session.save();
		emitSystemEvent$1("clinicalAttendance.student.checkedOut", {
			sessionId,
			studentId,
			checkOutTime: checkOutTime.toISOString(),
			durationMinutes: attendeeRecord.duration ?? null
		});
		res.status(200).json({
			success: true,
			message: "Student checked out successfully",
			data: session
		});
	} catch (error) {
		console.error("Error during check-out:", error);
		res.status(500).json({
			success: false,
			message: "Error during check-out",
			error: error.message
		});
	}
};
const getClinicalAttendanceSessions = async (req, res) => {
	try {
		const { unit, supervisor, status, startDate, endDate, academicYear, page = 1, limit = 10 } = req.query;
		const filter = buildClinicalAttendanceFilter({
			unit: typeof unit === "string" ? unit : void 0,
			supervisor: typeof supervisor === "string" ? supervisor : void 0,
			status: typeof status === "string" ? status : void 0,
			startDate: typeof startDate === "string" ? startDate : void 0,
			endDate: typeof endDate === "string" ? endDate : void 0,
			academicYear: typeof academicYear === "string" ? academicYear : void 0
		});
		const skip = (Number(page) - 1) * Number(limit);
		const sessions = await clinicalAttendance_default$1.find(filter).populate([
			{
				path: "supervisor",
				select: "firstName lastName email"
			},
			{
				path: "unit",
				select: "name"
			},
			{
				path: "createdBy",
				select: "firstName lastName"
			},
			{
				path: "attendees.student",
				select: "firstName lastName"
			}
		]).sort({ date: -1 }).skip(skip).limit(Number(limit));
		const total = await clinicalAttendance_default$1.countDocuments(filter);
		res.status(200).json({
			success: true,
			data: sessions,
			pagination: {
				total,
				page: Number(page),
				pages: Math.ceil(total / Number(limit)),
				limit: Number(limit)
			}
		});
	} catch (error) {
		console.error("Error fetching clinical attendance sessions:", error);
		res.status(500).json({
			success: false,
			message: "Error fetching clinical attendance sessions",
			error: error.message
		});
	}
};
const generateQrAttendancePayload = async (req, res) => {
	try {
		await cleanupExpiredOtpEntries();
		if (!enforceOtpRateLimit(req)) return res.status(429).json({
			success: false,
			message: "Too many OTP requests. Please wait a moment and try again."
		});
		const { studentId, studentIdNumber, sessionId } = req.body;
		if (!studentId || !sessionId) return res.status(400).json({
			success: false,
			message: "Missing required fields: studentId, sessionId"
		});
		const session = await clinicalAttendance_default$1.findById(sessionId);
		if (!session) return res.status(404).json({
			success: false,
			message: "Clinical attendance session not found"
		});
		const student = await user_default$1.findById(studentId);
		if (!student) return res.status(404).json({
			success: false,
			message: "Student not found"
		});
		const now = /* @__PURE__ */ new Date();
		const validityMinutes = Math.max(30, Math.min(120, Math.round(((session.endTime ? new Date(session.endTime).getTime() : now.getTime() + 3600 * 1e3) - now.getTime()) / 6e4 / 2)));
		const identityReference = getInstitutionIdentityReference({
			inn: student.inn,
			idNumber: studentIdNumber || student.idNumber,
			email: student.email
		});
		const payload = {
			studentId: student._id.toString(),
			studentIdNumber: identityReference,
			sessionId: session._id.toString(),
			supervisorId: session.supervisor?.toString() || null,
			issuedAt: now.toISOString(),
			expiresAt: new Date(now.getTime() + validityMinutes * 6e4).toISOString(),
			nonce: crypto.randomUUID(),
			type: "clinical-attendance-qr"
		};
		const signedPayload = createSignedQrPayload(payload);
		let otp = String(Math.floor(1e5 + Math.random() * 9e5));
		try {
			await qrOtp_default.create({
				otp,
				payload: signedPayload,
				expiresAt: new Date(payload.expiresAt)
			});
		} catch (err) {
			let attempts = 0;
			let created = false;
			while (attempts < 3 && !created) {
				attempts += 1;
				const next = String(Math.floor(1e5 + Math.random() * 9e5));
				try {
					await qrOtp_default.create({
						otp: next,
						payload: signedPayload,
						expiresAt: new Date(payload.expiresAt)
					});
					otp = next;
					created = true;
				} catch {}
			}
		}
		emitSystemEvent$1("clinicalAttendance.qr.generated", {
			sessionId: session._id.toString(),
			studentId: student._id.toString(),
			expiresAt: payload.expiresAt,
			otpGenerated: Boolean(otp)
		});
		res.status(200).json({
			success: true,
			message: "QR payload generated successfully",
			data: {
				qrPayload: signedPayload,
				sessionId: session._id,
				expiresAt: payload.expiresAt,
				validityMinutes,
				otp
			}
		});
	} catch (error) {
		console.error("Error generating QR payload:", error);
		res.status(500).json({
			success: false,
			message: "Error generating QR payload",
			error: error.message
		});
	}
};
const approveQrAttendance = async (req, res) => {
	try {
		await cleanupExpiredOtpEntries();
		if (!enforceOtpRateLimit(req)) return res.status(429).json({
			success: false,
			message: "Too many approval attempts. Please wait a moment and try again."
		});
		const { qrPayload, status = "present", notes = "" } = req.body;
		if (!qrPayload) return res.status(400).json({
			success: false,
			message: "Missing required field: qrPayload"
		});
		let parsedPayload;
		if (typeof qrPayload === "string" && /^\d{6}$/.test(qrPayload.trim())) {
			const found = await qrOtp_default.findOne({
				otp: qrPayload.trim(),
				expiresAt: { $gt: /* @__PURE__ */ new Date() }
			}).lean();
			if (!found) return res.status(404).json({
				success: false,
				message: "OTP not found or expired"
			});
			try {
				parsedPayload = verifySignedQrPayload(found.payload);
				if (!parsedPayload) return res.status(400).json({
					success: false,
					message: "Invalid signed OTP payload stored on server"
				});
				await qrOtp_default.deleteOne({ _id: found._id }).catch(() => {});
			} catch (err) {
				return res.status(400).json({
					success: false,
					message: "Invalid OTP payload stored on server"
				});
			}
		} else {
			parsedPayload = verifySignedQrPayload(qrPayload);
			if (!parsedPayload) return res.status(400).json({
				success: false,
				message: "Invalid or tampered QR payload"
			});
		}
		const now = /* @__PURE__ */ new Date();
		const expiresAt = parsedPayload.expiresAt ? new Date(parsedPayload.expiresAt) : null;
		if (expiresAt && now.getTime() > expiresAt.getTime()) return res.status(410).json({
			success: false,
			message: "Attendance QR has expired"
		});
		const session = await clinicalAttendance_default$1.findById(parsedPayload.sessionId);
		if (!session) return res.status(404).json({
			success: false,
			message: "Clinical attendance session not found"
		});
		const student = await user_default$1.findById(parsedPayload.studentId);
		if (!student) return res.status(404).json({
			success: false,
			message: "Student not found"
		});
		const existingRecord = session.attendees.find((attendee) => attendee.student.toString() === parsedPayload.studentId);
		const checkInTime = /* @__PURE__ */ new Date();
		const normalizedStatus = status === "approved_absent" ? "excused" : status === "absent" ? "absent" : "present";
		if (existingRecord) {
			existingRecord.status = normalizedStatus;
			existingRecord.checkInTime = checkInTime;
			existingRecord.notes = notes || existingRecord.notes || "Approved via QR";
		} else session.attendees.push({
			student: parsedPayload.studentId,
			status: normalizedStatus,
			checkInTime,
			notes: notes || "Approved via QR"
		});
		session.presentCount = session.attendees.filter((a) => a.status === "present").length;
		session.absentCount = session.attendees.filter((a) => a.status === "absent").length;
		session.lateCount = session.attendees.filter((a) => a.status === "late").length;
		session.excusedCount = session.attendees.filter((a) => a.status === "excused").length;
		await session.save();
		emitSystemEvent$1("clinicalAttendance.qr.approved", {
			sessionId: session._id.toString(),
			studentId: parsedPayload.studentId,
			status: normalizedStatus,
			supervisorId: req.user?._id?.toString() || null,
			approvedAt: checkInTime.toISOString()
		});
		res.status(200).json({
			success: true,
			message: "Attendance approved successfully",
			data: {
				studentId: student._id,
				studentIdNumber: parsedPayload.studentIdNumber,
				sessionId: session._id,
				status: normalizedStatus,
				checkedAt: checkInTime
			}
		});
	} catch (error) {
		console.error("Error approving QR attendance:", error);
		res.status(500).json({
			success: false,
			message: "Error approving QR attendance",
			error: error.message
		});
	}
};
const getStudentAttendanceRecord = async (req, res) => {
	try {
		const { studentId, academicYear, unit } = req.query;
		if (!studentId) return res.status(400).json({
			success: false,
			message: "Missing required field: studentId"
		});
		const filter = { "attendees.student": studentId };
		if (academicYear) filter.academicYear = academicYear;
		if (unit) filter.unit = unit;
		const sessions = await clinicalAttendance_default$1.find(filter).populate([{
			path: "unit",
			select: "name"
		}, {
			path: "supervisor",
			select: "firstName lastName"
		}]).sort({ date: -1 });
		let present = 0, absent = 0, late = 0, excused = 0;
		let totalDuration = 0;
		sessions.forEach((session) => {
			const record = session.attendees.find((a) => a.student.toString() === studentId);
			if (record) {
				if (record.status === "present") present++;
				if (record.status === "absent") absent++;
				if (record.status === "late") late++;
				if (record.status === "excused") excused++;
				if (record.duration) totalDuration += record.duration;
			}
		});
		res.status(200).json({
			success: true,
			data: {
				sessions,
				statistics: {
					present,
					absent,
					late,
					excused,
					totalSessions: sessions.length,
					totalMinutesAttended: totalDuration
				}
			}
		});
	} catch (error) {
		console.error("Error fetching student attendance record:", error);
		res.status(500).json({
			success: false,
			message: "Error fetching student attendance record",
			error: error.message
		});
	}
};
const updateStudentAttendanceStatus = async (req, res) => {
	try {
		const { sessionId, studentId, status, notes } = req.body;
		if (!sessionId || !studentId || !status) return res.status(400).json({
			success: false,
			message: "Missing required fields: sessionId, studentId, status"
		});
		const session = await clinicalAttendance_default$1.findById(sessionId);
		if (!session) return res.status(404).json({
			success: false,
			message: "Clinical attendance session not found"
		});
		const attendeeRecord = session.attendees.find((attendee) => attendee.student.toString() === studentId);
		if (!attendeeRecord) return res.status(404).json({
			success: false,
			message: "Student not found in this session"
		});
		attendeeRecord.status = status;
		if (notes) attendeeRecord.notes = notes;
		session.presentCount = session.attendees.filter((a) => a.status === "present").length;
		session.absentCount = session.attendees.filter((a) => a.status === "absent").length;
		session.lateCount = session.attendees.filter((a) => a.status === "late").length;
		session.excusedCount = session.attendees.filter((a) => a.status === "excused").length;
		await session.save();
		emitSystemEvent$1("clinicalAttendance.status.updated", {
			sessionId,
			studentId,
			status,
			notes
		});
		res.status(200).json({
			success: true,
			message: "Attendance status updated successfully",
			data: session
		});
	} catch (error) {
		console.error("Error updating attendance status:", error);
		res.status(500).json({
			success: false,
			message: "Error updating attendance status",
			error: error.message
		});
	}
};
const endClinicalSession = async (req, res) => {
	try {
		const { sessionId, feedback, proceduresPerformed, patientCount } = req.body;
		if (!sessionId) return res.status(400).json({
			success: false,
			message: "Missing required field: sessionId"
		});
		const session = await clinicalAttendance_default$1.findById(sessionId);
		if (!session) return res.status(404).json({
			success: false,
			message: "Clinical attendance session not found"
		});
		session.status = "completed";
		session.endTime = /* @__PURE__ */ new Date();
		if (!session.duration && session.startTime && session.endTime) {
			const durationMs = session.endTime.getTime() - session.startTime.getTime();
			session.duration = Math.round(durationMs / 6e4);
		}
		if (feedback) session.feedback = feedback;
		if (proceduresPerformed) session.proceduresPerformed = proceduresPerformed;
		if (patientCount) session.patientCount = patientCount;
		session.presentCount = session.attendees.filter((a) => a.status === "present").length;
		session.absentCount = session.attendees.filter((a) => a.status === "absent").length;
		session.lateCount = session.attendees.filter((a) => a.status === "late").length;
		session.excusedCount = session.attendees.filter((a) => a.status === "excused").length;
		await session.save();
		emitSystemEvent$1("clinicalAttendance.session.completed", {
			sessionId,
			durationMinutes: session.duration,
			endTime: session.endTime.toISOString()
		});
		res.status(200).json({
			success: true,
			message: "Clinical attendance session completed successfully",
			data: session
		});
	} catch (error) {
		console.error("Error ending clinical session:", error);
		res.status(500).json({
			success: false,
			message: "Error ending clinical session",
			error: error.message
		});
	}
};
const generateAttendanceReport = async (req, res) => {
	try {
		const { academicYear, unit, startDate, endDate, format = "json" } = req.query;
		if (!academicYear) return res.status(400).json({
			success: false,
			message: "Missing required field: academicYear"
		});
		const filter = { academicYear };
		if (unit) filter.unit = unit;
		if (startDate || endDate) {
			filter.date = {};
			if (startDate) filter.date.$gte = new Date(startDate);
			if (endDate) filter.date.$lte = new Date(endDate);
		}
		const sessions = await clinicalAttendance_default$1.find(filter).populate([
			{
				path: "attendees.student",
				select: "firstName lastName email"
			},
			{
				path: "unit",
				select: "name"
			},
			{
				path: "supervisor",
				select: "firstName lastName"
			}
		]).sort({ date: -1 });
		const report = {
			totalSessions: sessions.length,
			totalParticipants: new Set(sessions.flatMap((s) => s.attendees.map((a) => a.student.toString()))).size,
			activityBreakdown: {},
			statistics: {
				totalPresent: 0,
				totalAbsent: 0,
				totalLate: 0,
				totalExcused: 0
			},
			sessionDetails: sessions
		};
		sessions.forEach((session) => {
			if (!report.activityBreakdown[session.activityType]) report.activityBreakdown[session.activityType] = 0;
			report.activityBreakdown[session.activityType]++;
			report.statistics.totalPresent += session.presentCount;
			report.statistics.totalAbsent += session.absentCount;
			report.statistics.totalLate += session.lateCount;
			report.statistics.totalExcused += session.excusedCount;
		});
		emitSystemEvent$1("clinicalAttendance.report.generated", {
			academicYear: academicYear?.toString(),
			unit: unit?.toString() || null,
			recordCount: sessions.length,
			format: String(format)
		});
		res.status(200).json({
			success: true,
			data: report
		});
	} catch (error) {
		console.error("Error generating attendance report:", error);
		res.status(500).json({
			success: false,
			message: "Error generating attendance report",
			error: error.message
		});
	}
};
const deleteClinicalSession = async (req, res) => {
	try {
		const { sessionId } = req.params;
		if (!sessionId) return res.status(400).json({
			success: false,
			message: "Missing required field: sessionId"
		});
		if (!await clinicalAttendance_default$1.findByIdAndDelete(sessionId)) return res.status(404).json({
			success: false,
			message: "Clinical attendance session not found"
		});
		emitSystemEvent$1("clinicalAttendance.session.deleted", { sessionId });
		res.status(200).json({
			success: true,
			message: "Clinical attendance session deleted successfully"
		});
	} catch (error) {
		console.error("Error deleting clinical session:", error);
		res.status(500).json({
			success: false,
			message: "Error deleting clinical session",
			error: error.message
		});
	}
};
var clinicalAttendanceRouter = express.Router();
clinicalAttendanceRouter.post("/session/create", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), createClinicalAttendanceSession);
clinicalAttendanceRouter.post("/qr/generate", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident",
	"student"
]), generateQrAttendancePayload);
clinicalAttendanceRouter.post("/qr/approve", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), approveQrAttendance);
clinicalAttendanceRouter.post("/check-in", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"student"
]), checkInStudent);
clinicalAttendanceRouter.post("/check-out", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"student"
]), checkOutStudent);
clinicalAttendanceRouter.get("/sessions", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident",
	"student"
]), getClinicalAttendanceSessions);
clinicalAttendanceRouter.get("/student-record", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"student"
]), getStudentAttendanceRecord);
clinicalAttendanceRouter.put("/attendance-status", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant"
]), updateStudentAttendanceStatus);
clinicalAttendanceRouter.post("/session/end", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), endClinicalSession);
clinicalAttendanceRouter.get("/report", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant"
]), generateAttendanceReport);
clinicalAttendanceRouter.delete("/session/:sessionId", protect, authorize(["admin", "teacher"]), deleteClinicalSession);
var clinicalAttendance_default = clinicalAttendanceRouter;
var ActivityNotificationSchema = new Schema({
	userId: {
		type: Schema.Types.ObjectId,
		ref: "User",
		required: true,
		index: true
	},
	activityId: {
		type: String,
		required: true
	},
	activityType: {
		type: String,
		enum: [
			"lecture",
			"clinical",
			"tutorial",
			"duty",
			"call",
			"posting"
		],
		required: true,
		index: true
	},
	activityTitle: {
		type: String,
		required: true
	},
	classId: { type: String },
	instructorId: {
		type: Schema.Types.ObjectId,
		ref: "User"
	},
	location: { type: String },
	scheduledTime: {
		type: Date,
		required: true,
		index: true
	},
	notificationTime: {
		type: Date,
		required: true,
		index: true
	},
	leadTimeMinutes: {
		type: Number,
		required: true
	},
	message: {
		type: String,
		required: true
	},
	status: {
		type: String,
		enum: [
			"pending",
			"sent",
			"dismissed"
		],
		default: "pending",
		index: true
	},
	browserNotificationSent: {
		type: Boolean,
		default: false
	},
	databaseNotificationId: {
		type: Schema.Types.ObjectId,
		ref: "Notification"
	}
}, { timestamps: true });
ActivityNotificationSchema.index({
	userId: 1,
	status: 1,
	notificationTime: 1
});
ActivityNotificationSchema.index({
	status: 1,
	notificationTime: 1
});
const ActivityNotification = mongoose.model("ActivityNotification", ActivityNotificationSchema);
const createActivityNotification = async (req, res) => {
	try {
		const { userId, activityId, activityType, activityTitle, classId, instructorId, location, scheduledTime, leadTimeMinutes, message: message$1 } = req.body;
		if (!userId || !activityId || !activityType || !activityTitle || !scheduledTime || leadTimeMinutes === void 0) return res.status(400).json({ error: "Missing required fields" });
		const validTypes = [
			"lecture",
			"clinical",
			"tutorial",
			"duty",
			"call",
			"posting"
		];
		if (!validTypes.includes(activityType)) return res.status(400).json({ error: `Invalid activityType. Must be one of: ${validTypes.join(", ")}` });
		const scheduledDate = new Date(scheduledTime);
		const notificationTime = /* @__PURE__ */ new Date(scheduledDate.getTime() - leadTimeMinutes * 6e4);
		const activityNotification = await ActivityNotification.create({
			userId: new mongoose.Types.ObjectId(userId),
			activityId,
			activityType,
			activityTitle,
			classId,
			instructorId: instructorId ? new mongoose.Types.ObjectId(instructorId) : void 0,
			location,
			scheduledTime: scheduledDate,
			notificationTime,
			leadTimeMinutes,
			message: message$1,
			status: "pending",
			browserNotificationSent: false
		});
		res.status(201).json({
			success: true,
			notification: activityNotification.toObject()
		});
	} catch (err) {
		console.error("POST /activity-notifications error:", err);
		res.status(500).json({ error: "Failed to create activity notification" });
	}
};
const getPendingNotifications = async (req, res) => {
	try {
		const { userId } = req.params;
		if (req.user && String(req.user._id) !== userId && req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
		const notifications = await ActivityNotification.find({
			userId: new mongoose.Types.ObjectId(userId),
			status: "pending"
		}).sort({ notificationTime: 1 }).lean();
		res.json({
			success: true,
			notifications,
			count: notifications.length
		});
	} catch (err) {
		console.error("GET /activity-notifications/pending/:userId error:", err);
		res.status(500).json({ error: "Failed to fetch pending notifications" });
	}
};
const getDueNotifications = async (req, res) => {
	try {
		const { userId } = req.params;
		const now = /* @__PURE__ */ new Date();
		if (req.user && String(req.user._id) !== userId && req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
		const notifications = await ActivityNotification.find({
			userId: new mongoose.Types.ObjectId(userId),
			status: "pending",
			notificationTime: { $lte: now }
		}).sort({ notificationTime: 1 }).lean();
		res.json({
			success: true,
			notifications,
			count: notifications.length
		});
	} catch (err) {
		console.error("GET /activity-notifications/due/:userId error:", err);
		res.status(500).json({ error: "Failed to fetch due notifications" });
	}
};
const updateNotificationStatus = async (req, res) => {
	try {
		const { id } = req.params;
		const { status, browserNotificationSent } = req.body;
		const validStatuses = [
			"pending",
			"sent",
			"dismissed"
		];
		if (!validStatuses.includes(status)) return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
		const updateData = { status };
		if (browserNotificationSent !== void 0) updateData.browserNotificationSent = browserNotificationSent;
		const updated = await ActivityNotification.findByIdAndUpdate(id, updateData, { returnDocument: "after" });
		if (!updated) return res.status(404).json({ error: "Activity notification not found" });
		res.json({
			success: true,
			notification: updated.toObject()
		});
	} catch (err) {
		console.error("PATCH /activity-notifications/:id error:", err);
		res.status(500).json({ error: "Failed to update activity notification" });
	}
};
const deleteActivityNotification = async (req, res) => {
	try {
		const { id } = req.params;
		if (!await ActivityNotification.findByIdAndDelete(id)) return res.status(404).json({ error: "Activity notification not found" });
		res.json({ success: true });
	} catch (err) {
		console.error("DELETE /activity-notifications/:id error:", err);
		res.status(500).json({ error: "Failed to delete activity notification" });
	}
};
const getPendingNotificationCount = async (req, res) => {
	try {
		const { userId } = req.params;
		if (req.user && String(req.user._id) !== userId && req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
		const count = await ActivityNotification.countDocuments({
			userId: new mongoose.Types.ObjectId(userId),
			status: "pending"
		});
		res.json({
			success: true,
			count
		});
	} catch (err) {
		console.error("GET /activity-notifications/count/:userId error:", err);
		res.status(500).json({ error: "Failed to fetch notification count" });
	}
};
var router = Router();
router.post("/", createActivityNotification);
router.get("/pending/:userId", protect, getPendingNotifications);
router.get("/due/:userId", protect, getDueNotifications);
router.get("/count/:userId", protect, getPendingNotificationCount);
router.patch("/:id", protect, updateNotificationStatus);
router.delete("/:id", protect, deleteActivityNotification);
var activityNotification_default = router;
var DEFAULT_BODY_LIMIT = process.env.EXPRESS_BODY_LIMIT || "10mb";
const createBodyParsers = () => ({
	json: express.json({ limit: DEFAULT_BODY_LIMIT }),
	urlencoded: express.urlencoded({
		extended: true,
		limit: DEFAULT_BODY_LIMIT
	})
});
init_inngest();
init_functions();
dns.setServers([
	"8.8.8.8",
	"8.8.4.4",
	"1.1.1.1"
]);
dotenv.config();
var normalizeOrigin = (value) => {
	if (!value) return null;
	let origin = value.trim();
	if (!origin) return null;
	if (origin.endsWith("/")) origin = origin.slice(0, -1);
	if (!origin.startsWith("http://") && !origin.startsWith("https://")) origin = `https://${origin}`;
	return origin;
};
const app = express();
var PORT = process.env.PORT || 5e3;
var isVercelRuntime = process.env.VERCEL === "1" || process.env.VERCEL === "true" || Boolean(process.env.VERCEL_URL) && process.env.NODE_ENV === "production";
var apiBase = isVercelRuntime ? "" : "/api";
var routePrefixes = isVercelRuntime ? ["/api", ""] : ["/api"];
var DB_TIMEOUT_MS = isVercelRuntime ? 7e3 : 1e4;
var dbConnectionPromise = null;
var ensureDatabaseConnection = async () => {
	if (mongoose.connection.readyState === 1) return;
	if (!dbConnectionPromise) dbConnectionPromise = Promise.race([connectDB().then(() => void 0).catch((error) => {
		dbConnectionPromise = null;
		throw error;
	}), new Promise((_, reject) => setTimeout(() => reject(/* @__PURE__ */ new Error("Database connection timeout (30s)")), 3e4))]);
	await dbConnectionPromise;
};
try {
	console$1.log(`\n🚀 Backend Server Initialization:`);
	console$1.log(`   Environment: ${isVercelRuntime ? "🟦 VERCEL/SERVERLESS" : "🟩 LOCAL DEVELOPMENT"}`);
	console$1.log(`   Port: ${PORT}`);
	console$1.log(`   Node Env: ${process.env.NODE_ENV || "not set"}`);
	console$1.log(`   API Base: ${apiBase || "(root)"}`);
	console$1.log(`   Route Prefixes: ${routePrefixes.join(", ") || "(none)"}`);
	console$1.log(`   Vercel Flag: ${process.env.VERCEL || "not set"}`);
	console$1.log(`   Vercel URL: ${process.env.VERCEL_URL || "not set"}`);
	console$1.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? "✅ SET" : "❌ NOT SET"}`);
	console$1.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? "✅ SET" : "❌ NOT SET"}`);
	console$1.log(`   CLIENT_URL: ${process.env.CLIENT_URL || "not set"}\n`);
} catch (err) {}
var { json, urlencoded } = createBodyParsers();
app.use(helmet());
app.use(json);
app.use(urlencoded);
app.use(cookieParser());
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));
var configuredOrigins = [
	normalizeOrigin(process.env.CLIENT_URL),
	normalizeOrigin(process.env.LOCAL_CLIENT_URL),
	normalizeOrigin(process.env.FRONTEND_URL),
	normalizeOrigin(process.env.VERCEL_URL),
	"http://localhost:5173",
	"https://localhost:5173",
	"http://127.0.0.1:5173",
	"https://127.0.0.1:5173"
].filter((origin) => origin !== null && origin !== "");
var isAllowedOrigin = (origin) => {
	if (!origin) return true;
	const normalizedOrigin = normalizeOrigin(origin);
	if (!normalizedOrigin) return true;
	if (configuredOrigins.includes(normalizedOrigin)) return true;
	try {
		const hostname = new URL(normalizedOrigin).hostname;
		return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".vercel.app") || hostname.endsWith(".fly.dev");
	} catch {
		return false;
	}
};
app.use(cors({
	origin: (origin, callback) => {
		callback(null, isAllowedOrigin(origin));
	},
	credentials: true,
	methods: [
		"GET",
		"POST",
		"PUT",
		"PATCH",
		"DELETE",
		"OPTIONS"
	],
	allowedHeaders: [
		"Content-Type",
		"Authorization",
		"X-Requested-With"
	]
}));
app.get("/", (req, res) => {
	res.status(200).json({
		status: "ok",
		message: "Server is healthy!"
	});
});
app.use((req, res, next) => {
	const timeout = isVercelRuntime ? 25e3 : 3e4;
	const timeoutId = setTimeout(() => {
		if (!res.headersSent) {
			console$1.warn(`[TIMEOUT] Request ${req.method} ${req.path} exceeded ${timeout}ms`);
			res.status(503).json({
				status: "Error",
				message: "Request timeout - server took too long to respond"
			});
		}
	}, timeout);
	res.on("finish", () => clearTimeout(timeoutId));
	res.on("close", () => clearTimeout(timeoutId));
	next();
});
app.use((req, res, next) => {
	const requestPath = req.path || "/";
	if (!(requestPath === "/setup/status" || requestPath === "/api/setup/status" || requestPath.endsWith("/setup/status"))) {
		next();
		return;
	}
	const label = `${req.method} ${req.originalUrl}`;
	const startTime = Date.now();
	console$1.info(`[ROUTE] enter ${label}`);
	const finishLogger = () => {
		const elapsed = Date.now() - startTime;
		console$1.info(`[ROUTE] exit  ${label} status=${res.statusCode} duration=${elapsed}ms`);
	};
	const closeLogger = () => {
		const elapsed = Date.now() - startTime;
		console$1.warn(`[ROUTE] close ${label} status=${res.statusCode} duration=${elapsed}ms`);
	};
	res.once("finish", finishLogger);
	res.once("close", closeLogger);
	next();
});
app.use(async (req, res, next) => {
	const requestPath = req.path || "/";
	const isSetupStatusRequest = requestPath === "/setup/status" || requestPath === "/api/setup/status" || requestPath.endsWith("/setup/status");
	if (req.method === "OPTIONS" || requestPath === "/" || requestPath === "/_routes" || requestPath === "/healthz" || isSetupStatusRequest) {
		next();
		return;
	}
	console$1.log(`[DB] Ensuring connection for ${req.method} ${req.path}`);
	try {
		await Promise.race([ensureDatabaseConnection(), new Promise((_, reject) => {
			setTimeout(() => reject(/* @__PURE__ */ new Error(`Database connection timeout (${DB_TIMEOUT_MS}ms)`)), DB_TIMEOUT_MS);
		})]);
		console$1.log(`[DB] Connection ready, proceeding to route handler`);
		next();
	} catch (error) {
		console$1.error(`[DB] Connection failed for ${req.path}:`, error.message);
		if (!res.headersSent) res.status(503).json({
			status: "Error!",
			message: "Database connection unavailable",
			error: error.message
		});
	}
});
var mountRoutes = (prefix) => {
	app.use(`${prefix}/users`, user_default);
	app.use(`${prefix}/activities`, activitieslog_default);
	app.use(`${prefix}/academic-years`, academicYear_default);
	app.use(`${prefix}/academic-clocks`, academicClock_default);
	app.use(`${prefix}/classes`, classes_default);
	app.use(`${prefix}/courses`, courses_default);
	app.use(`${prefix}/timetables`, timetable_default);
	app.use(`${prefix}/exams`, exam_default);
	app.use(`${prefix}/dashboard`, dashboard_default);
	app.use(`${prefix}/attendance`, attendance_default);
	app.use(`${prefix}/clinical-attendance`, clinicalAttendance_default);
	app.use(`${prefix}/notifications`, notification_default);
	app.use(`${prefix}/activity-notifications`, activityNotification_default);
	app.use(`${prefix}/setup`, setup_default);
	app.use(`${prefix}/og-ped-rotations`, for500LevelPostings_default);
	app.use(`${prefix}/rotation-schedules`, rotationSchedules_default);
	app.use(`${prefix}/logbook-entries`, logbookEntry_default);
	app.use(`${prefix}/hospital-data`, hospitalData_default);
	app.use(`${prefix}/activity-entries`, activityEntry_default);
	app.use(`${prefix}/inngest`, serve({
		client: inngest,
		functions: [
			generateTimeTable,
			generateExam,
			generateAttendance,
			bulkCreateUsers,
			rotationNotify
		]
	}));
	app.use(`${prefix}/mordred`, mordred_default);
};
for (const prefix of routePrefixes) mountRoutes(prefix);
app.get(`${apiBase}/_routes`, (req, res) => {
	try {
		const stack = app._router?.stack || [];
		const routes = [];
		for (const layer of stack) if (layer.route && layer.route.path) {
			const methods = Object.keys(layer.route.methods || {}).map((m) => m.toUpperCase());
			routes.push({
				path: `${apiBase}${layer.route.path}`,
				methods
			});
		} else if (layer.name === "router" && layer.handle && layer.handle.stack) {
			for (const nested of layer.handle.stack) if (nested.route && nested.route.path) {
				const methods = Object.keys(nested.route.methods || {}).map((m) => m.toUpperCase());
				routes.push({
					path: `${apiBase}${nested.route.path}`,
					methods
				});
			}
		}
		res.json({ routes });
	} catch (err) {
		res.status(500).json({
			error: "Failed to enumerate routes",
			detail: String(err)
		});
	}
});
app.use((err, req, res, next) => {
	console$1.error(err.stack);
	res.status(500).json({
		status: "Error!",
		message: err.message
	});
});
if (!isVercelRuntime) connectDB().then(async () => {
	await backfillMissingInns();
	app.listen(PORT, () => {
		console$1.log(`Server is running on http://localhost:${PORT}`);
	});
}).catch((error) => {
	console$1.error("Failed to connect to the database:", error);
});
else connectDB().then(async () => {
	await backfillMissingInns();
}).catch((error) => {
	console$1.error("Failed to connect to the database on Vercel startup:", error);
});
var server_default = app;
console.log("⚙️ Serverless Handler Bootstrap:");
console.log(`  NODE_ENV: ${process.env.NODE_ENV || "NOT SET"}`);
console.log(`  VERCEL: ${process.env.VERCEL || "NOT SET"}`);
console.log(`  VERCEL_URL: ${process.env.VERCEL_URL || "NOT SET"}`);
console.log(`  MEDLOG_MONGO_URL: ${process.env.MEDLOG_MONGO_URL ? "SET" : "NOT SET"}`);
console.log(`  JWT_SECRET: ${process.env.JWT_SECRET ? "SET" : "NOT SET"}`);
console.log(`  CLIENT_URL: ${process.env.CLIENT_URL || "NOT SET"}`);
var handler;
try {
	handler = serverless(server_default);
	console.log("✅ Handler initialized successfully");
} catch (error) {
	console.error("❌ Handler initialization failed:", error);
	throw error;
}
var api_default = handler;
export { init_user as _, rotationPlan_default as a, timetable_default$1 as c, Notification as d, api_default as default, init_notification as f, UserRole as g, UserIDs as h, handler, init_rotationPlan as i, classes_default$1 as l, UserDepartmentRole as m, rotationRunner_default as n, academicYear_default$1 as o, UserAcademicStatus as p, runRotationSnapshot as r, init_timetable as s, init_rotationRunner as t, init_classes as u, user_default$1 as v };
