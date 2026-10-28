export interface TourStep {
  id: string;
  title: string;
  description: string;
  /**
   * Route the tour navigates to for this step.
   * Use "*" for steps that should show on any page (e.g. sidebar/topbar intros).
   */
  route: string;
  /** Optional CSS selector for the element to anchor the tooltip to. */
  target?: string;
  actionLabel?: string;
}

const studentSteps: TourStep[] = [
  {
    id: "student-sidebar",
    title: "Your navigation",
    description:
      "This sidebar is home base — jump between your portal, attendance, timetable, courses and notifications anytime.",
    target: "[data-tour='student-sidebar']",
    route: "*",
    actionLabel: "Next",
  },
  {
    id: "student-topbar",
    title: "Quick access",
    description:
      "The top bar shows where you are and gives you quick actions like theme and account settings.",
    target: "[data-tour='student-topbar']",
    route: "*",
    actionLabel: "Next",
  },
  {
    id: "student-portal",
    title: "Your portal",
    description:
      "Your dashboard summarises everything — announcements, your schedule and quick links to what matters.",
    route: "/student-portal",
    actionLabel: "Next",
  },
  {
    id: "student-attendance",
    title: "Attendance",
    description:
      "Check your attendance here to stay on top of your participation and progress.",
    target: "[data-tour='student-attendance']",
    route: "/attendance",
    actionLabel: "Next",
  },
  {
    id: "student-timetable",
    title: "Timetable",
    description:
      "Open the timetable to see your class and lecture schedule for the week.",
    target: "[data-tour='student-timetable']",
    route: "/timetable",
    actionLabel: "Next",
  },
  {
    id: "student-courses",
    title: "Courses & subjects",
    description:
      "View your enrolled courses. Click \"View Subjects\" on a course card to see its full subject list.",
    route: "/courses",
    actionLabel: "Next",
  },
  {
    id: "student-notifications",
    title: "Notifications",
    description:
      "Keep an eye on announcements, reminders, and updates from the school here.",
    target: "[data-tour='student-notifications']",
    route: "/notifications",
    actionLabel: "Finish",
  },
];

const teacherSteps: TourStep[] = [
  {
    id: "teacher-sidebar",
    title: "Your navigation",
    description:
      "This sidebar is home base — jump between your dashboard, attendance, timetable, student logbooks and notifications.",
    target: "[data-tour='student-sidebar']",
    route: "*",
    actionLabel: "Next",
  },
  {
    id: "teacher-topbar",
    title: "Quick access",
    description:
      "The top bar shows where you are and gives you quick actions like theme and account settings.",
    target: "[data-tour='student-topbar']",
    route: "*",
    actionLabel: "Next",
  },
  {
    id: "teacher-dashboard",
    title: "Your dashboard",
    description:
      "Your dashboard summarises your day — lecture sessions, classes and quick stats.",
    route: "/dashboard",
    actionLabel: "Next",
  },
  {
    id: "teacher-attendance-overview",
    title: "Attendance overview",
    description:
      "Your dedicated overview page for tracking attendance across your classes and clinical sessions.",
    route: "/attendance/overview",
    actionLabel: "Next",
  },
  {
    id: "teacher-attendance",
    title: "Attendance",
    description:
      "Record and review academic attendance for your classes here.",
    route: "/attendance",
    actionLabel: "Next",
  },
  {
    id: "teacher-timetable",
    title: "Timetable",
    description:
      "See your lecture schedule for the week and where you're expected.",
    route: "/timetable",
    actionLabel: "Next",
  },
  {
    id: "teacher-logbooks",
    title: "Student logbooks",
    description:
      "Review the logbook submissions of students you supervise — incoming entries, approvals and statistics.",
    route: "/logbook-supervision",
    actionLabel: "Next",
  },
  {
    id: "teacher-notifications",
    title: "Notifications",
    description:
      "Announcements and updates from the school appear here.",
    target: "[data-tour='student-notifications']",
    route: "/notifications",
    actionLabel: "Finish",
  },
];

const adminSteps: TourStep[] = [
  {
    id: "admin-sidebar",
    title: "Your navigation",
    description:
      "This sidebar is home base — every module of MedLog LMS is one click away: users, academics, clinicals, timetables and more.",
    target: "[data-tour='student-sidebar']",
    route: "*",
    actionLabel: "Next",
  },
  {
    id: "admin-topbar",
    title: "Quick access",
    description:
      "The top bar shows where you are and gives you quick actions like theme and account settings.",
    target: "[data-tour='student-topbar']",
    route: "*",
    actionLabel: "Next",
  },
  {
    id: "admin-dashboard",
    title: "Dashboard",
    description:
      "Your command centre — system stats, alerts and the activities log that tracks everything happening in the system.",
    route: "/dashboard",
    actionLabel: "Next",
  },
  {
    id: "admin-users",
    title: "Users",
    description:
      "Create and manage every account — students, teachers, staff and administrators — including bulk uploads.",
    route: "/users",
    actionLabel: "Next",
  },
  {
    id: "admin-academics",
    title: "Academics",
    description:
      "Set up the academic structure: classes, courses, subjects, the calendar, study materials and assignments.",
    route: "/classes",
    actionLabel: "Next",
  },
  {
    id: "admin-clinicals",
    title: "Clinicals",
    description:
      "Manage clinical postings, rotation teams and the clinical calendar for medical rotations.",
    route: "/clinical-rotations",
    actionLabel: "Next",
  },
  {
    id: "admin-attendance",
    title: "Attendance",
    description:
      "Monitor lecture and clinical attendance across the whole school.",
    route: "/attendance",
    actionLabel: "Next",
  },
  {
    id: "admin-timetable",
    title: "Timetables",
    description:
      "Publish lecture schedules, clinical schedules and important dates & events.",
    route: "/timetable",
    actionLabel: "Next",
  },
  {
    id: "admin-notifications",
    title: "Notifications",
    description:
      "System announcements and alerts land here — only notifications that need admin action.",
    target: "[data-tour='student-notifications']",
    route: "/notifications",
    actionLabel: "Finish",
  },
];

const parentSteps: TourStep[] = [
  {
    id: "parent-sidebar",
    title: "Your navigation",
    description:
      "This sidebar is home base — jump between your notifications, school profile and account settings.",
    target: "[data-tour='student-sidebar']",
    route: "*",
    actionLabel: "Next",
  },
  {
    id: "parent-topbar",
    title: "Quick access",
    description:
      "The top bar shows where you are and gives you quick actions like theme and account settings.",
    target: "[data-tour='student-topbar']",
    route: "*",
    actionLabel: "Next",
  },
  {
    id: "parent-notifications",
    title: "Notifications",
    description:
      "Announcements and updates about the school and your ward appear here.",
    target: "[data-tour='student-notifications']",
    route: "/notifications",
    actionLabel: "Next",
  },
  {
    id: "parent-account",
    title: "Your account",
    description:
      "Update your profile and password from your account settings.",
    route: "/settings/account",
    actionLabel: "Finish",
  },
];

export const getTourSteps = (role?: string): TourStep[] => {
  switch (role) {
    case "admin":
      return adminSteps;
    case "teacher":
    case "unitconsultant":
    case "unitresident":
      return teacherSteps;
    case "parent":
      return parentSteps;
    case "student":
    default:
      return studentSteps;
  }
};
