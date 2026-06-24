import type { LucideIcon } from "lucide-react";
import {
  Home,
  School,
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Bell,
  Users,
  Banknote,
  Settings2,
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
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: true,
      roles: ["admin", "teacher", "student", "parent"],
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          roles: ["admin", "teacher", "student", "parent"],
        },
        {
          title: "Activities Log",
          url: "/activities-log",
          roles: ["admin"],
        },
      ],
    },
    {
      title: "Academics",
      url: "#",
      icon: School,
      roles: ["admin", "teacher"],
      items: [
        { title: "Classes", url: "/classes", roles: ["admin", "teacher"] },
        { title: "Courses", url: "/courses", roles: ["admin", "teacher"] },
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
      title: "Learning (LMS)",
      url: "#",
      icon: GraduationCap,
      roles: ["teacher", "admin", "unit_consultant", "unit_resident", "parent"],
      items: [
        { title: "Clinical Rotations", url: "/clinical-rotations" },
        { title: "Clinical Activities", url: "/clinical-activities", roles: ["student", "unit_consultant", "unit_resident"] },
        { title: "Activity Approvals", url: "/staff-approvals", roles: ["unit_consultant", "unit_resident"] },
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
        { title: "Current Posting", url: "/clinical-rotations" },
        { title: "Rotations", url: "/clinical-rotations" },
        { title: "Team", url: "/student/clinicals/team" },
        { title: "Clinical Attendance", url: "/student/clinicals/attendance" },
        { title: "Clinical History", url: "/student/clinicals/history" },
      ],
    },
    {
      title: "Logbook",
      url: "#",
      icon: BookOpen,
      roles: ["student"],
      items: [
        { title: "Dashboard", url: "/logbook-entries" },
        { title: "Entries", url: "/logbook-entries" },
        { title: "Pending Approvals", url: "/staff-approvals" },
        { title: "Approved Entries", url: "/student/logbook/approved" },
        { title: "Statistics", url: "/student/logbook/statistics" },
      ],
    },
    {
      title: "Timetable",
      url: "#",
      icon: CalendarDays,
      roles: ["student"],
      items: [
        { title: "Weekly Timetable", url: "/timetable" },
        { title: "Daily View", url: "/student/schedule/today" },
        { title: "Download", url: "/student/timetable/download" },
      ],
    },
    {
      title: "Schedule",
      url: "#",
      icon: CalendarDays,
      roles: ["student"],
      items: [
        { title: "Today", url: "/student/schedule/today" },
        { title: "This Week", url: "/student/schedule/week" },
        { title: "Calendar", url: "/student/schedule/calendar" },
        { title: "Upcoming", url: "/student/schedule/upcoming" },
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
      title: "Notices",
      url: "/notifications",
      icon: Bell,
      roles: ["student"],
    },
    {
      title: "Profile",
      url: "/settings/account",
      icon: Users,
      roles: ["student"],
    },
    {
      title: "People",
      url: "#",
      icon: Users,
      roles: ["admin", "teacher"],
      items: [
        { title: "Students", url: "/users/students" },
        { title: "Teachers", url: "/users/teachers", roles: ["admin"] },
        { title: "Parents", url: "/users/parents", roles: ["admin"] },
        { title: "Admins", url: "/users/admins", roles: ["admin"] },
        { title: "Unit Consultants", url: "/users/unit-consultants", roles: ["admin"] },
        { title: "Unit Residents", url: "/users/unit-residents", roles: ["admin"] },
      ],
    },
    {
      title: "Finance",
      url: "#",
      icon: Banknote,
      roles: ["admin"],
      items: [
        { title: "Fee Collection", url: "/finance/fees" },
        { title: "Expenses", url: "/finance/expenses" },
        { title: "Salary", url: "/finance/salary" },
      ],
    },
    {
      title: "System",
      url: "#",
      icon: Settings2,
      roles: ["admin"],
      items: [
        { title: "Notifications", url: "/notifications" },
        { title: "School Settings", url: "/settings/general" },
        { title: "Academic Years", url: "/settings/academic-years" },
        { title: "Roles & Permissions", url: "/settings/roles" },
      ],
    },
  ] as NavItem[],
};
