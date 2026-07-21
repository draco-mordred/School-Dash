import { describe, expect, it } from 'vitest';
import { getPersistedPostingScheduleKey, normalizePostingScheduleForDisplay } from './postingScheduleDisplay';

describe('getPersistedPostingScheduleKey', () => {
  it('uses the selected posting option id when available', () => {
    expect(getPersistedPostingScheduleKey({
      selectedPostingOptionId: 'phase-2',
      selectedSixthPostingOptionId: 'sixth-phase',
      selectedFourthPostingOptionId: 'fourth-phase',
    })).toBe('phase-2');
  });

  it('falls back to a generic default when no posting option is selected', () => {
    expect(getPersistedPostingScheduleKey({})).toBe('default');
  });
});

describe('normalizePostingScheduleForDisplay', () => {
  it('converts generic department and unit labels into friendly labels and resolves student ids', () => {
    const schedule = {
      postings: [{
        name: 'Demo posting',
        groups: [{
          groupId: 'group-1',
          group: {
            department: 'Department 1',
            name: 'Unit 1',
            students: ['507f1f77bcf86cd799439011'],
          },
        }],
      }],
    };

    const result = normalizePostingScheduleForDisplay(schedule, [{ _id: '507f1f77bcf86cd799439011', name: 'Ada Lovelace', idNumber: 'ST001' }]);

    expect(result.unitAssignments[0].department).toBe('Department Group 1');
    expect(result.unitAssignments[0].unit).toBe('Unit 1');
    expect(result.unitAssignments[0].students[0].name).toBe('Ada Lovelace');
    expect(result.unitAssignments[0].students[0].idNumber).toBe('ST001');
  });

  it('keeps real labels intact', () => {
    const schedule = {
      postings: [{
        name: 'Demo posting',
        groups: [{
          groupId: 'group-1',
          group: {
            department: 'Obstetrics',
            name: 'Maternity Unit',
            students: [{ _id: 'student-1', name: 'John Doe' }],
          },
        }],
      }],
    };

    const result = normalizePostingScheduleForDisplay(schedule);

    expect(result.unitAssignments[0].department).toBe('Obstetrics');
    expect(result.unitAssignments[0].unit).toBe('Maternity Unit');
    expect(result.unitAssignments[0].students[0].name).toBe('John Doe');
  });

  it('preserves postingType from the schedule and does not hard-code OG_PEDS', () => {
    const schedule = {
      postings: [{
        name: 'Broad posting',
        postingType: 'General Medicine',
        groups: [{
          groupId: 'group-1',
          group: {
            department: 'General Medicine',
            name: 'Ward Unit',
            students: [{ _id: 'student-2', name: 'Jane Roe' }],
          },
        }],
      }],
    };

    const result = normalizePostingScheduleForDisplay(schedule);

    expect(result.postingType).toBe('General Medicine');
    expect(result.postingName).toBe('Broad posting');
  });
});
