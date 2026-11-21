import { type Request, type Response } from 'express';
import ClassModel from '../models/classes';
import DepartmentModel from '../models/departments';
import AcademicClock from '../models/academicClock';
import {
  hasConfiguredAcademicClockPhases,
  resolveClockPhaseWindowById,
} from '../utils/academicClockPhase';
import { DEPARTMENTS_METADATA, DEPARTMENT_UNITS } from '../constants/departments';

// PR C2 — custom posting-generation wizard: one catalog call that gives the
// wizard everything it needs (classes, departments + units, per-class clock)
// phases WITH their resolved windows, using the SAME 30-day-month math the
// backend applies in clock mode so the preview matches the generated plan).

type PhaseSeedConfig = Record<string, any> | any[] | null | undefined;

const phaseLabelFor = (id: string, cfg: any) => String(cfg?.name || id);

const extractPhaseOptions = (phaseConfig: PhaseSeedConfig) => {
  if (Array.isArray(phaseConfig)) {
    return phaseConfig.map((p: any, i: number) => ({
      id: p?.id ?? p?.phaseId ?? 'phase' + (i + 1),
      name: phaseLabelFor(p?.id ?? p?.phaseId ?? 'phase' + (i + 1), p),
      postingName: p?.postingName ? String(p.postingName) : null,
      postingScheduleId: p?.postingScheduleId ? String(p.postingScheduleId) : null,
      postingType: p?.postingType ? String(p.postingType) : null,
    }));
  }
  if (phaseConfig && typeof phaseConfig === 'object') {
    return Object.entries(phaseConfig).map(([id, p]) => ({
      id,
      name: phaseLabelFor(id, p as any),
      postingName: (p as any)?.postingName ? String((p as any).postingName) : null,
      postingScheduleId: (p as any)?.postingScheduleId ? String((p as any).postingScheduleId) : null,
      postingType: (p as any)?.postingType ? String((p as any).postingType) : null,
    }));
  }
  return [];
};

export const getGeneratorOptions = async (req: Request, res: Response) => {
  try {
    const [classes, departDocs, clocks] = await Promise.all([
      ClassModel.find({}).select('name academicYear students').lean(),
      DepartmentModel.find({})
        .select('name code departmentID units')
        .populate('units', 'name code unitID supervisor')
        .lean(),
      AcademicClock.find({})
        .select('classId classLevel clockStartDate clockIsPaused clockPausedAt phaseConfig')
        .lean(),
    ]);

    const classOptions = classes.map((cls: any) => ({
      id: String(cls._id),
      name: String(cls.name ?? 'Class'),
      academicYear: cls.academicYear ? String(typeof cls.academicYear === 'object' ? (cls.academicYear as any)._id : cls.academicYear) : null,
      studentCount: Array.isArray(cls.students) ? cls.students.length : 0,
      source: 'db',
    }));

    // Departments from the DB, falling back to the seeded constants so the
    // wizard still works on fresh installs that have no Department docs yet.
    const dbDepartmentOptions = departDocs.map((d: any) => ({
      id: String(d._id),
      identifier: String(d.departmentID || d.code || d.name),
      name: String(d.name),
      code: d.code ? String(d.code) : null,
      source: 'db',
      units: (Array.isArray(d.units) ? d.units : []).map((u: any) => ({
        unitId: String(u?.unitID || u?.code || u?._id),
        name: String(u?.name ?? u?.unitId),
        code: u?.code ? String(u.code) : null,
        hasDesignatedSupervisor: Boolean(u?.supervisor),
      })),
    }));

    if (dbDepartmentOptions.length === 0) {
      const seenCodes = new Set<string>();
      for (const [name, meta] of Object.entries(DEPARTMENTS_METADATA as any)) {
        const code = String((meta as any).code);
        if (seenCodes.has(code)) continue;
        seenCodes.add(code);
        const unitData = (DEPARTMENT_UNITS as any)[name];
        const rawUnits = unitData?.units?.active ?? [];
        dbDepartmentOptions.push({
          id: code,
          identifier: code,
          name: String((meta as any).name),
          code,
          source: 'seed',
          units: rawUnits.map((u: any) => ({
            unitId: String(typeof u === 'string' ? u : u.id),
            name: String(typeof u === 'string' ? u : u.name),
            code: null,
            hasDesignatedSupervisor: false,
          })),
        });
      }
    }

    // Clock phases with RESOLVED windows (same helper the clock-mode
    // generation path uses) — only for clocks with configured phases.
    const clockOptions = clocks
      .filter((c: any) => hasConfiguredAcademicClockPhases(c.phaseConfig))
      .map((c: any) => ({
        clockId: String(c._id),
        classId: String(c.classId),
        classLevel: c.classLevel ?? null,
        clockStartDate: c.clockStartDate ?? null,
        clockIsPaused: Boolean(c.clockIsPaused),
        phases: extractPhaseOptions(c.phaseConfig).map((p) => {
          const window = resolveClockPhaseWindowById(c, p.id);
          return {
            ...p,
            window: window ? { startsAt: window.startsAt.toISOString(), endsAt: window.endsAt.toISOString() } : null,
          };
        }),
      }));

    return res.json({
      classes: classOptions,
      departments: dbDepartmentOptions,
      clocks: clockOptions,
    });
  } catch (err) {
    console.error('getGeneratorOptions error', err);
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
};
