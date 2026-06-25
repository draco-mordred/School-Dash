import { connectDB } from "../src/config/db";
import RotationScheduleModel, { RotationGroupModel } from "../src/models/rotationPlan";
import ClassModel from "../src/models/classes";
const UserModel = require("../src/models/user").default;

async function backfill(dryRun = true) {
  await connectDB();
  console.log("Connected to DB");

  // Find all rotation schedules and map class -> classTeacher
  const schedules = await RotationScheduleModel.find({}).populate("class").lean();
  const classTeacherByClassId: Record<string, any> = {};
  for (const s of schedules) {
    const cls: any = s.class as any;
    if (cls && cls._id && cls.classTeacher) {
      classTeacherByClassId[String(cls._id)] = cls.classTeacher;
    }
  }

  // Find groups without supervisor
  const groups = await RotationGroupModel.find({ $or: [{ supervisor: null }, { supervisor: { $exists: false } }] }).lean();
  console.log(`Found ${groups.length} groups without supervisor`);

  let updated = 0;
  for (const g of groups) {
    // try to find classTeacher from any schedule that references this group
    let chosen: any = null;
    const schedulesWithGroup = schedules.filter((s: any) => (s.groups || []).some((gr: any) => String(gr) === String(g._id)));
    if (schedulesWithGroup.length) {
      const cls = schedulesWithGroup[0].class as any;
      if (cls && cls.classTeacher) chosen = cls.classTeacher;
    }

    // fallback: find any active supervisor (prefer higher supervisorRank)
    if (!chosen) {
      chosen = await UserModel.findOne({ isActive: true, isSupervisor: true, role: { $in: ["unitconsultant", "teacher", "unitresident"] } }).select("_id supervisorRank").sort({ supervisorRank: -1 }).lean();
    }

    if (chosen) {
      if (!dryRun) {
        await RotationGroupModel.findByIdAndUpdate(g._id, { supervisor: chosen._id });
      }
      updated++;
      console.log(`Group ${g._id} -> supervisor ${String(chosen._id)}`);
    } else {
      console.log(`No supervisor found for group ${g._id}`);
    }
  }

  console.log(`Updated ${updated} groups (dryRun=${dryRun})`);
  process.exit(0);
}

const args = process.argv.slice(2);
const dry = args.includes("--apply") ? false : true;
backfill(dry).catch((e) => { console.error(e); process.exit(1); });
