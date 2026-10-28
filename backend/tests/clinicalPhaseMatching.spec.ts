import { describe, expect, test } from "bun:test";
import {
  detectDepartmentCodes,
  matchCoursesToPhase,
  phaseDepartmentCodes,
  selectPlanForPhase,
} from "../src/utils/clinicalPhaseMatching";

describe("clinicalPhaseMatching", () => {
  test("detects OBG/PAE from phase and schedule names", () => {
    expect(phaseDepartmentCodes({ name: "O&G/Pediatrics Senior Postings" })).toEqual(["OBG", "PAE"]);
    expect(detectDepartmentCodes("500 Level OG/PAE Senior Posting Schedule")).toEqual(["OBG", "PAE"]);
    expect(detectDepartmentCodes("Medicine and Surgery Initial Clinical Postings")).toContain("MED");
    expect(detectDepartmentCodes("Medicine and Surgery Initial Clinical Postings")).toContain("SUR");
  });

  test("junior phase never matches a senior plan and vice versa", () => {
    const phase = { name: "O&G/Pediatrics Junior Postings" };
    const seniorPlan = {
      name: "500 Level OG/PAE Senior Postings",
      postings: [{ name: "500 Level OG/PAE Senior Postings", groups: [] }],
    };
    const juniorPlan = {
      name: "500 Level OG/PAE Junior Postings",
      postings: [{ name: "500 Level OG/PAE Junior Postings", groups: [] }],
    };
    const picked = selectPlanForPhase([seniorPlan, juniorPlan], phase);
    expect(picked?.posting?.name).toContain("Junior");
  });

  test("phase without codes does not match unrelated plans", () => {
    const phase = { name: "4th MBBS Exams" };
    const plan = { name: "Specialty Posting Schedule", postings: [{ name: "Specialty", groups: [] }] };
    expect(selectPlanForPhase([plan], phase)).toBeNull();
  });

  test("exact posting name match wins", () => {
    const phase = { name: "O&G/Pediatrics Senior Postings" };
    const plans = [
      { name: "500 Level OG/PAE Senior Postings", postings: [{ name: "Phase 3 Posting", groups: [] }] },
      { name: "500 Level OG/PAE Senior Postings", postings: [{ name: "Phase 3 Posting", groups: [] }, { name: "Exact Posting", groups: [] }] },
    ];
    const picked = selectPlanForPhase(plans, phase, "Exact Posting");
    expect(picked?.exact).toBe(true);
    expect(picked?.posting?.name).toBe("Exact Posting");
  });

  test("matches courses by code prefix and long name", () => {
    const phase = {
      name: "O&G/Pediatrics Senior Postings",
      subPostings: ["Obstetrics and Gynaecology", "Paediatrics"],
    };
    const courses = [
      { _id: "1", code: "OBG 501", name: "Obstetrics and Gynaecology" },
      { _id: "2", code: "PAE501", name: "Paediatrics" },
      { _id: "3", code: "SUR 501", name: "Surgery" },
      { _id: "4", code: "MED501", name: "Internal Medicine" },
    ];
    const matched = matchCoursesToPhase(courses, phase).map((c: any) => String(c.code));
    expect(matched).toContain("OBG 501");
    expect(matched).toContain("PAE501");
    expect(matched).not.toContain("SUR 501");
    expect(matched).not.toContain("MED501");
  });

  test("explicit courseIds win when they resolve", () => {
    const phase = { name: "O&G/Pediatrics Senior Postings", courseIds: ["3"] };
    const courses = [
      { _id: "1", code: "OBG", name: "Obstetrics and Gynaecology" },
      { _id: "3", code: "SUR", name: "Surgery" },
    ];
    expect(matchCoursesToPhase(courses, phase).map((c: any) => String(c._id))).toEqual(["3"]);
  });

  test("no recognisable department returns all courses", () => {
    const courses = [{ _id: "1", code: "XXX", name: "Random Course" }];
    expect(matchCoursesToPhase(courses, { name: "4th MBBS Exams" })).toHaveLength(1);
  });
});
