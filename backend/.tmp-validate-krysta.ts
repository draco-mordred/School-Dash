import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import mongoose from 'mongoose';
import ClassModel from './src/models/classes.ts';
import Department from './src/models/departments.ts';
import Unit from './src/models/units.ts';
import { generateKrystaSchedule } from './src/services/krystaGenerator.ts';

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('Missing MongoDB URI');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 20000,
    connectTimeoutMS: 5000,
  });
  console.log('Connected to', mongoose.connection.host);

  const cls = await ClassModel.findOne({}).lean();
  if (!cls) throw new Error('No class found');
  console.log('Class:', String(cls._id), cls.name, 'students=', Array.isArray(cls.students) ? cls.students.length : 0);

  const department = await Department.findOne({}).lean();
  if (!department) throw new Error('No department found');
  console.log('Department:', String(department._id), department.name, department.code, department.departmentID);

  const units = await Unit.find({ department: department._id }).lean();
  console.log('Department units count:', units.length);
  if (units.length === 0) throw new Error('No units found for department');
  console.log('Sample units:', units.slice(0, 6).map((u) => ({ id: String(u._id), name: u.name, code: u.code, unitID: u.unitID })));

  const activeUnitIds = units.slice(0, 6).map((u) => String(u._id));
  const payload = {
    classId: String(cls._id),
    name: 'Krysta Validation Posting',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000).toISOString(),
    departments: [
      {
        departmentId: department.departmentID || department.name,
        activeUnitIds,
        departmentDurationWeeks: 8,
        unitDurationWeeks: 2,
        useUnits: true,
      },
    ],
  };

  const result = await generateKrystaSchedule(payload as any);
  console.log('Generated timeline count:', result.meta?.timeline?.length);
  console.log('Posting spin:', result.postings?.[0]?.spin);
  console.log('Posting spinBase:', result.postings?.[0]?.spinBase);
  console.log('Posting groups sample:', (result.postings?.[0]?.groups || []).map((g: any) => ({ supervisorName: g.supervisorName, groupName: g.group?.name })));
  console.log('Phases count:', result.meta?.phases?.length);
  console.log('Sample timeline windows:');
  (result.meta?.timeline || []).slice(0, 8).forEach((w: any, i: number) => {
    console.log(i, {
      phaseIndex: w.phaseIndex,
      departmentId: w.departmentId,
      departmentName: w.departmentName,
      departmentCode: w.departmentCode,
      unitGroupIndex: w.unitGroupIndex,
      unitId: w.unitId,
      unitName: w.unitName,
      unitCode: w.unitCode,
      studentCount: Array.isArray(w.studentIds) ? w.studentIds.length : 0,
      supervisorName: w.supervisorName,
      startDate: w.startDate,
      endDate: w.endDate,
    });
  });
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
