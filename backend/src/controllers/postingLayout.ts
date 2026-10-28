import { type Request, type Response } from "express";
import mongoose from "mongoose";
import RotationPlan from "../models/rotationPlan";
import ClassModel from "../models/classes";
import User from "../models/user";
import { resolveActiveSupervisorTeams } from "../subs/latifah/clinicalPostingResolver";

const IS_OBJECT_ID = (v: unknown) =>
  typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);

const toObjectIds = (ids: string[]) =>
  ids.filter(IS_OBJECT_ID).map((id) => new mongoose.Types.ObjectId(id));

// GET /clinical-attendance/my-supervised-groups
// (teacher / unitconsultant / unitresident / admin)
//
// The caller's CURRENT posting teams — every department/unit group whose
// active timeline window covers `now` and whose supervisor is the
// caller. Returns each group's students (with names/ID numbers) so
// lecturers can generate attendance sessions, record performance and
// manage logbook entries for the students currently assigned to them.
export const getMySupervisedGroups = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const me = String(user._id);
    const now = new Date();

    const teams = await resolveActiveSupervisorTeams(now);
    const mine = teams.filter(
      (t: any) => String(t.supervisor ?? "") === me,
    );

    // Enrich: student docs + class names.
    const studentIdSet = new Set<string>();
    for (const t of mine) {
      for (const s of Array.isArray(t.students) ? t.students : []) {
        studentIdSet.add(String(s));
      }
    }
    const students = studentIdSet.size
      ? await User.find({ _id: { $in: toObjectIds([...studentIdSet]) } })
          .select("name idNumber email role")
          .lean<any[]>()
      : [];
    const studentById = new Map(
      students.map((s: any) => [String(s._id), s]),
    );

    const classIds = [
      ...new Set(
        mine
          .map((t: any) => String(t.classId ?? ""))
          .filter((id: string) => id && IS_OBJECT_ID(id)),
      ),
    ];
    const classes = classIds.length
      ? await ClassModel.find({ _id: { $in: toObjectIds(classIds) } })
          .select("name")
          .lean<any[]>()
      : [];
    const classById = new Map(
      classes.map((c: any) => [String(c._id), c?.name ?? null]),
    );

    res.status(200).json({
      success: true,
      data: {
        asOf: now,
        groups: mine.map((t: any) => ({
          classId: t.classId ? String(t.classId) : null,
          className: t.classId
            ? classById.get(String(t.classId)) ?? null
            : null,
          postingName: t.postingName ?? null,
          groupName: t.groupName ?? null,
          supervisor: t.supervisor ? String(t.supervisor) : null,
          supervisorName: t.supervisorName ?? null,
          students: (Array.isArray(t.students) ? t.students : []).map(
            (id: any) => {
              const doc = studentById.get(String(id));
              return {
                id: String(id),
                name: doc?.name ?? null,
                idNumber: doc?.idNumber ?? null,
              };
            },
          ),
        })),
      },
    });
  } catch (error: any) {
    console.error("Error fetching supervised groups:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching supervised groups",
      error: error.message,
    });
  }
};

// GET /rotation-schedules/class/:classId/posting-layout (admin/teacher)
//
// The FULL clinical posting layout of a class's most recent rotation
// plan: posting window, department groups (name, code, department
// identifier, supervisor, cohort students) and, per department, its
// unit groups with per-window students + supervisors, plus the raw
// timeline and rotation blocks. Exposes the generated posting schedule
// to the rest of the application — attendance session creation,
// student performance recording, and logbook correlation against
// department/unit assignments.
export const getClassPostingLayout = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { classId } = req.params;
    const plan = await RotationPlan.findOne({ class: classId })
      .sort({ createdAt: -1 })
      .lean<any>();
    if (!plan) {
      res
        .status(404)
        .json({ success: false, message: "No posting schedule found for this class" });
      return;
    }

    const postings = Array.isArray(plan.postings) ? plan.postings : [];
    const layoutPostings = postings.map((posting: any) => {
      const tl =
        Array.isArray(posting?.meta?.timeline) && posting.meta.timeline.length > 0
          ? posting.meta.timeline
          : Array.isArray(plan?.meta?.timeline)
            ? plan.meta.timeline
            : [];
      const groups = Array.isArray(posting?.groups) ? posting.groups : [];

      const departments = groups.map((g: any, d: number) => {
        const wins = tl.filter(
          (w: any) => Number(w?.departmentGroupIndex) === d,
        );
        const unitGroupMap = new Map<number, any[]>();
        for (const w of wins) {
          const gidx = Number(w?.unitGroupIndex ?? 0);
          if (!unitGroupMap.has(gidx)) unitGroupMap.set(gidx, []);
          unitGroupMap.get(gidx)!.push(w);
        }
        const unitGroups = [...unitGroupMap.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([gidx, ws]) => ({
            unitGroupIndex: gidx,
            label: ws[0]?.unitGroupLabel ?? g?.group?.name ?? null,
            unitIds: [
              ...new Set(
                ws
                  .map((w: any) => (w.unitId != null ? String(w.unitId) : ""))
                  .filter(Boolean),
              ),
            ],
            windows: ws.map((w: any) => ({
              phaseIndex: w.phaseIndex ?? null,
              cohortIndex: w.cohortIndex ?? null,
              startDate: w.startDate ?? null,
              endDate: w.endDate ?? null,
              unitName: w.unitName ?? null,
              unitCode: w.unitCode ?? null,
              supervisorId: w.supervisorId ?? null,
              supervisorName: w.supervisorName ?? null,
              studentIds: (Array.isArray(w.studentIds) ? w.studentIds : []).map(
                (id: any) => String(id),
              ),
            })),
          }));

        const cohortStudents = (Array.isArray(g?.group?.students)
          ? g.group.students
          : []
        ).map((s: any) =>
          typeof s === "object"
            ? String((s as any)._id ?? (s as any).id ?? "")
            : String(s),
        );

        return {
          departmentGroupIndex: d,
          name: g?.group?.name ?? null,
          code: g?.group?.code ?? null,
          departmentIdentifier: g?.group?.departmentIdentifier ?? null,
          supervisor: g?.supervisor ?? null,
          supervisorName: g?.supervisorName ?? null,
          cohortStudents,
          unitGroups,
          weeklySchedule: Array.isArray(g?.weeklySchedule) ? g.weeklySchedule : [],
        };
      });

      return {
        postingName: posting?.name ?? null,
        startDate: posting?.startDate ?? null,
        endDate: posting?.endDate ?? null,
        logbookRequiredEntries: Number(posting?.logbookRequiredEntries ?? 0) || 0,
        departments,
        timeline: tl,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        planId: String(plan._id),
        name: plan?.name ?? null,
        classId: plan?.class ? String(plan.class) : null,
        blockDays: plan?.meta?.blockDays ?? null,
        totalDays: plan?.meta?.totalDays ?? null,
        phases: Array.isArray(plan?.meta?.phases) ? plan.meta.phases : [],
        postings: layoutPostings,
      },
    });
  } catch (error: any) {
    console.error("Error fetching posting layout:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching posting layout",
      error: error.message,
    });
  }
};
