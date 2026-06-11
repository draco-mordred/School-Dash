import { createBrowserRouter } from "react-router"; // Keeping your requested import
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/NotFound";
import PrivateRoutes from "@/pages/routes/PrivateRoutes";
import Dashboard from "@/pages/Dashboard";
import ActivitiesLog from "@/pages/ActivitiesLog";
import AcademicYear from "@/pages/settings/academic-year";
import RolesPage from "@/pages/settings/Roles";
import UserManagementPage from "@/pages/users";
import Classes from "@/pages/academics/Classes";
import { Subjects } from "@/pages/academics/Subjects";
import Courses from "@/pages/academics/Courses";
import Timetable from "@/pages/academics/Timetable";
import Attendance from "@/pages/academics/Attendance";
import LogbookEntries from "@/pages/LogbookEntries";
import Procedures from "@/pages/Procedures";
import ClinicalRotations from "@/pages/ClinicalRotations";
import Approvals from "@/pages/Approvals";
import Reflections from "@/pages/Reflections";

import Exams from "@/pages/lms/Exams";
import Exam from "../lms/Exam";
import Assignments from "@/pages/lms/Assignments";
import StudyMaterials from "@/pages/lms/StudyMaterials";
import Account from "@/pages/settings/Account";
import Notifications from "@/pages/Notifications";

export const router = createBrowserRouter([
  {
    children: [
      // public routes
      { index: true, element: <Home /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      // protected routes would go here
      {
        element: <PrivateRoutes />, // Assuming PrivateRoutes is imported
        children: [
          { path: "dashboard", element: <Dashboard /> },
          { path: "activities-log", element: <ActivitiesLog /> },
          { path: "settings/academic-years", element: <AcademicYear /> },
          {
            path: "users/students",
            element: (
              <UserManagementPage
                role="student"
                title="Students"
                description="Manage student directory and class assignments."
              />
            ),
          },
          {
            path: "users/teachers",
            element: (
              <UserManagementPage
                role="teacher"
                title="Teachers"
                description="Manage teaching staff."
              />
            ),
          },
          {
            path: "users/parents",
            element: (
              <UserManagementPage
                role="parent"
                title="Parents"
                description="Manage Parents."
              />
            ),
          },
          {
            path: "users/admins",
            element: (
              <UserManagementPage
                role="admin"
                title="Admins"
                description="Manage Admins."
              />
            ),
          },
          {
            path: "users/unit-consultants",
            element: (
              <UserManagementPage
                role="unit_consultant"
                title="Unit Consultants"
                description="Manage Unit Consultants."
              />
            ),
          },
          {
            path: "users/unit-residents",
            element: (
              <UserManagementPage
                role="unit_resident"
                title="Unit Residents"
                description="Manage Unit Residents."
              />
            ),
          },
          {
            path: "classes",
            element: <Classes />,
          },
          {
            path: "courses",
            element: <Courses />,
          },
          {
            path: "subjects",
            element: <Subjects />,
          },
          {
            path: "logbook-entries",
            element: <LogbookEntries />,
          },
          {
            path: "procedures",
            element: <Procedures />,
          },
          {
            path: "attendance",
            element: <Attendance />,
          },
          {
            path: "clinical-rotations",
            element: <ClinicalRotations />,
          },
          {
            path: "approvals",
            element: <Approvals />,
          },
          {
            path: "reflections",
            element: <Reflections />,
          },
          {
            path: "notifications",
            element: <Notifications />,
          },
          {
            path: "settings/roles",
            element: <RolesPage />,
          },
          {
            path: "lms/assignments",
            element: <Assignments />,
          },
          {
            path: "lms/materials",
            element: <StudyMaterials />,
          },
          {
            path: "timetable",
            element: <Timetable />,
          },
          {
            path: "settings/account",
            element: <Account />,
          },
          {
            path: "lms/exams",
            element: <Exams />,
          },
          {
            path: "lms/exams/:id",
            element: <Exam />,
          },
          {
            path: "*",
            element: <NotFound />,
          },
        ],
      },
    ],
  },
]);
