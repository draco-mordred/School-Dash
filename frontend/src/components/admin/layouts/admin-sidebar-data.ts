import {
  Home,
  Users,
  GraduationCap,
  Stethoscope,
  Calendar,
  ClipboardList,
  CheckSquare,
  BookOpen,
  MessageSquare,
  BarChart3,
  Shield,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AdminNavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: string;
  items?: {
    title: string;
    url: string;
  }[];
}

export const adminSidebarData = {
  navMain: [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: Home,
    },
    {
      title: "Users",
      url: "/admin/users",
      icon: Users,
      items: [
        { title: "User Management", url: "/admin/users" },
        { title: "Students", url: "/admin/users/students" },
        { title: "Parents", url: "/admin/users/parents" },
        { title: "Teachers", url: "/admin/users/teachers" },
        { title: "Unit Consultants", url: "/admin/users/unit-consultants" },
        { title: "Unit Residents", url: "/admin/users/unit-residents" },
        { title: "Staff", url: "/admin/users/staff" },
        { title: "Administrators", url: "/admin/users/admins" },
      ],
    },
    {
      title: "Academics",
      url: "/admin/academics",
      icon: GraduationCap,
      items: [
        { title: "Sessions", url: "/admin/academics/sessions" },
        { title: "Semesters", url: "/admin/academics/semesters" },
        { title: "Classes", url: "/admin/academics/classes" },
        { title: "Courses", url: "/admin/academics/courses" },
        { title: "Subjects", url: "/admin/academics/subjects" },
        { title: "Academic Calendar", url: "/admin/academics/calendar" },
      ],
    },
    {
      title: "Clinicals",
      url: "/admin/clinicals",
      icon: Stethoscope,
      items: [
        { title: "Postings", url: "/admin/clinicals/postings" },
        { title: "Departments", url: "/admin/clinicals/departments" },
        { title: "Units", url: "/admin/clinicals/units" },
        { title: "Rotation Teams", url: "/admin/clinicals/rotation-teams" },
        { title: "Clinical Calendar", url: "/admin/clinicals/calendar" },
      ],
    },
    {
      title: "Timetables",
      url: "/admin/timetables",
      icon: Calendar,
    },
    {
      title: "Assessments",
      url: "/admin/assessments",
      icon: ClipboardList,
    },
    {
      title: "Attendance",
      url: "/admin/attendance",
      icon: CheckSquare,
    },
    {
      title: "Logbooks",
      url: "/admin/logbooks",
      icon: BookOpen,
    },
    {
      title: "Announcements",
      url: "/admin/announcements",
      icon: MessageSquare,
    },
    {
      title: "Reports & Analytics",
      url: "/admin/reports",
      icon: BarChart3,
    },
    {
      title: "Audit Logs",
      url: "/admin/audit-logs",
      icon: Shield,
    },
    {
      title: "Settings",
      url: "/admin/settings",
      icon: Settings,
    },
  ] as AdminNavItem[],
};
