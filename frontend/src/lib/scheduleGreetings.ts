/**
 * Friendly greetings shown in the student schedule cards.
 *
 * - WEEKEND_GREETINGS: 50 samples shown when a schedule card would land on a
 *   weekend day (Saturday/Sunday). A deterministic per-user, per-day picker
 *   means each student sees a stable greeting for the day, and different
 *   students (up to ~10 viewing the same day) almost always see different
 *   greetings from the pool.
 * - NEW_WEEK_GREETINGS: greetings for the start of a new week. In Nigeria /
 *   West Africa the week starts on Monday, so these are shown on Mondays.
 */

export const WEEKEND_GREETINGS: string[] = [
  "Happy weekend! Rest well — your future patients will thank you.",
  "Weekend mode activated. Recharge like it's a prescription. 💊",
  "Saturday and stethoscopes can wait. Enjoy your weekend!",
  "Happy weekend! Even doctors-in-training deserve a day off.",
  "Rest is clinical. Have a restful weekend!",
  "Happy weekend! May your sleep be deep and your data be free. 😄",
  "Weekend loading… please wait. ⏳",
  "Happy weekend! Take a break — the wards will still be there on Monday.",
  "Weekend vibes only. Books can rest too.",
  "Happy weekend! Hydrate, rest, and catch up with family.",
  "It's the weekend — perfect time to rest and reset.",
  "Happy weekend! You've earned this pause.",
  "Weekends are nature's way of saying 'slow down'. Enjoy!",
  "Happy weekend! Netflix, jollof, and zero alarms. 🍛",
  "Rest up this weekend — the grind returns on Monday.",
  "Happy weekend! May your rest be uninterrupted.",
  "Weekend duty: relax, recharge, repeat.",
  "Happy weekend! Protect your peace today.",
  "No lectures, no wards — just weekend. Enjoy!",
  "Happy weekend! Breathe out the week, breathe in the rest.",
  "The weekend is here — treat rest like homework. Do it well!",
  "Happy weekend! Your white coat will still fit on Monday. 😉",
  "Enjoy the weekend — balance is part of the training.",
  "Happy weekend! A well-rested mind retains more. Rest smart!",
  "Weekend greetings! Stretch, snack, and sleep well.",
  "Happy weekend! Give your brain a well-deserved holiday.",
  "Two days, zero timetables. Happy weekend!",
  "Happy weekend! Celebrate how far you've come this week.",
  "Weekend check-in: have you actually rested yet? 😄",
  "Happy weekend! May your only emergency be a jollof shortage.",
  "Wishing you a calm, refreshing weekend.",
  "Happy weekend! Log off, lie down, look at the sky.",
  "The weekend has officially prescribed you rest. Take the full dose!",
  "Happy weekend! Dance a little — it's good for the heart. 🎶",
  "Weekend rule #1: no guilt, only rest. Enjoy!",
  "Happy weekend! Recharge your scrubs and your spirit.",
  "Enjoy your weekend — future you will thank present you for resting.",
  "Happy weekend! The best revision today is a good nap.",
  "Sun's up, schedule's clear. Happy weekend!",
  "Happy weekend! Call your people, eat well, rest well.",
  "Weekend greeting from MedLog LMS: you're doing great. Now rest!",
  "Happy weekend! Even the heart rests between beats. ❤️",
  "Take two days of rest and call me on Monday. 😄 Happy weekend!",
  "Happy weekend! Today's vital signs: relaxed and smiling.",
  "Weekend loading complete. Enjoy every minute!",
  "Happy weekend! Sip something cold and celebrate the small wins.",
  "No ward rounds today — only round of applause for you. Happy weekend!",
  "Happy weekend! Rest is not a reward, it's a requirement.",
  "The weekend is your recovery room. Use it well!",
  "Happy weekend! See you bright and early on Monday. 🌤️",
];

export const NEW_WEEK_GREETINGS: string[] = [
  "Happy new week! In this part of the world the week starts on Monday — make it count. 💪",
  "New week, new energy. Welcome to a fresh Monday!",
  "Happy new week! Set your goals, then chase them one lecture at a time.",
  "A fresh week begins — may your Monday be motivated and your Friday be fruitful!",
  "Happy new week! Show up today like the doctor you're becoming.",
  "New week loading… 100% potential. Happy Monday!",
  "Happy new week! May this week's diagnoses be 'mild' and your grades be 'excellent'. 😄",
  "Welcome to a brand-new week — clean slate, clear goals, full focus.",
  "Happy new week! One week closer to your white coat.",
  "New week greetings! Start strong, stay consistent, finish proud.",
  "Happy new week! May your timetable be kind and your coffee be strong. ☕",
  "It's a new week — write the first page well. Happy Monday!",
];

// Simple deterministic string hash (FNV-1a style).
const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
};

const dateKeyOfDay = (date: Date): string => {
  const year = date.getFullYear();
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(year, 0, 0).getTime()) / 86400000,
  );
  return `${year}-${dayOfYear}`;
};

/**
 * Deterministic weekend greeting: stable for a given user on a given day,
 * but different across users and across days.
 */
export const pickWeekendGreeting = (
  userId?: string | null,
  date: Date = new Date(),
): string => {
  const seed = `${userId ?? "guest"}:${dateKeyOfDay(date)}`;
  const index = hashString(seed) % WEEKEND_GREETINGS.length;
  return WEEKEND_GREETINGS[index];
};

/** Deterministic start-of-week (Monday) greeting. */
export const pickNewWeekGreeting = (
  userId?: string | null,
  date: Date = new Date(),
): string => {
  const seed = `new-week:${userId ?? "guest"}:${dateKeyOfDay(date)}`;
  const index = hashString(seed) % NEW_WEEK_GREETINGS.length;
  return NEW_WEEK_GREETINGS[index];
};

export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

export const isMonday = (date: Date): boolean => date.getDay() === 1;

export const WEEKDAY_NAMES_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
