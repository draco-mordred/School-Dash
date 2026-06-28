import { createBrowserRouter } from "react-router-dom";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/NotFound";
import PrivateRoutes from "@/pages/routes/PrivateRoutes";
import Dashboard from "@/pages/Dashboard";
import ActivitiesLog from "@/pages/ActivitiesLog";
import AcademicYear from "@/pages/settings/academic-year";
import RolesPage from "@/pages/settings/Roles";
import SchoolSettings from "@/pages/settings/General";
import UserManagementPage from "@/pages/users";
import Classes from "@/pages/academics/Classes";
import { Subjects } from "@/pages/academics/Subjects";
import Courses from "@/pages/academics/Courses";
import StudentCourses from "@/pages/StudentCourses";
import TeacherCourses from "@/pages/TeacherCourses";
import UnitConsultantCourses from "@/pages/UnitConsultantCourses";
import UnitResidentCourses from "@/pages/UnitResidentCourses";
import ParentCourses from "@/pages/ParentCourses";
import StudentClinicalsCurrentPosting from "@/pages/StudentClinicalsCurrentPosting";
import StudentLogbookDashboard from "@/pages/StudentLogbookDashboard";
import Timetable from "@/pages/academics/Timetable";
import Attendance from "@/pages/academics/Attendance";
import StudentPortal from "@/pages/StudentPortal";
import StudentSection from "@/pages/StudentSection";
import LogbookEntries from "@/pages/LogbookEntries";
import Procedures from "@/pages/Procedures";
import ClinicalRotations from "@/pages/ClinicalRotations";
import RotationSchedules from "@/pages/rotation-schedules/RotationSchedules";
import RotationScheduleDetail from "@/pages/rotation-schedules/RotationScheduleDetail";
import Approvals from "@/pages/Approvals";
import Reflections from "@/pages/Reflections";
import ClinicalActivities from "@/pages/ClinicalActivities";
import AdminDepartments from "@/pages/admin/AdminDepartments";
import AdminUnits from "@/pages/admin/AdminUnits";
import StaffApprovals from "@/pages/StaffApprovals";

import Exams from "@/pages/lms/Exams";
import Exam from "../lms/Exam";
import Assignments from "@/pages/lms/Assignments";
import StudyMaterials from "@/pages/lms/StudyMaterials";
import Account from "@/pages/settings/Account";
import Notifications from "@/pages/Notifications";
import { useAuth } from "@/hooks/useAuth";

// Wrapper component for courses route - renders based on user role
const CoursesWrapper = () => {
  const { user } = useAuth();
  
  switch (user?.role) {
    case "student":
      return <StudentCourses />;
    case "teacher":
      return <TeacherCourses />;
    case "unitconsultant":
      return <UnitConsultantCourses />;
    case "unitresident":
      return <UnitResidentCourses />;
    case "parent":
      return <ParentCourses />;
    case "admin":
      return <TeacherCourses />;
    default:
      return <Courses />;
  }
};

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
            path: "users",
            element: (
              <UserManagementPage
                role="student"
                title="User Management"
                description="Manage all user role accounts."
              />
            ),
          },
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
            path: "users/staff",
            element: (
              <UserManagementPage
                role="teacher"
                title="Staff"
                description="Manage staff users including teachers, unit residents, and unit consultants."
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
                role="unitconsultant"
                title="Unit Consultants"
                description="Manage Unit Consultants."
              />
            ),
          },
          {
            path: "users/unit-residents",
            element: (
              <UserManagementPage
                role="unitresident"
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
            element: <CoursesWrapper />,
          },
          {
            path: "student-portal",
            element: <StudentPortal />,
          },
          {
            path: "student/academics/overview",
            element: <StudentSection title="Academics Overview" description="A student-friendly overview of your academic progress and resources." />,
          },
          {
            path: "subjects",
            element: <Subjects />,
          },
          {
            path: "student/clinicals/current-posting",
            element: <StudentClinicalsCurrentPosting />,
          },
          {
            path: "student/clinicals/team",
            element: <StudentSection title="Clinical Team" description="Meet your clinical supervisors and support team." />,
          },
          {
            path: "student/clinicals/attendance",
            element: <StudentSection title="Clinical Attendance" description="Track your clinical attendance and session status." />,
          },
          {
            path: "student/clinicals/history",
            element: <StudentSection title="Clinical History" description="Review your rotation history and past postings." />,
          },
          {
            path: "student/logbook/approved",
            element: <StudentLogbookDashboard />,
          },
          {
            path: "student/logbook/statistics",
            element: <StudentLogbookDashboard />,
          },
          {
            path: "student/schedule/today",
            element: <StudentSection title="Today" description="Your schedule and highlights for today." />,
          },
          {
            path: "student/schedule/week",
            element: <StudentSection title="This Week" description="View your schedule and key events for the current week." />,
          },
          {
            path: "student/schedule/calendar",
            element: <StudentSection title="Calendar" description="See your full academic calendar and important dates." />,
          },
          {
            path: "student/schedule/upcoming",
            element: <StudentSection title="Upcoming" description="Track upcoming sessions, rotations, and deadlines." />,
          },
          {
            path: "student/timetable/download",
            element: <StudentSection title="Download Timetable" description="Download your timetable as a PDF or calendar file." />,
          },
          {
            path: "student/attendance/academic",
            element: <StudentSection title="Academic Attendance" description="Monitor your academic attendance and class participation." />,
          },
          {
            path: "student/attendance/clinical",
            element: <StudentSection title="Clinical Attendance" description="Monitor your attendance for clinical postings." />,
          },
          {
            path: "student/attendance/history",
            element: <StudentSection title="Attendance History" description="Review your past attendance records and trends." />,
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
            path: "departments",
            element: <AdminDepartments />,
          },
          {
            path: "units",
            element: <AdminUnits />,
          },
          {
            path: "clinical-activities",
            element: <ClinicalActivities />,
          },
          {
            path: "staff-approvals",
            element: <StaffApprovals />,
          },
          { path: "rotation-schedules", element: <RotationSchedules /> },
          { path: "rotation-schedules/:id", element: <RotationScheduleDetail /> },
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
            path: "settings/general",
            element: <SchoolSettings />,
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
