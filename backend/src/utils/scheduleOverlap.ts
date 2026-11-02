// PR H — pure schedule-overlap math (pre-save warnings). No DB imports.

export interface TimeWindow {
  start: Date;
  end: Date;
}

// An exam occupies [dueDate, dueDate + durationMinutes]. Duration minutes are
// always positive here (validated upstream).
export const examTimeWindow = (dueDate: Date | string, durationMinutes: number): TimeWindow => {
  const start = new Date(dueDate);
  const end = new Date(start.getTime() + Math.max(0, Number(durationMinutes) || 0) * 60 * 1000);
  return { start, end };
};

// Strict overlap: touching boundaries (a.end === b.start) do NOT overlap.
export const windowsOverlap = (a: TimeWindow, b: TimeWindow): boolean =>
  a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();

export const overlapMinutes = (a: TimeWindow, b: TimeWindow): number => {
  if (!windowsOverlap(a, b)) return 0;
  const end = Math.min(a.end.getTime(), b.end.getTime());
  const start = Math.max(a.start.getTime(), b.start.getTime());
  return Math.round((end - start) / 60000);
};

export interface ExistingExamLike {
  id: string;
  title?: string | null;
  dueDate: Date | string;
  durationMinutes: number;
  isActive?: boolean;
}

export interface OverlapWarning {
  examId: string;
  title: string | null;
  overlapMinutes: number;
}

export const MAX_OVERLAP_WARNINGS = 5;

// Pre-save check: which existing ACTIVE exams for the same class overlap the
// candidate window? Sorted by overlap size, capped at MAX_OVERLAP_WARNINGS.
export const findExamOverlaps = (
  candidate: TimeWindow,
  existing: ExistingExamLike[]
): OverlapWarning[] =>
  (existing ?? [])
    .filter((exam) => exam == null || exam.isActive === undefined || exam.isActive === true)
    .map((exam) => ({
      examId: exam.id,
      title: exam.title ?? null,
      overlapMinutes: overlapMinutes(candidate, examTimeWindow(exam.dueDate, exam.durationMinutes)),
    }))
    .filter((w) => w.overlapMinutes > 0)
    .sort((a, b) => b.overlapMinutes - a.overlapMinutes)
    .slice(0, MAX_OVERLAP_WARNINGS);
