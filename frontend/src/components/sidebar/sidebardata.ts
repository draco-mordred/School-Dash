import type { LucideIcon } from "lucide-react";
import {
  School,
  LayoutDashboard,
  GraduationCap,
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
      icon: LayoutDashboard,
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
      roles: ["admin", "teacher", "student", "parent"],
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
      title: "Learning (LMS)",
      url: "#",
      icon: GraduationCap,
      roles: ["teacher", "student", "admin", "unit_consultant", "unit_resident", "parent"],
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
