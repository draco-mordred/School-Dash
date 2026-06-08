import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../src/config/db";
// Ensure DNS servers are set like the main server to resolve Atlas SRV records
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
import User from "../src/models/user";

async function seed() {
  await connectDB();
  console.log("Seeding demo users...");

  const demoUsers = [
    { name: "Admin Demo", email: "admin.demo@example.com", password: "Password123!", role: "admin", isActive: true },
    { name: "Teacher One", email: "teacher.one@example.com", password: "Password123!", role: "teacher", isActive: true },
    { name: "Teacher Two", email: "teacher.two@example.com", password: "Password123!", role: "teacher", isActive: false },
    { name: "Student A", email: "student.a@example.com", password: "Password123!", role: "student", isActive: true },
    { name: "Student B", email: "student.b@example.com", password: "Password123!", role: "student", isActive: false },
    { name: "Parent One", email: "parent.one@example.com", password: "Password123!", role: "parent", isActive: true },
    { name: "Unit Consultant", email: "consultant@example.com", password: "Password123!", role: "unit_consultant", isActive: true },
    { name: "Unit Resident", email: "resident@example.com", password: "Password123!", role: "unit_resident", isActive: false },
  ];

  for (const u of demoUsers) {
    // ensure each demo user has a unique idNumber to avoid duplicate key collisions
    const rolePrefixMap: Record<string, string> = {
      admin: "UJ0000AD",
      teacher: "UJ0000TE",
      student: "UJ0000ST",
      parent: "UJ0000PA",
      unit_consultant: "UJ0000UC",
      unit_resident: "UJ0000UR",
    };
    const prefix = rolePrefixMap[(u as any).role] || "UJ0000ST";
    const random4 = Math.floor(1000 + Math.random() * 9000).toString();
    (u as any).idNumber = (u as any).idNumber || `${prefix}${random4}`;

    const exists = await User.findOne({ email: u.email });
    if (exists) {
      console.log(`User exists: ${u.email} -> updating isActive=${u.isActive}`);
      exists.isActive = u.isActive;
      exists.role = (u as any).role;
      await exists.save();
      continue;
    }
    try {
      const created = await User.create(u as any);
      console.log(`Created: ${created.email} (${created.role})`);
    } catch (err) {
      console.error(`Failed to create ${u.email}:`, err);
    }
  }

  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
