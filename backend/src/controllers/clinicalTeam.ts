import { type Request, type Response } from "express";
import mongoose from "mongoose";
import User from "../models/user";
import ClassModel from "../models/classes";
import AcademicClock from "../models/academicClock";
import RotationPlan from "../models/rotationPlan";
import ClinicalAttendance from "../models/clinicalAttendance";
import {
  findGroupWindowForStudent,
  groupStudentIds,
} from "../subs/latifah/clinicalPostingResolver";
import {
  hasConfiguredAcademicClockPhases,
  phaseRequiresPostingSchedule,
  resolveAcademicClockPhase,
} from "../utils/academicClockPhase";

const DAY_MS = 24 * 60 * 60 * 1000;
const IS_OBJECT_ID = (v: unknown) =>
  typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d: Date) => {
  const x = startOfDay(d);
  x.setDate(x.getDate() + 1);
  return x;
};

// GET /clinical-attendance/my-team (student)
// The student's active posting team, resolved from the CLASS CLOCK: the
// class's current academic-clock phase selects the posting schedule
// (phaseConfig.postingScheduleId/postingName) for that class, and the
// team/group comes from that posting's groups. Falls back to scanning
// all rotation plans only when the class has no configured clock
// phases. Returns the posting + window, team members, supervisor
// details, this week's team activities, and the student's own
// performance across the posting — powers /student/clinicals/team.
export const getMyClinicalTeam = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const now = new Date();
    const myId = String(user._id);

    // 1. Class clock: student -> class -> academic year -> clock -> phase.
    const student = await User.findById(myId)
      .select("studentClasses")
      .lean<any>();
    const rawClassId =
      student?.studentClasses &&
      typeof student.studentClasses === "object" &&
      !Array.isArray(student.studentClasses)
        ? String((student.studentClasses as any)._id ?? student.studentClasses)
        : student?.studentClasses
          ? String(student.studentClasses)
          : null;

    let phaseInfo: any = null;
    let noTeamReason: string | null = rawClassId ? null : "no-class";

    let clock: any = null;
    let phaseConfig: Record<string, any> | null = null;
    let phaseDriven = false;
    if (rawClassId) {
      const classDoc = await ClassModel.findById(rawClassId)
        .select("academicYear name")
        .lean<any>();
      if (classDoc?.academicYear) {
        clock = await AcademicClock.findOne({
          classId: rawClassId,
          academicYear: classDoc.academicYear,
        }).lean<any>();
      }
      const resolved = clock
        ? resolveAcademicClockPhase(clock, now)
        : null;
      phaseConfig = (resolved?.phase ?? null) as Record<string, any> | null;
      phaseDriven = hasConfiguredAcademicClockPhases(clock?.phaseConfig);
      const phaseActive = Boolean(
        resolved &&
          (!resolved.startsAt || !resolved.endsAt ||
            (now >= resolved.startsAt && now < resolved.endsAt)),
      );
      phaseInfo = {
        phaseDriven,
        classId: rawClassId,
        className: classDoc?.name ?? null,
        phaseId: resolved?.phaseId ?? null,
        phaseName: phaseConfig?.name ?? null,
        startsAt: resolved?.startsAt ?? null,
        endsAt: resolved?.endsAt ?? null,
        phaseActive,
        postingRequired: phaseDriven
          ? phaseRequiresPostingSchedule(phaseConfig)
          : null,
      };
    }

    // 2. Resolve the active posting group + window.
    let hit: any = null;
    let postingName: string | null = null;

    if (phaseDriven) {
      const scheduleIdRaw =
        phaseConfig?.postingScheduleId ?? phaseConfig?.postingId ?? null;
      const configuredPostingName = phaseConfig?.postingName
        ? String(phaseConfig.postingName)
        : null;
      const scheduleId =
        scheduleIdRaw && IS_OBJECT_ID(String(scheduleIdRaw))
          ? String(scheduleIdRaw)
          : null;

      if (!phaseInfo?.phaseActive) {
        noTeamReason = "phase-inactive";
      } else if (!scheduleId || !configuredPostingName) {
        noTeamReason = "posting-not-configured";
        phaseInfo.postingConfigured = false;
      } else {
        phaseInfo.postingConfigured = true;
        phaseInfo.scheduleId = scheduleId;
        phaseInfo.postingName = configuredPostingName;
        const plan = await RotationPlan.findOne({
          _id: scheduleId,
          class: rawClassId,
        }).lean<any>();
        const posting = (plan?.postings ?? []).find(
          (p: any) => String(p?.name) === configuredPostingName,
        );
        if (posting) {
          const found = findGroupWindowForStudent(
            posting?.groups,
            myId,
            now,
          );
          if (found) {
            hit = found;
            postingName = configuredPostingName;
          }
        }
        if (!hit) noTeamReason = "not-in-posting-group";
      }
    } else {
      // No configured clock phases — legacy fallback: scan all plans.
      const plans = await RotationPlan.find({}).lean<any[]>();
      for (const plan of plans) {
        for (const posting of Array.isArray(plan?.postings)
          ? plan.postings
          : []) {
          const found = findGroupWindowForStudent(
            posting?.groups,
            myId,
            now,
          );
          if (found) {
            hit = found;
            postingName = posting?.name ?? null;
            break;
          }
        }
        if (hit) break;
      }
      if (!hit) noTeamReason = "no-active-group";
    }

    if (!hit) {
      res.status(200).json({
        success: true,
        data: {
          team: null,
          phase: phaseInfo,
          noTeamReason,
          weekActivities: [],
          myPerformance: null,
        },
      });
      return;
    }

    const studentIds = groupStudentIds(hit.groupRef);
    const windowStart = hit.window?.startDate
      ? new Date(hit.window.startDate)
      : null;
    const windowEnd = hit.window?.endDate ? new Date(hit.window.endDate) : null;

    const elapsedDays = windowStart
      ? Math.max(
          1,
          Math.floor(
            (startOfDay(now).getTime() - startOfDay(windowStart).getTime()) /
              DAY_MS,
          ) + 1,
        )
      : null;
    const totalDays =
      windowStart && windowEnd
        ? Math.floor(
            (startOfDay(windowEnd).getTime() - startOfDay(windowStart).getTime()) /
              DAY_MS,
          ) + 1
        : null;
    const remainingDays = windowEnd
      ? Math.max(
          0,
          Math.floor(
            (startOfDay(windowEnd).getTime() - startOfDay(now).getTime()) /
              DAY_MS,
          ),
        )
      : null;

    // 3. Team members + supervisor details.
    const memberObjectIds = studentIds
      .filter((id) => IS_OBJECT_ID(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    const members = await User.find({ _id: { $in: memberObjectIds } })
      .select("name idNumber email role")
      .lean<any[]>();

    const supervisorId = hit.groupRef?.supervisor ?? null;
    let supervisor: any = null;
    if (supervisorId && IS_OBJECT_ID(String(supervisorId))) {
      const doc = await User.findById(String(supervisorId))
        .select("name email role department specialization")
        .lean<any>();
      supervisor = doc ?? {
        _id: String(supervisorId),
        name: hit.groupRef?.supervisorName ?? "Supervisor",
      };
    } else if (hit.groupRef?.supervisorName) {
      supervisor = { name: hit.groupRef.supervisorName };
    }

    // 4. Team sessions inside the posting window.
    const sessionFilter: any = {
      status: { $ne: "cancelled" },
      attendees: { $elemMatch: { student: { $in: memberObjectIds } } },
    };
    if (supervisorId && IS_OBJECT_ID(String(supervisorId))) {
      sessionFilter.supervisor = new mongoose.Types.ObjectId(String(supervisorId));
    }
    if (windowStart && windowEnd) {
      sessionFilter.date = {
        $gte: startOfDay(windowStart),
        $lt: endOfDay(windowEnd),
      };
    }
    const sessions = await ClinicalAttendance.find(sessionFilter)
      .sort({ date: 1 })
      .lean<any[]>();

    const fmtSession = (s: any) => ({
      _id: String(s._id),
      title: s.title ?? "",
      activityType: s.activityType ?? "",
      date: s.date ?? null,
      startTime: s.startTime ?? null,
      endTime: s.endTime ?? null,
      status: s.status ?? "",
      unitLabel: s.unitLabel || s.department || s.location || "",
      presentCount: s.presentCount ?? 0,
      absentCount: s.absentCount ?? 0,
      lateCount: s.lateCount ?? 0,
      myStatus:
        (s.attendees ?? []).find((a: any) => String(a.student) === myId)?.status ??
        null,
    });

    // 5. This week (Monday–Sunday) team activities.
    const weekStart = startOfDay(now);
    weekStart.setDate(weekStart.getDate() - ((now.getDay() + 6) % 7));
    const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
    const weekActivities = sessions
      .filter((s) => {
        const d = s.date ? new Date(s.date).getTime() : NaN;
        return d >= weekStart.getTime() && d < weekEnd.getTime();
      })
      .map(fmtSession);

    // 6. The student's own performance across the posting.
    const tally: Record<string, number> = {
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
      "on-leave": 0,
      pending: 0,
    };
    const mySessions: any[] = [];
    for (const s of sessions) {
      const mine = (s.attendees ?? []).find(
        (a: any) => String(a.student) === myId,
      );
      if (!mine) continue;
      const key = String(mine.status ?? "pending");
      if (key in tally) tally[key] += 1;
      else tally.pending += 1;
      mySessions.push({
        ...fmtSession(s),
        myStatus: mine.status ?? "pending",
        checkInTime: mine.checkInTime ?? null,
        complaint: mine.complaint?.status ?? null,
      });
    }
    const resolvedTotal =
      tally.present + tally.late + tally.absent + tally.excused;
    const attendanceRate =
      resolvedTotal > 0
        ? Math.round(((tally.present + tally.late) / resolvedTotal) * 100)
        : 0;

    res.status(200).json({
      success: true,
      data: {
        team: {
          postingName,
          groupName: hit.groupRef?.group?.name ?? null,
          window: {
            startDate: windowStart,
            endDate: windowEnd,
          },
          daysElapsed: elapsedDays,
          daysTotal: totalDays,
          daysRemaining: remainingDays,
          supervisor,
          members,
        },
        phase: phaseInfo,
        weekActivities,
        myPerformance: {
          tally,
          resolvedTotal,
          attendanceRate,
          sessions: mySessions,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching clinical team:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching clinical team",
      error: error.message,
    });
  }
};
