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

  it("Phase 1: Mon-Thurs has PAE 8-10am, clinical 10am-1pm, break 1-1:30pm, OBG 1:30-3pm", () => {
    const schedule = build500LevelTimetablePlan("phase1", courseCatalog);
    const monday = schedule.find((day) => day.day === "Monday");

    expect(monday?.periods).to.have.lengthOf(4);
    expect(monday?.periods[0]).to.deep.include({ kind: "course", courseCode: "PAE", startTime: "08:00", endTime: "10:00" });
    expect(monday?.periods[1]).to.deep.include({ kind: "clinical", startTime: "10:00", endTime: "13:00" });
    expect(monday?.periods[2]).to.deep.include({ kind: "empty", startTime: "13:00", endTime: "13:30" });
    expect(monday?.periods[3]).to.deep.include({ kind: "course", courseCode: "OBG", startTime: "13:30", endTime: "15:00" });
  });

  it("Phase 1: Friday has COM 8-10am, break 10am-1pm, OBG 1-3pm", () => {
    const schedule = build500LevelTimetablePlan("phase1", courseCatalog);
    const friday = schedule.find((day) => day.day === "Friday");

    expect(friday?.periods).to.have.lengthOf(4);
    expect(friday?.periods[0]).to.deep.include({ kind: "course", courseCode: "COM" });
    expect(friday?.periods[1]).to.deep.include({ kind: "empty" }); // 10am-12pm break
    expect(friday?.periods[2]).to.deep.include({ kind: "empty" }); // 12pm-1pm blank
    expect(friday?.periods[3]).to.deep.include({ kind: "course", courseCode: "OBG" });
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

  it("Phase 3: Mon-Thurs has morning meetings 8-10am, clinical 10am-1pm, break 1-1:30pm, OBG 1:30-3pm", () => {
    const schedule = build500LevelTimetablePlan("phase3", courseCatalog);
    const monday = schedule.find((day) => day.day === "Monday");

    expect(monday?.periods[0]).to.deep.include({ kind: "empty", startTime: "08:00", endTime: "10:00" }); // Morning meetings
    expect(monday?.periods[1]).to.deep.include({ kind: "clinical", startTime: "10:00", endTime: "13:00" });
    expect(monday?.periods[2]).to.deep.include({ kind: "empty", startTime: "13:00", endTime: "13:30" });
    expect(monday?.periods[3]).to.deep.include({ kind: "course", courseCode: "OBG" });
  });
});
