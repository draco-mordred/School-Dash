import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { AuthContext } from "./auth-context";
import type { academicYear, user } from "@/types";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<user | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<academicYear | null>(null);
 
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Skip API calls on auth pages - user isn't authenticated yet
        const path = window.location.pathname;
        const isAuthPage = path.includes("/login") || path.includes("/register") || path === "/";
        
        if (isAuthPage) {
          setUser(null);
          setYear(null);
          setLoading(false);
          return;
        }

        // Only make API calls if user has a valid token
        const token = localStorage.getItem("token");
        if (!token) {
          setUser(null);
          setYear(null);
          setLoading(false);
          return;
        }

        // Fetch user profile
        try {
          const { data } = await api.get("/users/profile");
          setUser(data.user);
        } catch (error) {
          setUser(null);
        }

        // Fetch academic year
        try {
          const { data } = await api.get("/academic-years/current");
          setYear(data.year || data || null);
        } catch (error) {
          setYear(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, year, setYear }}>
      {children}
    </AuthContext.Provider>
  );
};
