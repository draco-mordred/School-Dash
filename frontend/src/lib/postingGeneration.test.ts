import { describe, expect, it } from "vitest";
import { getEligibleDepartmentsForPhase, getPostingPhaseOptions } from "./postingGeneration";

describe("posting generation helpers", () => {
  it("builds phase options from academic clock config", () => {
    const options = getPostingPhaseOptions({
      phaseConfig: {
        phase1: {
          name: "O&G Junior",
          subPostings: ["Obstetrics and Gynecology", "Pediatrics"],
        },
        phase2: {
          name: "Specialty",
          subPostings: ["Psychiatry"],
        },
      },
    });

    expect(options).toEqual([
      {
        id: "phase1",
        label: "O&G Junior",
        subPostings: ["Obstetrics and Gynecology", "Pediatrics"],
      },
      {
        id: "phase2",
        label: "Specialty",
        subPostings: ["Psychiatry"],
      },
    ]);
  });

  it("falls back to class-level phase subPostings when academic clock phase config omits them", () => {
    const options = getPostingPhaseOptions(
      { phaseConfig: { phase1: { name: "O&G Junior" } } },
      [{ id: "phase1", name: "O&G Junior", subPostings: ["O&G Junior", "Pediatrics Junior"] }],
    );

    expect(options).toEqual([
      {
        id: "phase1",
        label: "O&G Junior",
        subPostings: ["O&G Junior", "Pediatrics Junior"],
      },
    ]);
  });

  it("matches phase sub-postings to institution departments", () => {
    const departments = getEligibleDepartmentsForPhase(
      {
        phaseConfig: {
          phase1: {
            name: "O&G Junior",
            subPostings: ["Obstetrics and Gynecology", "Pediatrics"],
          },
        },
      },
      [
        { _id: "dept-1", name: "Obstetrics and Gynecology", code: "OBG" },
        { _id: "dept-2", name: "Surgery", code: "SUR" },
        { _id: "dept-3", name: "Pediatrics", code: "PED" },
      ],
      "phase1",
    );

    expect(departments.map((department) => department.canonicalName)).toEqual(["Department of Obstetrics and Gynecology", "Department of Pediatrics"]);
  });

  it("normalizes common department aliases from academic clock phases", () => {
    const departments = getEligibleDepartmentsForPhase(
      {
        phaseConfig: {
          phase1: {
            name: "OG/Peds",
            subPostings: ["O&G", "Peds"],
          },
        },
      },
      [
        { _id: "dept-1", name: "Department of Obstetrics and Gynecology", code: "OBG" },
        { _id: "dept-2", name: "Department of Pediatrics", code: "PAE" },
        { _id: "dept-3", name: "Department of Medicine", code: "MED" },
      ],
      "phase1",
    );

    expect(departments.map((department) => department.canonicalName)).toEqual([
      "Department of Obstetrics and Gynecology",
      "Department of Pediatrics",
    ]);
  });

  it("does not overmatch medicine when the posting name is a different medicine-based department", () => {
    const departments = getEligibleDepartmentsForPhase(
      {
        phaseConfig: {
          phase1: {
            name: "Community Medicine",
            subPostings: ["Department of Community Medicine"],
          },
        },
      },
      [
        { _id: "dept-1", name: "Department of Medicine", code: "MED" },
        { _id: "dept-2", name: "Department of Community Medicine", code: "COM" },
      ],
      "phase1",
    );

    expect(departments.map((department) => department.canonicalName)).toEqual(["Department of Community Medicine"]);
  });

  it("matches KLAS-style posting labels like O&G Junior to the correct department", () => {
    const departments = getEligibleDepartmentsForPhase(
      {
        phaseConfig: {
          phase1: {
            name: "O&G Junior",
            subPostings: ["O&G Junior", "Pediatrics Junior"],
          },
        },
      },
      [
        { _id: "dept-1", name: "Department of Obstetrics and Gynecology", code: "OBG" },
        { _id: "dept-2", name: "Department of Pediatrics", code: "PAE" },
      ],
      "phase1",
    );

    expect(departments.map((department) => department.canonicalName)).toEqual([
      "Department of Obstetrics and Gynecology",
      "Department of Pediatrics",
    ]);
  });

  it("returns one department entry per phase posting even when one posting has no department match", () => {
    const departments = getEligibleDepartmentsForPhase(
      {
        phaseConfig: {
          phase1: {
            name: "Mixed Phase",
            subPostings: ["Unknown Posting", "Pediatrics"],
          },
        },
      },
      [{ _id: "dept-1", name: "Department of Pediatrics", code: "PED" }],
      "phase1",
    );

    expect(departments).toHaveLength(2);
    expect(departments.map((department) => department.canonicalName)).toEqual(["Unknown Posting", "Department of Pediatrics"]);
  });
});
