import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { user } from "@/types";

export interface UserStats {
  students: number;
  parents: number;
  staff: number;
  administrators: number;
}

export interface UserData {
  stats: UserStats;
  students: Array<{
    id: string;
    name: string;
    matricNumber: string;
    class: string;
    currentPosting?: string;
    attendancePercentage: number;
    status: "active" | "inactive" | "graduated";
    email: string;
    profileImage?: string;
  }>;
  parents: Array<user & { studentsCount?: number; status: string }>;
  staff: Array<user & { status: string; roles?: string[] }>;
  administrators: Array<user & { status: string }>;
}

const normalizeStatus = (user: user) => {
  if ((user as any).status) return (user as any).status;
  return (user as any).isActive === false ? "inactive" : "active";
};

const mapStudent = (user: user) => ({
  id: user._id,
  name: user.name,
  matricNumber: user.idNumber || "—",
  class:
    typeof user.studentClasses === "object" && user.studentClasses !== null
      ? (user.studentClasses as any).name || "Unassigned"
      : String(user.studentClasses || "Unassigned"),
  currentPosting: undefined,
  attendancePercentage: 0,
  status: normalizeStatus(user) as "active" | "inactive" | "graduated",
  email: user.email,
  profileImage: user.profileImage,
});

const mapParent = (user: user) => ({
  ...user,
  status: normalizeStatus(user),
  studentsCount: Array.isArray(user.parentStudents) ? user.parentStudents.length : 0,
});

const mapStaff = (user: user) => ({
  ...user,
  status: normalizeStatus(user),
  roles: [
    user.departmentRole || undefined,
    user.academicStatus || undefined,
  ].filter(Boolean) as string[],
});

const mapAdmin = (user: user) => ({
  ...user,
  status: normalizeStatus(user),
});

export function useUserManagement() {
  const [data, setData] = useState<UserData>({
    stats: {
      students: 0,
      parents: 0,
      staff: 0,
      administrators: 0,
    },
    students: [],
    parents: [],
    staff: [],
    administrators: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const requests = [
          api.get("/users?page=1&limit=50&role=student"),
          api.get("/users?page=1&limit=50&role=parent"),
          api.get("/users?page=1&limit=50&role=teacher"),
          api.get("/users?page=1&limit=50&role=admin"),
        ];

        const settled = await Promise.allSettled(requests);

        const studentsResponse = settled[0].status === "fulfilled" ? settled[0].value : null;
        const parentsResponse = settled[1].status === "fulfilled" ? settled[1].value : null;
        const staffResponse = settled[2].status === "fulfilled" ? settled[2].value : null;
        const adminsResponse = settled[3].status === "fulfilled" ? settled[3].value : null;

        const students = Array.isArray(studentsResponse?.data?.users)
          ? studentsResponse.data.users.map(mapStudent)
          : [];
        const parents = Array.isArray(parentsResponse?.data?.users)
          ? parentsResponse.data.users.map(mapParent)
          : [];
        const staff = Array.isArray(staffResponse?.data?.users)
          ? staffResponse.data.users.map(mapStaff)
          : [];
        const administrators = Array.isArray(adminsResponse?.data?.users)
          ? adminsResponse.data.users.map(mapAdmin)
          : [];

        const hasAnyData = students.length || parents.length || staff.length || administrators.length;

        setData({
          stats: {
            students: studentsResponse?.data?.pagination?.total ?? students.length,
            parents: parentsResponse?.data?.pagination?.total ?? parents.length,
            staff: staffResponse?.data?.pagination?.total ?? staff.length,
            administrators: adminsResponse?.data?.pagination?.total ?? administrators.length,
          },
          students,
          parents,
          staff,
          administrators,
        });

        if (!hasAnyData) {
          setError("Some user data could not be loaded. Please try again.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch user data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}
