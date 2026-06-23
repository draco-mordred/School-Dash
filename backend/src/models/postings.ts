const UserDepartments = {
    OandG: {
        id: "og",
        name: "Obstetrics & Gynaecology",
        rotationDurationWeeks: 4,

        units: {        
            active: [
                "Antenatal Clinic",
                "Labour Ward",
                "Postnatal Ward",
                "Gynaecology Ward",
                "Emergency O&G",
                "Family Planning",
                "Fertility / Endocrine Unit",
                "Reproductive Medicine Unit",
                "Gynaecologic Oncology Unit"
            ],

            reserve: [
                "Family Medicine / Reproductive Health Unit"
            ],
        }
    },
    Pediatrics: {
        id: "peds",
        name: "Pediatrics",
        rotationDurationWeeks: 2,

        units: {
            active: [
                "Neonatology / SCBU",
                "Paediatric Nephrology",
                "Paediatric Infectious Diseases",
                "Emergency Paediatrics",
                "Nutrition Unit",
                "Paediatric Neurology",
                "Paediatric Cardiology",
                "Paediatric Endocrinology",
                "Paediatric Hemato-Oncology"
            ],
            reserve: [
                "General Paediatrics"
        
            ]
        }
    },
    Medicine: {
        id: "med",
        name: "Medicine",
        rotationDurationWeeks: 2,

        units: {
            active: [
              "General Medicine",
              "Cardiology",
              "Endocrinology",
              "Hematooncology",
              "Neurology",
              "Nephrology",
              "Pulmonology",
              "Rheumatology",
              "Gastroenterology",
              "Infectious Disease",
              "Nephrology",
            ],
            reserve: [
             
            ]
    }
}

export enum UserDepartmentNames {
    /*
    Medicine       → 9 Units
    Surgery        → 9 Units
    O&G            → 8 Units
    Paediatrics    → 8 Units
    Psychiatry     → 6 Units
    ENT            → 6 Units
    Anaesthesia    → 6 Units
    Radiology      → 6 Units
    Ophthalmology  → 7 Units
    Dermatology    → 5 Units
    */
    medicine = "Medicine",
    surgery = "Surgery",
    og = "O&G",
    paediatrics = "Paediatrics",
    psychiatry = "Psychiatry",
    ent = "ENT",
    anaesthesia = "Anaesthesia",
    radiology = "Radiology",
    ophthalmology = "Ophthalmology",
    dermatology = "Dermatology",
    hematology = "Hematology",
    histopathology = "Histopathology",
    microbiology = "Microbiology",
    chemicalPathology = "Chemical Pathology"
}

export const ClinicalDepartments: Record<UserDepartmentNames, { unit: string[], reserve: string[] }> = {
    Medicine: {
        unit: [
            "General Medicine",
            "Cardiology",
            "Endocrinology",
            "Hematooncology",
            "Neurology",
            "Nephrology",
            "Pulmonology",
            "Rheumatology",
            "Gastroenterology",
            "Infectious Disease",
            "Nephrology",
        ],
        reserve: 
            ["General Medicine", "Cardiology", "Endocrinology", "Hematooncology", "Neurology", "Nephrology", "Pulmonology", "Rheumatology", "Gastroenterology", "Infectious Disease", "Nephrology"]
    },
    Surgery: {
        unit: [
            "General Surgery",
            "Neurosurgery",
            "Cardiothoracic Surgery",
            "Plastic and Reconstructive Surgery",
            "Orthopedic and Trauma Surgery",
            "Urology",
            "Pediatric Surgery",
        ]
    }
} as const