import mongoose from "mongoose";
import dotenv from "dotenv";
import Attendance from "../src/models/attendance";

dotenv.config();

// One-off backfill: existing records created via POST /attendance/record lack
// dayOfWeek, which excludes them from the This-Week and per-day views.
// Run: cd backend && bunx tsx scripts/backfillDayOfWeek.ts
async function main() {
  const mongoUrl = process.env.MONGO_URL ?? process.env.MONGODB_URI ?? process.env.MEDLOG_MONGO_URL;
  if (!mongoUrl) {
    console.error("No Mongo connection string found in env (MONGO_URL / MONGODB_URI).");
    process.exit(1);
  }
  await mongoose.connect(mongoUrl);

  const dayMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const records = await Attendance.find({
    $or: [{ dayOfWeek: { $exists: false } }, { dayOfWeek: null }, { dayOfWeek: "" }],
  });

  let updated = 0;
  for (const record of records) {
    record.dayOfWeek = dayMap[new Date(record.date).getDay()];
    await record.save();
    updated += 1;
  }

  console.log(`Backfilled dayOfWeek on ${updated} record(s).`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
