import { expect } from "chai";
import { build500LevelTimetablePlan } from "../src/utils/500LevelTimetable.ts";

describe("500-level timetable generation", () => {
  const courseCatalog = [
    { _id: "course-pae", code: "PAE", name: "Pediatrics" },
    { _id: "course-obg", code: "OBG", name: "Obstetrics and Gynaecology" },
    { _id: "course-com", code: "COM", name: "Community Medicine" },
    { _id: "course-oph", code: "OPH", name: "Ophthalmology" },
    { _id: "course-ane", code: "ANE", name: "Anaesthesiology" },
    { _id: "course-orl", code: "ORL", name: "ENT" },
    { _id: "course-rad", code: "RAD", name: "Radiology" },
    { _id: "course-psy", code: "PSY", name: "Psychiatry" },
  ];

  it("Phase 1: clinical posting template (morning meetings, activities, break, call, night call)", () => {
    const schedule = build500LevelTimetablePlan("phase1", courseCatalog);
    const monday = schedule.find((day) => day.day === "Monday");

    expect(monday?.periods).to.have.lengthOf(6);
    expect(monday?.periods[0]).to.deep.include({ kind: "clinical", startTime: "08:00", endTime: "10:00", displayLabel: "Morning Meetings" });
    expect(monday?.periods[1]).to.deep.include({ kind: "clinical", startTime: "10:00", endTime: "12:00", displayLabel: "Clinical Activities" });
    expect(monday?.periods[2]).to.deep.include({ kind: "empty", startTime: "12:00", endTime: "13:00", displayLabel: "Break" });
    expect(monday?.periods[3]).to.deep.include({ kind: "clinical", startTime: "13:00", endTime: "16:00" });
    expect(monday?.periods[4]).to.deep.include({ kind: "clinical", startTime: "16:00", endTime: "18:00", displayLabel: "Call / Tutorials" });
    expect(monday?.periods[5]).to.deep.include({ kind: "clinical", startTime: "18:00", endTime: "22:00", displayLabel: "Night Call" });
  });

  it("Phase 1: postings run all seven days including weekends, Friday identical to Monday", () => {
    const schedule = build500LevelTimetablePlan("phase1", courseCatalog);

    expect(schedule.map((day) => day.day)).to.deep.equal([
      "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    ]);
    const friday = schedule.find((day) => day.day === "Friday");
    const monday = schedule.find((day) => day.day === "Monday");
    expect(friday?.periods).to.deep.equal(monday?.periods);
  });

  it("Phase 2: rotates specialty postings by weekday (OPH/ANE/ORL/RAD/PSY) 8-10am", () => {
    const schedule = build500LevelTimetablePlan("phase2", courseCatalog);

    expect(schedule.find((day) => day.day === "Monday")?.periods[0]).to.deep.include({ kind: "course", courseCode: "OPH", startTime: "08:00", endTime: "10:00" });
    expect(schedule.find((day) => day.day === "Tuesday")?.periods[0]).to.deep.include({ kind: "course", courseCode: "ANE" });
    expect(schedule.find((day) => day.day === "Wednesday")?.periods[0]).to.deep.include({ kind: "course", courseCode: "ORL" });
    expect(schedule.find((day) => day.day === "Thursday")?.periods[0]).to.deep.include({ kind: "course", courseCode: "RAD" });
    expect(schedule.find((day) => day.day === "Friday")?.periods[0]).to.deep.include({ kind: "course", courseCode: "PSY" });
  });

  it("Phase 2: has clinical 10am-12pm, optional tutorials 12pm-3pm, and optional call duty 3pm-6pm", () => {
    const schedule = build500LevelTimetablePlan("phase2", courseCatalog);
    const monday = schedule.find((day) => day.day === "Monday");

    expect(monday?.periods[1]).to.deep.include({ kind: "clinical", startTime: "10:00", endTime: "12:00" });
    expect(monday?.periods[2]).to.deep.include({ kind: "optional", startTime: "12:00", endTime: "15:00", isOptional: true, displayLabel: "Tutorials/Presentations" });
    expect(monday?.periods[3]).to.deep.include({ kind: "optional", startTime: "15:00", endTime: "18:00", isOptional: true, displayLabel: "Call Duty/Tutorials" });
  });

  it("Phase 3: same clinical posting template as Phase 1", () => {
    const schedule = build500LevelTimetablePlan("phase3", courseCatalog);
    const monday = schedule.find((day) => day.day === "Monday");

    expect(monday?.periods).to.have.lengthOf(6);
    expect(monday?.periods[0]).to.deep.include({ kind: "clinical", startTime: "08:00", endTime: "10:00", displayLabel: "Morning Meetings" });
    expect(monday?.periods[2]).to.deep.include({ kind: "empty", startTime: "12:00", endTime: "13:00", displayLabel: "Break" });
  });
});
