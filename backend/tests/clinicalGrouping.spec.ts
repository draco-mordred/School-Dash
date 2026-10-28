import { describe, expect, test } from 'bun:test';
import {
  splitIntoBuckets,
  resolveUnitPool,
  distributeStudentsRoundRobin,
  rotateLeft,
  findStudentWindowOverlaps,
} from '../src/utils/clinicalGrouping';

describe('splitIntoBuckets', () => {
  test('equal split, remainder goes to the LAST group', () => {
    const buckets = splitIntoBuckets(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 5);
    expect(buckets.map((b) => b.studentIds.length)).toEqual([1, 1, 1, 1, 3]);
  });

  test('50 students / 5 sub-postings -> 10 students in each of 5 groups', () => {
    const students = Array.from({ length: 50 }, (_, i) => `s${i}`);
    const buckets = splitIntoBuckets(students, 5);
    expect(buckets).toHaveLength(5);
    expect(buckets.every((b) => b.studentIds.length === 10)).toBe(true);
  });

  test('100 students / 4 sub-postings -> 25 each', () => {
    const students = Array.from({ length: 100 }, (_, i) => `s${i}`);
    const buckets = splitIntoBuckets(students, 4);
    expect(buckets.every((b) => b.studentIds.length === 25)).toBe(true);
  });
});

describe('resolveUnitPool', () => {
  test('active units win over reserve', () => {
    expect(
      resolveUnitPool({ activeUnitIds: ['OBG01', 'OBG02'], reserveUnitIds: ['OBGR01'] }),
    ).toEqual(['OBG01', 'OBG02']);
  });

  test('reserve used only when active is empty', () => {
    expect(resolveUnitPool({ reserveUnitIds: ['OBGR01'] })).toEqual(['OBGR01']);
    expect(resolveUnitPool({})).toEqual([]);
  });
});

describe('distributeStudentsRoundRobin', () => {
  test('strict round-robin: every unit gets a student before wrapping', () => {
    const groups = distributeStudentsRoundRobin(['s0', 's1', 's2', 's3', 's4'], 4);
    expect(groups).toEqual([['s0'], ['s1'], ['s2'], ['s3', 's4']]);
  });

  test('25 students / 10 units -> all 10 units non-empty, 5x3 + 5x2', () => {
    const students = Array.from({ length: 25 }, (_, i) => `s${i}`);
    const groups = distributeStudentsRoundRobin(students, 10);
    expect(groups.every((g) => g.length > 0)).toBe(true);
    expect(groups.filter((g) => g.length === 3)).toHaveLength(5);
    expect(groups.filter((g) => g.length === 2)).toHaveLength(5);
  });

  test('more units than students -> each student alone, empty units kept', () => {
    const groups = distributeStudentsRoundRobin(['s0', 's1'], 4);
    expect(groups).toEqual([['s0'], ['s1'], [], []]);
  });
});

describe('rotateLeft', () => {
  test('rotates by n with wraparound', () => {
    expect(rotateLeft(['a', 'b', 'c'], 1)).toEqual(['b', 'c', 'a']);
    expect(rotateLeft(['a', 'b'], 3)).toEqual(['a', 'b']);
    expect(rotateLeft([], 2)).toEqual([]);
  });
});


describe('findStudentWindowOverlaps', () => {
  const win = (studentIds: string[], startDate: string, endDate: string) => ({ studentIds, startDate, endDate });

  test('no violations when windows are disjoint or students differ', () => {
    expect(findStudentWindowOverlaps([
      win(['s1'], '2026-07-01T00:00:00Z', '2026-07-28T00:00:00Z'),
      win(['s1'], '2026-07-28T00:00:00Z', '2026-08-25T00:00:00Z'),
      win(['s2'], '2026-07-01T00:00:00Z', '2026-07-28T00:00:00Z'),
    ])).toEqual([]);
  });

  test('flags a student in two groups at the same time', () => {
    const v = findStudentWindowOverlaps([
      win(['s1'], '2026-07-01T00:00:00Z', '2026-07-28T00:00:00Z'),
      win(['s1'], '2026-07-15T00:00:00Z', '2026-08-15T00:00:00Z'),
    ]);
    expect(v).toHaveLength(1);
    expect(v[0]).toContain('student s1');
  });

  test('ignores windows without usable dates', () => {
    expect(findStudentWindowOverlaps([
      { studentIds: ['s1'] },
      win(['s1'], '2026-07-01T00:00:00Z', '2026-07-02T00:00:00Z'),
    ])).toEqual([]);
  });
});
