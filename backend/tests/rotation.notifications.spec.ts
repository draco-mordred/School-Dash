import { expect } from "chai";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.ts";
import User from "../src/models/user.ts";
import ClinicalRotation from "../src/models/clinicalRotation.ts";
import { Notification } from "../src/models/notification.ts";
import { createClinicalRotation } from "../src/controllers/clinicalRotation.ts";

// Simple mock response object
function createMockRes() {
  let statusCode = 200;
  let body: any = null;
  return {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: any) {
      body = payload;
      return payload;
    },
    _getStatus() { return statusCode; },
    _getBody() { return body; },
  } as any;
}

describe("Clinical rotation -> Notifications integration", function () {
  this.timeout(20000);

  before(async () => {
    await connectDB();
    // ensure clean collections for test
    await Notification.deleteMany({});
    await ClinicalRotation.deleteMany({});
    await User.deleteMany({});
  });

  after(async () => {
    // cleanup
    await Notification.deleteMany({});
    await ClinicalRotation.deleteMany({});
    await User.deleteMany({});
    // close mongoose connection
    await mongoose.connection.close();
  });

  it("creates notifications when a clinical rotation is created", async () => {
    // create some users to be notified
    const admin = await User.create({ name: "Test Admin", email: "test.admin@example.com", password: "Password123!", role: "admin", isActive: true });
    const student = await User.create({ name: "Test Student", email: "test.student@example.com", password: "Password123!", role: "student", isActive: true });
    const teacher = await User.create({ name: "Test Teacher", email: "test.teacher@example.com", password: "Password123!", role: "teacher", isActive: true });

    const req: any = {
      body: {
        rotationName: "Integration Test Rotation",
        rotationDescription: "Rotation created during test",
        rotationType: "medicine",
        rotationStartDate: new Date().toISOString(),
        rotationEndDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        rotationUnit: "Test Unit",
      },
      user: { _id: admin._id.toString(), role: admin.role },
    };

    const res = createMockRes();

    // call controller directly
    await createClinicalRotation(req, res);

    const createdRotation = await ClinicalRotation.findOne({ rotationName: "Integration Test Rotation" });
    expect(createdRotation, "rotation should be created").to.exist;

    // Notifications should be created for active users
    const notifs = await Notification.find({ "metadata.rotationId": createdRotation?._id });
    expect(notifs.length, "notifications should be created for users").to.be.greaterThan(0);

    // Each notification should include title and message
    notifs.forEach((n) => {
      expect(n.title).to.be.a("string");
      expect(n.message).to.be.a("string");
      expect(n.isRead).to.equal(false);
    });
  });
});
