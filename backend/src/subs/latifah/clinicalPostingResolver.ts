import mongoose from "mongoose";
import RotationPlan from "../../models/rotationPlan";
import Timetable from "../../models/timetable";
import ClinicalAttendance from "../../models/clinicalAttendance";
import { Notification } from "../../models/notification";

// Phase H — clinical posting/team model (flow as described by Israel).
//
// H1: clinical students resolve to exactly one active team + supervisor
//     per day via the KRYSTA RotationPlan data (postings[].groups[] carry
//     the student list, an `assigned` date-window list, and the
//     supervisor). Supervisor identity will drive clinical session
//     authorization (Phase I).
//
// H3: clinical activities are open-ended — the supervisor closes the
//     session by submitting (Phase I/J). Until then, the 5-minute
//     attendance tick nudges the supervisor to CREATE the session: first
//     at 15 minutes before the scheduled (timetable) end time, then every
//     30 minutes afterwards, capped 4 hours after the scheduled end.
//     Clinical weekend activities are allowed (D10) — this does NOT skip
//     weekends.
//
// Nudge "session already created" check: KRYSTA stores supervisorGroupId
// as "unit:<index>" / "department:<index>" (see
// clinicalAttendanceGroupSelection), NOT the group name — so the check
// matches any session created by the supervisor today, group-agnostic.

export const NUDGE_LEAD_MS = 15 * 60 * 1000;
export const NUDGE_INTERVAL_MS = 30 * 60 * 1000;
export const NUDGE_MAX_AFTER_END_MS = 4 * 60 * 60 * 1000;

const DAY_MAP: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

const HH_MM = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const IS_OBJECT_ID = (v: unknown) =>
  typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);

const toObjectId = (v: any) => {
  if (v && typeof v === "object" && String((v as any).constructor?.name) === "ObjectId") {
    return v;
  }
  const s = String(v ?? "");
  return IS_OBJECT_ID(s) ? new mongoose.Types.ObjectId(s) : null;
};

// "HH:MM" on the same (local) day as `day`.
export const timeOnDay = (hhmm: string, day: Date): Date | null => {
  if (!HH_MM.test(hhmm ?? "")) return null;
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
};

// Student ids of a RotationPlan group ref. `group.group.students` is a
// Mixed field; entries may be plain ids or { _id, name, idNumber } docs.
export const groupStudentIds = (groupRef: any): string[] => {
  const students = groupRef?.group?.students;
  if (!Array.isArray(students)) return [];
  const ids: string[] = [];
  for (const entry of students) {
    const id =
      (entry as any)?._id ?? (entry as any)?.id ?? (entry as any)?.student ?? entry;
    if (id == null) continue;
    if (typeof id === "object") {
      const inner = (id as any)._id ?? (id as any).id;
      if (inner != null) ids.push(String(inner));
    } else {
      ids.push(String(id));
    }
  }
  return ids;
};

// Does any `assigned` window of the group cover `date`?
export const windowCovers = (assigned: any, date: Date): boolean => {
  for (const w of Array.isArray(assigned) ? assigned : []) {
    const s = w?.startDate ? new Date(w.startDate).getTime() : NaN;
    const e = w?.endDate ? new Date(w.endDate).getTime() : NaN;
    if (
      Number.isFinite(s) &&
      Number.isFinite(e) &&
      date.getTime() >= s &&
      date.getTime() <= e
    ) {
      return true;
    }
  }
  return false;
};

// First group of this posting that contains the student with an assigned
// window covering `date`. Returns { groupRef, window } or null.
export const findGroupWindowForStudent = (
  groupRefs: any,
  studentId: string,
  date: Date,
) => {
  for (const groupRef of Array.isArray(groupRefs) ? groupRefs : []) {
    if (!groupStudentIds(groupRef).includes(String(studentId))) continue;
    for (const assigned of Array.isArray(groupRef?.assigned) ? groupRef.assigned : []) {
      const start = assigned?.startDate ? new Date(assigned.startDate) : null;
      const end = assigned?.endDate ? new Date(assigned.endDate) : null;
      if (!start || !end) continue;
      if (
        date.getTime() >= start.getTime() &&
        date.getTime() <= end.getTime()
      ) {
        return { groupRef, window: assigned };
      }
    }
  }
  return null;
};

// Generated schedules populate meta.timeline (and posting.meta.timeline)
// with the student windows and per-window supervisors, but leave
// postings[].groups[].assigned empty. The timeline is therefore the
// source of truth for "which student is where, when" for generated
// plans, and departmentGroupIndex indexes the posting's groups.
export const findTimelineWindowForStudent = (
  plan: any,
  posting: any,
  studentId: string,
  date: Date,
): { window: any } | null => {
  const planPostings = Array.isArray(plan?.postings) ? plan.postings : [];
  let timeline: any[] | null = Array.isArray(posting?.meta?.timeline)
    ? posting.meta.timeline
    : null;
  if (!timeline || timeline.length === 0) {
    if (
      Array.isArray(plan?.meta?.timeline) &&
      (planPostings.length <= 1 || planPostings[0] === posting)
    ) {
      timeline = plan.meta.timeline;
    }
  }
  for (const w of Array.isArray(timeline) ? timeline : []) {
    const s = w?.startDate ? new Date(w.startDate).getTime() : NaN;
    const e = w?.endDate ? new Date(w.endDate).getTime() : NaN;
    if (!Number.isFinite(s) || !Number.isFinite(e)) continue;
    if (date.getTime() < s || date.getTime() > e) continue;
    const ids = Array.isArray(w?.studentIds) ? w.studentIds : [];
    if (!ids.some((id: unknown) => String(id) === String(studentId))) continue;
    return { window: w };
  }
  return null;
};

// Group window with a timeline fallback: first the posting groups'
// assigned windows (manually assigned schedules), then the generated
// plan timeline. windowSupervisorId carries the timeline window's
// supervisor when resolution came via the timeline; groupRef may be
// null when the posting has no groups at all (students then come from
// the timeline window's studentIds).
export const findGroupOrTimelineWindowForStudent = (
  plan: any,
  posting: any,
  studentId: string,
  date: Date,
): {
  groupRef: any;
  window: any;
  windowSupervisorId: string | null;
  viaTimeline: boolean;
} | null => {
  const direct = findGroupWindowForStudent(posting?.groups, studentId, date);
  if (direct) {
    return {
      groupRef: direct.groupRef,
      window: direct.window,
      windowSupervisorId: null,
      viaTimeline: false,
    };
  }
  const timelineHit = findTimelineWindowForStudent(plan, posting, studentId, date);
  if (!timelineHit) return null;
  const groups = Array.isArray(posting?.groups) ? posting.groups : [];
  const idx = Number(timelineHit.window?.departmentGroupIndex);
  const groupRef =
    (Number.isInteger(idx) && idx >= 0 && idx < groups.length
      ? groups[idx]
      : null) ??
    groups[0] ??
    null;
  return {
    groupRef,
    window: timelineHit.window,
    windowSupervisorId:
      timelineHit.window?.supervisorId != null
        ? String(timelineHit.window.supervisorId)
        : null,
    viaTimeline: true,
  };
};

// Nudge slot index at `now`: null = not due (or past the 4h cap),
// otherwise floor((now - firstNudgeAt) / 30 min). One notification per
// slot is enforced with a persisted clinicalNudgeKey, so repeated ticks
// are idempotent.
export const currentNudgeIndex = (
  now: Date,
  scheduledEnd: Date,
): number | null => {
  const first = scheduledEnd.getTime() - NUDGE_LEAD_MS;
  if (now.getTime() < first) return null;
  if (now.getTime() > scheduledEnd.getTime() + NUDGE_MAX_AFTER_END_MS) {
    return null;
  }
  return Math.floor((now.getTime() - first) / NUDGE_INTERVAL_MS);
};

// H1: the active clinical team + supervisor for one student right now.
export const resolveStudentClinicalGroup = async (
  studentId: string,
  now: Date = new Date(),
) => {
  const plans = await RotationPlan.find({}).lean<any[]>();
  for (const plan of plans) {
    for (const posting of Array.isArray(plan?.postings) ? plan.postings : []) {
      const hit = findGroupOrTimelineWindowForStudent(plan, posting, studentId, now);
      if (!hit) continue;
      return {
        planId: plan?._id ?? null,
        classId: plan?.class ?? null,
        postingName: posting?.name ?? null,
        groupName: hit.window?.unitGroupLabel ?? hit.groupRef?.group?.name ?? null,
        supervisor:
          hit.viaTimeline && hit.window?.supervisorId != null
            ? String(hit.window.supervisorId)
            : hit.groupRef?.supervisor ?? hit.windowSupervisorId ?? null,
        supervisorName: hit.window?.supervisorName ?? hit.groupRef?.supervisorName ?? null,
        students:
          hit.viaTimeline && Array.isArray(hit.window?.studentIds) && hit.window.studentIds.length
            ? hit.window.studentIds.map((id: any) => String(id))
            : groupStudentIds(hit.groupRef),
      };
    }
  }
  return null;
};

// H3: every (class, posting group, supervisor) whose assigned window
// covers `now` — the nudge audience for today's clinical periods.
export const resolveActiveSupervisorTeams = async (now: Date = new Date()) => {
  const teams: any[] = [];
  const plans = await RotationPlan.find({}).lean<any[]>();
  for (const plan of plans) {
    const seen = new Set<string>();
    const pushTeam = (team: any) => {
      const key = [
        String(team.classId),
        String(team.postingName),
        String(team.groupName),
        String(team.supervisor),
      ].join("|");
      if (seen.has(key)) return;
      seen.add(key);
      teams.push(team);
    };
    for (const posting of Array.isArray(plan?.postings) ? plan.postings : []) {
      for (const groupRef of Array.isArray(posting?.groups) ? posting.groups : []) {
        if (!groupRef?.supervisor) continue;
        if (!windowCovers(groupRef?.assigned, now)) continue;
        pushTeam({
          classId: plan?.class ?? null,
          postingName: posting?.name ?? null,
          groupName: groupRef?.group?.name ?? null,
          supervisor: groupRef.supervisor,
          supervisorName: groupRef?.supervisorName ?? null,
          students: groupStudentIds(groupRef),
        });
      }
      // Generated schedules leave groups[].assigned empty — the plan
      // timeline carries the windows (and the per-window supervisor).
      const postings = Array.isArray(plan?.postings) ? plan.postings : [];
      const timeline =
        Array.isArray(posting?.meta?.timeline) && posting.meta.timeline.length > 0
          ? posting.meta.timeline
          : postings.length <= 1 && Array.isArray(plan?.meta?.timeline)
            ? plan.meta.timeline
            : [];
      const groups = Array.isArray(posting?.groups) ? posting.groups : [];
      for (const w of Array.isArray(timeline) ? timeline : []) {
        const s = w?.startDate ? new Date(w.startDate).getTime() : NaN;
        const e = w?.endDate ? new Date(w.endDate).getTime() : NaN;
        if (!Number.isFinite(s) || !Number.isFinite(e)) continue;
        if (now.getTime() < s || now.getTime() > e) continue;
        const idx = Number(w?.departmentGroupIndex);
        const groupRef =
          (Number.isInteger(idx) && idx >= 0 && idx < groups.length ? groups[idx] : null) ??
          groups[0] ??
          null;
        const supervisor =
          w?.supervisorId != null
            ? String(w.supervisorId)
            : groupRef?.supervisor ?? null;
        if (!supervisor) continue;
        pushTeam({
          classId: plan?.class ?? null,
          postingName: posting?.name ?? null,
          groupName: w?.unitGroupLabel ?? groupRef?.group?.name ?? null,
          supervisor,
          supervisorName: w?.supervisorName ?? groupRef?.supervisorName ?? null,
          students:
            Array.isArray(w?.studentIds) && w.studentIds.length
              ? w.studentIds.map((id: any) => String(id))
              : groupRef
                ? groupStudentIds(groupRef)
                : [],
        });
      }
    }

  }
  return teams;
};

// H3: nudge tick step (called from runLectureAttendanceTick, every 5 min).
// For each class with clinical timetable periods today and each active
// supervisor team of that class: if no ClinicalAttendance session exists
// for (supervisor, group, today) and the current nudge slot is due, send
// exactly one notification per slot.
export const runClinicalSessionNudges = async (now: Date = new Date()) => {
  const nudged: any[] = [];
  const dayName = DAY_MAP[now.getDay()] ?? "unknown";
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const teams = await resolveActiveSupervisorTeams(now);
  if (teams.length === 0) return { dayName, nudged };

  const timetables = await Timetable.find({}).lean<any[]>();
  for (const timetable of timetables) {
    const classTeams = teams.filter(
      (t) => String(t.classId ?? "") === String(timetable?.class ?? ""),
    );
    if (classTeams.length === 0) continue;
    const daySchedule = (timetable?.schedule ?? []).find(
      (d: any) => (d?.day ?? "").toLowerCase() === dayName.toLowerCase(),
    );
    const periods = (daySchedule?.periods ?? []).filter(
      (p: any) => p?.isClinical === true,
    );
    for (const period of periods) {
      const scheduledEnd = timeOnDay(String(period?.endTime ?? ""), now);
      if (!scheduledEnd) continue;
      for (const team of classTeams) {
        try {
          const supervisorOid = toObjectId(team.supervisor);
          if (!supervisorOid) continue;
          const sessionExists = await ClinicalAttendance.findOne({
            supervisor: supervisorOid,
            date: { $gte: dayStart, $lt: dayEnd },
            status: { $ne: "cancelled" },
          }).lean();
          if (sessionExists) continue;
          const nudgeIndex = currentNudgeIndex(now, scheduledEnd);
          if (nudgeIndex == null) continue;
          const nudgeKey =
            dayStart.toISOString().slice(0, 10) +
            "|" +
            String(team.groupName) +
            "|" +
            String(period.endTime) +
            "|" +
            String(nudgeIndex);
          const already = await Notification.findOne({
            userId: supervisorOid,
            "metadata.clinicalNudgeKey": nudgeKey,
          }).lean();
          if (already) continue;
          await Notification.create({
            userId: supervisorOid,
            role: "unitconsultant",
            title: "Create the clinical attendance session",
            message:
              "No attendance session exists yet for " +
              (team.groupName ?? "your team") +
              " (" +
              (team.postingName ?? "current posting") +
              ", scheduled end " +
              String(period.endTime) +
              "). Create one so students can check in.",
            type: "attendance",
            isRead: false,
            link: "/attendance",
            metadata: {
              clinicalNudgeKey: nudgeKey,
              groupName: team.groupName,
              postingName: team.postingName,
              endTime: period.endTime,
              nudgeIndex,
            },
          });
          nudged.push({
            supervisor: String(team.supervisor),
            groupName: team.groupName,
            endTime: period.endTime,
            nudgeIndex,
          });
        } catch (err) {
          console.warn(
            "[clinical-nudge] failed for team " + String(team.groupName) + ":",
            err,
          );
        }
      }
    }
  }
  return { dayName, nudged };
};
