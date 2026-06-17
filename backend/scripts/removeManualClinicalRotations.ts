import { connectDB } from "../src/config/db";
import ClinicalRotation from "../src/models/clinicalRotation";

async function run(dryRun = true) {
  await connectDB();
  console.log("Connected to DB");

  // Find clinical rotations that were NOT generated from a schedule
  const filter = { $or: [{ generatedFromSchedule: { $exists: false } }, { generatedFromSchedule: null }] };
  const count = await ClinicalRotation.countDocuments(filter);
  console.log(`Found ${count} clinical rotations that appear to be manual (no generatedFromSchedule)`);

  if (count === 0) {
    console.log("Nothing to delete.");
    process.exit(0);
  }

  if (dryRun) {
    console.log("Dry run mode. To actually delete these documents, re-run with --apply flag.");
    process.exit(0);
  }

  const res = await ClinicalRotation.deleteMany(filter);
  console.log(`Deleted ${res.deletedCount} manual clinical rotations.`);
  process.exit(0);
}

const args = process.argv.slice(2);
const dry = args.includes("--apply") ? false : true;
run(dry).catch((e) => { console.error(e); process.exit(1); });
