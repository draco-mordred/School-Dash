import type { LucideIcon } from "lucide-react";
import {
  Home,
  School,
  GraduationCap,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Users,
  Banknote,
  Settings2,
  Shield,
  Stethoscope,
  BarChart3,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  roles?: string[];
  items?: {
    title: string;
    url: string;
    roles?: string[];
  }[];
}

export const sidebardata = {
  teams: [
    {
      name: "MedLog",
      logo: School,
    },
  ],
  navMain: [
    // ═══════════════════════════════════════════════════════════════
    // ADMIN ONLY MODULES (12 main sections)
    // ═══════════════════════════════════════════════════════════════
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      roles: ["admin"],
    },
    {
      title: "Users",
      url: "/users",
      icon: Users,
      roles: ["admin"],
      items: [
        { title: "User Management", url: "/users", roles: ["admin"] },
        { title: "Students", url: "/users/students", roles: ["admin"] },
        // { title: "Parents", url: "/users/parents", roles: ["admin"] },
        { title: "Teachers", url: "/users/teachers", roles: ["admin"] },
        // { title: "Unit Consultants", url: "/users/unit-consultants", roles: ["admin"] },
        // { title: "Unit Residents", url: "/users/unit-residents", roles: ["admin"] },
        { title: "Staff", url: "/users/staff", roles: ["admin"] },
        { title: "Administrators", url: "/users/admins", roles: ["admin"] },
      ],
    },
    {
      title: "Academics",
      url: "#",
      icon: GraduationCap,
      roles: ["admin"],
      items: [
        { title: "Classes", url: "/classes", roles: ["admin"] },
        { title: "Courses", url: "/courses", roles: ["admin"] },
        { title: "Subjects", url: "/subjects", roles: ["admin"] },
        // { title: "Sessions", url: "/settings/academic-years", roles: ["admin"] },
        // { title: "Semesters", url: "/semesters", roles: ["admin"] },
        { title: "Academic Calendar", url: "/academic-calendar", roles: ["admin"] },
      ],
    },
    {
      title: "Clinicals",
      url: "#",
      icon: Stethoscope,
      roles: ["admin"],
      items: [
        { title: "Postings", url: "/clinical-rotations", roles: ["admin"] },
        { title: "Rotation Teams", url: "/rotation-teams", roles: ["admin"] },
        { title: "Clinical Calendar", url: "/rotation-schedules", roles: ["admin"] },
      ],
    },
    {
      title: "Timetables",
      url: "#",
      icon: CalendarDays,
      roles: ["admin"],
      items: [
        { title: "Lecture Schedules", url: "/timetable", roles: ["admin"] },
        { title: "Clinical Schedules", url: "/clinical-schedules", roles: ["admin"] },
        { title: "Dates and Events", url: "/timetable/events", roles: ["admin"] },
      ],
    },
    {
      title: "Assessments",
      url: "#",
      icon: ClipboardList,
      roles: ["admin"],
      items: [
        { title: "C.A. Tests", url: "/lms/exams", roles: ["admin"] },
        { title: "Examinations", url: "/lms/exams/main", roles: ["admin"] },
        { title: "Clinical Assessments", url: "/lms/exams/clinical", roles: ["admin"] },
      ],
    },
    {
      title: "Attendance",
      url: "#",
      icon: CheckCircle2,
      roles: ["admin"],
      items: [
        { title: "Lecture Attendance", url: "/attendance", roles: ["admin"] },
        { title: "Clinical Attendance", url: "/attendance/clinical", roles: ["admin"] },
      ],
    },
    {
      title: "Logbooks",
      url: "#",
      icon: BookOpen,
      roles: ["admin"],
      items: [
        { title: "Students Logbook Submission", url: "/logbook-entries", roles: ["admin"] },
        { title: "Staff Logbook Approvals", url: "/logbook-entries/approvals", roles: ["admin"] },
      ],
    },
    {
      title: "Announcements",
      url: "#",
      icon: MessageSquare,
      roles: ["admin"],
      items: [
        { title: "Admin Profile Notifications", url: "/notifications", roles: ["admin"] },
        { title: "System Notifications", url: "/notifications/system", roles: ["admin"] },
      ],
    },
    {
      title: "Reports & Analytics",
      url: "#",
      icon: BarChart3,
      roles: ["admin"],
      items: [
        { title: "Activities Logs", url: "/activities-log", roles: ["admin"] },
        { title: "System Alerts", url: "/reports/system-alerts", roles: ["admin"] },
        { title: "Priorities and Problems", url: "/reports/priorities", roles: ["admin"] },
        { title: "Global Feedback & Complaints", url: "/reports/feedback", roles: ["admin"] },
      ],
    },
    {
      title: "Audit Logs",
      url: "/audit-logs",
      icon: Shield,
      roles: ["admin"],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      roles: ["admin"],
      items: [
        { title: "Faculties", url: "/faculties", roles: ["admin"] },
        { title: "Departments", url: "/departments", roles: ["admin"] },
        { title: "Units", url: "/units", roles: ["admin"] },
        { title: "School Settings", url: "/settings/general", roles: ["admin"] },
        { title: "Academic Year Settings", url: "/settings/academic-years", roles: ["admin"] },
        { title: "Roles & Permissions", url: "/settings/roles", roles: ["admin"] },
        { title: "Admin Account/Profile", url: "/settings/account", roles: ["admin"] },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // NON-ADMIN MODULES
    // ═══════════════════════════════════════════════════════════════
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: true,
      roles: ["teacher", "student", "parent"],
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          roles: ["teacher", "student", "parent"],
        },
        {
          title: "Activities Log",
          url: "/activities-log",
          roles: ["teacher"],
        },
      ],
    },
    {
      title: "Academics",
      url: "#",
      icon: School,
      roles: ["teacher"],
      items: [
        { title: "Classes", url: "/classes", roles: ["teacher"] },
        { title: "Courses", url: "/courses", roles: ["teacher"] },
        { title: "Timetable", url: "/timetable" },
        { title: "Attendance", url: "/attendance" },
        { title: "Exams", url: "/lms/exams" },
        { title: "Study Materials", url: "/lms/materials" },
        { title: "Assignments", url: "/lms/assignments" },
      ],
    },
    {
      title: "Academics",
      url: "#",
      icon: School,
      roles: ["student"],
      items: [
        { title: "Overview", url: "/student-portal" },
        { title: "Courses", url: "/courses" },
        { title: "Subjects", url: "/subjects" },
        { title: "Learning Materials", url: "/lms/materials" },
        { title: "Assessments", url: "/lms/assignments" },
        { title: "Results", url: "/lms/exams" },
      ],
    },
    {
      title: "Clinical Learning (LMS)",
      url: "#",
      icon: GraduationCap,
      roles: ["teacher", "admin", "unitconsultant", "unitresident", "parent"],
      items: [
        { title: "Clinical Rotations", url: "/clinical-rotations" },
        { title: "Clinical Activities", url: "/clinical-activities", roles: ["student", "unitconsultant", "unitresident"] },
        { title: "Activity Approvals", url: "/staff-approvals", roles: ["unitconsultant", "unitresident"] },
        { title: "Logbook Entries", url: "/logbook-entries" },
        { title: "Procedures", url: "/procedures" },
        { title: "Approvals", url: "/approvals" },
        { title: "Reflections", url: "/reflections" },
      ],
    },
    {
      title: "Clinicals",
      url: "#",
      icon: GraduationCap,
      roles: ["student"],
      items: [
        { title: "Postings", url: "/clinical-rotations" },
        { title: "Rotation Schedule", url: "/rotation-schedule" },
        { title: "My Team", url: "/student/clinicals/team" },
        // { title: "Clinical Attendance", url: "/student/clinicals/attendance" },
        { title: "Clinical History", url: "/student/clinicals/history" },

        { title: "Daily activities", url: "/student/schedule/daily-activities" },
        { title: "This Week", url: "/student/schedule/week" },
        { title: "Calendar", url: "/student/schedule/calendar" },
        { title: "Upcoming", url: "/student/schedule/upcoming" },
      ],
    },
    {
      title: "My Logbook",
      url: "#",
      icon: BookOpen,
      roles: ["student"],
      items: [
        { title: "Overview", url: "/logbook-entries" },
        { title: "Entries", url: "/clinical-activities" },
        { title: "Pending Approvals", url: "/staff-approvals" },
        { title: "Approved Entries", url: "/student/logbook/approved" },
        { title: "Statistics", url: "/student/logbook/statistics" },
      ],
    },

    {
      title: "Student Logbooks",
      url: "#",
      icon: BookOpen,
      roles: ["teacher", "unitconsultants", "unitresidents"],
      items: [
        { title: "Overview", url: "/logbook-supervision" },
        { title: "Submissions", url: "/logbook-submissions" },
        { title: "Incoming Entries", url: "/logbook-incoming" },
        { title: "Statistics", url: "/student/logbook/statistics" },
      ],
    },

    {
      title: "Clinical Schedule",
      url: "#",
      icon: CalendarDays,
      roles: ["student"],
      items: [
     
      ],
    },
    {
      title: "Timetable",
      url: "#",
      icon: CalendarDays,
      roles: ["student"],
      items: [
        { title: "Weekly Timetable", url: "/timetable" },
        { title: "Today", url: "/student/schedule/today" },
        // { title: "Download", url: "/student/timetable/download" },
      ],
    },
    {
      title: "Attendance",
      url: "#",
      icon: ClipboardList,
      roles: ["student"],
      items: [
        { title: "Overview", url: "/attendance" },
        { title: "Academic", url: "/student/attendance/academic" },
        { title: "Clinical", url: "/student/attendance/clinical" },
        { title: "History", url: "/student/attendance/history" },
      ],
    },
        {
      title: "Attendance",
      url: "#",
      icon: ClipboardList,
      roles: ["teacher", "unitconsultant", "unitresident"],
      items: [
        { title: "Overview", url: "/attendance/overview" },
        { title: "Academic", url: "/attendance" },
        { title: "Clinical", url: "/attendance/clinical" },
        { title: "History", url: "/attendance/history" },
      ],
    },

    {
      title: "People",
      url: "#",
      icon: Users,
      roles: ["teacher"],
      items: [
        { title: "Students", url: "/users/students", roles: ["teacher"] },
      ],
    },
    {
      title: "Finance",
      url: "#",
      icon: Banknote,
      roles: ["teacher", "unitconsultant", "unitresident"],
      items: [
        { title: "Fee Collection", url: "/finance/fees" },
        { title: "Expenses", url: "/finance/expenses" },
        { title: "Salary", url: "/finance/salary" },
      ],
    },
    {
      title: "Finance",
      url: "#",
      icon: Banknote,
      roles: ["student"],
      items: [
        { title: "Payments", url: "/finance/fees" },
 
      ],
    },
    {
      title: "System",
      url: "#",
      icon: Settings2,
      roles: ["student"],
      items: [
        { title: "Profile", url: "/settings/account" },
        { title: "Notices", url: "/notifications" },
        { title: "Institution Profile", url: "/school-profile" },
        // { title: "Academic Years", url: "/settings/academic-years" },
      ],
    },

    {
      title: "System",
      url: "#",
      icon: Settings2,
      roles: ["teacher", "unitconsultant", "unitresident"],
      items: [
        { title: "Profile", url: "/settings/account" },
        { title: "Notifications", url: "/notifications" },
        { title: "School Profile", url: "/school-profile" },
        { title: "Academic Years", url: "/settings/academic-years" },
        // { title: "Roles & Permissions", url: "/settings/roles" },
      ],
    },
  ] as NavItem[],
};
