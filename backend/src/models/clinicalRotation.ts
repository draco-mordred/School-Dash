import mongoose, { Schema, Document } from "mongoose";

const RotationActivitiesSchema = new Schema(
  {
    numberOfWeeks: { type: Number, default: 0 },
    numberOfConsultantWardRound: { type: Number, default: 0 },
    numberOfClinics: { type: Number, default: 0 },
    numberOfResidentWardRound: { type: Number, default: 0 },
    numberOfCallDuty: { type: Number, default: 0 },
    numberOfTheatreDays: { type: Number, default: 0 },
  },
  { _id: false }
);

const PatientClerkedSchema = new Schema(
  {
    patientName: { type: String },
    diagnosis: { type: String },
    clerkedAt: { type: Date, default: () => new Date() },
    notes: { type: String },
  },
  { _id: false }
);

export const procredureAction = {
  performed: "performed",
  assisted: "assisted",
  watched: "watched"
} as const;

const ProceduresWatchedAssistedOrPerformedSchema = new Schema(
  {
    procedureName: { type: String, required: true, default: "" },
    action: {
      type: String,
      enum: Object.values(procredureAction),
      required: true,
      default: procredureAction.watched,
    },
    date: { type: Date, default: () => new Date(), required: true },
    notes: { type: String, default: "" },
  },
  { _id: false }
);
  

const PracticalsPerformedSchema = new Schema(
  {
    practicalName: { type: String, required: true, default: "" },
    coursseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    performedAt: { type: Date, default: () => new Date(), required: true },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const UnitActivitiesSchema = new Schema(
  {
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", required: true },
    activities: { type: RotationActivitiesSchema, default: () => ({}) },
    patientsClerked: { type: [PatientClerkedSchema], default: [] },
    proceduresWatchedAssistedOrPerformed: { type: [ProceduresWatchedAssistedOrPerformedSchema], default: [] },
  },
  { _id: false }
);


export const ClinicalPostingType = {
  acedemic: "academic",
  clinical: "clinical",
} as const;

export const ClinicalPostingPhase = {
  OandGAndPediatricsPosting: "OG_PED",
  SpecialtyPosting: "SPECIALTY",
  ElectivePosting: "ELECTIVE",
  MedicineAndSurgeryPosting: "MED_SUR",
} as const;

export const CurrentPosting = {
  OBG: "O&G",
  PED: "Pediatrics",
  PSY: "Psychiatry",
  ENT: "ENT",
  RAD: "Radiology",
  OPH: "Ophthalmology",
  ANE: "Anesthesiology",
  DER: "Dermatology",
  MED: "Medicine",
  SUR: "Surgery",
  COM: "Community Medicine"
}

export type currentPostings = "O&G" | "Pediatrics" | "Psychiatry" | "ENT" | "Radiology" | "Ophthalmology" | "Anesthesiology" | "Dermatology" | "Medicine" | "Surgery" | "Community Medicine";

export type clinicalPostingPhase = "OG_PED" | "SPECIALTY" | "ELECTIVE" | "MED_SUR";

export type clinicalPostingType = "academic" | "clinical";

export interface IClinicalRotations extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  department: mongoose.Types.ObjectId;
  supervisor?: mongoose.Types.ObjectId;
  currentPosting: currentPostings;
  postingType: clinicalPostingType;
  postingPhase: clinicalPostingPhase;
  isActive: boolean;
  practicalActivities?: typeof PracticalsPerformedSchema[];// for Block postings, this will be an array of practicals performed during the posting
  unitActivities?: typeof UnitActivitiesSchema[]; //
  class: mongoose.Types.ObjectId;
  unit: mongoose.Types.ObjectId;
  totalPoints: Number;
  startDate: Date;
  endDate: Date;
}

const ClinicalRotationsSchema = new Schema<IClinicalRotations>({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
  supervisor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  currentPosting: { type: String, required: true },
  postingType: { type: String, required: true },
  postingPhase: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  practicalActivities: { type: [PracticalsPerformedSchema], default: [] },
  unitActivities: { type: [UnitActivitiesSchema], default: [] },
  class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  unit: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", required: true },
  totalPoints: { type: Number, default: 320 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true }
})

export default mongoose.model("ClinicalRotations", ClinicalRotationsSchema);


let sampleRotation = {
  "schedule": {
    "postingName": "O&G-Pediatrics Posting",
    "postingType": "OG_PEDS",
    "durationWeeks": 16,
    "startDate": "2026-01-05",
    "endDate": "2026-04-27",
    "phases": [
      "Phase 1",
      "Phase 2"
    ],
    "departments": [
      {
        "department": "Department of Obstetrics and Gynecology",
        "departmentCode": "OBG",
        "rotationDurationWeeks": 4,
        "activeUnits": [
          {
            "id": "OBG01",
            "name": "Antenatal Clinic"
          },
          {
            "id": "OBG02",
            "name": "Labour Ward"
          },
          {
            "id": "OBG03",
            "name": "Postnatal Ward"
          },
          {
            "id": "OBG04",
            "name": "Gynaecology Ward"
          },
          {
            "id": "OBG05",
            "name": "Emergency O&G"
          },
          {
            "id": "OBG06",
            "name": "Family Planning"
          },
          {
            "id": "OBG07",
            "name": "Fertility / Endocrine Unit"
          },
          {
            "id": "OBG08",
            "name": "Reproductive Medicine Unit"
          },
          {
            "id": "OBG09",
            "name": "Gynaecologic Oncology Unit"
          }
        ],
        "reserveUnits": [
          {
            "id": "OBGR01",
            "name": "Family Medicine / Reproductive Health Unit"
          }
        ],
        "supervisors": [
          {
            "unit": "Antenatal Clinic",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            }
          },
          {
            "unit": "Labour Ward",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            }
          },
          {
            "unit": "Postnatal Ward",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            }
          },
          {
            "unit": "Gynaecology Ward",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            }
          },
          {
            "unit": "Emergency O&G",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            }
          },
          {
            "unit": "Family Planning",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            }
          },
          {
            "unit": "Fertility / Endocrine Unit",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            }
          },
          {
            "unit": "Reproductive Medicine Unit",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            }
          },
          {
            "unit": "Gynaecologic Oncology Unit",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            }
          }
        ]
      },
      {
        "department": "Department of Pediatrics",
        "departmentCode": "PAE",
        "rotationDurationWeeks": 2,
        "activeUnits": [
          {
            "id": "PAE01",
            "name": "Neonatology / SCBU"
          },
          {
            "id": "PAE02",
            "name": "Paediatric Nephrology"
          },
          {
            "id": "PAE03",
            "name": "Paediatric Infectious Diseases"
          },
          {
            "id": "PAE04",
            "name": "Emergency Paediatrics"
          },
          {
            "id": "PAE05",
            "name": "Nutrition Unit"
          },
          {
            "id": "PAE06",
            "name": "Paediatric Neurology"
          },
          {
            "id": "PAE07",
            "name": "Paediatric Cardiology"
          },
          {
            "id": "PAE08",
            "name": "Paediatric Endocrinology"
          },
          {
            "id": "PAE09",
            "name": "Paediatric Hemato-Oncology"
          }
        ],
        "reserveUnits": [
          {
            "id": "PAER01",
            "name": "General Paediatrics"
          }
        ],
        "supervisors": [
          {
            "unit": "Neonatology / SCBU",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            }
          },
          {
            "unit": "Paediatric Nephrology",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            }
          },
          {
            "unit": "Paediatric Infectious Diseases",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            }
          },
          {
            "unit": "Emergency Paediatrics",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            }
          },
          {
            "unit": "Nutrition Unit",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            }
          },
          {
            "unit": "Paediatric Neurology",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            }
          },
          {
            "unit": "Paediatric Cardiology",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            }
          },
          {
            "unit": "Paediatric Endocrinology",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            }
          },
          {
            "unit": "Paediatric Hemato-Oncology",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            }
          }
        ]
      }
    ],
    "studentCategories": [
      {
        "category": "Group A",
        "studentCount": 5,
        "departmentPhase1": "OBG",
        "departmentPhase2": "Pediatrics",
        "students": [
          {
            "_id": "6a24622fc7a2b1a77a79d964",
            "name": "BELLO HARUNA DABO",
            "idNumber": "UJ/2016/MD/0034"
          },
          {
            "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
            "name": "Draco Mordred",
            "idNumber": "UJ/2018/CS/0123"
          },
          {
            "_id": "6a246251c7a2b1a77a79d98f",
            "name": "EMMANUEL ALERO SHALOM",
            "idNumber": "UJ/2018/CS/0090"
          },
          {
            "_id": "6a11cd6633e251c0f37eb095",
            "name": "Deborah Oladele",
            "idNumber": "UJ0000ST0007"
          },
          {
            "_id": "6a246254c7a2b1a77a79d994",
            "name": "SHEILA JACK OONYE",
            "idNumber": "UJ/2018/CS/0114"
          }
        ]
      },
      {
        "category": "Group B",
        "studentCount": 4,
        "departmentPhase1": "Pediatrics",
        "departmentPhase2": "OBG",
        "students": [
          {
            "_id": "6a246235c7a2b1a77a79d96c",
            "name": "YILYOK JOSEPH NAANGOE'AN",
            "idNumber": "UJ/2016/MD/0268"
          },
          {
            "_id": "6a246255c7a2b1a77a79d995",
            "name": "DALANG KIRKI",
            "idNumber": "UJ/2018/CS/0115"
          },
          {
            "_id": "6a24624ac7a2b1a77a79d987",
            "name": "DADEON PATIENCE",
            "idNumber": "UJ/2018/CS/0058"
          },
          {
            "_id": "6a11ce37d5f05867ff11aae4",
            "name": "Success Oladele",
            "idNumber": "UJ0000UN0002"
          }
        ]
      }
    ],
    "unitAssignments": [
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 1",
        "unit": "Antenatal Clinic",
        "unitId": "OBG01",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a24622fc7a2b1a77a79d964",
            "name": "BELLO HARUNA DABO",
            "idNumber": "UJ/2016/MD/0034"
          }
        ]
      },
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 1",
        "unit": "Labour Ward",
        "unitId": "OBG02",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a24622fc7a2b1a77a79d964",
            "name": "BELLO HARUNA DABO",
            "idNumber": "UJ/2016/MD/0034"
          },
          {
            "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
            "name": "Draco Mordred",
            "idNumber": "UJ/2018/CS/0123"
          }
        ]
      },
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 1",
        "unit": "Postnatal Ward",
        "unitId": "OBG03",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
            "name": "Draco Mordred",
            "idNumber": "UJ/2018/CS/0123"
          },
          {
            "_id": "6a246251c7a2b1a77a79d98f",
            "name": "EMMANUEL ALERO SHALOM",
            "idNumber": "UJ/2018/CS/0090"
          }
        ]
      },
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 1",
        "unit": "Gynaecology Ward",
        "unitId": "OBG04",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246251c7a2b1a77a79d98f",
            "name": "EMMANUEL ALERO SHALOM",
            "idNumber": "UJ/2018/CS/0090"
          },
          {
            "_id": "6a11cd6633e251c0f37eb095",
            "name": "Deborah Oladele",
            "idNumber": "UJ0000ST0007"
          }
        ]
      },
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 1",
        "unit": "Emergency O&G",
        "unitId": "OBG05",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a11cd6633e251c0f37eb095",
            "name": "Deborah Oladele",
            "idNumber": "UJ0000ST0007"
          },
          {
            "_id": "6a246254c7a2b1a77a79d994",
            "name": "SHEILA JACK OONYE",
            "idNumber": "UJ/2018/CS/0114"
          }
        ]
      },
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 1",
        "unit": "Family Planning",
        "unitId": "OBG06",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246254c7a2b1a77a79d994",
            "name": "SHEILA JACK OONYE",
            "idNumber": "UJ/2018/CS/0114"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 1",
        "unit": "Neonatology / SCBU",
        "unitId": "PAE01",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246235c7a2b1a77a79d96c",
            "name": "YILYOK JOSEPH NAANGOE'AN",
            "idNumber": "UJ/2016/MD/0268"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 1",
        "unit": "Paediatric Nephrology",
        "unitId": "PAE02",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246235c7a2b1a77a79d96c",
            "name": "YILYOK JOSEPH NAANGOE'AN",
            "idNumber": "UJ/2016/MD/0268"
          },
          {
            "_id": "6a246255c7a2b1a77a79d995",
            "name": "DALANG KIRKI",
            "idNumber": "UJ/2018/CS/0115"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 1",
        "unit": "Paediatric Infectious Diseases",
        "unitId": "PAE03",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246235c7a2b1a77a79d96c",
            "name": "YILYOK JOSEPH NAANGOE'AN",
            "idNumber": "UJ/2016/MD/0268"
          },
          {
            "_id": "6a246255c7a2b1a77a79d995",
            "name": "DALANG KIRKI",
            "idNumber": "UJ/2018/CS/0115"
          },
          {
            "_id": "6a24624ac7a2b1a77a79d987",
            "name": "DADEON PATIENCE",
            "idNumber": "UJ/2018/CS/0058"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 1",
        "unit": "Emergency Paediatrics",
        "unitId": "PAE04",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246235c7a2b1a77a79d96c",
            "name": "YILYOK JOSEPH NAANGOE'AN",
            "idNumber": "UJ/2016/MD/0268"
          },
          {
            "_id": "6a246255c7a2b1a77a79d995",
            "name": "DALANG KIRKI",
            "idNumber": "UJ/2018/CS/0115"
          },
          {
            "_id": "6a24624ac7a2b1a77a79d987",
            "name": "DADEON PATIENCE",
            "idNumber": "UJ/2018/CS/0058"
          },
          {
            "_id": "6a11ce37d5f05867ff11aae4",
            "name": "Success Oladele",
            "idNumber": "UJ0000UN0002"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 1",
        "unit": "Nutrition Unit",
        "unitId": "PAE05",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246255c7a2b1a77a79d995",
            "name": "DALANG KIRKI",
            "idNumber": "UJ/2018/CS/0115"
          },
          {
            "_id": "6a24624ac7a2b1a77a79d987",
            "name": "DADEON PATIENCE",
            "idNumber": "UJ/2018/CS/0058"
          },
          {
            "_id": "6a11ce37d5f05867ff11aae4",
            "name": "Success Oladele",
            "idNumber": "UJ0000UN0002"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 1",
        "unit": "Paediatric Neurology",
        "unitId": "PAE06",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a24624ac7a2b1a77a79d987",
            "name": "DADEON PATIENCE",
            "idNumber": "UJ/2018/CS/0058"
          },
          {
            "_id": "6a11ce37d5f05867ff11aae4",
            "name": "Success Oladele",
            "idNumber": "UJ0000UN0002"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 1",
        "unit": "Paediatric Cardiology",
        "unitId": "PAE07",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a11ce37d5f05867ff11aae4",
            "name": "Success Oladele",
            "idNumber": "UJ0000UN0002"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 2",
        "unit": "Neonatology / SCBU",
        "unitId": "PAE01",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a24622fc7a2b1a77a79d964",
            "name": "BELLO HARUNA DABO",
            "idNumber": "UJ/2016/MD/0034"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 2",
        "unit": "Paediatric Nephrology",
        "unitId": "PAE02",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a24622fc7a2b1a77a79d964",
            "name": "BELLO HARUNA DABO",
            "idNumber": "UJ/2016/MD/0034"
          },
          {
            "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
            "name": "Draco Mordred",
            "idNumber": "UJ/2018/CS/0123"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 2",
        "unit": "Paediatric Infectious Diseases",
        "unitId": "PAE03",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a24622fc7a2b1a77a79d964",
            "name": "BELLO HARUNA DABO",
            "idNumber": "UJ/2016/MD/0034"
          },
          {
            "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
            "name": "Draco Mordred",
            "idNumber": "UJ/2018/CS/0123"
          },
          {
            "_id": "6a246251c7a2b1a77a79d98f",
            "name": "EMMANUEL ALERO SHALOM",
            "idNumber": "UJ/2018/CS/0090"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 2",
        "unit": "Emergency Paediatrics",
        "unitId": "PAE04",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a24622fc7a2b1a77a79d964",
            "name": "BELLO HARUNA DABO",
            "idNumber": "UJ/2016/MD/0034"
          },
          {
            "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
            "name": "Draco Mordred",
            "idNumber": "UJ/2018/CS/0123"
          },
          {
            "_id": "6a246251c7a2b1a77a79d98f",
            "name": "EMMANUEL ALERO SHALOM",
            "idNumber": "UJ/2018/CS/0090"
          },
          {
            "_id": "6a11cd6633e251c0f37eb095",
            "name": "Deborah Oladele",
            "idNumber": "UJ0000ST0007"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 2",
        "unit": "Nutrition Unit",
        "unitId": "PAE05",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
            "name": "Draco Mordred",
            "idNumber": "UJ/2018/CS/0123"
          },
          {
            "_id": "6a246251c7a2b1a77a79d98f",
            "name": "EMMANUEL ALERO SHALOM",
            "idNumber": "UJ/2018/CS/0090"
          },
          {
            "_id": "6a11cd6633e251c0f37eb095",
            "name": "Deborah Oladele",
            "idNumber": "UJ0000ST0007"
          },
          {
            "_id": "6a246254c7a2b1a77a79d994",
            "name": "SHEILA JACK OONYE",
            "idNumber": "UJ/2018/CS/0114"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 2",
        "unit": "Paediatric Neurology",
        "unitId": "PAE06",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246251c7a2b1a77a79d98f",
            "name": "EMMANUEL ALERO SHALOM",
            "idNumber": "UJ/2018/CS/0090"
          },
          {
            "_id": "6a11cd6633e251c0f37eb095",
            "name": "Deborah Oladele",
            "idNumber": "UJ0000ST0007"
          },
          {
            "_id": "6a246254c7a2b1a77a79d994",
            "name": "SHEILA JACK OONYE",
            "idNumber": "UJ/2018/CS/0114"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 2",
        "unit": "Paediatric Cardiology",
        "unitId": "PAE07",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a11cd6633e251c0f37eb095",
            "name": "Deborah Oladele",
            "idNumber": "UJ0000ST0007"
          },
          {
            "_id": "6a246254c7a2b1a77a79d994",
            "name": "SHEILA JACK OONYE",
            "idNumber": "UJ/2018/CS/0114"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 2",
        "unit": "Paediatric Endocrinology",
        "unitId": "PAE08",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246254c7a2b1a77a79d994",
            "name": "SHEILA JACK OONYE",
            "idNumber": "UJ/2018/CS/0114"
          }
        ]
      },
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 2",
        "unit": "Antenatal Clinic",
        "unitId": "OBG01",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246235c7a2b1a77a79d96c",
            "name": "YILYOK JOSEPH NAANGOE'AN",
            "idNumber": "UJ/2016/MD/0268"
          }
        ]
      },
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 2",
        "unit": "Labour Ward",
        "unitId": "OBG02",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246235c7a2b1a77a79d96c",
            "name": "YILYOK JOSEPH NAANGOE'AN",
            "idNumber": "UJ/2016/MD/0268"
          },
          {
            "_id": "6a246255c7a2b1a77a79d995",
            "name": "DALANG KIRKI",
            "idNumber": "UJ/2018/CS/0115"
          }
        ]
      },
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 2",
        "unit": "Postnatal Ward",
        "unitId": "OBG03",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246255c7a2b1a77a79d995",
            "name": "DALANG KIRKI",
            "idNumber": "UJ/2018/CS/0115"
          },
          {
            "_id": "6a24624ac7a2b1a77a79d987",
            "name": "DADEON PATIENCE",
            "idNumber": "UJ/2018/CS/0058"
          }
        ]
      },
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 2",
        "unit": "Gynaecology Ward",
        "unitId": "OBG04",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a24624ac7a2b1a77a79d987",
            "name": "DADEON PATIENCE",
            "idNumber": "UJ/2018/CS/0058"
          },
          {
            "_id": "6a11ce37d5f05867ff11aae4",
            "name": "Success Oladele",
            "idNumber": "UJ0000UN0002"
          }
        ]
      },
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 2",
        "unit": "Emergency O&G",
        "unitId": "OBG05",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a11ce37d5f05867ff11aae4",
            "name": "Success Oladele",
            "idNumber": "UJ0000UN0002"
          }
        ]
      }
    ],
    "rotationTeams": [
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 1",
        "unit": "Antenatal Clinic",
        "unitId": "OBG01",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a24622fc7a2b1a77a79d964",
            "name": "BELLO HARUNA DABO",
            "idNumber": "UJ/2016/MD/0034"
          }
        ]
      },
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 1",
        "unit": "Labour Ward",
        "unitId": "OBG02",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a24622fc7a2b1a77a79d964",
            "name": "BELLO HARUNA DABO",
            "idNumber": "UJ/2016/MD/0034"
          },
          {
            "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
            "name": "Draco Mordred",
            "idNumber": "UJ/2018/CS/0123"
          }
        ]
      },
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 1",
        "unit": "Postnatal Ward",
        "unitId": "OBG03",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
            "name": "Draco Mordred",
            "idNumber": "UJ/2018/CS/0123"
          },
          {
            "_id": "6a246251c7a2b1a77a79d98f",
            "name": "EMMANUEL ALERO SHALOM",
            "idNumber": "UJ/2018/CS/0090"
          }
        ]
      },
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 1",
        "unit": "Gynaecology Ward",
        "unitId": "OBG04",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246251c7a2b1a77a79d98f",
            "name": "EMMANUEL ALERO SHALOM",
            "idNumber": "UJ/2018/CS/0090"
          },
          {
            "_id": "6a11cd6633e251c0f37eb095",
            "name": "Deborah Oladele",
            "idNumber": "UJ0000ST0007"
          }
        ]
      },
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 1",
        "unit": "Emergency O&G",
        "unitId": "OBG05",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a11cd6633e251c0f37eb095",
            "name": "Deborah Oladele",
            "idNumber": "UJ0000ST0007"
          },
          {
            "_id": "6a246254c7a2b1a77a79d994",
            "name": "SHEILA JACK OONYE",
            "idNumber": "UJ/2018/CS/0114"
          }
        ]
      },
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 1",
        "unit": "Family Planning",
        "unitId": "OBG06",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246254c7a2b1a77a79d994",
            "name": "SHEILA JACK OONYE",
            "idNumber": "UJ/2018/CS/0114"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 1",
        "unit": "Neonatology / SCBU",
        "unitId": "PAE01",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246235c7a2b1a77a79d96c",
            "name": "YILYOK JOSEPH NAANGOE'AN",
            "idNumber": "UJ/2016/MD/0268"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 1",
        "unit": "Paediatric Nephrology",
        "unitId": "PAE02",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246235c7a2b1a77a79d96c",
            "name": "YILYOK JOSEPH NAANGOE'AN",
            "idNumber": "UJ/2016/MD/0268"
          },
          {
            "_id": "6a246255c7a2b1a77a79d995",
            "name": "DALANG KIRKI",
            "idNumber": "UJ/2018/CS/0115"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 1",
        "unit": "Paediatric Infectious Diseases",
        "unitId": "PAE03",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246235c7a2b1a77a79d96c",
            "name": "YILYOK JOSEPH NAANGOE'AN",
            "idNumber": "UJ/2016/MD/0268"
          },
          {
            "_id": "6a246255c7a2b1a77a79d995",
            "name": "DALANG KIRKI",
            "idNumber": "UJ/2018/CS/0115"
          },
          {
            "_id": "6a24624ac7a2b1a77a79d987",
            "name": "DADEON PATIENCE",
            "idNumber": "UJ/2018/CS/0058"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 1",
        "unit": "Emergency Paediatrics",
        "unitId": "PAE04",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246235c7a2b1a77a79d96c",
            "name": "YILYOK JOSEPH NAANGOE'AN",
            "idNumber": "UJ/2016/MD/0268"
          },
          {
            "_id": "6a246255c7a2b1a77a79d995",
            "name": "DALANG KIRKI",
            "idNumber": "UJ/2018/CS/0115"
          },
          {
            "_id": "6a24624ac7a2b1a77a79d987",
            "name": "DADEON PATIENCE",
            "idNumber": "UJ/2018/CS/0058"
          },
          {
            "_id": "6a11ce37d5f05867ff11aae4",
            "name": "Success Oladele",
            "idNumber": "UJ0000UN0002"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 1",
        "unit": "Nutrition Unit",
        "unitId": "PAE05",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246255c7a2b1a77a79d995",
            "name": "DALANG KIRKI",
            "idNumber": "UJ/2018/CS/0115"
          },
          {
            "_id": "6a24624ac7a2b1a77a79d987",
            "name": "DADEON PATIENCE",
            "idNumber": "UJ/2018/CS/0058"
          },
          {
            "_id": "6a11ce37d5f05867ff11aae4",
            "name": "Success Oladele",
            "idNumber": "UJ0000UN0002"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 1",
        "unit": "Paediatric Neurology",
        "unitId": "PAE06",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a24624ac7a2b1a77a79d987",
            "name": "DADEON PATIENCE",
            "idNumber": "UJ/2018/CS/0058"
          },
          {
            "_id": "6a11ce37d5f05867ff11aae4",
            "name": "Success Oladele",
            "idNumber": "UJ0000UN0002"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 1",
        "unit": "Paediatric Cardiology",
        "unitId": "PAE07",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a11ce37d5f05867ff11aae4",
            "name": "Success Oladele",
            "idNumber": "UJ0000UN0002"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 2",
        "unit": "Neonatology / SCBU",
        "unitId": "PAE01",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a24622fc7a2b1a77a79d964",
            "name": "BELLO HARUNA DABO",
            "idNumber": "UJ/2016/MD/0034"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 2",
        "unit": "Paediatric Nephrology",
        "unitId": "PAE02",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a24622fc7a2b1a77a79d964",
            "name": "BELLO HARUNA DABO",
            "idNumber": "UJ/2016/MD/0034"
          },
          {
            "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
            "name": "Draco Mordred",
            "idNumber": "UJ/2018/CS/0123"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 2",
        "unit": "Paediatric Infectious Diseases",
        "unitId": "PAE03",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a24622fc7a2b1a77a79d964",
            "name": "BELLO HARUNA DABO",
            "idNumber": "UJ/2016/MD/0034"
          },
          {
            "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
            "name": "Draco Mordred",
            "idNumber": "UJ/2018/CS/0123"
          },
          {
            "_id": "6a246251c7a2b1a77a79d98f",
            "name": "EMMANUEL ALERO SHALOM",
            "idNumber": "UJ/2018/CS/0090"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 2",
        "unit": "Emergency Paediatrics",
        "unitId": "PAE04",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a24622fc7a2b1a77a79d964",
            "name": "BELLO HARUNA DABO",
            "idNumber": "UJ/2016/MD/0034"
          },
          {
            "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
            "name": "Draco Mordred",
            "idNumber": "UJ/2018/CS/0123"
          },
          {
            "_id": "6a246251c7a2b1a77a79d98f",
            "name": "EMMANUEL ALERO SHALOM",
            "idNumber": "UJ/2018/CS/0090"
          },
          {
            "_id": "6a11cd6633e251c0f37eb095",
            "name": "Deborah Oladele",
            "idNumber": "UJ0000ST0007"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 2",
        "unit": "Nutrition Unit",
        "unitId": "PAE05",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
            "name": "Draco Mordred",
            "idNumber": "UJ/2018/CS/0123"
          },
          {
            "_id": "6a246251c7a2b1a77a79d98f",
            "name": "EMMANUEL ALERO SHALOM",
            "idNumber": "UJ/2018/CS/0090"
          },
          {
            "_id": "6a11cd6633e251c0f37eb095",
            "name": "Deborah Oladele",
            "idNumber": "UJ0000ST0007"
          },
          {
            "_id": "6a246254c7a2b1a77a79d994",
            "name": "SHEILA JACK OONYE",
            "idNumber": "UJ/2018/CS/0114"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 2",
        "unit": "Paediatric Neurology",
        "unitId": "PAE06",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246251c7a2b1a77a79d98f",
            "name": "EMMANUEL ALERO SHALOM",
            "idNumber": "UJ/2018/CS/0090"
          },
          {
            "_id": "6a11cd6633e251c0f37eb095",
            "name": "Deborah Oladele",
            "idNumber": "UJ0000ST0007"
          },
          {
            "_id": "6a246254c7a2b1a77a79d994",
            "name": "SHEILA JACK OONYE",
            "idNumber": "UJ/2018/CS/0114"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 2",
        "unit": "Paediatric Cardiology",
        "unitId": "PAE07",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a11cd6633e251c0f37eb095",
            "name": "Deborah Oladele",
            "idNumber": "UJ0000ST0007"
          },
          {
            "_id": "6a246254c7a2b1a77a79d994",
            "name": "SHEILA JACK OONYE",
            "idNumber": "UJ/2018/CS/0114"
          }
        ]
      },
      {
        "department": "Pediatrics",
        "phase": "Phase 2",
        "unit": "Paediatric Endocrinology",
        "unitId": "PAE08",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246254c7a2b1a77a79d994",
            "name": "SHEILA JACK OONYE",
            "idNumber": "UJ/2018/CS/0114"
          }
        ]
      },
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 2",
        "unit": "Antenatal Clinic",
        "unitId": "OBG01",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246235c7a2b1a77a79d96c",
            "name": "YILYOK JOSEPH NAANGOE'AN",
            "idNumber": "UJ/2016/MD/0268"
          }
        ]
      },
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 2",
        "unit": "Labour Ward",
        "unitId": "OBG02",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246235c7a2b1a77a79d96c",
            "name": "YILYOK JOSEPH NAANGOE'AN",
            "idNumber": "UJ/2016/MD/0268"
          },
          {
            "_id": "6a246255c7a2b1a77a79d995",
            "name": "DALANG KIRKI",
            "idNumber": "UJ/2018/CS/0115"
          }
        ]
      },
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 2",
        "unit": "Postnatal Ward",
        "unitId": "OBG03",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a246255c7a2b1a77a79d995",
            "name": "DALANG KIRKI",
            "idNumber": "UJ/2018/CS/0115"
          },
          {
            "_id": "6a24624ac7a2b1a77a79d987",
            "name": "DADEON PATIENCE",
            "idNumber": "UJ/2018/CS/0058"
          }
        ]
      },
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 2",
        "unit": "Gynaecology Ward",
        "unitId": "OBG04",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a24624ac7a2b1a77a79d987",
            "name": "DADEON PATIENCE",
            "idNumber": "UJ/2018/CS/0058"
          },
          {
            "_id": "6a11ce37d5f05867ff11aae4",
            "name": "Success Oladele",
            "idNumber": "UJ0000UN0002"
          }
        ]
      },
      {
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 2",
        "unit": "Emergency O&G",
        "unitId": "OBG05",
        "consultant": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "resident": {
          "_id": null,
          "name": "TBD",
          "role": "supervisor"
        },
        "students": [
          {
            "_id": "6a11ce37d5f05867ff11aae4",
            "name": "Success Oladele",
            "idNumber": "UJ0000UN0002"
          }
        ]
      }
    ],
    "rotationTimeline": [
      {
        "phase": "Phase 1",
        "department": "Obstetrics and Gynecology",
        "category": "Group A",
        "weeks": "1-4",
        "units": [
          {
            "unit": "Antenatal Clinic",
            "unitId": "OBG01",
            "startDate": "2026-01-05",
            "endDate": "2026-02-02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a24622fc7a2b1a77a79d964",
                "name": "BELLO HARUNA DABO",
                "idNumber": "UJ/2016/MD/0034"
              }
            ]
          },
          {
            "unit": "Labour Ward",
            "unitId": "OBG02",
            "startDate": "2026-01-05",
            "endDate": "2026-02-02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
                "name": "Draco Mordred",
                "idNumber": "UJ/2018/CS/0123"
              }
            ]
          },
          {
            "unit": "Postnatal Ward",
            "unitId": "OBG03",
            "startDate": "2026-01-05",
            "endDate": "2026-02-02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246251c7a2b1a77a79d98f",
                "name": "EMMANUEL ALERO SHALOM",
                "idNumber": "UJ/2018/CS/0090"
              }
            ]
          },
          {
            "unit": "Gynaecology Ward",
            "unitId": "OBG04",
            "startDate": "2026-01-05",
            "endDate": "2026-02-02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a11cd6633e251c0f37eb095",
                "name": "Deborah Oladele",
                "idNumber": "UJ0000ST0007"
              }
            ]
          },
          {
            "unit": "Emergency O&G",
            "unitId": "OBG05",
            "startDate": "2026-01-05",
            "endDate": "2026-02-02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246254c7a2b1a77a79d994",
                "name": "SHEILA JACK OONYE",
                "idNumber": "UJ/2018/CS/0114"
              }
            ]
          }
        ]
      },
      {
        "phase": "Phase 1",
        "department": "Obstetrics and Gynecology",
        "category": "Group A",
        "weeks": "5-8",
        "units": [
          {
            "unit": "Labour Ward",
            "unitId": "OBG02",
            "startDate": "2026-02-02",
            "endDate": "2026-03-02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a24622fc7a2b1a77a79d964",
                "name": "BELLO HARUNA DABO",
                "idNumber": "UJ/2016/MD/0034"
              }
            ]
          },
          {
            "unit": "Postnatal Ward",
            "unitId": "OBG03",
            "startDate": "2026-02-02",
            "endDate": "2026-03-02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
                "name": "Draco Mordred",
                "idNumber": "UJ/2018/CS/0123"
              }
            ]
          },
          {
            "unit": "Gynaecology Ward",
            "unitId": "OBG04",
            "startDate": "2026-02-02",
            "endDate": "2026-03-02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246251c7a2b1a77a79d98f",
                "name": "EMMANUEL ALERO SHALOM",
                "idNumber": "UJ/2018/CS/0090"
              }
            ]
          },
          {
            "unit": "Emergency O&G",
            "unitId": "OBG05",
            "startDate": "2026-02-02",
            "endDate": "2026-03-02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a11cd6633e251c0f37eb095",
                "name": "Deborah Oladele",
                "idNumber": "UJ0000ST0007"
              }
            ]
          },
          {
            "unit": "Family Planning",
            "unitId": "OBG06",
            "startDate": "2026-02-02",
            "endDate": "2026-03-02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246254c7a2b1a77a79d994",
                "name": "SHEILA JACK OONYE",
                "idNumber": "UJ/2018/CS/0114"
              }
            ]
          }
        ]
      },
      {
        "phase": "Phase 1",
        "department": "Pediatrics",
        "category": "Group B",
        "weeks": "1-2",
        "units": [
          {
            "unit": "Neonatology / SCBU",
            "unitId": "PAE01",
            "startDate": "2026-01-05",
            "endDate": "2026-01-19",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246235c7a2b1a77a79d96c",
                "name": "YILYOK JOSEPH NAANGOE'AN",
                "idNumber": "UJ/2016/MD/0268"
              }
            ]
          },
          {
            "unit": "Paediatric Nephrology",
            "unitId": "PAE02",
            "startDate": "2026-01-05",
            "endDate": "2026-01-19",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246255c7a2b1a77a79d995",
                "name": "DALANG KIRKI",
                "idNumber": "UJ/2018/CS/0115"
              }
            ]
          },
          {
            "unit": "Paediatric Infectious Diseases",
            "unitId": "PAE03",
            "startDate": "2026-01-05",
            "endDate": "2026-01-19",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a24624ac7a2b1a77a79d987",
                "name": "DADEON PATIENCE",
                "idNumber": "UJ/2018/CS/0058"
              }
            ]
          },
          {
            "unit": "Emergency Paediatrics",
            "unitId": "PAE04",
            "startDate": "2026-01-05",
            "endDate": "2026-01-19",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a11ce37d5f05867ff11aae4",
                "name": "Success Oladele",
                "idNumber": "UJ0000UN0002"
              }
            ]
          }
        ]
      },
      {
        "phase": "Phase 1",
        "department": "Pediatrics",
        "category": "Group B",
        "weeks": "3-4",
        "units": [
          {
            "unit": "Paediatric Nephrology",
            "unitId": "PAE02",
            "startDate": "2026-01-19",
            "endDate": "2026-02-02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246235c7a2b1a77a79d96c",
                "name": "YILYOK JOSEPH NAANGOE'AN",
                "idNumber": "UJ/2016/MD/0268"
              }
            ]
          },
          {
            "unit": "Paediatric Infectious Diseases",
            "unitId": "PAE03",
            "startDate": "2026-01-19",
            "endDate": "2026-02-02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246255c7a2b1a77a79d995",
                "name": "DALANG KIRKI",
                "idNumber": "UJ/2018/CS/0115"
              }
            ]
          },
          {
            "unit": "Emergency Paediatrics",
            "unitId": "PAE04",
            "startDate": "2026-01-19",
            "endDate": "2026-02-02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a24624ac7a2b1a77a79d987",
                "name": "DADEON PATIENCE",
                "idNumber": "UJ/2018/CS/0058"
              }
            ]
          },
          {
            "unit": "Nutrition Unit",
            "unitId": "PAE05",
            "startDate": "2026-01-19",
            "endDate": "2026-02-02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a11ce37d5f05867ff11aae4",
                "name": "Success Oladele",
                "idNumber": "UJ0000UN0002"
              }
            ]
          }
        ]
      },
      {
        "phase": "Phase 1",
        "department": "Pediatrics",
        "category": "Group B",
        "weeks": "5-6",
        "units": [
          {
            "unit": "Paediatric Infectious Diseases",
            "unitId": "PAE03",
            "startDate": "2026-02-02",
            "endDate": "2026-02-16",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246235c7a2b1a77a79d96c",
                "name": "YILYOK JOSEPH NAANGOE'AN",
                "idNumber": "UJ/2016/MD/0268"
              }
            ]
          },
          {
            "unit": "Emergency Paediatrics",
            "unitId": "PAE04",
            "startDate": "2026-02-02",
            "endDate": "2026-02-16",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246255c7a2b1a77a79d995",
                "name": "DALANG KIRKI",
                "idNumber": "UJ/2018/CS/0115"
              }
            ]
          },
          {
            "unit": "Nutrition Unit",
            "unitId": "PAE05",
            "startDate": "2026-02-02",
            "endDate": "2026-02-16",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a24624ac7a2b1a77a79d987",
                "name": "DADEON PATIENCE",
                "idNumber": "UJ/2018/CS/0058"
              }
            ]
          },
          {
            "unit": "Paediatric Neurology",
            "unitId": "PAE06",
            "startDate": "2026-02-02",
            "endDate": "2026-02-16",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a11ce37d5f05867ff11aae4",
                "name": "Success Oladele",
                "idNumber": "UJ0000UN0002"
              }
            ]
          }
        ]
      },
      {
        "phase": "Phase 1",
        "department": "Pediatrics",
        "category": "Group B",
        "weeks": "7-8",
        "units": [
          {
            "unit": "Emergency Paediatrics",
            "unitId": "PAE04",
            "startDate": "2026-02-16",
            "endDate": "2026-03-02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246235c7a2b1a77a79d96c",
                "name": "YILYOK JOSEPH NAANGOE'AN",
                "idNumber": "UJ/2016/MD/0268"
              }
            ]
          },
          {
            "unit": "Nutrition Unit",
            "unitId": "PAE05",
            "startDate": "2026-02-16",
            "endDate": "2026-03-02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246255c7a2b1a77a79d995",
                "name": "DALANG KIRKI",
                "idNumber": "UJ/2018/CS/0115"
              }
            ]
          },
          {
            "unit": "Paediatric Neurology",
            "unitId": "PAE06",
            "startDate": "2026-02-16",
            "endDate": "2026-03-02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a24624ac7a2b1a77a79d987",
                "name": "DADEON PATIENCE",
                "idNumber": "UJ/2018/CS/0058"
              }
            ]
          },
          {
            "unit": "Paediatric Cardiology",
            "unitId": "PAE07",
            "startDate": "2026-02-16",
            "endDate": "2026-03-02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a11ce37d5f05867ff11aae4",
                "name": "Success Oladele",
                "idNumber": "UJ0000UN0002"
              }
            ]
          }
        ]
      },
      {
        "phase": "Phase 2",
        "department": "Pediatrics",
        "category": "Group A",
        "weeks": "1-2",
        "units": [
          {
            "unit": "Neonatology / SCBU",
            "unitId": "PAE01",
            "startDate": "2026-03-02",
            "endDate": "2026-03-16",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a24622fc7a2b1a77a79d964",
                "name": "BELLO HARUNA DABO",
                "idNumber": "UJ/2016/MD/0034"
              }
            ]
          },
          {
            "unit": "Paediatric Nephrology",
            "unitId": "PAE02",
            "startDate": "2026-03-02",
            "endDate": "2026-03-16",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
                "name": "Draco Mordred",
                "idNumber": "UJ/2018/CS/0123"
              }
            ]
          },
          {
            "unit": "Paediatric Infectious Diseases",
            "unitId": "PAE03",
            "startDate": "2026-03-02",
            "endDate": "2026-03-16",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246251c7a2b1a77a79d98f",
                "name": "EMMANUEL ALERO SHALOM",
                "idNumber": "UJ/2018/CS/0090"
              }
            ]
          },
          {
            "unit": "Emergency Paediatrics",
            "unitId": "PAE04",
            "startDate": "2026-03-02",
            "endDate": "2026-03-16",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a11cd6633e251c0f37eb095",
                "name": "Deborah Oladele",
                "idNumber": "UJ0000ST0007"
              }
            ]
          },
          {
            "unit": "Nutrition Unit",
            "unitId": "PAE05",
            "startDate": "2026-03-02",
            "endDate": "2026-03-16",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246254c7a2b1a77a79d994",
                "name": "SHEILA JACK OONYE",
                "idNumber": "UJ/2018/CS/0114"
              }
            ]
          }
        ]
      },
      {
        "phase": "Phase 2",
        "department": "Pediatrics",
        "category": "Group A",
        "weeks": "3-4",
        "units": [
          {
            "unit": "Paediatric Nephrology",
            "unitId": "PAE02",
            "startDate": "2026-03-16",
            "endDate": "2026-03-30",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a24622fc7a2b1a77a79d964",
                "name": "BELLO HARUNA DABO",
                "idNumber": "UJ/2016/MD/0034"
              }
            ]
          },
          {
            "unit": "Paediatric Infectious Diseases",
            "unitId": "PAE03",
            "startDate": "2026-03-16",
            "endDate": "2026-03-30",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
                "name": "Draco Mordred",
                "idNumber": "UJ/2018/CS/0123"
              }
            ]
          },
          {
            "unit": "Emergency Paediatrics",
            "unitId": "PAE04",
            "startDate": "2026-03-16",
            "endDate": "2026-03-30",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246251c7a2b1a77a79d98f",
                "name": "EMMANUEL ALERO SHALOM",
                "idNumber": "UJ/2018/CS/0090"
              }
            ]
          },
          {
            "unit": "Nutrition Unit",
            "unitId": "PAE05",
            "startDate": "2026-03-16",
            "endDate": "2026-03-30",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a11cd6633e251c0f37eb095",
                "name": "Deborah Oladele",
                "idNumber": "UJ0000ST0007"
              }
            ]
          },
          {
            "unit": "Paediatric Neurology",
            "unitId": "PAE06",
            "startDate": "2026-03-16",
            "endDate": "2026-03-30",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246254c7a2b1a77a79d994",
                "name": "SHEILA JACK OONYE",
                "idNumber": "UJ/2018/CS/0114"
              }
            ]
          }
        ]
      },
      {
        "phase": "Phase 2",
        "department": "Pediatrics",
        "category": "Group A",
        "weeks": "5-6",
        "units": [
          {
            "unit": "Paediatric Infectious Diseases",
            "unitId": "PAE03",
            "startDate": "2026-03-30",
            "endDate": "2026-04-13",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a24622fc7a2b1a77a79d964",
                "name": "BELLO HARUNA DABO",
                "idNumber": "UJ/2016/MD/0034"
              }
            ]
          },
          {
            "unit": "Emergency Paediatrics",
            "unitId": "PAE04",
            "startDate": "2026-03-30",
            "endDate": "2026-04-13",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
                "name": "Draco Mordred",
                "idNumber": "UJ/2018/CS/0123"
              }
            ]
          },
          {
            "unit": "Nutrition Unit",
            "unitId": "PAE05",
            "startDate": "2026-03-30",
            "endDate": "2026-04-13",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246251c7a2b1a77a79d98f",
                "name": "EMMANUEL ALERO SHALOM",
                "idNumber": "UJ/2018/CS/0090"
              }
            ]
          },
          {
            "unit": "Paediatric Neurology",
            "unitId": "PAE06",
            "startDate": "2026-03-30",
            "endDate": "2026-04-13",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a11cd6633e251c0f37eb095",
                "name": "Deborah Oladele",
                "idNumber": "UJ0000ST0007"
              }
            ]
          },
          {
            "unit": "Paediatric Cardiology",
            "unitId": "PAE07",
            "startDate": "2026-03-30",
            "endDate": "2026-04-13",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246254c7a2b1a77a79d994",
                "name": "SHEILA JACK OONYE",
                "idNumber": "UJ/2018/CS/0114"
              }
            ]
          }
        ]
      },
      {
        "phase": "Phase 2",
        "department": "Pediatrics",
        "category": "Group A",
        "weeks": "7-8",
        "units": [
          {
            "unit": "Emergency Paediatrics",
            "unitId": "PAE04",
            "startDate": "2026-04-13",
            "endDate": "2026-04-27",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a24622fc7a2b1a77a79d964",
                "name": "BELLO HARUNA DABO",
                "idNumber": "UJ/2016/MD/0034"
              }
            ]
          },
          {
            "unit": "Nutrition Unit",
            "unitId": "PAE05",
            "startDate": "2026-04-13",
            "endDate": "2026-04-27",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
                "name": "Draco Mordred",
                "idNumber": "UJ/2018/CS/0123"
              }
            ]
          },
          {
            "unit": "Paediatric Neurology",
            "unitId": "PAE06",
            "startDate": "2026-04-13",
            "endDate": "2026-04-27",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246251c7a2b1a77a79d98f",
                "name": "EMMANUEL ALERO SHALOM",
                "idNumber": "UJ/2018/CS/0090"
              }
            ]
          },
          {
            "unit": "Paediatric Cardiology",
            "unitId": "PAE07",
            "startDate": "2026-04-13",
            "endDate": "2026-04-27",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a11cd6633e251c0f37eb095",
                "name": "Deborah Oladele",
                "idNumber": "UJ0000ST0007"
              }
            ]
          },
          {
            "unit": "Paediatric Endocrinology",
            "unitId": "PAE08",
            "startDate": "2026-04-13",
            "endDate": "2026-04-27",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246254c7a2b1a77a79d994",
                "name": "SHEILA JACK OONYE",
                "idNumber": "UJ/2018/CS/0114"
              }
            ]
          }
        ]
      },
      {
        "phase": "Phase 2",
        "department": "Obstetrics and Gynecology",
        "category": "Group B",
        "weeks": "1-4",
        "units": [
          {
            "unit": "Antenatal Clinic",
            "unitId": "OBG01",
            "startDate": "2026-03-02",
            "endDate": "2026-03-30",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246235c7a2b1a77a79d96c",
                "name": "YILYOK JOSEPH NAANGOE'AN",
                "idNumber": "UJ/2016/MD/0268"
              }
            ]
          },
          {
            "unit": "Labour Ward",
            "unitId": "OBG02",
            "startDate": "2026-03-02",
            "endDate": "2026-03-30",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246255c7a2b1a77a79d995",
                "name": "DALANG KIRKI",
                "idNumber": "UJ/2018/CS/0115"
              }
            ]
          },
          {
            "unit": "Postnatal Ward",
            "unitId": "OBG03",
            "startDate": "2026-03-02",
            "endDate": "2026-03-30",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a24624ac7a2b1a77a79d987",
                "name": "DADEON PATIENCE",
                "idNumber": "UJ/2018/CS/0058"
              }
            ]
          },
          {
            "unit": "Gynaecology Ward",
            "unitId": "OBG04",
            "startDate": "2026-03-02",
            "endDate": "2026-03-30",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a11ce37d5f05867ff11aae4",
                "name": "Success Oladele",
                "idNumber": "UJ0000UN0002"
              }
            ]
          }
        ]
      },
      {
        "phase": "Phase 2",
        "department": "Obstetrics and Gynecology",
        "category": "Group B",
        "weeks": "5-8",
        "units": [
          {
            "unit": "Labour Ward",
            "unitId": "OBG02",
            "startDate": "2026-03-30",
            "endDate": "2026-04-27",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246235c7a2b1a77a79d96c",
                "name": "YILYOK JOSEPH NAANGOE'AN",
                "idNumber": "UJ/2016/MD/0268"
              }
            ]
          },
          {
            "unit": "Postnatal Ward",
            "unitId": "OBG03",
            "startDate": "2026-03-30",
            "endDate": "2026-04-27",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a246255c7a2b1a77a79d995",
                "name": "DALANG KIRKI",
                "idNumber": "UJ/2018/CS/0115"
              }
            ]
          },
          {
            "unit": "Gynaecology Ward",
            "unitId": "OBG04",
            "startDate": "2026-03-30",
            "endDate": "2026-04-27",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a24624ac7a2b1a77a79d987",
                "name": "DADEON PATIENCE",
                "idNumber": "UJ/2018/CS/0058"
              }
            ]
          },
          {
            "unit": "Emergency O&G",
            "unitId": "OBG05",
            "startDate": "2026-03-30",
            "endDate": "2026-04-27",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "students": [
              {
                "_id": "6a11ce37d5f05867ff11aae4",
                "name": "Success Oladele",
                "idNumber": "UJ0000UN0002"
              }
            ]
          }
        ]
      }
    ],
    "rotationHistory": [
      {
        "student": {
          "_id": "6a24622fc7a2b1a77a79d964",
          "name": "BELLO HARUNA DABO",
          "idNumber": "UJ/2016/MD/0034"
        },
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 1",
        "blocks": [
          {
            "unit": "Antenatal Clinic",
            "unitId": "OBG01",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-01-05",
            "endDate": "2026-02-02",
            "weeks": "1-4",
            "completed": false
          },
          {
            "unit": "Labour Ward",
            "unitId": "OBG02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-02-02",
            "endDate": "2026-03-02",
            "weeks": "5-8",
            "completed": false
          }
        ]
      },
      {
        "student": {
          "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
          "name": "Draco Mordred",
          "idNumber": "UJ/2018/CS/0123"
        },
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 1",
        "blocks": [
          {
            "unit": "Labour Ward",
            "unitId": "OBG02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-01-05",
            "endDate": "2026-02-02",
            "weeks": "1-4",
            "completed": false
          },
          {
            "unit": "Postnatal Ward",
            "unitId": "OBG03",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-02-02",
            "endDate": "2026-03-02",
            "weeks": "5-8",
            "completed": false
          }
        ]
      },
      {
        "student": {
          "_id": "6a246251c7a2b1a77a79d98f",
          "name": "EMMANUEL ALERO SHALOM",
          "idNumber": "UJ/2018/CS/0090"
        },
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 1",
        "blocks": [
          {
            "unit": "Postnatal Ward",
            "unitId": "OBG03",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-01-05",
            "endDate": "2026-02-02",
            "weeks": "1-4",
            "completed": false
          },
          {
            "unit": "Gynaecology Ward",
            "unitId": "OBG04",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-02-02",
            "endDate": "2026-03-02",
            "weeks": "5-8",
            "completed": false
          }
        ]
      },
      {
        "student": {
          "_id": "6a11cd6633e251c0f37eb095",
          "name": "Deborah Oladele",
          "idNumber": "UJ0000ST0007"
        },
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 1",
        "blocks": [
          {
            "unit": "Gynaecology Ward",
            "unitId": "OBG04",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-01-05",
            "endDate": "2026-02-02",
            "weeks": "1-4",
            "completed": false
          },
          {
            "unit": "Emergency O&G",
            "unitId": "OBG05",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-02-02",
            "endDate": "2026-03-02",
            "weeks": "5-8",
            "completed": false
          }
        ]
      },
      {
        "student": {
          "_id": "6a246254c7a2b1a77a79d994",
          "name": "SHEILA JACK OONYE",
          "idNumber": "UJ/2018/CS/0114"
        },
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 1",
        "blocks": [
          {
            "unit": "Emergency O&G",
            "unitId": "OBG05",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-01-05",
            "endDate": "2026-02-02",
            "weeks": "1-4",
            "completed": false
          },
          {
            "unit": "Family Planning",
            "unitId": "OBG06",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-02-02",
            "endDate": "2026-03-02",
            "weeks": "5-8",
            "completed": false
          }
        ]
      },
      {
        "student": {
          "_id": "6a246235c7a2b1a77a79d96c",
          "name": "YILYOK JOSEPH NAANGOE'AN",
          "idNumber": "UJ/2016/MD/0268"
        },
        "department": "Pediatrics",
        "phase": "Phase 1",
        "blocks": [
          {
            "unit": "Neonatology / SCBU",
            "unitId": "PAE01",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-01-05",
            "endDate": "2026-01-19",
            "weeks": "1-2",
            "completed": false
          },
          {
            "unit": "Paediatric Nephrology",
            "unitId": "PAE02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-01-19",
            "endDate": "2026-02-02",
            "weeks": "3-4",
            "completed": false
          },
          {
            "unit": "Paediatric Infectious Diseases",
            "unitId": "PAE03",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-02-02",
            "endDate": "2026-02-16",
            "weeks": "5-6",
            "completed": false
          },
          {
            "unit": "Emergency Paediatrics",
            "unitId": "PAE04",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-02-16",
            "endDate": "2026-03-02",
            "weeks": "7-8",
            "completed": false
          }
        ]
      },
      {
        "student": {
          "_id": "6a246255c7a2b1a77a79d995",
          "name": "DALANG KIRKI",
          "idNumber": "UJ/2018/CS/0115"
        },
        "department": "Pediatrics",
        "phase": "Phase 1",
        "blocks": [
          {
            "unit": "Paediatric Nephrology",
            "unitId": "PAE02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-01-05",
            "endDate": "2026-01-19",
            "weeks": "1-2",
            "completed": false
          },
          {
            "unit": "Paediatric Infectious Diseases",
            "unitId": "PAE03",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-01-19",
            "endDate": "2026-02-02",
            "weeks": "3-4",
            "completed": false
          },
          {
            "unit": "Emergency Paediatrics",
            "unitId": "PAE04",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-02-02",
            "endDate": "2026-02-16",
            "weeks": "5-6",
            "completed": false
          },
          {
            "unit": "Nutrition Unit",
            "unitId": "PAE05",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-02-16",
            "endDate": "2026-03-02",
            "weeks": "7-8",
            "completed": false
          }
        ]
      },
      {
        "student": {
          "_id": "6a24624ac7a2b1a77a79d987",
          "name": "DADEON PATIENCE",
          "idNumber": "UJ/2018/CS/0058"
        },
        "department": "Pediatrics",
        "phase": "Phase 1",
        "blocks": [
          {
            "unit": "Paediatric Infectious Diseases",
            "unitId": "PAE03",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-01-05",
            "endDate": "2026-01-19",
            "weeks": "1-2",
            "completed": false
          },
          {
            "unit": "Emergency Paediatrics",
            "unitId": "PAE04",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-01-19",
            "endDate": "2026-02-02",
            "weeks": "3-4",
            "completed": false
          },
          {
            "unit": "Nutrition Unit",
            "unitId": "PAE05",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-02-02",
            "endDate": "2026-02-16",
            "weeks": "5-6",
            "completed": false
          },
          {
            "unit": "Paediatric Neurology",
            "unitId": "PAE06",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-02-16",
            "endDate": "2026-03-02",
            "weeks": "7-8",
            "completed": false
          }
        ]
      },
      {
        "student": {
          "_id": "6a11ce37d5f05867ff11aae4",
          "name": "Success Oladele",
          "idNumber": "UJ0000UN0002"
        },
        "department": "Pediatrics",
        "phase": "Phase 1",
        "blocks": [
          {
            "unit": "Emergency Paediatrics",
            "unitId": "PAE04",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-01-05",
            "endDate": "2026-01-19",
            "weeks": "1-2",
            "completed": false
          },
          {
            "unit": "Nutrition Unit",
            "unitId": "PAE05",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-01-19",
            "endDate": "2026-02-02",
            "weeks": "3-4",
            "completed": false
          },
          {
            "unit": "Paediatric Neurology",
            "unitId": "PAE06",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-02-02",
            "endDate": "2026-02-16",
            "weeks": "5-6",
            "completed": false
          },
          {
            "unit": "Paediatric Cardiology",
            "unitId": "PAE07",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-02-16",
            "endDate": "2026-03-02",
            "weeks": "7-8",
            "completed": false
          }
        ]
      },
      {
        "student": {
          "_id": "6a24622fc7a2b1a77a79d964",
          "name": "BELLO HARUNA DABO",
          "idNumber": "UJ/2016/MD/0034"
        },
        "department": "Pediatrics",
        "phase": "Phase 2",
        "blocks": [
          {
            "unit": "Neonatology / SCBU",
            "unitId": "PAE01",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-02",
            "endDate": "2026-03-16",
            "weeks": "1-2",
            "completed": false
          },
          {
            "unit": "Paediatric Nephrology",
            "unitId": "PAE02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-16",
            "endDate": "2026-03-30",
            "weeks": "3-4",
            "completed": false
          },
          {
            "unit": "Paediatric Infectious Diseases",
            "unitId": "PAE03",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-30",
            "endDate": "2026-04-13",
            "weeks": "5-6",
            "completed": false
          },
          {
            "unit": "Emergency Paediatrics",
            "unitId": "PAE04",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-04-13",
            "endDate": "2026-04-27",
            "weeks": "7-8",
            "completed": false
          }
        ]
      },
      {
        "student": {
          "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
          "name": "Draco Mordred",
          "idNumber": "UJ/2018/CS/0123"
        },
        "department": "Pediatrics",
        "phase": "Phase 2",
        "blocks": [
          {
            "unit": "Paediatric Nephrology",
            "unitId": "PAE02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-02",
            "endDate": "2026-03-16",
            "weeks": "1-2",
            "completed": false
          },
          {
            "unit": "Paediatric Infectious Diseases",
            "unitId": "PAE03",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-16",
            "endDate": "2026-03-30",
            "weeks": "3-4",
            "completed": false
          },
          {
            "unit": "Emergency Paediatrics",
            "unitId": "PAE04",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-30",
            "endDate": "2026-04-13",
            "weeks": "5-6",
            "completed": false
          },
          {
            "unit": "Nutrition Unit",
            "unitId": "PAE05",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-04-13",
            "endDate": "2026-04-27",
            "weeks": "7-8",
            "completed": false
          }
        ]
      },
      {
        "student": {
          "_id": "6a246251c7a2b1a77a79d98f",
          "name": "EMMANUEL ALERO SHALOM",
          "idNumber": "UJ/2018/CS/0090"
        },
        "department": "Pediatrics",
        "phase": "Phase 2",
        "blocks": [
          {
            "unit": "Paediatric Infectious Diseases",
            "unitId": "PAE03",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-02",
            "endDate": "2026-03-16",
            "weeks": "1-2",
            "completed": false
          },
          {
            "unit": "Emergency Paediatrics",
            "unitId": "PAE04",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-16",
            "endDate": "2026-03-30",
            "weeks": "3-4",
            "completed": false
          },
          {
            "unit": "Nutrition Unit",
            "unitId": "PAE05",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-30",
            "endDate": "2026-04-13",
            "weeks": "5-6",
            "completed": false
          },
          {
            "unit": "Paediatric Neurology",
            "unitId": "PAE06",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-04-13",
            "endDate": "2026-04-27",
            "weeks": "7-8",
            "completed": false
          }
        ]
      },
      {
        "student": {
          "_id": "6a11cd6633e251c0f37eb095",
          "name": "Deborah Oladele",
          "idNumber": "UJ0000ST0007"
        },
        "department": "Pediatrics",
        "phase": "Phase 2",
        "blocks": [
          {
            "unit": "Emergency Paediatrics",
            "unitId": "PAE04",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-02",
            "endDate": "2026-03-16",
            "weeks": "1-2",
            "completed": false
          },
          {
            "unit": "Nutrition Unit",
            "unitId": "PAE05",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-16",
            "endDate": "2026-03-30",
            "weeks": "3-4",
            "completed": false
          },
          {
            "unit": "Paediatric Neurology",
            "unitId": "PAE06",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-30",
            "endDate": "2026-04-13",
            "weeks": "5-6",
            "completed": false
          },
          {
            "unit": "Paediatric Cardiology",
            "unitId": "PAE07",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-04-13",
            "endDate": "2026-04-27",
            "weeks": "7-8",
            "completed": false
          }
        ]
      },
      {
        "student": {
          "_id": "6a246254c7a2b1a77a79d994",
          "name": "SHEILA JACK OONYE",
          "idNumber": "UJ/2018/CS/0114"
        },
        "department": "Pediatrics",
        "phase": "Phase 2",
        "blocks": [
          {
            "unit": "Nutrition Unit",
            "unitId": "PAE05",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-02",
            "endDate": "2026-03-16",
            "weeks": "1-2",
            "completed": false
          },
          {
            "unit": "Paediatric Neurology",
            "unitId": "PAE06",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-16",
            "endDate": "2026-03-30",
            "weeks": "3-4",
            "completed": false
          },
          {
            "unit": "Paediatric Cardiology",
            "unitId": "PAE07",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-30",
            "endDate": "2026-04-13",
            "weeks": "5-6",
            "completed": false
          },
          {
            "unit": "Paediatric Endocrinology",
            "unitId": "PAE08",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-04-13",
            "endDate": "2026-04-27",
            "weeks": "7-8",
            "completed": false
          }
        ]
      },
      {
        "student": {
          "_id": "6a246235c7a2b1a77a79d96c",
          "name": "YILYOK JOSEPH NAANGOE'AN",
          "idNumber": "UJ/2016/MD/0268"
        },
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 2",
        "blocks": [
          {
            "unit": "Antenatal Clinic",
            "unitId": "OBG01",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-02",
            "endDate": "2026-03-30",
            "weeks": "1-4",
            "completed": false
          },
          {
            "unit": "Labour Ward",
            "unitId": "OBG02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-30",
            "endDate": "2026-04-27",
            "weeks": "5-8",
            "completed": false
          }
        ]
      },
      {
        "student": {
          "_id": "6a246255c7a2b1a77a79d995",
          "name": "DALANG KIRKI",
          "idNumber": "UJ/2018/CS/0115"
        },
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 2",
        "blocks": [
          {
            "unit": "Labour Ward",
            "unitId": "OBG02",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-02",
            "endDate": "2026-03-30",
            "weeks": "1-4",
            "completed": false
          },
          {
            "unit": "Postnatal Ward",
            "unitId": "OBG03",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-30",
            "endDate": "2026-04-27",
            "weeks": "5-8",
            "completed": false
          }
        ]
      },
      {
        "student": {
          "_id": "6a24624ac7a2b1a77a79d987",
          "name": "DADEON PATIENCE",
          "idNumber": "UJ/2018/CS/0058"
        },
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 2",
        "blocks": [
          {
            "unit": "Postnatal Ward",
            "unitId": "OBG03",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-02",
            "endDate": "2026-03-30",
            "weeks": "1-4",
            "completed": false
          },
          {
            "unit": "Gynaecology Ward",
            "unitId": "OBG04",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-30",
            "endDate": "2026-04-27",
            "weeks": "5-8",
            "completed": false
          }
        ]
      },
      {
        "student": {
          "_id": "6a11ce37d5f05867ff11aae4",
          "name": "Success Oladele",
          "idNumber": "UJ0000UN0002"
        },
        "department": "Obstetrics and Gynecology",
        "phase": "Phase 2",
        "blocks": [
          {
            "unit": "Gynaecology Ward",
            "unitId": "OBG04",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-02",
            "endDate": "2026-03-30",
            "weeks": "1-4",
            "completed": false
          },
          {
            "unit": "Emergency O&G",
            "unitId": "OBG05",
            "consultant": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "resident": {
              "_id": null,
              "name": "TBD",
              "role": "supervisor"
            },
            "startDate": "2026-03-30",
            "endDate": "2026-04-27",
            "weeks": "5-8",
            "completed": false
          }
        ]
      }
    ],
    "nestedSchedule": {
      "phase1": {
        "groupA": {
          "posting": "O&G",
          "duration": 2,
          "totalNumberofUnitsPerStudent": 2,
          "units": {
            "unit1": {
              "OandG_Unit_1": {
                "name": "Antenatal Clinic",
                "unitId": "OBG01",
                "duration": 4,
                "postingType": "O&G",
                "students": [
                  {
                    "_id": "6a24622fc7a2b1a77a79d964",
                    "name": "BELLO HARUNA DABO",
                    "idNumber": "UJ/2016/MD/0034"
                  },
                  {
                    "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
                    "name": "Draco Mordred",
                    "idNumber": "UJ/2018/CS/0123"
                  },
                  {
                    "_id": "6a246251c7a2b1a77a79d98f",
                    "name": "EMMANUEL ALERO SHALOM",
                    "idNumber": "UJ/2018/CS/0090"
                  },
                  {
                    "_id": "6a11cd6633e251c0f37eb095",
                    "name": "Deborah Oladele",
                    "idNumber": "UJ0000ST0007"
                  },
                  {
                    "_id": "6a246254c7a2b1a77a79d994",
                    "name": "SHEILA JACK OONYE",
                    "idNumber": "UJ/2018/CS/0114"
                  }
                ],
                "supervisor": {
                  "_id": null,
                  "name": "TBD",
                  "role": "supervisor"
                }
              }
            },
            "unit2": {
              "OandG_Unit_2": {
                "name": "Labour Ward",
                "unitId": "OBG02",
                "duration": 4,
                "postingType": "O&G",
                "students": [
                  {
                    "_id": "6a24622fc7a2b1a77a79d964",
                    "name": "BELLO HARUNA DABO",
                    "idNumber": "UJ/2016/MD/0034"
                  },
                  {
                    "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
                    "name": "Draco Mordred",
                    "idNumber": "UJ/2018/CS/0123"
                  },
                  {
                    "_id": "6a246251c7a2b1a77a79d98f",
                    "name": "EMMANUEL ALERO SHALOM",
                    "idNumber": "UJ/2018/CS/0090"
                  },
                  {
                    "_id": "6a11cd6633e251c0f37eb095",
                    "name": "Deborah Oladele",
                    "idNumber": "UJ0000ST0007"
                  },
                  {
                    "_id": "6a246254c7a2b1a77a79d994",
                    "name": "SHEILA JACK OONYE",
                    "idNumber": "UJ/2018/CS/0114"
                  }
                ],
                "supervisor": {
                  "_id": null,
                  "name": "TBD",
                  "role": "supervisor"
                }
              }
            }
          }
        },
        "groupB": {
          "posting": "Pediatrics",
          "duration": 2,
          "totalNumberofUnitsPerStudent": 4,
          "units": {
            "unit1": {
              "Pediatrics_Unit_1": {
                "name": "Neonatology / SCBU",
                "unitId": "PAE01",
                "duration": 2,
                "postingType": "Pediatrics",
                "students": [
                  {
                    "_id": "6a246235c7a2b1a77a79d96c",
                    "name": "YILYOK JOSEPH NAANGOE'AN",
                    "idNumber": "UJ/2016/MD/0268"
                  },
                  {
                    "_id": "6a246255c7a2b1a77a79d995",
                    "name": "DALANG KIRKI",
                    "idNumber": "UJ/2018/CS/0115"
                  },
                  {
                    "_id": "6a24624ac7a2b1a77a79d987",
                    "name": "DADEON PATIENCE",
                    "idNumber": "UJ/2018/CS/0058"
                  },
                  {
                    "_id": "6a11ce37d5f05867ff11aae4",
                    "name": "Success Oladele",
                    "idNumber": "UJ0000UN0002"
                  }
                ],
                "supervisor": {
                  "_id": null,
                  "name": "TBD",
                  "role": "supervisor"
                }
              }
            },
            "unit2": {
              "Pediatrics_Unit_2": {
                "name": "Paediatric Nephrology",
                "unitId": "PAE02",
                "duration": 2,
                "postingType": "Pediatrics",
                "students": [
                  {
                    "_id": "6a246235c7a2b1a77a79d96c",
                    "name": "YILYOK JOSEPH NAANGOE'AN",
                    "idNumber": "UJ/2016/MD/0268"
                  },
                  {
                    "_id": "6a246255c7a2b1a77a79d995",
                    "name": "DALANG KIRKI",
                    "idNumber": "UJ/2018/CS/0115"
                  },
                  {
                    "_id": "6a24624ac7a2b1a77a79d987",
                    "name": "DADEON PATIENCE",
                    "idNumber": "UJ/2018/CS/0058"
                  },
                  {
                    "_id": "6a11ce37d5f05867ff11aae4",
                    "name": "Success Oladele",
                    "idNumber": "UJ0000UN0002"
                  }
                ],
                "supervisor": {
                  "_id": null,
                  "name": "TBD",
                  "role": "supervisor"
                }
              }
            },
            "unit3": {
              "Pediatrics_Unit_3": {
                "name": "Paediatric Infectious Diseases",
                "unitId": "PAE03",
                "duration": 2,
                "postingType": "Pediatrics",
                "students": [
                  {
                    "_id": "6a246235c7a2b1a77a79d96c",
                    "name": "YILYOK JOSEPH NAANGOE'AN",
                    "idNumber": "UJ/2016/MD/0268"
                  },
                  {
                    "_id": "6a246255c7a2b1a77a79d995",
                    "name": "DALANG KIRKI",
                    "idNumber": "UJ/2018/CS/0115"
                  },
                  {
                    "_id": "6a24624ac7a2b1a77a79d987",
                    "name": "DADEON PATIENCE",
                    "idNumber": "UJ/2018/CS/0058"
                  },
                  {
                    "_id": "6a11ce37d5f05867ff11aae4",
                    "name": "Success Oladele",
                    "idNumber": "UJ0000UN0002"
                  }
                ],
                "supervisor": {
                  "_id": null,
                  "name": "TBD",
                  "role": "supervisor"
                }
              }
            },
            "unit4": {
              "Pediatrics_Unit_4": {
                "name": "Emergency Paediatrics",
                "unitId": "PAE04",
                "duration": 2,
                "postingType": "Pediatrics",
                "students": [
                  {
                    "_id": "6a246235c7a2b1a77a79d96c",
                    "name": "YILYOK JOSEPH NAANGOE'AN",
                    "idNumber": "UJ/2016/MD/0268"
                  },
                  {
                    "_id": "6a246255c7a2b1a77a79d995",
                    "name": "DALANG KIRKI",
                    "idNumber": "UJ/2018/CS/0115"
                  },
                  {
                    "_id": "6a24624ac7a2b1a77a79d987",
                    "name": "DADEON PATIENCE",
                    "idNumber": "UJ/2018/CS/0058"
                  },
                  {
                    "_id": "6a11ce37d5f05867ff11aae4",
                    "name": "Success Oladele",
                    "idNumber": "UJ0000UN0002"
                  }
                ],
                "supervisor": {
                  "_id": null,
                  "name": "TBD",
                  "role": "supervisor"
                }
              }
            }
          }
        }
      },
      "phase2": {
        "groupA": {
          "posting": "Pediatrics",
          "duration": 2,
          "totalNumberofUnitsPerStudent": 4,
          "units": {
            "unit1": {
              "Pediatrics_Unit_1": {
                "name": "Neonatology / SCBU",
                "unitId": "PAE01",
                "duration": 2,
                "postingType": "Pediatrics",
                "students": [
                  {
                    "_id": "6a24622fc7a2b1a77a79d964",
                    "name": "BELLO HARUNA DABO",
                    "idNumber": "UJ/2016/MD/0034"
                  },
                  {
                    "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
                    "name": "Draco Mordred",
                    "idNumber": "UJ/2018/CS/0123"
                  },
                  {
                    "_id": "6a246251c7a2b1a77a79d98f",
                    "name": "EMMANUEL ALERO SHALOM",
                    "idNumber": "UJ/2018/CS/0090"
                  },
                  {
                    "_id": "6a11cd6633e251c0f37eb095",
                    "name": "Deborah Oladele",
                    "idNumber": "UJ0000ST0007"
                  },
                  {
                    "_id": "6a246254c7a2b1a77a79d994",
                    "name": "SHEILA JACK OONYE",
                    "idNumber": "UJ/2018/CS/0114"
                  }
                ],
                "supervisor": {
                  "_id": null,
                  "name": "TBD",
                  "role": "supervisor"
                }
              }
            },
            "unit2": {
              "Pediatrics_Unit_2": {
                "name": "Paediatric Nephrology",
                "unitId": "PAE02",
                "duration": 2,
                "postingType": "Pediatrics",
                "students": [
                  {
                    "_id": "6a24622fc7a2b1a77a79d964",
                    "name": "BELLO HARUNA DABO",
                    "idNumber": "UJ/2016/MD/0034"
                  },
                  {
                    "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
                    "name": "Draco Mordred",
                    "idNumber": "UJ/2018/CS/0123"
                  },
                  {
                    "_id": "6a246251c7a2b1a77a79d98f",
                    "name": "EMMANUEL ALERO SHALOM",
                    "idNumber": "UJ/2018/CS/0090"
                  },
                  {
                    "_id": "6a11cd6633e251c0f37eb095",
                    "name": "Deborah Oladele",
                    "idNumber": "UJ0000ST0007"
                  },
                  {
                    "_id": "6a246254c7a2b1a77a79d994",
                    "name": "SHEILA JACK OONYE",
                    "idNumber": "UJ/2018/CS/0114"
                  }
                ],
                "supervisor": {
                  "_id": null,
                  "name": "TBD",
                  "role": "supervisor"
                }
              }
            },
            "unit3": {
              "Pediatrics_Unit_3": {
                "name": "Paediatric Infectious Diseases",
                "unitId": "PAE03",
                "duration": 2,
                "postingType": "Pediatrics",
                "students": [
                  {
                    "_id": "6a24622fc7a2b1a77a79d964",
                    "name": "BELLO HARUNA DABO",
                    "idNumber": "UJ/2016/MD/0034"
                  },
                  {
                    "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
                    "name": "Draco Mordred",
                    "idNumber": "UJ/2018/CS/0123"
                  },
                  {
                    "_id": "6a246251c7a2b1a77a79d98f",
                    "name": "EMMANUEL ALERO SHALOM",
                    "idNumber": "UJ/2018/CS/0090"
                  },
                  {
                    "_id": "6a11cd6633e251c0f37eb095",
                    "name": "Deborah Oladele",
                    "idNumber": "UJ0000ST0007"
                  },
                  {
                    "_id": "6a246254c7a2b1a77a79d994",
                    "name": "SHEILA JACK OONYE",
                    "idNumber": "UJ/2018/CS/0114"
                  }
                ],
                "supervisor": {
                  "_id": null,
                  "name": "TBD",
                  "role": "supervisor"
                }
              }
            },
            "unit4": {
              "Pediatrics_Unit_4": {
                "name": "Emergency Paediatrics",
                "unitId": "PAE04",
                "duration": 2,
                "postingType": "Pediatrics",
                "students": [
                  {
                    "_id": "6a24622fc7a2b1a77a79d964",
                    "name": "BELLO HARUNA DABO",
                    "idNumber": "UJ/2016/MD/0034"
                  },
                  {
                    "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
                    "name": "Draco Mordred",
                    "idNumber": "UJ/2018/CS/0123"
                  },
                  {
                    "_id": "6a246251c7a2b1a77a79d98f",
                    "name": "EMMANUEL ALERO SHALOM",
                    "idNumber": "UJ/2018/CS/0090"
                  },
                  {
                    "_id": "6a11cd6633e251c0f37eb095",
                    "name": "Deborah Oladele",
                    "idNumber": "UJ0000ST0007"
                  },
                  {
                    "_id": "6a246254c7a2b1a77a79d994",
                    "name": "SHEILA JACK OONYE",
                    "idNumber": "UJ/2018/CS/0114"
                  }
                ],
                "supervisor": {
                  "_id": null,
                  "name": "TBD",
                  "role": "supervisor"
                }
              }
            }
          }
        },
        "groupB": {
          "posting": "O&G",
          "duration": 2,
          "totalNumberofUnitsPerStudent": 2,
          "units": {
            "unit1": {
              "OandG_Unit_1": {
                "name": "Antenatal Clinic",
                "unitId": "OBG01",
                "duration": 4,
                "postingType": "O&G",
                "students": [
                  {
                    "_id": "6a246235c7a2b1a77a79d96c",
                    "name": "YILYOK JOSEPH NAANGOE'AN",
                    "idNumber": "UJ/2016/MD/0268"
                  },
                  {
                    "_id": "6a246255c7a2b1a77a79d995",
                    "name": "DALANG KIRKI",
                    "idNumber": "UJ/2018/CS/0115"
                  },
                  {
                    "_id": "6a24624ac7a2b1a77a79d987",
                    "name": "DADEON PATIENCE",
                    "idNumber": "UJ/2018/CS/0058"
                  },
                  {
                    "_id": "6a11ce37d5f05867ff11aae4",
                    "name": "Success Oladele",
                    "idNumber": "UJ0000UN0002"
                  }
                ],
                "supervisor": {
                  "_id": null,
                  "name": "TBD",
                  "role": "supervisor"
                }
              }
            },
            "unit2": {
              "OandG_Unit_2": {
                "name": "Labour Ward",
                "unitId": "OBG02",
                "duration": 4,
                "postingType": "O&G",
                "students": [
                  {
                    "_id": "6a246235c7a2b1a77a79d96c",
                    "name": "YILYOK JOSEPH NAANGOE'AN",
                    "idNumber": "UJ/2016/MD/0268"
                  },
                  {
                    "_id": "6a246255c7a2b1a77a79d995",
                    "name": "DALANG KIRKI",
                    "idNumber": "UJ/2018/CS/0115"
                  },
                  {
                    "_id": "6a24624ac7a2b1a77a79d987",
                    "name": "DADEON PATIENCE",
                    "idNumber": "UJ/2018/CS/0058"
                  },
                  {
                    "_id": "6a11ce37d5f05867ff11aae4",
                    "name": "Success Oladele",
                    "idNumber": "UJ0000UN0002"
                  }
                ],
                "supervisor": {
                  "_id": null,
                  "name": "TBD",
                  "role": "supervisor"
                }
              }
            }
          }
        }
      }
    }
  },
  "saved": {
    "name": "O&G-Pediatrics Posting",
    "class": "6a23ecfee4d050388a83e619",
    "createdBy": "6a11afe5461f486b97474497",
    "postings": [
      {
        "name": "O&G-Pediatrics Posting",
        "category": "OG_PEDS",
        "startDate": "2026-01-05T00:00:00.000Z",
        "endDate": "2026-04-27T00:00:00.000Z",
        "groups": [
          {
            "groupId": null,
            "group": {
              "name": "Antenatal Clinic",
              "students": [
                {
                  "_id": "6a24622fc7a2b1a77a79d964",
                  "name": "BELLO HARUNA DABO",
                  "idNumber": "UJ/2016/MD/0034"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-01-05T00:00:00.000Z",
                "endDate": "2026-02-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-02T00:00:00.000Z",
                "endDate": "2026-03-30T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Labour Ward",
              "students": [
                {
                  "_id": "6a24622fc7a2b1a77a79d964",
                  "name": "BELLO HARUNA DABO",
                  "idNumber": "UJ/2016/MD/0034"
                },
                {
                  "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
                  "name": "Draco Mordred",
                  "idNumber": "UJ/2018/CS/0123"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-01-05T00:00:00.000Z",
                "endDate": "2026-02-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-02-02T00:00:00.000Z",
                "endDate": "2026-03-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-02T00:00:00.000Z",
                "endDate": "2026-03-30T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-30T00:00:00.000Z",
                "endDate": "2026-04-27T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Postnatal Ward",
              "students": [
                {
                  "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
                  "name": "Draco Mordred",
                  "idNumber": "UJ/2018/CS/0123"
                },
                {
                  "_id": "6a246251c7a2b1a77a79d98f",
                  "name": "EMMANUEL ALERO SHALOM",
                  "idNumber": "UJ/2018/CS/0090"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-01-05T00:00:00.000Z",
                "endDate": "2026-02-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-02-02T00:00:00.000Z",
                "endDate": "2026-03-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-02T00:00:00.000Z",
                "endDate": "2026-03-30T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-30T00:00:00.000Z",
                "endDate": "2026-04-27T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Gynaecology Ward",
              "students": [
                {
                  "_id": "6a246251c7a2b1a77a79d98f",
                  "name": "EMMANUEL ALERO SHALOM",
                  "idNumber": "UJ/2018/CS/0090"
                },
                {
                  "_id": "6a11cd6633e251c0f37eb095",
                  "name": "Deborah Oladele",
                  "idNumber": "UJ0000ST0007"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-01-05T00:00:00.000Z",
                "endDate": "2026-02-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-02-02T00:00:00.000Z",
                "endDate": "2026-03-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-02T00:00:00.000Z",
                "endDate": "2026-03-30T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-30T00:00:00.000Z",
                "endDate": "2026-04-27T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Emergency O&G",
              "students": [
                {
                  "_id": "6a11cd6633e251c0f37eb095",
                  "name": "Deborah Oladele",
                  "idNumber": "UJ0000ST0007"
                },
                {
                  "_id": "6a246254c7a2b1a77a79d994",
                  "name": "SHEILA JACK OONYE",
                  "idNumber": "UJ/2018/CS/0114"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-01-05T00:00:00.000Z",
                "endDate": "2026-02-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-02-02T00:00:00.000Z",
                "endDate": "2026-03-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-30T00:00:00.000Z",
                "endDate": "2026-04-27T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Family Planning",
              "students": [
                {
                  "_id": "6a246254c7a2b1a77a79d994",
                  "name": "SHEILA JACK OONYE",
                  "idNumber": "UJ/2018/CS/0114"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-02-02T00:00:00.000Z",
                "endDate": "2026-03-02T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Neonatology / SCBU",
              "students": [
                {
                  "_id": "6a246235c7a2b1a77a79d96c",
                  "name": "YILYOK JOSEPH NAANGOE'AN",
                  "idNumber": "UJ/2016/MD/0268"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-01-05T00:00:00.000Z",
                "endDate": "2026-01-19T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-02T00:00:00.000Z",
                "endDate": "2026-03-16T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Paediatric Nephrology",
              "students": [
                {
                  "_id": "6a246235c7a2b1a77a79d96c",
                  "name": "YILYOK JOSEPH NAANGOE'AN",
                  "idNumber": "UJ/2016/MD/0268"
                },
                {
                  "_id": "6a246255c7a2b1a77a79d995",
                  "name": "DALANG KIRKI",
                  "idNumber": "UJ/2018/CS/0115"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-01-05T00:00:00.000Z",
                "endDate": "2026-01-19T00:00:00.000Z"
              },
              {
                "startDate": "2026-01-19T00:00:00.000Z",
                "endDate": "2026-02-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-02T00:00:00.000Z",
                "endDate": "2026-03-16T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-16T00:00:00.000Z",
                "endDate": "2026-03-30T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Paediatric Infectious Diseases",
              "students": [
                {
                  "_id": "6a246235c7a2b1a77a79d96c",
                  "name": "YILYOK JOSEPH NAANGOE'AN",
                  "idNumber": "UJ/2016/MD/0268"
                },
                {
                  "_id": "6a246255c7a2b1a77a79d995",
                  "name": "DALANG KIRKI",
                  "idNumber": "UJ/2018/CS/0115"
                },
                {
                  "_id": "6a24624ac7a2b1a77a79d987",
                  "name": "DADEON PATIENCE",
                  "idNumber": "UJ/2018/CS/0058"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-01-05T00:00:00.000Z",
                "endDate": "2026-01-19T00:00:00.000Z"
              },
              {
                "startDate": "2026-01-19T00:00:00.000Z",
                "endDate": "2026-02-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-02-02T00:00:00.000Z",
                "endDate": "2026-02-16T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-02T00:00:00.000Z",
                "endDate": "2026-03-16T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-16T00:00:00.000Z",
                "endDate": "2026-03-30T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-30T00:00:00.000Z",
                "endDate": "2026-04-13T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Emergency Paediatrics",
              "students": [
                {
                  "_id": "6a246235c7a2b1a77a79d96c",
                  "name": "YILYOK JOSEPH NAANGOE'AN",
                  "idNumber": "UJ/2016/MD/0268"
                },
                {
                  "_id": "6a246255c7a2b1a77a79d995",
                  "name": "DALANG KIRKI",
                  "idNumber": "UJ/2018/CS/0115"
                },
                {
                  "_id": "6a24624ac7a2b1a77a79d987",
                  "name": "DADEON PATIENCE",
                  "idNumber": "UJ/2018/CS/0058"
                },
                {
                  "_id": "6a11ce37d5f05867ff11aae4",
                  "name": "Success Oladele",
                  "idNumber": "UJ0000UN0002"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-01-05T00:00:00.000Z",
                "endDate": "2026-01-19T00:00:00.000Z"
              },
              {
                "startDate": "2026-01-19T00:00:00.000Z",
                "endDate": "2026-02-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-02-02T00:00:00.000Z",
                "endDate": "2026-02-16T00:00:00.000Z"
              },
              {
                "startDate": "2026-02-16T00:00:00.000Z",
                "endDate": "2026-03-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-02T00:00:00.000Z",
                "endDate": "2026-03-16T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-16T00:00:00.000Z",
                "endDate": "2026-03-30T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-30T00:00:00.000Z",
                "endDate": "2026-04-13T00:00:00.000Z"
              },
              {
                "startDate": "2026-04-13T00:00:00.000Z",
                "endDate": "2026-04-27T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Nutrition Unit",
              "students": [
                {
                  "_id": "6a246255c7a2b1a77a79d995",
                  "name": "DALANG KIRKI",
                  "idNumber": "UJ/2018/CS/0115"
                },
                {
                  "_id": "6a24624ac7a2b1a77a79d987",
                  "name": "DADEON PATIENCE",
                  "idNumber": "UJ/2018/CS/0058"
                },
                {
                  "_id": "6a11ce37d5f05867ff11aae4",
                  "name": "Success Oladele",
                  "idNumber": "UJ0000UN0002"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-01-19T00:00:00.000Z",
                "endDate": "2026-02-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-02-02T00:00:00.000Z",
                "endDate": "2026-02-16T00:00:00.000Z"
              },
              {
                "startDate": "2026-02-16T00:00:00.000Z",
                "endDate": "2026-03-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-02T00:00:00.000Z",
                "endDate": "2026-03-16T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-16T00:00:00.000Z",
                "endDate": "2026-03-30T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-30T00:00:00.000Z",
                "endDate": "2026-04-13T00:00:00.000Z"
              },
              {
                "startDate": "2026-04-13T00:00:00.000Z",
                "endDate": "2026-04-27T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Paediatric Neurology",
              "students": [
                {
                  "_id": "6a24624ac7a2b1a77a79d987",
                  "name": "DADEON PATIENCE",
                  "idNumber": "UJ/2018/CS/0058"
                },
                {
                  "_id": "6a11ce37d5f05867ff11aae4",
                  "name": "Success Oladele",
                  "idNumber": "UJ0000UN0002"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-02-02T00:00:00.000Z",
                "endDate": "2026-02-16T00:00:00.000Z"
              },
              {
                "startDate": "2026-02-16T00:00:00.000Z",
                "endDate": "2026-03-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-16T00:00:00.000Z",
                "endDate": "2026-03-30T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-30T00:00:00.000Z",
                "endDate": "2026-04-13T00:00:00.000Z"
              },
              {
                "startDate": "2026-04-13T00:00:00.000Z",
                "endDate": "2026-04-27T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Paediatric Cardiology",
              "students": [
                {
                  "_id": "6a11ce37d5f05867ff11aae4",
                  "name": "Success Oladele",
                  "idNumber": "UJ0000UN0002"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-02-16T00:00:00.000Z",
                "endDate": "2026-03-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-30T00:00:00.000Z",
                "endDate": "2026-04-13T00:00:00.000Z"
              },
              {
                "startDate": "2026-04-13T00:00:00.000Z",
                "endDate": "2026-04-27T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Neonatology / SCBU",
              "students": [
                {
                  "_id": "6a24622fc7a2b1a77a79d964",
                  "name": "BELLO HARUNA DABO",
                  "idNumber": "UJ/2016/MD/0034"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-01-05T00:00:00.000Z",
                "endDate": "2026-01-19T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-02T00:00:00.000Z",
                "endDate": "2026-03-16T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Paediatric Nephrology",
              "students": [
                {
                  "_id": "6a24622fc7a2b1a77a79d964",
                  "name": "BELLO HARUNA DABO",
                  "idNumber": "UJ/2016/MD/0034"
                },
                {
                  "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
                  "name": "Draco Mordred",
                  "idNumber": "UJ/2018/CS/0123"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-01-05T00:00:00.000Z",
                "endDate": "2026-01-19T00:00:00.000Z"
              },
              {
                "startDate": "2026-01-19T00:00:00.000Z",
                "endDate": "2026-02-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-02T00:00:00.000Z",
                "endDate": "2026-03-16T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-16T00:00:00.000Z",
                "endDate": "2026-03-30T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Paediatric Infectious Diseases",
              "students": [
                {
                  "_id": "6a24622fc7a2b1a77a79d964",
                  "name": "BELLO HARUNA DABO",
                  "idNumber": "UJ/2016/MD/0034"
                },
                {
                  "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
                  "name": "Draco Mordred",
                  "idNumber": "UJ/2018/CS/0123"
                },
                {
                  "_id": "6a246251c7a2b1a77a79d98f",
                  "name": "EMMANUEL ALERO SHALOM",
                  "idNumber": "UJ/2018/CS/0090"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-01-05T00:00:00.000Z",
                "endDate": "2026-01-19T00:00:00.000Z"
              },
              {
                "startDate": "2026-01-19T00:00:00.000Z",
                "endDate": "2026-02-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-02-02T00:00:00.000Z",
                "endDate": "2026-02-16T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-02T00:00:00.000Z",
                "endDate": "2026-03-16T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-16T00:00:00.000Z",
                "endDate": "2026-03-30T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-30T00:00:00.000Z",
                "endDate": "2026-04-13T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Emergency Paediatrics",
              "students": [
                {
                  "_id": "6a24622fc7a2b1a77a79d964",
                  "name": "BELLO HARUNA DABO",
                  "idNumber": "UJ/2016/MD/0034"
                },
                {
                  "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
                  "name": "Draco Mordred",
                  "idNumber": "UJ/2018/CS/0123"
                },
                {
                  "_id": "6a246251c7a2b1a77a79d98f",
                  "name": "EMMANUEL ALERO SHALOM",
                  "idNumber": "UJ/2018/CS/0090"
                },
                {
                  "_id": "6a11cd6633e251c0f37eb095",
                  "name": "Deborah Oladele",
                  "idNumber": "UJ0000ST0007"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-01-05T00:00:00.000Z",
                "endDate": "2026-01-19T00:00:00.000Z"
              },
              {
                "startDate": "2026-01-19T00:00:00.000Z",
                "endDate": "2026-02-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-02-02T00:00:00.000Z",
                "endDate": "2026-02-16T00:00:00.000Z"
              },
              {
                "startDate": "2026-02-16T00:00:00.000Z",
                "endDate": "2026-03-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-02T00:00:00.000Z",
                "endDate": "2026-03-16T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-16T00:00:00.000Z",
                "endDate": "2026-03-30T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-30T00:00:00.000Z",
                "endDate": "2026-04-13T00:00:00.000Z"
              },
              {
                "startDate": "2026-04-13T00:00:00.000Z",
                "endDate": "2026-04-27T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Nutrition Unit",
              "students": [
                {
                  "_id": "6a2aa5afcaa7a2b3ce8d1d6e",
                  "name": "Draco Mordred",
                  "idNumber": "UJ/2018/CS/0123"
                },
                {
                  "_id": "6a246251c7a2b1a77a79d98f",
                  "name": "EMMANUEL ALERO SHALOM",
                  "idNumber": "UJ/2018/CS/0090"
                },
                {
                  "_id": "6a11cd6633e251c0f37eb095",
                  "name": "Deborah Oladele",
                  "idNumber": "UJ0000ST0007"
                },
                {
                  "_id": "6a246254c7a2b1a77a79d994",
                  "name": "SHEILA JACK OONYE",
                  "idNumber": "UJ/2018/CS/0114"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-01-19T00:00:00.000Z",
                "endDate": "2026-02-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-02-02T00:00:00.000Z",
                "endDate": "2026-02-16T00:00:00.000Z"
              },
              {
                "startDate": "2026-02-16T00:00:00.000Z",
                "endDate": "2026-03-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-02T00:00:00.000Z",
                "endDate": "2026-03-16T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-16T00:00:00.000Z",
                "endDate": "2026-03-30T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-30T00:00:00.000Z",
                "endDate": "2026-04-13T00:00:00.000Z"
              },
              {
                "startDate": "2026-04-13T00:00:00.000Z",
                "endDate": "2026-04-27T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Paediatric Neurology",
              "students": [
                {
                  "_id": "6a246251c7a2b1a77a79d98f",
                  "name": "EMMANUEL ALERO SHALOM",
                  "idNumber": "UJ/2018/CS/0090"
                },
                {
                  "_id": "6a11cd6633e251c0f37eb095",
                  "name": "Deborah Oladele",
                  "idNumber": "UJ0000ST0007"
                },
                {
                  "_id": "6a246254c7a2b1a77a79d994",
                  "name": "SHEILA JACK OONYE",
                  "idNumber": "UJ/2018/CS/0114"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-02-02T00:00:00.000Z",
                "endDate": "2026-02-16T00:00:00.000Z"
              },
              {
                "startDate": "2026-02-16T00:00:00.000Z",
                "endDate": "2026-03-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-16T00:00:00.000Z",
                "endDate": "2026-03-30T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-30T00:00:00.000Z",
                "endDate": "2026-04-13T00:00:00.000Z"
              },
              {
                "startDate": "2026-04-13T00:00:00.000Z",
                "endDate": "2026-04-27T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Paediatric Cardiology",
              "students": [
                {
                  "_id": "6a11cd6633e251c0f37eb095",
                  "name": "Deborah Oladele",
                  "idNumber": "UJ0000ST0007"
                },
                {
                  "_id": "6a246254c7a2b1a77a79d994",
                  "name": "SHEILA JACK OONYE",
                  "idNumber": "UJ/2018/CS/0114"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-02-16T00:00:00.000Z",
                "endDate": "2026-03-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-30T00:00:00.000Z",
                "endDate": "2026-04-13T00:00:00.000Z"
              },
              {
                "startDate": "2026-04-13T00:00:00.000Z",
                "endDate": "2026-04-27T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Paediatric Endocrinology",
              "students": [
                {
                  "_id": "6a246254c7a2b1a77a79d994",
                  "name": "SHEILA JACK OONYE",
                  "idNumber": "UJ/2018/CS/0114"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-04-13T00:00:00.000Z",
                "endDate": "2026-04-27T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Antenatal Clinic",
              "students": [
                {
                  "_id": "6a246235c7a2b1a77a79d96c",
                  "name": "YILYOK JOSEPH NAANGOE'AN",
                  "idNumber": "UJ/2016/MD/0268"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-01-05T00:00:00.000Z",
                "endDate": "2026-02-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-02T00:00:00.000Z",
                "endDate": "2026-03-30T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Labour Ward",
              "students": [
                {
                  "_id": "6a246235c7a2b1a77a79d96c",
                  "name": "YILYOK JOSEPH NAANGOE'AN",
                  "idNumber": "UJ/2016/MD/0268"
                },
                {
                  "_id": "6a246255c7a2b1a77a79d995",
                  "name": "DALANG KIRKI",
                  "idNumber": "UJ/2018/CS/0115"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-01-05T00:00:00.000Z",
                "endDate": "2026-02-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-02-02T00:00:00.000Z",
                "endDate": "2026-03-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-02T00:00:00.000Z",
                "endDate": "2026-03-30T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-30T00:00:00.000Z",
                "endDate": "2026-04-27T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Postnatal Ward",
              "students": [
                {
                  "_id": "6a246255c7a2b1a77a79d995",
                  "name": "DALANG KIRKI",
                  "idNumber": "UJ/2018/CS/0115"
                },
                {
                  "_id": "6a24624ac7a2b1a77a79d987",
                  "name": "DADEON PATIENCE",
                  "idNumber": "UJ/2018/CS/0058"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-01-05T00:00:00.000Z",
                "endDate": "2026-02-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-02-02T00:00:00.000Z",
                "endDate": "2026-03-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-02T00:00:00.000Z",
                "endDate": "2026-03-30T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-30T00:00:00.000Z",
                "endDate": "2026-04-27T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Gynaecology Ward",
              "students": [
                {
                  "_id": "6a24624ac7a2b1a77a79d987",
                  "name": "DADEON PATIENCE",
                  "idNumber": "UJ/2018/CS/0058"
                },
                {
                  "_id": "6a11ce37d5f05867ff11aae4",
                  "name": "Success Oladele",
                  "idNumber": "UJ0000UN0002"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-01-05T00:00:00.000Z",
                "endDate": "2026-02-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-02-02T00:00:00.000Z",
                "endDate": "2026-03-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-02T00:00:00.000Z",
                "endDate": "2026-03-30T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-30T00:00:00.000Z",
                "endDate": "2026-04-27T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          },
          {
            "groupId": null,
            "group": {
              "name": "Emergency O&G",
              "students": [
                {
                  "_id": "6a11ce37d5f05867ff11aae4",
                  "name": "Success Oladele",
                  "idNumber": "UJ0000UN0002"
                }
              ]
            },
            "assigned": [
              {
                "startDate": "2026-01-05T00:00:00.000Z",
                "endDate": "2026-02-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-02-02T00:00:00.000Z",
                "endDate": "2026-03-02T00:00:00.000Z"
              },
              {
                "startDate": "2026-03-30T00:00:00.000Z",
                "endDate": "2026-04-27T00:00:00.000Z"
              }
            ],
            "supervisorName": "TBD",
            "supervisor": null
          }
        ],
        "meta": {
          "generatedBy": "6a11afe5461f486b97474497"
        }
      }
    ],
    "groups": [],
    "_id": "6a44cae6efbc56300756eab5",
    "createdAt": "2026-07-01T08:08:06.491Z",
    "updatedAt": "2026-07-01T08:08:06.500Z",
    "__v": 0
  }
}