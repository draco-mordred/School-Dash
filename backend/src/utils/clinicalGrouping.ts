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
