import type { IDaySchedule, ITimetable } from "../models/timetable";

type PhaseTimetableLike = {
  phaseId: string;
  schedule: IDaySchedule[];
};

export const getTimetableForPhase = (
  timetable: Pick<ITimetable, "schedule" | "phaseSchedules"> | null,
  phaseId: string | null,
  sourcePhaseId?: string | null,
) => {
  if (!timetable) return { schedule: [] as IDaySchedule[], configured: false };

  const source = sourcePhaseId || phaseId;
  if (!phaseId) {
    return {
      schedule: timetable.schedule ?? [],
      configured: Boolean(timetable.schedule?.some((day) => day.periods?.length)),
    };
  }
  if (source === "legacy") {
    return {
      schedule: timetable.schedule ?? [],
      configured: Boolean(timetable.schedule?.some((day) => day.periods?.length)),
    };
  }

  const phaseSchedule = (timetable.phaseSchedules ?? []).find(
    (entry: PhaseTimetableLike) => entry.phaseId === source,
  );
  if (phaseSchedule) {
    return {
      schedule: phaseSchedule.schedule ?? [],
      configured: Boolean(
        phaseSchedule.schedule?.some((day) => day.periods?.length),
      ),
    };
  }

  const hasPhaseSchedules = (timetable.phaseSchedules ?? []).length > 0;
  return {
    schedule: hasPhaseSchedules ? [] : timetable.schedule ?? [],
    configured: !hasPhaseSchedules && Boolean(
      timetable.schedule?.some((day) => day.periods?.length),
    ),
  };
};

export const saveTimetableForPhase = async (
  TimetableModel: any,
  {
    classId,
    academicYearId,
    phaseId,
    schedule,
    courseIds = [],
  }: {
    classId: string;
    academicYearId: string;
    phaseId: string | null;
    schedule: IDaySchedule[];
    courseIds?: string[];
  },
) => {
  if (!phaseId) {
    const timetable = await TimetableModel.findOne({ class: classId, academicYear: academicYearId });
    if (timetable) {
      timetable.schedule = schedule;
      await timetable.save();
    } else {
      await TimetableModel.create({ class: classId, academicYear: academicYearId, schedule });
    }
    return;
  }

  const timetable = await TimetableModel.findOne({ class: classId, academicYear: academicYearId });
  if (!timetable) {
    await TimetableModel.create({
      class: classId,
      academicYear: academicYearId,
      schedule: [],
      phaseSchedules: [{ phaseId, schedule, courseIds, updatedAt: new Date() }],
    });
    return;
  }

  const phaseSchedules = [...(timetable.phaseSchedules ?? [])];
  const existingIndex = phaseSchedules.findIndex((entry: PhaseTimetableLike) => entry.phaseId === phaseId);
  const nextEntry = { phaseId, schedule, courseIds, updatedAt: new Date() };
  if (existingIndex === -1) phaseSchedules.push(nextEntry);
  else phaseSchedules[existingIndex] = nextEntry;

  timetable.phaseSchedules = phaseSchedules;
  await timetable.save();
};
