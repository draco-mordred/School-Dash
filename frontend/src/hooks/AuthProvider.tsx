import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { AuthContext } from "./auth-context";
import type { academicYear, user } from "@/types";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<user | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<academicYear | null>(null);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setYear(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get("/users/profile");
      setUser(data.user);
    } catch (error) {
      setUser(null);
    }

    try {
      const { data } = await api.get("/academic-years/current");
      setYear(data.year || data || null);
    } catch (error) {
      setYear(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    const isAuthPage = path.includes("/login") || path.includes("/register") || path === "/";
    const token = localStorage.getItem("token");

    if (isAuthPage && !token) {
      setUser(null);
      setYear(null);
      setLoading(false);
      return;
    }

    void refreshAuth();
  }, [refreshAuth]);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, year, setYear, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
