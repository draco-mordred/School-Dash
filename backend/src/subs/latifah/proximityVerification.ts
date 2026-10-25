import Attendance from "../../models/attendance";
import LectureSession from "../../models/lectureSession";

// Phase D2 — proximity verification for auto-generated lecture attendance.
// Runs per-record as taps arrive (evaluateProximity at submit time) and
// again from the 5-minute tick / 18:00 SLA sweeper for records left
// provisional. Verification order per design: student<->venue distance
// first, then lecturer presence.

export const haversineMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) => {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
};

// Pure verdict (unit-testable in Phase G). Order per design:
// 1. self-declared absent needs no GPS corroboration;
// 2. no student coords (GPS-only v1) -> unverified;
// 3. out of venue radius -> out-of-range, Present becomes unverified (D2);
// 4. lecturer GPS missing -> provisional "lecturer-absent", re-checked later;
// 5. otherwise verified.
export const evaluateProximity = (record: any, session: any) => {
  if (record?.status === "absent") {
    return { verificationStatus: "verified", markRecordUnverified: false, provisional: false };
  }
  const proximity = record?.proximity ?? {};
  const hasStudentCoords =
    proximity.studentLat != null && proximity.studentLng != null;
  const distance = proximity.distanceMeters ?? null;
  if (!hasStudentCoords || distance == null) {
    return { verificationStatus: "unverified", markRecordUnverified: true, provisional: false };
  }
  const radius = session?.venueSnapshot?.radiusMeters ?? 150;
  if (distance > radius) {
    return { verificationStatus: "out-of-range", markRecordUnverified: true, provisional: false };
  }
  const lecturerCheckedIn =
    session?.lecturerCheckIn?.at != null &&
    session?.lecturerCheckIn?.verified === true;
  if (!lecturerCheckedIn) {
    return { verificationStatus: "lecturer-absent", markRecordUnverified: false, provisional: true };
  }
  return { verificationStatus: "verified", markRecordUnverified: false, provisional: false };
};

const applyVerdict = async (recordId: any, verdict: any) => {
  const update: any = {
    "proximity.verificationStatus": verdict.verificationStatus,
  };
  if (verdict.markRecordUnverified) {
    update.status = "unverified";
  }
  await Attendance.updateOne({ _id: recordId }, { $set: update });
};

// Re-verify every pending/provisional record of one session. Used after the
// lecturer checks in and by the SLA sweeper for a final pass.
export const processSessionVerifications = async (
  session: any,
  _now = new Date(),
) => {
  const records = await Attendance.find({
    session: session._id,
    "proximity.verificationStatus": { $in: ["pending", "lecturer-absent"] },
  }).lean<any[]>();
  let verified = 0;
  let unverified = 0;
  let provisional = 0;
  for (const record of records) {
    const verdict = evaluateProximity(record, session);
    await applyVerdict(record._id, verdict);
    if (verdict.provisional) provisional += 1;
    else if (verdict.verificationStatus === "verified") verified += 1;
    else unverified += 1;
  }
  return { processed: records.length, verified, unverified, provisional };
};

// Re-verify all pending/provisional auto records (tick step 4). Sessions are
// cached per run to avoid refetching per record.
export const processPendingVerifications = async (_now = new Date()) => {
  const records = await Attendance.find({
    session: { $ne: null },
    "proximity.verificationStatus": { $in: ["pending", "lecturer-absent"] },
  }).lean<any[]>();
  const sessionCache = new Map<string, any>();
  const getSession = async (id: any) => {
    const key = String(id);
    if (!sessionCache.has(key)) {
      sessionCache.set(key, await LectureSession.findById(id).lean<any>());
    }
    return sessionCache.get(key) ?? null;
  };
  let verified = 0;
  let unverified = 0;
  let provisional = 0;
  for (const record of records) {
    const session = await getSession(record.session);
    if (!session) continue;
    const verdict = evaluateProximity(record, session);
    await applyVerdict(record._id, verdict);
    if (verdict.provisional) provisional += 1;
    else if (verdict.verificationStatus === "verified") verified += 1;
    else unverified += 1;
  }
  return { processed: records.length, verified, unverified, provisional };
};
