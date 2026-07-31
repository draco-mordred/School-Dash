export interface StudentTourProgress {
  completed: boolean;
  completedRoutes: string[];
}

const getStorageKey = (userId?: string) => {
  if (!userId) return null;
  return `schooldash.student-tour:${userId}`;
};

export const getStudentTourProgress = (
  userId?: string,
): StudentTourProgress => {
  const storageKey = getStorageKey(userId);
  if (!storageKey) {
    return { completed: false, completedRoutes: [] };
  }

  const rawValue = window.localStorage.getItem(storageKey);
  if (!rawValue) {
    return { completed: false, completedRoutes: [] };
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<StudentTourProgress>;
    return {
      completed: Boolean(parsed.completed),
      completedRoutes: Array.isArray(parsed.completedRoutes)
        ? parsed.completedRoutes
        : [],
    };
  } catch {
    return { completed: false, completedRoutes: [] };
  }
};

export const saveStudentTourProgress = (
  userId: string | undefined,
  progress: StudentTourProgress,
) => {
  const storageKey = getStorageKey(userId);
  if (!storageKey) return;
  window.localStorage.setItem(storageKey, JSON.stringify(progress));
};

export const markStudentTourCompleted = (userId: string | undefined) => {
  if (!userId) return;
  const progress = getStudentTourProgress(userId);
  saveStudentTourProgress(userId, { ...progress, completed: true });
};

export const markStudentTourRouteCompleted = (
  userId: string | undefined,
  route: string,
) => {
  if (!userId) return;
  const progress = getStudentTourProgress(userId);
  const completedRoutes = progress.completedRoutes.includes(route)
    ? progress.completedRoutes
    : [...progress.completedRoutes, route];

  saveStudentTourProgress(userId, {
    completed: progress.completed,
    completedRoutes,
  });
};

export const hasCompletedStudentTourRoute = (
  userId: string | undefined,
  route: string,
) => {
  if (!userId) return true;
  const progress = getStudentTourProgress(userId);
  return progress.completed || progress.completedRoutes.includes(route);
};
