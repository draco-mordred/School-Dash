// Phase-to-posting and phase-to-course matching helpers.
//
// Class clock phases are configured with a name (e.g. "O&G/Pediatrics
// Senior Postings"), optional subPostings (e.g. ["Obstetrics and
// Gynaecology", "Paediatrics"]) and MAY carry explicit
// postingScheduleId/postingName/courseIds. When those explicit links are
// missing or stale, the phase text still tells us WHICH departments it
// is about — via the same 3-letter department codes used across the app
// (constants/departments.ts: OBG, PAE, MED, SUR, ...). These helpers
// detect those department codes from free text and use them to
// (a) pick the rotation plan/posting that matches the active phase and
// (b) filter the class courses down to the ones belonging to the phase
// ("Courses for this phase").

const DEPARTMENT_PATTERNS: Array<{ code: string; pattern: RegExp }> = [
  { code: "OBG", pattern: /o\s*&\s*g|\bog\b|\bobg\b|obstetric|gyna?ecolog|\bobs\b/i },
  { code: "PAE", pattern: /\bpae\b|\bpeds?\b|paedia?tric|pediatric/i },
  { code: "MED", pattern: /\bmed\b|medicine/i },
  { code: "SUR", pattern: /\bsur\b|\bsurg\b|surgery|surgical/i },
  { code: "PSY", pattern: /\bpsy\b|psychiatr/i },
  { code: "ORL", pattern: /\borl\b|\bent\b|otorhinolaryngolog/i },
  { code: "ANE", pattern: /\bane\b|ana?esthesiolog|anaesthesia|anesthesia/i },
  { code: "RAD", pattern: /\brad\b|radiolog/i },
  { code: "OPH", pattern: /\boph\b|ophthalmolog/i },
  { code: "DER", pattern: /\bder\b|dermatolog/i },
  { code: "COM", pattern: /\bcom\b|community medicine/i },
  { code: "HEM", pattern: /\bhem\b|ha?ematolog|blood transfusion/i },
  { code: "MIC", pattern: /\bmic\b|microbiolog/i },
  { code: "CHP", pattern: /\bchp\b|chemical pathology/i },
  { code: "PHA", pattern: /\bpha\b|pharmacolog/i },
  { code: "PAT", pattern: /\bpat\b|anatomic pathology|histopatholog|\bpathology\b/i },
  { code: "FAM", pattern: /\bfam\b|family medicine/i },
  { code: "ORT", pattern: /\bort\b|orthopa?edic/i },
  { code: "FOR", pattern: /forensic/i },
];

const GENERIC_TOKENS = new Set([
  "posting", "postings", "phase", "clinical", "level", "class", "schedule",
  "rotation", "block", "exam", "exams", "elective", "initial", "final",
  "other", "specialty", "the", "and", "mbbs",
]);

export const phaseText = (
  phaseConfig: Record<string, any> | null | undefined,
): string =>
  [
    phaseConfig?.name,
    phaseConfig?.postingName,
    phaseConfig?.postingType,
    ...(Array.isArray(phaseConfig?.subPostings) ? phaseConfig.subPostings : []),
  ]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .join(" ");

export const detectDepartmentCodes = (text: string): string[] => {
  const found: string[] = [];
  for (const { code, pattern } of DEPARTMENT_PATTERNS) {
    if (pattern.test(String(text ?? ""))) found.push(code);
  }
  return found;
};

export const phaseDepartmentCodes = (
  phaseConfig: Record<string, any> | null | undefined,
): string[] => detectDepartmentCodes(phaseText(phaseConfig));

export const normalizeTokens = (text: string): string[] =>
  String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length > 1 && !GENERIC_TOKENS.has(token));

// Class courses for this phase: explicit courseIds win when they resolve
// to at least one course; otherwise match the phase's department codes
// against each course — first by its code (first three alpha characters,
// e.g. "OBG" for "OBG 501"), then by its long name (e.g. "Obstetrics and
// Gynaecology"). When the phase text names no recognisable department,
// all courses are returned (previous behaviour).
export const matchCoursesToPhase = (
  courses: any[],
  phaseConfig: Record<string, any> | null | undefined,
): any[] => {
  if (!Array.isArray(courses)) return [];
  const explicitIds = Array.isArray(phaseConfig?.courseIds)
    ? phaseConfig.courseIds.map(String)
    : [];
  if (explicitIds.length > 0) {
    const explicit = courses.filter((course) =>
      explicitIds.includes(String((course as any)?._id ?? (course as any)?.id ?? course)),
    );
    if (explicit.length > 0) return explicit;
  }
  const phaseCodes = phaseDepartmentCodes(phaseConfig);
  if (phaseCodes.length === 0) return courses;
  return courses.filter((course) => {
    const code3 = String((course as any)?.code ?? "")
      .replace(/[^a-zA-Z]/g, "")
      .slice(0, 3)
      .toUpperCase();
    if (code3 && phaseCodes.includes(code3)) return true;
    const courseText = [(course as any)?.name, (course as any)?.code]
      .filter((part) => typeof part === "string" && part.length > 0)
      .join(" ");
    const courseCodes = detectDepartmentCodes(courseText);
    return courseCodes.some((code) => phaseCodes.includes(code));
  });
};

// Pick the plan (and the posting inside it) that belongs to the active
// class clock phase. An exact posting-name match scores highest;
// otherwise department-code overlap (OBG/PAE/...) plus meaningful name
// tokens decides. Junior and senior are mutually exclusive: a phase
// that says "Junior" never matches a plan that says "Senior", and vice
// versa. Returns null when nothing scores above zero.
export const selectPlanForPhase = (
  plans: any[],
  phaseConfig: Record<string, any> | null | undefined,
  exactPostingName?: string | null,
): { plan: any; posting: any; score: number; exact: boolean } | null => {
  if (!Array.isArray(plans) || plans.length === 0) return null;
  const phaseCodes = phaseDepartmentCodes(phaseConfig);
  const phaseTextValue = phaseText(phaseConfig);
  const phaseTokens = new Set(normalizeTokens(phaseTextValue));
  const phaseIsJunior = /\bjunior\b/i.test(phaseTextValue);
  const phaseIsSenior = /\bsenior\b/i.test(phaseTextValue);

  let best: { plan: any; posting: any; score: number; exact: boolean } | null = null;
  for (const plan of plans) {
    const postings = Array.isArray(plan?.postings) ? plan.postings : [];
    const candidates: any[] = postings.length > 0 ? postings : [null];
    for (const posting of candidates) {
      const names = [plan?.name, posting?.name].filter(Boolean).join(" ");
      if (!names) continue;
      const planIsJunior = /\bjunior\b/i.test(names);
      const planIsSenior = /\bsenior\b/i.test(names);
      if (planIsJunior && phaseIsSenior) continue;
      if (planIsSenior && phaseIsJunior) continue;
      let score = 0;
      let exact = false;
      if (exactPostingName && posting && String(posting?.name) === String(exactPostingName)) {
        score += 1000;
        exact = true;
      }
      const planCodes = detectDepartmentCodes(names);
      score += phaseCodes.filter((code) => planCodes.includes(code)).length * 20;
      const sharedTokens = normalizeTokens(names).filter((token) => phaseTokens.has(token));
      score += sharedTokens.length * 5;
      if (score <= 0) continue;
      if (!best || score > best.score) {
        best = { plan, posting: posting ?? postings[0] ?? null, score, exact };
      }
    }
  }
  return best;
};
