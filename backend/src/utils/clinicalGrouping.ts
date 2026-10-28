// Pure grouping helpers for KRYSTA clinical posting generation.
// No DB access and no side effects so they can be unit-tested directly
// (see backend/tests/clinicalGrouping.spec.ts).

export type DepartmentGroup = {
  groupIndex: number;
  studentIds: string[];
};

// Equal split of students across `bucketCount` groups; the remainder
// goes to the LAST group (102 students / 5 groups -> 20,20,20,20,22).
export function splitIntoBuckets(
  items: string[],
  bucketCount: number,
): DepartmentGroup[] {
  if (bucketCount <= 0) {
    return [{ groupIndex: 0, studentIds: items }];
  }

  const buckets: DepartmentGroup[] = [];
  const base = Math.floor(items.length / bucketCount);
  let cursor = 0;

  for (let index = 0; index < bucketCount; index++) {
    const size = index === bucketCount - 1 ? items.length - cursor : base;
    buckets.push({ groupIndex: index, studentIds: items.slice(cursor, cursor + size) });
    cursor += size;
  }

  return buckets;
}

export const normalizeUnitIds = (identifiers: unknown): string[] => {
  if (!Array.isArray(identifiers)) return [];
  return identifiers
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    .map((id) => id.trim());
};

// Unit pool for a department config: ACTIVE units first; reserve units
// are used only when the posting has no active units configured.
export const resolveUnitPool = (dept: any): string[] => {
  const active = normalizeUnitIds(dept?.activeUnitIds);
  if (active.length) return active;
  return normalizeUnitIds(dept?.reserveUnitIds);
};

// Strict round-robin across units: student i -> unit group (i % unitCount)
// so every unit receives a student before any unit receives a second one.
export const distributeStudentsRoundRobin = (
  studentIds: string[],
  unitCount: number,
): string[][] => {
  const count = Math.max(1, unitCount);
  const groups: string[][] = Array.from({ length: count }, () => []);
  for (let i = 0; i < studentIds.length; i++) {
    groups[i % count].push(studentIds[i]);
  }
  return groups;
};

export const rotateLeft = (items: string[], n: number): string[] => {
  if (!Array.isArray(items) || items.length === 0) return items.slice();
  const r = n % items.length;
  return items.slice(r).concat(items.slice(0, r));
};

export type WindowLike = {
  studentIds?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  [key: string]: unknown;
};

// Invariant check: a student must NEVER be in more than one department
// group or unit group at the same time. Returns one message per pair of
// windows that overlap in time AND share a student; empty = valid.
export const findStudentWindowOverlaps = (windows: WindowLike[]): string[] => {
  const byStudent = new Map<string, Array<{ start: number; end: number; label: string }>>();
  for (const w of Array.isArray(windows) ? windows : []) {
    const s = w?.startDate ? new Date(String(w.startDate)).getTime() : NaN;
    const e = w?.endDate ? new Date(String(w.endDate)).getTime() : NaN;
    if (!Number.isFinite(s) || !Number.isFinite(e)) continue;
    const label = new Date(s).toISOString() + '..' + new Date(e).toISOString();
    for (const id of Array.isArray(w?.studentIds) ? w.studentIds : []) {
      const key = String(id);
      if (!byStudent.has(key)) byStudent.set(key, []);
      byStudent.get(key)!.push({ start: s, end: e, label });
    }
  }
  const violations: string[] = [];
  for (const [student, wins] of byStudent) {
    for (let i = 0; i < wins.length; i++) {
      for (let j = i + 1; j < wins.length; j++) {
        const a = wins[i];
        const b = wins[j];
        if (a.start < b.end && b.start < a.end) {
          violations.push('student ' + student + ': window ' + a.label + ' overlaps window ' + b.label);
        }
      }
    }
  }
  return violations;
};
