import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { readAuthSnapshot, persistAuthSnapshot } from "@/lib/offlineMode";
import { AuthContext } from "./auth-context";
import type { academicYear, user } from "@/types";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<user | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<academicYear | null>(null);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const cachedSnapshot = readAuthSnapshot();

    if (!token) {
      const cachedUser = (cachedSnapshot?.user as user | null) ?? null;
      const cachedYear = (cachedSnapshot?.year as academicYear | null) ?? null;

      setUser(cachedUser);
      setYear(cachedYear);
      setLoading(false);
      return;
    }

    const [profileResult, yearResult] = await Promise.allSettled([
      api.get("/users/profile"),
      api.get("/academic-years/current"),
    ]);

    const profileUser = profileResult.status === "fulfilled" ? (profileResult.value.data?.user as user | undefined) : null;
    const profileYear = yearResult.status === "fulfilled" ? ((yearResult.value.data?.year || yearResult.value.data || null) as academicYear | null) : null;

    const nextUser = profileUser ?? ((cachedSnapshot?.user as user | null) ?? null);
    const nextYear = profileYear ?? ((cachedSnapshot?.year as academicYear | null) ?? null);

    setUser(nextUser);
    setYear(nextYear);
    persistAuthSnapshot(nextUser, nextYear);
    setLoading(false);
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
