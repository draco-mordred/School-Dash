import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
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

export interface AdminNavItem {
  title: string;
  url: string;
  icon: ComponentType<LucideProps>;
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
      url: "/dashboard",
      icon: Home,
    },
    {
      title: "Users",
      url: "/users",
      icon: Users,
      items: [
        { title: "User Management", url: "/users" },
        { title: "Students", url: "/users/students" },
        { title: "Parents", url: "/users/parents" },
        { title: "Teachers", url: "/users/teachers" },
        { title: "Unit Consultants", url: "/users/unit-consultants" },
        { title: "Unit Residents", url: "/users/unit-residents" },
        { title: "Staff", url: "/users/staff" },
        { title: "Administrators", url: "/users/admins" },
      ],
    },
    {
      title: "Academics",
      url: "/academics",
      icon: GraduationCap,
      items: [
        { title: "Sessions", url: "/academics/sessions" },
        { title: "Semesters", url: "/academics/semesters" },
        { title: "Classes", url: "/academics/classes" },
        { title: "Courses", url: "/academics/courses" },
        { title: "Subjects", url: "/academics/subjects" },
        { title: "Academic Calendar", url: "/academics/calendar" },
      ],
    },
    {
      title: "Clinicals",
      url: "/clinicals",
      icon: Stethoscope,
      items: [
        { title: "Postings", url: "/clinicals/postings" },
        { title: "Departments", url: "/clinicals/departments" },
        { title: "Units", url: "/clinicals/units" },
        { title: "Rotation Teams", url: "/clinicals/rotation-teams" },
        { title: "Clinical Calendar", url: "/clinicals/calendar" },
      ],
    },
    {
      title: "Timetables",
      url: "/timetables",
      icon: Calendar,
    },
    {
      title: "Assessments",
      url: "/assessments",
      icon: ClipboardList,
    },
    {
      title: "Attendance",
      url: "/attendance",
      icon: CheckSquare,
    },
    {
      title: "Logbooks",
      url: "/logbooks",
      icon: BookOpen,
    },
    {
      title: "Announcements",
      url: "/announcements",
      icon: MessageSquare,
    },
    {
      title: "Reports & Analytics",
      url: "/reports",
      icon: BarChart3,
    },
    {
      title: "Audit Logs",
      url: "/audit-logs",
      icon: Shield,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ] as AdminNavItem[],
};
