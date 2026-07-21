export interface PostingDurationControlVisibility {
  showDepartmentDurationInput: boolean;
  showUnitDurationInput: boolean;
  showUnitDurationDisabledMessage: boolean;
}

export function getPostingDurationControlVisibility(useUnits: boolean): PostingDurationControlVisibility {
  return {
    showDepartmentDurationInput: true,
    showUnitDurationInput: useUnits,
    showUnitDurationDisabledMessage: !useUnits,
  };
}
