import mongoose from "mongoose";
import { expect } from "chai";
import generateRotationSchedule from "../src/services/rotationScheduler";
import User from "../src/models/user";
import ClassModel from "../src/models/classes";
import AcademicYear from "../src/models/academicYear";
import RotationScheduleModel from "../src/models/rotationPlan";
import ScheduledNotification from "../src/models/scheduledNotification";
import { connectDB } from "../src/config/db";

describe("generateRotationSchedule", function () {
  this.timeout(20000);

  before(async () => {
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/schooldash-test";
    await mongoose.connect(uri as string);
  });

  after(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await RotationScheduleModel.deleteMany({});
    await ScheduledNotification.deleteMany({});
    await User.deleteMany({});
    await ClassModel.deleteMany({});
    await AcademicYear.deleteMany({});
  });

  it("creates a rotation schedule and schedules notifications", async () => {
    // create academic year
    const ay = await AcademicYear.create({ name: "2026/2027", fromYear: new Date(), toYear: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), isCurrent: true });

    // create students
    const students = [] as any[];
    for (let i = 0; i < 6; i++) {
      const u = await User.create({ name: `Student ${i + 1}`, password: "password", role: "student" });
      students.push(u);
    }

    const cls = await ClassModel.create({ name: "400 level Test", academicYear: ay._id, students: students.map((s) => s._id) });

    const admin = await User.create({ name: "Admin", password: "password", role: "admin" });

    const schedule = await generateRotationSchedule(String(ay._id), String(cls._id), { level: 400, generatedBy: String(admin._id) });
    expect(schedule).to.exist;
    const found = await RotationScheduleModel.findById(schedule._id);
    expect(found).to.exist;

    const scheduledCount = await ScheduledNotification.countDocuments({});
    expect(scheduledCount).to.be.greaterThan(0);
  });
});
