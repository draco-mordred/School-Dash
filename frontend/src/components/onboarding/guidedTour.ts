export interface GuidedTourProgress {
  completed: boolean;
  completedSteps: string[];
}

const STORAGE_PREFIX = "schooldash.guided-tour";
const LEGACY_STUDENT_TOUR_PREFIX = "schooldash.student-tour";

const getStorageKey = (userId?: string) =>
  userId ? `${STORAGE_PREFIX}:${userId}` : null;

export const getGuidedTourProgress = (
  userId?: string,
): GuidedTourProgress => {
  const storageKey = getStorageKey(userId);
  if (!storageKey) {
    return { completed: false, completedSteps: [] };
  }

  const rawValue = window.localStorage.getItem(storageKey);
  if (rawValue) {
    try {
      const parsed = JSON.parse(rawValue) as Partial<GuidedTourProgress>;
      return {
        completed: Boolean(parsed.completed),
        completedSteps: Array.isArray(parsed.completedSteps)
          ? parsed.completedSteps
          : [],
      };
    } catch {
      // fall through to legacy check
    }
  }

  // Migration: users who already completed the old student-only tour
  // should not see the new tour again on this device.
  const legacyRaw = window.localStorage.getItem(
    `${LEGACY_STUDENT_TOUR_PREFIX}:${userId}`,
  );
  if (legacyRaw) {
    try {
      const legacy = JSON.parse(legacyRaw) as { completed?: boolean };
      if (legacy.completed) {
        return { completed: true, completedSteps: [] };
      }
    } catch {
      // ignore malformed legacy data
    }
  }

  return { completed: false, completedSteps: [] };
};

export const saveGuidedTourProgress = (
  userId: string | undefined,
  progress: GuidedTourProgress,
) => {
  const storageKey = getStorageKey(userId);
  if (!storageKey) return;
  window.localStorage.setItem(storageKey, JSON.stringify(progress));
};

export const markGuidedTourStepCompleted = (
  userId: string | undefined,
  stepId: string,
) => {
  if (!userId) return;
  const progress = getGuidedTourProgress(userId);
  if (progress.completedSteps.includes(stepId)) return;
  saveGuidedTourProgress(userId, {
    ...progress,
    completedSteps: [...progress.completedSteps, stepId],
  });
};

export const markGuidedTourCompleted = (userId: string | undefined) => {
  if (!userId) return;
  const progress = getGuidedTourProgress(userId);
  saveGuidedTourProgress(userId, { ...progress, completed: true });
};
