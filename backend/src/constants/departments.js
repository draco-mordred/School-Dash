// Department constants - mirrors the UserDepartmentName pattern
// Use these when creating, filtering, or referencing departments across the application
export var DepartmentName;
(function (DepartmentName) {
    DepartmentName["medicine"] = "Medicine";
    DepartmentName["pediatrics"] = "Pediatrics";
    DepartmentName["obstetricsAndGynecology"] = "Obstetrics and Gynecology";
    DepartmentName["surgery"] = "Surgery";
    DepartmentName["psychiatry"] = "Psychiatry";
    DepartmentName["earNoseAndThroat"] = "ENT" || "Otolaryngology" || "Otorhinolaryngology";
    DepartmentName["anaesthesiology"] = "Anaesthesiology";
    DepartmentName["radiology"] = "Radiology";
    DepartmentName["ophthalmology"] = "Ophthalmology";
    DepartmentName["dermatology"] = "Dermatology";
    DepartmentName["communityMedicine"] = "Community Medicine";
    DepartmentName["hematologyAndBloodTransfusion"] = "Hematology and Blood Transfusion";
    DepartmentName["anatomicPathology"] = "Anatomic Pathology";
    DepartmentName["microbiology"] = "Microbiology";
    DepartmentName["chemicalPathology"] = "Chemical Pathology";
    DepartmentName["clinicalParmacologyAndTherapeutics"] = "Clinical Pharmacology and Therapeutics";
    DepartmentName["familyMedicine"] = "Family Medicine";
    DepartmentName["orthopaedics"] = "Orthopaedics";
    DepartmentName["forensicMedicine"] = "Forensic Medicine";
})(DepartmentName || (DepartmentName = {}));
//must be three letter codes for each department, used in course codes and other identifiers
export var DepartmentCode;
(function (DepartmentCode) {
    DepartmentCode["medicine"] = "MED";
    DepartmentCode["pediatrics"] = "PAE";
    DepartmentCode["obstetricsAndGynecology"] = "OBG";
    DepartmentCode["surgery"] = "SUR";
    DepartmentCode["psychiatry"] = "PSY";
    DepartmentCode["earNoseAndThroat"] = "ORL";
    DepartmentCode["anaesthesiology"] = "ANE";
    DepartmentCode["radiology"] = "RAD";
    DepartmentCode["ophthalmology"] = "OPH";
    DepartmentCode["dermatology"] = "DER";
    DepartmentCode["communityMedicine"] = "COM";
    DepartmentCode["hematologyAndBloodTransfusion"] = "HEM";
    DepartmentCode["microbiology"] = "MIC";
    DepartmentCode["chemicalPathology"] = "CHP";
    DepartmentCode["clinicalParmacologyAndTherapeutics"] = "PHA";
    DepartmentCode["anatomicPathology"] = "PAT";
    DepartmentCode["familyMedicine"] = "FAM";
    DepartmentCode["orthopaedics"] = "ORT";
    DepartmentCode["forensicMedicine"] = "FOR";
})(DepartmentCode || (DepartmentCode = {}));
// Metadata for each department with name, code, and departmentID
export const DEPARTMENTS_METADATA = {
    [DepartmentName.medicine]: {
        name: "Department of Medicine",
        code: DepartmentCode.medicine,
        departmentID: `${DepartmentCode.medicine}MBBS001`,
    },
    [DepartmentName.pediatrics]: {
        name: "Department of Pediatrics",
        code: DepartmentCode.pediatrics,
        departmentID: `${DepartmentCode.pediatrics}MBBS001`,
    },
    [DepartmentName.obstetricsAndGynecology]: {
        name: "Department of Obstetrics and Gynecology",
        code: DepartmentCode.obstetricsAndGynecology,
        departmentID: `${DepartmentCode.obstetricsAndGynecology}MBBS001`,
    },
    [DepartmentName.surgery]: {
        name: "Department of Surgery",
        code: DepartmentCode.surgery,
        departmentID: `${DepartmentCode.surgery}MBBS001`,
    },
    [DepartmentName.psychiatry]: {
        name: "Department of Psychiatry",
        code: DepartmentCode.psychiatry,
        departmentID: `${DepartmentCode.psychiatry}MBBS001`,
    },
    [DepartmentName.earNoseAndThroat]: {
        name: "Department of ENT",
        code: DepartmentCode.earNoseAndThroat,
        departmentID: `${DepartmentCode.earNoseAndThroat}MBBS001`,
    },
    [DepartmentName.anaesthesiology]: {
        name: "Department of Anaesthesiology",
        code: DepartmentCode.anaesthesiology,
        departmentID: `${DepartmentCode.anaesthesiology}MBBS001`,
    },
    [DepartmentName.radiology]: {
        name: "Department of Radiology",
        code: DepartmentCode.radiology,
        departmentID: `${DepartmentCode.radiology}MBBS001`,
    },
    [DepartmentName.ophthalmology]: {
        name: "Department of Ophthalmology",
        code: DepartmentCode.ophthalmology,
        departmentID: `${DepartmentCode.ophthalmology}MBBS001`,
    },
    [DepartmentName.dermatology]: {
        name: "Department of Dermatology",
        code: DepartmentCode.dermatology,
        departmentID: `${DepartmentCode.dermatology}MBBS001`,
    },
    [DepartmentName.communityMedicine]: {
        name: "Department of Community Medicine",
        code: DepartmentCode.communityMedicine,
        departmentID: `${DepartmentCode.communityMedicine}MBBS001`,
    },
    [DepartmentName.hematologyAndBloodTransfusion]: {
        name: "Department of Hematology and Blood Transfusion",
        code: DepartmentCode.hematologyAndBloodTransfusion,
        departmentID: `${DepartmentCode.hematologyAndBloodTransfusion}MBBS001`,
    },
    [DepartmentName.microbiology]: {
        name: "Department of Microbiology",
        code: DepartmentCode.microbiology,
        departmentID: `${DepartmentCode.microbiology}MBBS001`,
    },
    [DepartmentName.chemicalPathology]: {
        name: "Department of Chemical Pathology",
        code: DepartmentCode.chemicalPathology,
        departmentID: `${DepartmentCode.chemicalPathology}MBBS001`,
    },
    [DepartmentName.clinicalParmacologyAndTherapeutics]: {
        name: "Department of Clinical Pharmacology and Therapeutics",
        code: DepartmentCode.clinicalParmacologyAndTherapeutics,
        departmentID: `${DepartmentCode.clinicalParmacologyAndTherapeutics}MBBS001`,
    },
    [DepartmentName.anatomicPathology]: {
        name: "Department of Anatomic Pathology",
        code: DepartmentCode.anatomicPathology,
        departmentID: `${DepartmentCode.anatomicPathology}MBBS001`,
    },
    [DepartmentName.familyMedicine]: {
        name: "Department of Family Medicine",
        code: DepartmentCode.familyMedicine,
        departmentID: `${DepartmentCode.familyMedicine}MBBS001`,
    },
    [DepartmentName.orthopaedics]: {
        name: "Department of Orthopaedics",
        code: DepartmentCode.orthopaedics,
        departmentID: `${DepartmentCode.orthopaedics}MBBS001`,
    },
    [DepartmentName.forensicMedicine]: {
        name: "Department of Forensic Medicine",
        code: DepartmentCode.forensicMedicine,
        departmentID: `${DepartmentCode.forensicMedicine}MBBS001`,
    },
};
export const DEPARTMENT_UNITS = {
    [DepartmentName.obstetricsAndGynecology]: {
        id: DEPARTMENTS_METADATA[DepartmentName.obstetricsAndGynecology].code,
        name: DEPARTMENTS_METADATA[DepartmentName.obstetricsAndGynecology].name,
        postingType: "OG_PEDS",
        rotationDurationWeeks: 4,
        currentUnit: [],
        units: {
            active: [
                { id: "OBG01", name: "Antenatal Clinic" },
                { id: "OBG02", name: "Labour Ward" },
                { id: "OBG03", name: "Postnatal Ward" },
                { id: "OBG04", name: "Gynaecology Ward" },
                { id: "OBG05", name: "Emergency O&G" },
                { id: "OBG06", name: "Family Planning" },
                { id: "OBG07", name: "Fertility / Endocrine Unit" },
                { id: "OBG08", name: "Reproductive Medicine Unit" },
                { id: "OBG09", name: "Gynaecologic Oncology Unit" },
            ],
            reserve: [{ id: "OBGR01", name: "Family Medicine / Reproductive Health Unit" }],
            history: [],
        },
    },
    [DepartmentName.pediatrics]: {
        id: DEPARTMENTS_METADATA[DepartmentName.pediatrics].code,
        name: DEPARTMENTS_METADATA[DepartmentName.pediatrics].name,
        postingType: "OG_PEDS",
        rotationDurationWeeks: 2,
        currentUnit: [],
        units: {
            active: [
                { id: "PAE01", name: "Neonatology / SCBU" },
                { id: "PAE02", name: "Paediatric Nephrology" },
                { id: "PAE03", name: "Paediatric Infectious Diseases" },
                { id: "PAE04", name: "Emergency Paediatrics" },
                { id: "PAE05", name: "Nutrition Unit" },
                { id: "PAE06", name: "Paediatric Neurology" },
                { id: "PAE07", name: "Paediatric Cardiology" },
                { id: "PAE08", name: "Paediatric Endocrinology" },
                { id: "PAE09", name: "Paediatric Hemato-Oncology" },
            ],
            reserve: [
                {
                    id: "PAER01", name: "General Paediatrics"
                }
            ],
            history: [],
        },
    },
    [DepartmentName.medicine]: {
        id: DEPARTMENTS_METADATA[DepartmentName.medicine].code,
        name: DEPARTMENTS_METADATA[DepartmentName.medicine].name,
        postingType: "MED_SURG",
        rotationDurationWeeks: 2,
        currentUnit: [],
        units: {
            active: [
                { id: "MED01", name: "Cardiology" },
                { id: "MED02", name: "Gastroenterology / Hepatology" },
                { id: "MED03", name: "Nephrology" },
                { id: "MED04", name: "Pulmonology" },
                { id: "MED05", name: "Infectious Diseases" },
                { id: "MED06", name: "Endocrinology" },
                { id: "MED07", name: "Neurology" },
                { id: "MED08", name: "Rheumatology" },
                { id: "MED09", name: "General Internal Medicine" },
            ],
            reserve: [
                { id: "MEDR01", name: "Geriatric Medicine" },
                { id: "MEDR02", name: "Clinical Pharmacology" },
            ],
            history: [],
        },
    },
    [DepartmentName.surgery]: {
        id: DEPARTMENTS_METADATA[DepartmentName.surgery].code,
        name: DEPARTMENTS_METADATA[DepartmentName.surgery].name,
        postingType: "MED_SURG",
        rotationDurationWeeks: 2,
        currentUnit: [],
        units: {
            active: [
                { id: "SUR01", name: "General Surgery" },
                { id: "SUR02", name: "Urology" },
                { id: "SUR03", name: "Paediatric Surgery" },
                { id: "SUR04", name: "Cardiothoracic Surgery" },
                { id: "SUR05", name: "Orthopaedic Surgery" },
                { id: "SUR06", name: "Trauma Surgery" },
                { id: "SUR07", name: "Neurosurgery" },
                { id: "SUR08", name: "Surgical Oncology" },
                { id: "SUR09", name: "Plastic & Reconstructive Surgery" },
            ],
            reserve: [
                { id: "SURR01", name: "Burns Unit" },
                { id: "SURR02", name: "Vascular Surgery" },
            ],
            history: [],
        },
    },
    [DepartmentName.psychiatry]: {
        id: DEPARTMENTS_METADATA[DepartmentName.psychiatry].code,
        name: DEPARTMENTS_METADATA[DepartmentName.psychiatry].name,
        postingType: "SPECIALTY",
        rotationDurationWeeks: 2,
        currentUnit: [],
        units: {
            active: [
                { id: "PSY01", name: "Adult Psychiatry" },
                { id: "PSY02", name: "Child & Adolescent Psychiatry" },
                { id: "PSY03", name: "Community Psychiatry" },
                { id: "PSY04", name: "Consultation-Liaison Psychiatry" },
                { id: "PSY05", name: "Addiction Psychiatry" },
                { id: "PSY06", name: "Emergency Psychiatry" },
            ],
            reserve: [{ id: "PSYR01", name: "Forensic Psychiatry" }],
            history: [],
        },
    },
    [DepartmentName.earNoseAndThroat]: {
        id: DEPARTMENTS_METADATA[DepartmentName.earNoseAndThroat].code,
        name: DEPARTMENTS_METADATA[DepartmentName.earNoseAndThroat].name,
        postingType: "SPECIALTY",
        rotationDurationWeeks: 2,
        currentUnit: [],
        units: {
            active: [
                { id: "ORL01", name: "Otology" },
                { id: "ORL02", name: "Rhinology" },
                { id: "ORL03", name: "Laryngology" },
                { id: "ORL04", name: "Head & Neck Surgery" },
                { id: "ORL05", name: "Audiology" },
                { id: "ORL06", name: "Cochlear Implant Unit" },
            ],
            reserve: [{ id: "ORLR01", name: "Maxillofacial Interface Unit" }],
            history: [],
        },
    },
    [DepartmentName.anaesthesiology]: {
        id: DEPARTMENTS_METADATA[DepartmentName.anaesthesiology].code,
        name: DEPARTMENTS_METADATA[DepartmentName.anaesthesiology].name,
        postingType: "SPECIALTY",
        rotationDurationWeeks: 2,
        currentUnit: [],
        units: {
            active: [
                { id: "ANE01", name: "General Anaesthesia" },
                { id: "ANE02", name: "Obstetric Anaesthesia" },
                { id: "ANE03", name: "Paediatric Anaesthesia" },
                { id: "ANE04", name: "ICU / Critical Care" },
                { id: "ANE05", name: "Pain Management" },
                { id: "ANE06", name: "Resuscitation Unit" },
            ],
            reserve: [
                { id: "ANER01", name: "Neuroanaesthesia" },
                { id: "ANER02", name: "Cardiothoracic Anaesthesia" },
            ],
            history: [],
        },
    },
    [DepartmentName.radiology]: {
        id: DEPARTMENTS_METADATA[DepartmentName.radiology].code,
        name: DEPARTMENTS_METADATA[DepartmentName.radiology].name,
        postingType: "SPECIALTY",
        rotationDurationWeeks: 2,
        currentUnit: [],
        units: {
            active: [
                { id: "RAD01", name: "Conventional Radiography" },
                { id: "RAD02", name: "Ultrasound" },
                { id: "RAD03", name: "CT Imaging" },
                { id: "RAD04", name: "MRI Imaging" },
                { id: "RAD05", name: "Fluoroscopy" },
                { id: "RAD06", name: "Interventional Radiology" },
            ],
            reserve: [{ id: "RADR01", name: "Nuclear Medicine" }],
            history: [],
        },
    },
    [DepartmentName.ophthalmology]: {
        id: DEPARTMENTS_METADATA[DepartmentName.ophthalmology].code,
        name: DEPARTMENTS_METADATA[DepartmentName.ophthalmology].name,
        postingType: "SPECIALTY",
        rotationDurationWeeks: 2,
        currentUnit: [],
        units: {
            active: [
                { id: "OPH01", name: "General Ophthalmology" },
                { id: "OPH02", name: "Cataract Unit" },
                { id: "OPH03", name: "Glaucoma Unit" },
                { id: "OPH04", name: "Retina / Vitreoretinal Unit" },
                { id: "OPH05", name: "Oculoplasty Unit" },
                { id: "OPH06", name: "Paediatric Ophthalmology" },
                { id: "OPH07", name: "Cornea Unit" },
            ],
            reserve: [{ id: "OPHR01", name: "Neuro-Ophthalmology" }],
            history: [],
        },
    },
    [DepartmentName.dermatology]: {
        id: DEPARTMENTS_METADATA[DepartmentName.dermatology].code,
        name: DEPARTMENTS_METADATA[DepartmentName.dermatology].name,
        postingType: "SPECIALTY",
        rotationDurationWeeks: 2,
        currentUnit: [],
        units: {
            active: [
                { id: "DER01", name: "General Dermatology" },
                { id: "DER02", name: "Venereology / STI Clinic" },
                { id: "DER03", name: "Paediatric Dermatology" },
                { id: "DER04", name: "Procedural Dermatology" },
                { id: "DER05", name: "Dermatopathology" },
            ],
            reserve: [{ id: "DERR01", name: "Cosmetic Dermatology" }],
            history: [],
        },
    },
};
// Array of all department names for easy iteration (use in dropdowns, forms)
export const DEPARTMENT_NAMES = Object.values(DepartmentName);
// Array of all department codes
export const DEPARTMENT_CODES = Object.values(DepartmentCode);
// Get department unit data by name
export const getDepartmentUnits = (name) => DEPARTMENT_UNITS[name] ?? null;
export const getDepartmentUnitsByCode = (code) => {
    const departmentName = DEPARTMENT_NAMES.find((name) => DEPARTMENTS_METADATA[name].code === code);
    return departmentName ? DEPARTMENT_UNITS[departmentName] ?? null : null;
};
export const DEPARTMENT_COURSES = {
    [DepartmentName.pediatrics]: [
        {
            title: "Paediatric Cardiology",
            units: 5,
            courseID: DepartmentCode.pediatrics,
            code: "PAE 501",
            departmentName: DEPARTMENTS_METADATA[DepartmentName.pediatrics].name,
            departmentCode: DepartmentCode.pediatrics,
            semester: "First",
        },
        {
            title: "Emergency Paediatrics",
            units: 4,
            courseID: DepartmentCode.pediatrics,
            code: "PAE 502",
            departmentName: DEPARTMENTS_METADATA[DepartmentName.pediatrics].name,
            departmentCode: DepartmentCode.pediatrics,
            semester: "Second",
        },
    ],
    [DepartmentName.obstetricsAndGynecology]: [
        {
            title: "Antenatal Care",
            units: 4,
            courseID: DepartmentCode.obstetricsAndGynecology,
            code: "OBG 501",
            departmentName: DEPARTMENTS_METADATA[DepartmentName.obstetricsAndGynecology].name,
            departmentCode: DepartmentCode.obstetricsAndGynecology,
            semester: "First",
        },
        {
            title: "Family Planning",
            units: 3,
            courseID: DepartmentCode.obstetricsAndGynecology,
            code: "OBG 502",
            departmentName: DEPARTMENTS_METADATA[DepartmentName.obstetricsAndGynecology].name,
            departmentCode: DepartmentCode.obstetricsAndGynecology,
            semester: "Second",
        },
    ],
    [DepartmentName.medicine]: [
        {
            title: "Internal Medicine I",
            units: 5,
            courseID: DepartmentCode.medicine,
            code: "MED 501",
            departmentName: DEPARTMENTS_METADATA[DepartmentName.medicine].name,
            departmentCode: DepartmentCode.medicine,
            semester: "First",
        },
    ],
};
export const getDepartmentCourses = (name) => DEPARTMENT_COURSES[name] ?? [];
export const getDepartmentCoursesByCode = (code) => {
    const departmentName = DEPARTMENT_NAMES.find((name) => DEPARTMENTS_METADATA[name].code === code);
    return departmentName ? DEPARTMENT_COURSES[departmentName] ?? [] : [];
};
export const getAllDepartmentCourses = () => Object.values(DEPARTMENT_COURSES).flat();
// Get all department unit definitions
export const getAllDepartmentUnits = () => Object.values(DEPARTMENT_UNITS);
// Get department metadata by name
export const getDepartmentMetadata = (name) => DEPARTMENTS_METADATA[name];
// Get all departments as array of objects (for seeding, forms, etc.)
export const getAllDepartments = () => DEPARTMENT_NAMES.map((name) => ({
    ...DEPARTMENTS_METADATA[name],
}));
