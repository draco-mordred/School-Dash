import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { AuthContext } from "./auth-context";
import type { academicYear, user } from "@/types";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<user | null>(null);
  const [loading, setLoading] = useState(true); // <--- Vital for preventing "flicker" 
  const [year, setYear] = useState<academicYear | null>(null);
 
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await api.get("/users/profile");
        setUser(data.user);
      } catch (error) {
        console.log(error);
        setUser(null);
      }
    };
    const fetchYear = async () => {
      try {
        const { data } = await api.get("/academic-years/current");
        setYear(data);
      } catch (error) {
        console.log(error);
        setYear(null);
      }
    };

    const initAuth = async () => {
      try {
        await Promise.all([checkAuth(), fetchYear()]);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, year }}>
      {children}
    </AuthContext.Provider>
  );
};
