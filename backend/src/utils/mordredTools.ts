// PR M1 — MORDRED engine tool registry (pure). UI brand: DALE. Internal engine name: MORDRED.
// Each tool declares the roles allowed to execute it. The model only ever
// receives tools for the calling user role, AND execution re-checks the role
// (defense in depth). Handlers live in services/mordredEngine.ts.

export interface MordredToolField {
  type: "string" | "number" | "boolean";
  description?: string;
  required?: boolean;
}

export interface MordredToolSpec {
  name: string;
  description: string;
  allowedRoles: string[];
  requiresConfirmation?: boolean;
  fields: Record<string, MordredToolField>;
}

export const MORDRED_STUDENT_ROLES = ["student"];
export const MORDRED_STAFF_ROLES = ["teacher", "unitconsultant", "unitresident"];
export const MORDRED_ADMIN_ROLES = ["admin"];

const STAFF_AND_ADMIN = [...MORDRED_STAFF_ROLES, ...MORDRED_ADMIN_ROLES];
const ALL_CHAT_ROLES = ["student", "teacher", "unitconsultant", "unitresident", "parent", "admin"];

export const MORDRED_TOOL_SPECS: MordredToolSpec[] = [
  {
    name: "get_my_attendance",
    description: "Get the current user overall attendance percent (lecture + clinical, final statuses only). Returns null when attendance is untracked.",
    allowedRoles: MORDRED_STUDENT_ROLES,
    fields: {},
  },
  {
    name: "get_my_results_and_gpa",
    description: "Get the current user released (non-withheld) course results with letter grades, percentages, and cumulative GPA on the 5.0 scale.",
    allowedRoles: MORDRED_STUDENT_ROLES,
    fields: {},
  },
  {
    name: "get_my_risk_snapshot",
    description: "Get the current user predictive risk snapshot: attendance percent, CA test trend, missed assessments, risk tier (low/medium/high) and generated insights.",
    allowedRoles: MORDRED_STUDENT_ROLES,
    fields: {},
  },
  {
    name: "get_my_upcoming_exams",
    description: "List the current user upcoming active exams and CA tests for their class (next 10, sorted by due date).",
    allowedRoles: MORDRED_STUDENT_ROLES,
    fields: {},
  },
  {
    name: "post_attendance_concern",
    description: "Raise an attendance concern or clarification request from the current user to the admin desk (creates a notification). Use for attendance disputes that are not software bugs.",
    allowedRoles: MORDRED_STUDENT_ROLES,
    fields: { note: { type: "string", description: "The concern in one or two sentences.", required: true } },
  },
  {
    name: "request_escalation",
    description: "Escalate a problem that needs a human staff member: software bugs, missing attendance logs, logbook errors, timetable conflicts. Routes a ticket to available staff and notifies admins.",
    allowedRoles: ALL_CHAT_ROLES,
    fields: {
      department: { type: "string", description: "Department name to route the ticket to (optional)." },
      details: { type: "string", description: "What the human needs to fix (optional)." },
    },
  },
  {
    name: "get_class_risk_overview",
    description: "Get the predictive risk overview for a class: tier counts (low/medium/high) and the high-risk students with their risk factors.",
    allowedRoles: STAFF_AND_ADMIN,
    fields: { classId: { type: "string", description: "The class id.", required: true } },
  },
  {
    name: "get_student_risk_snapshot",
    description: "Get the predictive risk snapshot (attendance, CA trend, missed assessments, tier, insights) for a specific student.",
    allowedRoles: STAFF_AND_ADMIN,
    fields: { studentId: { type: "string", description: "The student user id.", required: true } },
  },
  {
    name: "check_exam_overlap",
    description: "Check whether a candidate exam window [dueDate, dueDate + duration] overlaps any active exam already scheduled for the class. Returns warnings only.",
    allowedRoles: STAFF_AND_ADMIN,
    fields: {
      classId: { type: "string", description: "The class id.", required: true },
      dueDate: { type: "string", description: "Candidate exam due date (ISO string).", required: true },
      duration: { type: "number", description: "Candidate exam duration in minutes.", required: true },
      excludeExamId: { type: "string", description: "Exam id to exclude from the check (when editing an existing exam)." },
    },
  },
  {
    name: "flag_student_for_attention",
    description: "Flag a student for staff/admin attention with a short reason. Creates a notification for the admin desk. Does NOT change any student record.",
    allowedRoles: STAFF_AND_ADMIN,
    fields: {
      studentId: { type: "string", description: "The student user id.", required: true },
      reason: { type: "string", description: "Why the student needs attention.", required: true },
    },
  },
  {
    name: "release_course_results",
    description: "Release course results for a whole course. Students with outstanding eligibility issues have their results withheld (unless override is true). Use ONLY after explicit admin confirmation.",
    allowedRoles: MORDRED_ADMIN_ROLES,
    requiresConfirmation: true,
    fields: {
      courseId: { type: "string", description: "The course id.", required: true },
      override: { type: "boolean", description: "true to release even for students with eligibility issues." },
    },
  },
  {
    name: "override_withheld_result",
    description: "Set or clear the admin override for a withheld result of one student in one course. Use ONLY after explicit admin confirmation.",
    allowedRoles: MORDRED_ADMIN_ROLES,
    requiresConfirmation: true,
    fields: {
      courseId: { type: "string", description: "The course id.", required: true },
      studentId: { type: "string", description: "The student user id.", required: true },
      override: { type: "boolean", description: "true to force-release despite eligibility issues." },
    },
  },
  {
    name: "recompute_course_results",
    description: "Recompute course results (CA averages, exam component, weighted percent, letter, grade points) for every student in a course. Use ONLY after explicit admin confirmation.",
    allowedRoles: MORDRED_ADMIN_ROLES,
    requiresConfirmation: true,
    fields: { courseId: { type: "string", description: "The course id.", required: true } },
  },
  {
    name: "send_system_alert",
    description: "Send a system alert notification to all active users of a target role (defaults to admins). Use ONLY after explicit admin confirmation.",
    allowedRoles: MORDRED_ADMIN_ROLES,
    requiresConfirmation: true,
    fields: {
      title: { type: "string", description: "Alert title.", required: true },
      message: { type: "string", description: "Alert message.", required: true },
      targetRole: { type: "string", description: "Target role (student, teacher, unitconsultant, unitresident, parent, admin). Defaults to admin." },
    },
  },
];

export const toolsForRole = (role?: string): MordredToolSpec[] => {
  const normalized = String(role ?? "").trim().toLowerCase();
  return MORDRED_TOOL_SPECS.filter((spec) => spec.allowedRoles.includes(normalized));
};

export const toolSpecByName = (name: string): MordredToolSpec | undefined =>
  MORDRED_TOOL_SPECS.find((spec) => spec.name === String(name ?? "").trim());

export const canUseTool = (name: string, role?: string): boolean => {
  const spec = toolSpecByName(name);
  if (!spec) return false;
  const normalized = String(role ?? "").trim().toLowerCase();
  return spec.allowedRoles.includes(normalized);
};

export interface MordredUsageLimits {
  messages: number;
  toolCalls: number;
}

// Daily per-user caps, enforced BEFORE any model call. Institution
// subscription tiers can later override these via AssessmentSettings.
export const DEFAULT_MORDRED_LIMITS: Record<string, MordredUsageLimits> = {
  student: { messages: 20, toolCalls: 40 },
  parent: { messages: 10, toolCalls: 20 },
  teacher: { messages: 50, toolCalls: 100 },
  unitconsultant: { messages: 50, toolCalls: 100 },
  unitresident: { messages: 50, toolCalls: 100 },
  admin: { messages: 200, toolCalls: 400 },
  default: { messages: 20, toolCalls: 40 },
};

export const limitsForRole = (role?: string): MordredUsageLimits =>
  DEFAULT_MORDRED_LIMITS[String(role ?? "").trim().toLowerCase()] ?? DEFAULT_MORDRED_LIMITS.default;

export const usageDateKey = (date: Date): string => date.toISOString().slice(0, 10);

export const withinLimits = (
  used: { messages: number; toolCalls: number },
  role?: string
): { messages: boolean; toolCalls: boolean; limits: MordredUsageLimits } => {
  const limits = limitsForRole(role);
  return {
    messages: Number(used?.messages ?? 0) <= limits.messages,
    toolCalls: Number(used?.toolCalls ?? 0) <= limits.toolCalls,
    limits,
  };
};