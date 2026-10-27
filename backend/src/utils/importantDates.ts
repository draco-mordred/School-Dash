// Curated static dataset of important dates for students: Nigerian public
// holidays (declared dates) plus recurring world observance days with a
// health/medical focus. Movable Islamic holidays are declared yearly by the
// Federal Government; declared dates are hardcoded per year and entries for
// future years are marked "Expected" until officially declared.

export interface ImportantDateItem {
  id: string;
  type: "public-holiday" | "observance";
  title: string;
  detail: string;
  date: string; // yyyy-mm-dd
}

const nigeriaPublicHolidays: Record<string, { date: string; name: string; note?: string }[]> = {
  "2026": [
    { date: "2026-01-01", name: "New Year's Day" },
    { date: "2026-03-19", name: "Eid-ul-Fitr" },
    { date: "2026-03-20", name: "Eid-ul-Fitr (2nd day)" },
    { date: "2026-04-03", name: "Good Friday" },
    { date: "2026-04-06", name: "Easter Monday" },
    { date: "2026-05-01", name: "Workers' Day" },
    { date: "2026-05-27", name: "Eid-ul-Adha" },
    { date: "2026-05-28", name: "Eid-ul-Adha (2nd day)" },
    { date: "2026-06-12", name: "Democracy Day" },
    { date: "2026-08-25", name: "Eid-el-Maulud" },
    { date: "2026-10-01", name: "Independence Day" },
    { date: "2026-12-25", name: "Christmas Day" },
    { date: "2026-12-26", name: "Boxing Day" },
  ],
  "2027": [
    { date: "2027-01-01", name: "New Year's Day" },
    { date: "2027-03-26", name: "Good Friday", note: "Expected" },
    { date: "2027-03-29", name: "Easter Monday", note: "Expected" },
    { date: "2027-05-01", name: "Workers' Day" },
    { date: "2027-06-12", name: "Democracy Day" },
    { date: "2027-10-01", name: "Independence Day" },
    { date: "2027-12-25", name: "Christmas Day" },
    { date: "2027-12-26", name: "Boxing Day" },
  ],
};

// Recurring world observance days (fixed dates) — health-focused plus major
// international days relevant to medical students.
const worldObservanceDays: { month: number; day: number; name: string }[] = [
  { month: 2, day: 4, name: "World Cancer Day" },
  { month: 3, day: 8, name: "International Women's Day" },
  { month: 3, day: 24, name: "World Tuberculosis Day" },
  { month: 4, day: 7, name: "World Health Day" },
  { month: 4, day: 25, name: "World Malaria Day" },
  { month: 5, day: 5, name: "World Hand Hygiene Day" },
  { month: 5, day: 31, name: "World No Tobacco Day" },
  { month: 6, day: 14, name: "World Blood Donor Day" },
  { month: 7, day: 28, name: "World Hepatitis Day" },
  { month: 10, day: 10, name: "World Mental Health Day" },
  { month: 11, day: 14, name: "World Diabetes Day" },
  { month: 12, day: 1, name: "World AIDS Day" },
];

const pad2 = (value: number) => String(value).padStart(2, "0");

const buildObservancesForYear = (year: number): ImportantDateItem[] =>
  worldObservanceDays.map((entry) => ({
    id: "obs-" + year + "-" + entry.month + "-" + entry.day,
    type: "observance" as const,
    title: entry.name,
    detail: "World observance day",
    date: year + "-" + pad2(entry.month) + "-" + pad2(entry.day),
  }));

export const getUpcomingImportantDates = (from: Date, to: Date): ImportantDateItem[] => {
  const items: ImportantDateItem[] = [];
  const years = new Set<number>();
  for (let y = from.getFullYear(); y <= to.getFullYear(); y += 1) years.add(y);

  for (const year of years) {
    const holidays = nigeriaPublicHolidays[String(year)] ?? [];
    for (const holiday of holidays) {
      items.push({
        id: "hol-" + holiday.date,
        type: "public-holiday",
        title: holiday.name,
        detail: holiday.note
          ? holiday.note + " — Nigerian public holiday"
          : "Nigerian public holiday",
        date: holiday.date,
      });
    }
    items.push(...buildObservancesForYear(year));
  }

  const fromTime = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const toTime = to.getTime();
  return items
    .filter((item) => {
      const t = new Date(item.date + "T00:00:00Z").getTime();
      return t >= fromTime && t <= toTime;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};
