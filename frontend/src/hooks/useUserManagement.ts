import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface UserStats {
  students: number;
  parents: number;
  staff: number;
  administrators: number;
}

export interface UserData {
  stats: UserStats;
  students: any[];
  parents: any[];
  staff: any[];
  administrators: any[];
}

const mockData: UserData = {
  stats: {
    students: 450,
    parents: 380,
    staff: 65,
    administrators: 8,
  },
  students: [
    {
      id: "std001",
      name: "Ahmed Hassan",
      matricNumber: "2024/001",
      class: "Year 3",
      currentPosting: "Pediatrics",
      attendancePercentage: 92,
      status: "active",
      email: "ahmed@medlog.edu",
    },
    {
      id: "std002",
      name: "Fatima Mohammed",
      matricNumber: "2024/002",
      class: "Year 2",
      currentPosting: "Surgery",
      attendancePercentage: 85,
      status: "active",
      email: "fatima@medlog.edu",
    },
    {
      id: "std003",
      name: "Muhammad Ali",
      matricNumber: "2024/003",
      class: "Year 1",
      currentPosting: undefined,
      attendancePercentage: 78,
      status: "active",
      email: "muhammadali@medlog.edu",
    },
    {
      id: "std004",
      name: "Amina Ismail",
      matricNumber: "2024/004",
      class: "Year 4",
      currentPosting: "Internal Medicine",
      attendancePercentage: 88,
      status: "active",
      email: "amina@medlog.edu",
    },
    {
      id: "std005",
      name: "Ibrahim Okafor",
      matricNumber: "2024/005",
      class: "Year 3",
      currentPosting: "Orthopedics",
      attendancePercentage: 65,
      status: "inactive",
      email: "ibrahim@medlog.edu",
    },
  ],
  parents: [
    {
      id: "par001",
      name: "Dr. Hassan Ahmed",
      email: "hassan.ahmed@email.com",
      status: "active",
      joinDate: "2024-01-15",
      studentsCount: 2,
    },
    {
      id: "par002",
      name: "Mrs. Aisha Mohammed",
      email: "aisha.mohammed@email.com",
      status: "active",
      joinDate: "2024-02-20",
      studentsCount: 1,
    },
  ],
  staff: [
    {
      id: "stf001",
      name: "Prof. Chioma Adeyemi",
      email: "chioma.adeyemi@medlog.edu",
      status: "active",
      joinDate: "2020-09-01",
      department: "Internal Medicine",
      roles: ["lecturer", "course_coordinator"],
    },
    {
      id: "stf002",
      name: "Dr. Eze Okonkwo",
      email: "eze.okonkwo@medlog.edu",
      status: "active",
      joinDate: "2021-03-15",
      department: "Pediatrics",
      roles: ["lecturer", "consultant"],
    },
    {
      id: "stf003",
      name: "Dr. Ngozi Eze",
      email: "ngozi.eze@medlog.edu",
      status: "active",
      joinDate: "2022-01-10",
      department: "Surgery",
      roles: ["consultant", "unit_coordinator"],
    },
  ],
  administrators: [
    {
      id: "adm001",
      name: "David Chen",
      email: "david.chen@medlog.edu",
      status: "active",
      joinDate: "2020-01-01",
      role: "System Administrator",
    },
    {
      id: "adm002",
      name: "Sarah Okonkwo",
      email: "sarah.okonkwo@medlog.edu",
      status: "active",
      joinDate: "2021-06-15",
      role: "Academic Administrator",
    },
  ],
};

export function useUserManagement() {
  const [data, setData] = useState<UserData>(mockData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Replace with actual API calls when available
        // const response = await api.get("/admin/users/all");
        // setData(response);
        
        // For now, use mock data
        setData(mockData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch user data");
        // Fall back to mock data on error
        setData(mockData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}
