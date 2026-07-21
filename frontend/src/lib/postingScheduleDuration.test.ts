import { describe, expect, it } from 'vitest';
import { getPostingDurationControlVisibility } from './postingScheduleDuration';

describe('getPostingDurationControlVisibility', () => {
  it('keeps department duration visible even when units are disabled', () => {
    const visibility = getPostingDurationControlVisibility(false);

    expect(visibility.showDepartmentDurationInput).toBe(true);
    expect(visibility.showUnitDurationInput).toBe(false);
    expect(visibility.showUnitDurationDisabledMessage).toBe(true);
  });

  it('shows unit duration controls when units are enabled', () => {
    const visibility = getPostingDurationControlVisibility(true);

    expect(visibility.showDepartmentDurationInput).toBe(true);
    expect(visibility.showUnitDurationInput).toBe(true);
    expect(visibility.showUnitDurationDisabledMessage).toBe(false);
  });
});
