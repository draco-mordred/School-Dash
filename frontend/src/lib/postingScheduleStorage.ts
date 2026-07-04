const POSTING_SCHEDULE_STORAGE_KEY = "clinical-posting-schedules";

interface PersistedPostingScheduleEntry {
  classId: string;
  postingKey: string;
  schedule: unknown;
  savedAt: string;
}

const readStoredEntries = (): PersistedPostingScheduleEntry[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(POSTING_SCHEDULE_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStoredEntries = (entries: PersistedPostingScheduleEntry[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(POSTING_SCHEDULE_STORAGE_KEY, JSON.stringify(entries));
};

export const buildPostingScheduleStorageKey = (classId: string, postingKey: string) => `${classId}:${postingKey}`;

export const savePersistedPostingSchedule = (classId: string, postingKey: string, schedule: unknown) => {
  const entries = readStoredEntries();
  const nextEntry: PersistedPostingScheduleEntry = {
    classId,
    postingKey,
    schedule,
    savedAt: new Date().toISOString(),
  };

  const dedupedEntries = entries.filter((entry) => !(entry.classId === classId && entry.postingKey === postingKey));
  dedupedEntries.unshift(nextEntry);
  writeStoredEntries(dedupedEntries.slice(0, 50));
  return nextEntry;
};

export const loadPersistedPostingSchedule = (classId: string, postingKey: string) => {
  const entries = readStoredEntries();
  const match = entries.find((entry) => entry.classId === classId && entry.postingKey === postingKey);
  return match?.schedule ?? null;
};

export const deletePersistedPostingSchedule = (classId: string, postingKey: string) => {
  const entries = readStoredEntries().filter((entry) => !(entry.classId === classId && entry.postingKey === postingKey));
  writeStoredEntries(entries);
};
