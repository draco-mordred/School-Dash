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
import { Inngest, NonRetriableError } from "inngest";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import { serve } from "inngest/express";
import { z } from "zod";
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
		const link = process.env.MEDLOG_MONGO_URL || process.env.MONGO_URI;
		if (!link) throw new Error("Missing MongoDB connection string. Set MEDLOG_MONGO_URL or MONGO_URI.");
		const conn = await mongoose.connect(link, {
			serverSelectionTimeoutMS: 1e4,
			socketTimeoutMS: 45e3
		});
		console.log(`MongoDB Connected ONLINE @: ${conn.connection.host}`);
	} catch (error) {
		console.error(`MongoDB connection failed: ${error.message}`);
		process.exit(1);
	}
};
var UserRole, UserIDs, UserAcademicStatus, UserDepartmentRole, UserSchema, User, user_default$1;
var init_user = __esmMin((() => {
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
		student: "student"
	};
	UserDepartmentRole = {
		headOfDepartment: "head of department",
		deanOfFaculty: "dean of faculty",
		examOfficer: "exam officer",
		financeOfficer: "finance officer",
		levelCordinator: "level coordinator"
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
		password: {
			type: String,
			required: true
		},
		role: {
			type: String,
			enum: Object.values(UserRole),
			required: true,
			default: UserRole.STUDENT
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
		if (!this.isModified("password")) return;
		const salt = await bcrypt.genSalt(10);
		this.password = await bcrypt.hash(this.password, salt);
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
var DepartmentName;
(function(DepartmentName$1) {
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
})(DepartmentName || (DepartmentName = {}));
var DepartmentCode;
(function(DepartmentCode$1) {
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
})(DepartmentCode || (DepartmentCode = {}));
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
	}
};
const DEPARTMENT_NAMES = Object.values(DepartmentName);
Object.values(DepartmentCode);
const getDepartmentUnitsByCode = (code) => {
	const departmentName = DEPARTMENT_NAMES.find((name) => DEPARTMENTS_METADATA[name].code === code);
	return departmentName ? DEPARTMENT_UNITS[departmentName] ?? null : null;
};
const DEPARTMENT_COURSES = {
	[DepartmentName.pediatrics]: [{
		title: "Paediatric Cardiology",
		units: 5,
		courseID: DepartmentCode.pediatrics,
		code: "PAE 501",
		departmentName: DEPARTMENTS_METADATA[DepartmentName.pediatrics].name,
		departmentCode: DepartmentCode.pediatrics,
		semester: "First"
	}, {
		title: "Emergency Paediatrics",
		units: 4,
		courseID: DepartmentCode.pediatrics,
		code: "PAE 502",
		departmentName: DEPARTMENTS_METADATA[DepartmentName.pediatrics].name,
		departmentCode: DepartmentCode.pediatrics,
		semester: "Second"
	}],
	[DepartmentName.obstetricsAndGynecology]: [{
		title: "Antenatal Care",
		units: 4,
		courseID: DepartmentCode.obstetricsAndGynecology,
		code: "OBG 501",
		departmentName: DEPARTMENTS_METADATA[DepartmentName.obstetricsAndGynecology].name,
		departmentCode: DepartmentCode.obstetricsAndGynecology,
		semester: "First"
	}, {
		title: "Family Planning",
		units: 3,
		courseID: DepartmentCode.obstetricsAndGynecology,
		code: "OBG 502",
		departmentName: DEPARTMENTS_METADATA[DepartmentName.obstetricsAndGynecology].name,
		departmentCode: DepartmentCode.obstetricsAndGynecology,
		semester: "Second"
	}],
	[DepartmentName.medicine]: [{
		title: "Internal Medicine I",
		units: 5,
		courseID: DepartmentCode.medicine,
		code: "MED 501",
		departmentName: DEPARTMENTS_METADATA[DepartmentName.medicine].name,
		departmentCode: DepartmentCode.medicine,
		semester: "First"
	}]
};
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
		isDev: true
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
var init_mordredEngine = __esmMin((() => {})), generateTimeTable, generateExam, generateAttendance, bulkCreateUsers, rotationNotify, automaticPostingNotification, mordredTicketSentry;
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
				if (!lecturer.teacherSubject) return false;
				return topLevelCourses.some((tc) => lecturer.teacherSubject.some((subId) => String(subId) === String(tc._id)));
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
					const isValidObjectId = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
					if (!isValidObjectId(String(courseIdRaw))) throw new NonRetriableError(`Invalid subject id returned by AI: ${String(courseIdRaw)}`);
					const lecturerRaw = period?.lecturer;
					const lecturerObjId = isValidObjectId(lecturerRaw) ? new mongoose.Types.ObjectId(String(lecturerRaw)) : null;
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
		const dayName = dayMap[dateObj.getDay()];
		if (dayName === "Saturday" || dayName === "Sunday") throw new NonRetriableError("Attendance cannot be generated on weekends (Saturday/Sunday)");
		const classData = await step.run("fetch-class-students", async () => {
			const cls = await classes_default$1.findById(classId).populate("students", "_id name");
			if (!cls) throw new NonRetriableError(`Class not found: ${classId}`);
			return cls;
		});
		const studentIds = classData.students.map((s) => s._id);
		const timetableData = await step.run("fetch-timetable-schedule", async () => {
			const timetable = await timetable_default$1.findOne({
				class: classId,
				academicYear: academicYearId
			}).populate("schedule.periods.subject", "_id name code").populate("schedule.periods.lecturer", "_id name");
			if (!timetable) throw new NonRetriableError(`NO_TIMETABLE: No timetable found for this class. Please generate a timetable first.`);
			const daySchedule = timetable.schedule.find((d) => d.day?.toLowerCase() === dayName?.toLowerCase());
			if (!daySchedule) throw new NonRetriableError(`NO_SCHEDULE: No schedule found for ${dayName}. The timetable exists but has no periods on this day.`);
			const courseStr = courseId.toString();
			const matchingPeriods = daySchedule.periods.filter((p) => p.subject?._id?.toString() === courseStr);
			if (matchingPeriods.length === 0) {
				const availableSubjects = daySchedule.periods.map((p) => p.subject?.name ?? p.subject?.code ?? "Unknown").filter(Boolean);
				throw new NonRetriableError(`NO_PERIOD: No period found for the selected course on ${dayName}. Please verify the course was added to the ${dayName} schedule in the timetable.${availableSubjects.length > 0 ? ` Available courses on ${dayName}: ${[...new Set(availableSubjects)].join(", ")}.` : ""}`);
			}
			return {
				daySchedule,
				matchingPeriods
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
			const { matchingPeriods } = timetableData;
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
	bulkCreateUsers = inngest.createFunction({
		id: "Bulk-Create-Users",
		triggers: { event: "users/bulk-create" }
	}, async ({ event, step }) => {
		const { users, classId, courseIds, userId } = event.data;
		if (!users || users.length === 0) throw new NonRetriableError("No users provided.");
		const results = await step.run("bulk-create-users", async () => {
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
				if (u.role === "student" && classId) await (init_classes(), __toCommonJS(classes_exports)).default.findByIdAndUpdate(classId, { $addToSet: { students: new mongoose.Types.ObjectId(newUser._id) } }, { returnDocument: "after" });
				created.push(newUser.email);
			} catch (err) {
				errors.push(`'${u.name}': ${err.message}`);
			}
			return {
				created,
				skipped,
				errors
			};
		});
		await step.run("log-activity", async () => {
			await logActivity({
				userId: userId ?? "system",
				action: "Bulk uploaded users",
				details: `Bulk upload: ${results.created.length} created, ${results.skipped.length} skipped, ${results.errors.length} errors.`
			});
		});
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
			const { Notification: Notification$1 } = await import("./notification-WqRLsBJ_.js");
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
	inngest.createFunction({
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
var normalizeRole = (role) => {
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
		payload?.credential,
		payload?.idNumber,
		payload?.matricNumber,
		payload?.email
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
const registerUser = async (req, res) => {
	try {
		const { name, email, password, idNumber, role, departmentId, department, studentClasses, teacherSubject, parentStudents, isActive, isSupervisor, supervisorRank, specialties } = req.body;
		const normalizedRole = normalizeRole(role);
		if (!normalizedRole) {
			res.status(400).json({
				status: "Error!",
				message: "Invalid user role"
			});
			return;
		}
		const departmentDoc = await findDepartment(departmentId || department || req.body?.departmentCode || req.body?.departmentID);
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
		const newUser = await user_default$1.create({
			name,
			email,
			password,
			idNumber: newIDNumber,
			role: normalizedRole,
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
		const normalizedRole = normalizeRole(role);
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
		const newUser = await user_default$1.create({
			name,
			email,
			password,
			idNumber: newIDNumber,
			role: normalizedRole,
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
		const resolvedIdentifier = resolveLoginIdentifier(req.body);
		console.log(`[AUTH] login attempt, resolvedIdentifier='${resolvedIdentifier}' from payload:`, req.body);
		const trimmedIdentifier = resolvedIdentifier.trim();
		const lookupCandidates = [
			trimmedIdentifier && !trimmedIdentifier.includes("@") ? { idNumber: trimmedIdentifier } : null,
			trimmedIdentifier ? { email: trimmedIdentifier } : null,
			trimmedIdentifier ? { matricNumber: trimmedIdentifier } : null,
			trimmedIdentifier ? { studentId: trimmedIdentifier } : null
		].filter(Boolean);
		let user = null;
		for (const criteria of lookupCandidates) {
			console.log(`[AUTH] trying lookup criteria:`, criteria);
			user = await user_default$1.findOne(criteria);
			if (user) {
				console.log(`[AUTH] found user by criteria:`, criteria, `userId=${user._id}, email=${user.email}, idNumber=${user.idNumber}`);
				break;
			}
		}
		if (!user && trimmedIdentifier) {
			normalizeLoginIdentifier(trimmedIdentifier);
			const possibleMatches = await user_default$1.find({ $or: [
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
			] }).limit(200);
			user = possibleMatches.find((candidate) => identifierMatches(candidate.idNumber, trimmedIdentifier) || identifierMatches(candidate.matricNumber, trimmedIdentifier) || identifierMatches(candidate.studentId, trimmedIdentifier) || identifierMatches(candidate.email, trimmedIdentifier)) || null;
			console.log(`[AUTH] possibleMatches length=${possibleMatches.length}, selectedUser=${user ? user._id : null}`);
		}
		if (!user && normalizeLoginIdentifier(trimmedIdentifier)) user = await user_default$1.findOne({ email: trimmedIdentifier });
		if (user) {
			const pwMatch = await user.matchPassword(password);
			console.log(`[AUTH] password match for user ${user._id}: ${pwMatch}`);
			if (pwMatch) {
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
			}
		}
		res.status(401).json({ message: "Invalid matriculation number, email, or password" });
		return;
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
			if (req.body.role !== void 0) {
				const normalizedRole = normalizeRole(req.body.role);
				if (normalizedRole) user.role = normalizedRole;
			}
			user.isActive = req.body.isActive !== void 0 ? req.body.isActive : user.isActive;
			if (req.body.studentClasses !== void 0 || req.body.classId !== void 0) {
				const incoming = req.body.studentClasses !== void 0 ? req.body.studentClasses : req.body.classId;
				user.studentClasses = Array.isArray(incoming) ? incoming.length ? incoming[0] : null : typeof incoming === "string" ? incoming.trim() || null : incoming ?? null;
			}
			if (req.body.teacherSubject !== void 0) user.teacherSubject = (Array.isArray(req.body.teacherSubject) ? req.body.teacherSubject : req.body.teacherSubject ? [req.body.teacherSubject] : []).filter((subject) => typeof subject !== "string" || subject.trim() !== "");
			if (req.body.parentStudents !== void 0) user.parentStudents = (Array.isArray(req.body.parentStudents) ? req.body.parentStudents : req.body.parentStudents ? [req.body.parentStudents] : []).filter((student) => typeof student !== "string" || student.trim() !== "");
			if (req.body.department !== void 0 || req.body.departmentId !== void 0) {
				const deptDoc = await findDepartment(req.body.departmentId ?? req.body.department);
				if (deptDoc) {
					user.departmentId = deptDoc._id;
					user.department = deptDoc.name;
				} else if (req.body.department !== void 0) user.department = String(req.body.department).trim();
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
		const role = normalizeRole(req.query.role);
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
const authorize = (roles) => {
	return (req, res, next) => {
		if (!req.user) return res.status(401).json({ message: `Not authorized, no user found!` });
		if (!roles.includes(req.user.role)) return res.status(403).json({ message: `Access denied. User role '${req.user.role}' not allowed to acces this route. Allowed roles: ${roles.join(", ")}` });
		next();
	};
};
var userRoutes = express.Router();
userRoutes.post("/register", protect, authorize(["admin"]), registerUser);
userRoutes.get("/public/is-first", isFirstUser);
userRoutes.post("/public/register", registerPublic);
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
var ensureHas_Id = (obj) => {
	if (!obj) return obj;
	if (Array.isArray(obj)) return obj.map((o) => ensureHas_Id(o));
	if (typeof obj === "object" && !obj._id && obj.id) obj._id = obj.id;
	return obj;
};
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
		res.status(201).json(ensureHas_Id(academicYear));
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
			years: ensureHas_Id(years),
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
			res.status(404).json({ message: "No current academic year found!" });
			return;
		} else res.status(200).json(ensureHas_Id(currentYear));
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
		res.status(200).json(ensureHas_Id(updatedYear));
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
const LevelPhaseData = {
	final: {},
	sixth: {
		classNameID: "600 Level",
		phase1: {
			name: "Medicine and Surgery Final Postings",
			duration: 4,
			postingType: "MED&SURG3",
			postingId: null
		},
		phase2: {
			name: "Other Specialty Postings",
			duration: 6,
			postingType: "SPECIALTY",
			postingId: null
		},
		phase3: {
			name: "Community Medicine & Rural Postings",
			duration: 4,
			postingType: "COM&RURAL",
			postingId: null
		},
		phase4: {
			name: "Acccident & Emergency Postings",
			duration: 2,
			postingType: "ACCIDENT&EMERGENCY",
			postingId: null
		},
		numberOfPhases: 4
	},
	fifth: {
		phase1: {
			name: "O&G/Pediatrics Junior Postings",
			duration: 4,
			postingType: "OG_PEDS",
			postingId: null
		},
		phase2: {
			name: "Specialty Postings",
			duration: 6,
			postingType: "SPECIALTY",
			postingId: null
		},
		phase3: {
			name: "O&G/Pediatrics Senior Postings",
			duration: 4,
			postingType: "OG_PEDS",
			postingId: null
		},
		phase4: {
			name: "4th MBBS Exams/Elective Posting",
			duration: 2,
			postingType: null,
			postingId: null
		},
		classNameID: "500 Level",
		numberOfPhases: 4
	},
	fourth: {
		classNameID: "400 Level",
		phase1: {
			name: "Medicine and Surgery Initial Clinical Postings",
			duration: 10,
			postingType: "MED&SURG0&1&2",
			postingId: null
		},
		phase2: {
			name: "Pathology Block Postings",
			duration: 4,
			postingType: "PATHOLOGY",
			postingId: null
		},
		phase3: {
			name: "3rd MBBS Exams",
			duration: 2,
			postingType: null,
			postingId: null
		},
		numberOfPhases: 3
	},
	third: {
		classNameID: "300 Level",
		phase1: {
			name: "Preclinical Postings",
			duration: 12,
			postingType: "PRECLINICAL",
			postingId: null
		},
		phase2: {
			name: "2nd MBBS Exams",
			duration: 2,
			postingType: null,
			postingId: null
		},
		numberOfPhases: 2
	}
};
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
		enum: [
			"phase1",
			"phase2",
			"phase3",
			"phase4"
		],
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
		const resolvedPhaseConfig = phaseConfig ?? buildPhaseConfigForClassLevel(resolvedClassLevel);
		const academicClock = await academicClock_default$1.create({
			academicYear: academicYearId,
			classId,
			clockStartDate: clockStartDate ?? null,
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
		const academicClock = await academicClock_default$1.findById(req.params.id);
		if (!academicClock) {
			res.status(404).json({ message: "Academic clock not found" });
			return;
		}
		const classDoc = await classes_default$1.findById(academicClock.classId);
		const resolvedClassLevel = typeof req.body.classLevel === "string" && req.body.classLevel ? req.body.classLevel : academicClock.classLevel ?? resolveClassLevelFromName(classDoc?.name ?? "");
		if (resolvedClassLevel && !Object.prototype.hasOwnProperty.call(req.body, "phaseConfig")) updateData.phaseConfig = buildPhaseConfigForClassLevel(resolvedClassLevel);
		if (resolvedClassLevel && !Object.prototype.hasOwnProperty.call(req.body, "classLevel")) updateData.classLevel = resolvedClassLevel;
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
var DUPLICATE_WINDOW_MS = 300 * 1e3;
const createNotificationIfUnique = async (payload) => {
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
init_user();
init_classes();
const completeAcademicClockByClass = async (req, res) => {
	try {
		const { academicYearId, classId } = req.body;
		if (!academicYearId || !classId) {
			res.status(400).json({ message: "academicYearId and classId are required" });
			return;
		}
		const clock = await academicClock_default$1.findOne({
			academicYear: academicYearId,
			classId
		});
		if (!clock) return res.status(404).json({ message: "Academic clock not found" });
		clock.clockIsPaused = true;
		await clock.save();
		const year = await academicYear_default$1.findById(academicYearId);
		const className = (await classes_default$1.findById(classId).select("name"))?.name ?? classId;
		const executor = req.user;
		const actorName = executor?.name ?? executor?.email ?? "An administrator";
		const actorRole = executor?.role ?? "admin";
		const adminUsers = await user_default$1.find({
			role: "admin",
			isActive: true
		}).select("_id").lean();
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
		const cls = await classes_default$1.findById(req.params.id).populate("academicYear", "name").populate("classTeacher", "name email").populate("courses", "name code subjects.subjectID").select("name academicYear classTeacher courses");
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
		const [total, classes] = await Promise.all([classes_default$1.countDocuments(query), classes_default$1.find(query).populate("academicYear", "name").populate("classTeacher", "name email").populate("courses", "name code subjects.subjectID lecturer").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)]);
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
	"parent"
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
var generateSubjectUID = (subject) => {
	if (subject && typeof subject.subjectUID === "string" && subject.subjectUID.trim() !== "") return String(subject.subjectUID).trim();
	return new mongoose.Types.ObjectId().toHexString();
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
		topLevelCourse.subjects = (topLevelCourse.subjects ?? []).filter((s) => String(s._id) !== String(removed._id));
		await topLevelCourse.save();
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
		const subjectUID = generateSubjectUID(subject);
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
			semester: subject.semester ?? null
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
	return {
		name: String(raw?.name || raw?.departmentName || raw?.["Department Name"] || "").trim(),
		code: String(raw?.code || raw?.departmentCode || raw?.["Department Code"] || "").trim().toUpperCase(),
		departmentID: String(raw?.departmentID || raw?.departmentId || raw?.["Department ID"] || raw?.["department id"] || "").trim(),
		head: String(raw?.head || raw?.departmentHead || "").trim() || void 0
	};
};
const createDepartment = async (req, res) => {
	try {
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
			head: head && mongoose.isValidObjectId(head) ? head : void 0
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
		const { name, code, departmentID, head } = req.body;
		const updateData = {};
		if (name !== void 0) updateData.name = String(name).trim();
		if (code !== void 0) updateData.code = String(code).trim().toUpperCase();
		if (departmentID !== void 0) updateData.departmentID = String(departmentID).trim();
		if (head !== void 0) updateData.head = head && mongoose.isValidObjectId(head) ? head : null;
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
			const filter = { $or: [{ code: row.code }, { departmentID: row.departmentID }] };
			const existing = await departments_default.findOne(filter);
			if (existing) {
				await departments_default.findByIdAndUpdate(existing._id, {
					name: row.name,
					code: row.code,
					departmentID: row.departmentID,
					head: row.head && mongoose.isValidObjectId(row.head) ? row.head : existing.head
				});
				results.updated += 1;
				continue;
			}
			await departments_default.create({
				name: row.name,
				code: row.code,
				departmentID: row.departmentID,
				head: row.head && mongoose.isValidObjectId(row.head) ? row.head : void 0
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
courseRouter.route("/:courseId/subjects/:subjectId").delete(protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident"
]), deleteEmbeddedSubject);
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
mongoose.model("ClinicalRotations", ClinicalRotationsSchema);
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
var studentLogbookEntryType_;
(function(studentLogbookEntryType_$1) {
	studentLogbookEntryType_$1["tutorialAndDemonstrations"] = "tutorialAndDemonstrations";
	studentLogbookEntryType_$1["clinicalActivities"] = "clinicalActivities";
	studentLogbookEntryType_$1["clinicalProcedures"] = "clinicalProcedures";
	studentLogbookEntryType_$1["clinicalPatientPresentations"] = "clinicalPatientPresentations";
})(studentLogbookEntryType_ || (studentLogbookEntryType_ = {}));
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
		const timetable = await timetable_default$1.findOne({ class: req.params.classId }).populate("schedule.periods.subject", "name code courseID subjects.subjectID").populate("schedule.periods.lecturer", "name email");
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
		if (periodIndex < 0 || periodIndex >= daySchedule.periods.length) {
			res.status(400).json({ message: "Invalid periodIndex" });
			return;
		}
		daySchedule.periods[periodIndex] = {
			...daySchedule.periods[periodIndex],
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
		if (periodIndex < 0 || periodIndex >= daySchedule.periods.length) {
			res.status(400).json({ message: "Invalid periodIndex" });
			return;
		}
		daySchedule.periods.splice(periodIndex, 1);
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
	const academicYearDoc = await (await import("./academicYear-jZByGatC.js")).default.findById(academicYearId);
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
		const courseName = course.name.toLowerCase();
		coursesByName.set(courseName, String(course._id));
		courseMap.set(course.name, String(course._id));
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
init_activitieslog$1();
init_exam();
init_classes();
init_user();
var getTodayName = () => (/* @__PURE__ */ new Date()).toLocaleDateString("en-us", { weekday: "long" });
const getDashboradStats = async (req, res) => {
	try {
		const user = req.user;
		let stats = {};
		const activityQuery = user.role === "admin" ? {} : { user: user._id };
		const formattedActivity = (await activitieslog_default$1.find(activityQuery).sort({ createdAt: -1 }).limit(5).populate("user", "name")).map((log) => `${log.user.name}: ${log.action} (${new Date(log.createdAt).toLocaleDateString([], {
			hour: "2-digit",
			minute: "2-digit"
		})})`);
		if (user.role === "admin") {
			const totalStudents = await user_default$1.countDocuments({ role: "student" });
			stats = {
				totalLecturers: await user_default$1.countDocuments({ role: "teacher" }),
				totalStudents,
				activeExams: await user_default$1.countDocuments({ isActive: true }),
				avgAttendance: "94.5%",
				recentActivities: formattedActivity
			};
		} else if (user.role === "teacher") {
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
var dashBoardRouter = express.Router();
dashBoardRouter.get("/stats", protect, getDashboradStats);
var dashboard_default = dashBoardRouter;
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
		enum: [
			"medicine",
			"surgery",
			"paediatrics",
			"obstetrics",
			"block",
			"specialty"
		],
		required: true
	},
	umbrella: {
		type: String,
		enum: ["MEDICINE", "SURGERY"],
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
HospitalUnitSchema.index({
	umbrella: 1,
	isActive: 1
});
var hospitalUnit_default = mongoose.model("HospitalUnit", HospitalUnitSchema, "hospital_units");
init_attendance();
init_user();
init_activitieslog();
init_inngest();
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
			const records$1 = await attendance_default$1.find({ student: userId }).populate("course", "name code courseID subjects.subjectID").populate("class", "name").populate("lecturer", "name email").sort({ date: -1 }).limit(50);
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
		const records = await attendance_default$1.find({ lecturer: userId }).populate("course", "name code courseID subjects.subjectID").populate("class", "name").populate("student", "name idNumber email").populate("lecturer", "name email").populate("approvedBy", "name email").sort({ date: -1 }).limit(50);
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
		const records = await attendance_default$1.find({ student: studentId }).populate("course", "name code courseID subjects.subjectID").populate("class", "name").populate("lecturer", "name email").sort({ date: -1 }).limit(50);
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
		const classId = (await import("./user-DrPfSF2Y.js").then((m) => m.default.findById(userId).select("studentClasses name")))?.studentClasses;
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
		const ClassModel = (await import("./classes-CkN9HvI9.js")).default;
		const Timetable = (await import("./timetable-vpFVHPBl.js")).default;
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
		const records = await attendance_default$1.find(filter).populate("course", "name code courseID subjects.subjectID").populate("class", "name").populate("lecturer", "name email").sort({ date: -1 }).skip((+page - 1) * +limit).limit(+limit);
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
		const { classId, courseId, date } = req.query;
		if (!classId || !courseId || !date) {
			res.status(400).json({ message: "classId, courseId, and date are required." });
			return;
		}
		const dateObj = new Date(date);
		dateObj.setHours(0, 0, 0, 0);
		const nextDay = new Date(dateObj);
		nextDay.setDate(nextDay.getDate() + 1);
		const records = await attendance_default$1.find({
			class: classId,
			course: courseId,
			date: {
				$gte: dateObj,
				$lt: nextDay
			}
		}).populate("student", "name email idNumber").populate("course", "name code subjects.subjectID").populate("class", "name").populate("lecturer", "name email").sort({ "student.name": 1 });
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
		const { courseId, classId, academicYearId, date } = req.body;
		if (!courseId || !classId || !academicYearId || !date) {
			res.status(400).json({ message: "courseId, classId, academicYearId, and date are required." });
			return;
		}
		const userId = req.user._id?.toString();
		await inngest.send({
			name: "attendance/generate",
			data: {
				courseId,
				classId,
				academicYearId,
				date,
				userId
			}
		});
		res.status(202).json({
			message: "Attendance generation started.",
			status: "processing"
		});
	} catch (error) {
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
		const timetable = await (await import("./timetable-vpFVHPBl.js")).default.findOne({
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
		const records = await attendance_default$1.find(filter).populate("course", "name code courseID subjects.subjectID").populate("class", "name").populate("student", "name idNumber email").populate("lecturer", "name email").populate("approvedBy", "name email").sort({ date: -1 }).limit(100);
		res.json({ records });
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
		const ClassModel = (await import("./classes-CkN9HvI9.js")).default;
		const Timetable = (await import("./timetable-vpFVHPBl.js")).default;
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
var router$3 = Router();
router$3.get("/", protect, async (req, res) => {
	try {
		const user = req.user;
		if (!user) return res.status(401).json({ error: "Unauthorized" });
		const page = Math.max(1, parseInt(String(req.query.page)) || 1);
		const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit)) || 20));
		const skip = (page - 1) * limit;
		const [notifications, total] = await Promise.all([Notification.find({ userId: user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), Notification.countDocuments({ userId: user._id })]);
		res.json({
			notifications,
			total,
			page,
			pages: Math.ceil(total / limit)
		});
	} catch (err) {
		console.error("GET /notifications error:", err);
		res.status(500).json({ error: "Failed to fetch notifications" });
	}
});
router$3.get("/unread-count", protect, async (req, res) => {
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
router$3.get("/system", protect, async (req, res) => {
	try {
		const user = req.user;
		if (!user) return res.status(401).json({ error: "Unauthorized" });
		const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit)) || 100));
		const notifications = await Notification.find({}).sort({ createdAt: -1 }).limit(limit).lean();
		const seen = /* @__PURE__ */ new Map();
		for (const n of notifications) {
			const key = `${n.type}:${new Date(n.createdAt).toISOString()}`;
			if (!seen.has(key)) seen.set(key, n);
		}
		const deduped = Array.from(seen.values()).map((n) => ({
			...n,
			unreadForUser: String(n.userId) === String(user._id) && n.isRead === false
		}));
		res.json({ notifications: deduped });
	} catch (err) {
		console.error("GET /notifications/system error:", err);
		res.status(500).json({ error: "Failed to fetch system notifications" });
	}
});
router$3.patch("/:id/read", protect, async (req, res) => {
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
router$3.patch("/read-all", protect, async (req, res) => {
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
router$3.delete("/:id", protect, async (req, res) => {
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
router$3.get("/stream", protect, async (req, res) => {
	try {
		addSSEClient(req, res);
	} catch (err) {
		console.error("Failed to add SSE client", err);
		try {
			res.status(500).end();
		} catch {}
	}
});
var notification_default = router$3;
var for500LevelPostings_default = express.Router();
var GroupRefSchema = new Schema({
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
var PostingSchema = new Schema({
	name: {
		type: String,
		required: true
	},
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
var RotationPlanSchema = new Schema({
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
var rotationPlan_default = mongoose.model("RotationPlan", RotationPlanSchema);
const createRotationSchedule = async (req, res) => {
	try {
		const payload = req.body || {};
		payload.createdBy = req.user?._id;
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
var router$2 = express.Router();
router$2.post("/", protect, authorize(["admin", "teacher"]), createRotationSchedule);
router$2.get("/", protect, listRotationSchedules);
router$2.get("/student-assignments", protect, getStudentAssignments);
router$2.get("/:id", protect, getRotationScheduleById);
router$2.delete("/:id", protect, authorize(["admin", "teacher"]), deleteRotationSchedule);
var rotationSchedules_default = router$2;
var logbookEntry_default = express.Router();
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
		const total = await hospitalUnit_default.countDocuments(filter);
		const units = await hospitalUnit_default.find(filter).populate("supervisors", "name designation").sort({
			department: 1,
			name: 1
		}).limit(limit).skip(skip);
		return res.status(200).json({
			units,
			total,
			page: Math.floor(skip / limit) + 1,
			pages: Math.ceil(total / limit)
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
var router$1 = Router();
router$1.post("/units", protect, authorize(["admin"]), createHospitalUnit);
router$1.get("/units", protect, listHospitalUnits);
router$1.get("/units/:unitId", protect, getHospitalUnit);
router$1.patch("/units/:unitId", protect, authorize(["admin"]), updateHospitalUnit);
router$1.post("/staff", protect, authorize(["admin"]), createHospitalStaff);
router$1.get("/staff", protect, listHospitalStaff);
router$1.get("/staff/:staffId", protect, getHospitalStaff);
router$1.patch("/staff/:staffId", protect, authorize(["admin"]), updateHospitalStaff);
router$1.post("/staff/bulk-import", protect, authorize(["admin"]), bulkImportStaff);
var hospitalData_default = router$1;
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
		ref: "HospitalUnit",
		required: true
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
			if (!await mongoose.connection.collection("clinical_rotations").findOne({ _id: new mongoose.Types.ObjectId(payload.rotation) })) return {
				success: false,
				error: "Clinical rotation not found."
			};
			if (!await hospitalUnit_default.findById(payload.unit)) return {
				success: false,
				error: "Hospital unit not found."
			};
			return {
				success: true,
				entryId: (await activityEntry_default$1.create({
					student: payload.student,
					rotation: payload.rotation,
					unit: payload.unit,
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
			if (!staff.assignedUnits.some((unitId) => unitId.toString() === entry.unit.toString())) return {
				success: false,
				error: "This staff member is not assigned to the unit where this activity occurred."
			};
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
			return {
				success: true,
				entries: await activityEntry_default$1.find({
					student: studentId,
					rotation: rotationId,
					approvalStatus: "approved"
				}).populate("unit", "name department umbrellaCategory").populate("approvedBy", "name designation").sort({ entryDate: 1 })
			};
		} catch (error) {
			console.error("Error fetching logbook:", error);
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
var router = Router();
router.post("/", protect, createActivityEntry);
router.get("/", protect, authorize(["admin", "teacher"]), listActivityEntries);
router.get("/pending", protect, authorize(["unitconsultant", "unitresident"]), getPendingEntries);
router.get("/:entryId", protect, getActivityEntry);
router.get("/logbook/:studentId/:rotationId", protect, getStudentLogbook);
router.post("/:entryId/approve", protect, authorize(["unitconsultant", "unitresident"]), approveActivityEntry);
router.post("/:entryId/reject", protect, authorize(["unitconsultant", "unitresident"]), rejectActivityEntry);
var activityEntry_default = router;
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
const getSetupStatus = async (_req, res) => {
	try {
		const start = Date.now();
		console.info("Request /api/setup/status: received");
		const institution = await institution_default.findOne().populate("brandingSettings", "primaryColor accentColor").lean();
		const duration = Date.now() - start;
		console.info(`Request /api/setup/status: db query completed in ${duration}ms`);
		res.status(200).json({
			configured: Boolean(institution),
			institution: institution ? {
				name: institution.name,
				shortName: institution.shortName,
				type: institution.type,
				country: institution.country,
				state: institution.state,
				city: institution.city,
				academicCalendarType: institution.academicCalendarType,
				timezone: institution.timezone,
				logoUrl: institution.logoUrl || "",
				backgroundImageUrl: institution.backgroundImageUrl || "",
				brandingSettings: {
					primaryColor: institution.brandingSettings?.primaryColor || "#2563eb",
					accentColor: institution.brandingSettings?.accentColor || "#4f46e5"
				}
			} : null
		});
	} catch (error) {
		console.error("Setup status error:", error.message);
		res.status(500).json({
			status: "Error",
			message: "Unable to determine setup status."
		});
	}
};
const createInitialSetup = async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		if (await institution_default.findOne().session(session)) {
			await session.abortTransaction();
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
			administratorUser: adminUserDoc._id
		}], {
			session,
			ordered: true
		});
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
				students: createdStudents
			}
		});
	} catch (error) {
		console.error("Initial setup failed:", error.message);
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
	"parent"
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
var isAdminRole = (role) => String(role ?? "").trim().toLowerCase() === "admin";
var isInsightRole = (role) => permittedInsightRoles.has(String(role ?? "").trim().toLowerCase());
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
const mordredsWords = async (req, res) => {
	try {
		const { message: message$1, studentContext: studentContext$1 } = req.body;
		const userRole$1 = String(req.user?.role ?? "").trim().toLowerCase();
		const canExecuteSystemActions = isAdminRole(userRole$1);
		const apiKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "").trim();
		if (!apiKey) {
			console.warn("⚠️ MORDRED Configuration Warning: AI credentials are missing. Using fallback response.");
			return res.status(200).json(buildMordredFallbackResponse("missing credentials", message$1, studentContext$1, userRole$1));
		}
		try {
			const { object: mordredDecision } = await generateObject({
				model: createGoogleGenerativeAI({ apiKey })(process.env.MORDRED_MODEL || "gemini-2.0-flash"),
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
mordredAIRouter.get("/insights", protect, authorize([
	"admin",
	"teacher",
	"unitconsultant",
	"unitresident",
	"parent"
]), dynamicAIInsights);
var mordred_default = mordredAIRouter;
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
	console$1.log(`   MEDLOG_MONGO_URL: ${process.env.MEDLOG_MONGO_URL ? "✅ SET" : "❌ NOT SET"}`);
	console$1.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? "✅ SET" : "❌ NOT SET"}`);
	console$1.log(`   CLIENT_URL: ${process.env.CLIENT_URL || "not set"}\n`);
} catch (err) {}
var { json, urlencoded } = createBodyParsers();
app.use(helmet());
app.use(json);
app.use(urlencoded);
app.use(cookieParser());
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));
var allowedOrigins = [
	normalizeOrigin(process.env.CLIENT_URL),
	normalizeOrigin(process.env.LOCAL_CLIENT_URL),
	normalizeOrigin(process.env.VERCEL_URL),
	"http://localhost:5173",
	"https://localhost:5173",
	"http://127.0.0.1:5173",
	"https://127.0.0.1:5173"
].filter((origin) => origin !== null && origin !== "");
app.use(cors({
	origin: allowedOrigins,
	credentials: true
}));
app.get("/", (req, res) => {
	res.status(200).json({
		status: "ok",
		message: "Server is healthy!"
	});
});
app.use(async (req, res, next) => {
	if (req.path === "/" || req.path === "/_routes") {
		next();
		return;
	}
	console$1.log(`[DB] Ensuring connection for ${req.method} ${req.path}`);
	try {
		await ensureDatabaseConnection();
		console$1.log(`[DB] Connection ready, proceeding to route handler`);
		next();
	} catch (error) {
		console$1.error(`[DB] Connection failed for ${req.path}:`, error.message);
		res.status(503).json({
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
	app.use(`${prefix}/notifications`, notification_default);
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
	app.listen(PORT, () => {
		console$1.log(`Server is running on http://localhost:${PORT}`);
	});
}).catch((error) => {
	console$1.error("Failed to connect to the database:", error);
});
else connectDB().catch((error) => {
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
export { init_classes as a, UserAcademicStatus as c, UserRole as d, api_default as default, init_user as f, handler, classes_default$1 as i, UserDepartmentRole as l, init_timetable as n, Notification as o, user_default$1 as p, timetable_default$1 as r, init_notification as s, academicYear_default$1 as t, UserIDs as u };
