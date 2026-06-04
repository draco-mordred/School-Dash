import { createContext, useState, useEffect, useContext } from "react";
import { api } from "@/lib/api";
import type { academicYear, user } from "@/types";

// 1. Create Context
const AuthContext = createContext<{
  user: user | null;
  setUser: React.Dispatch<React.SetStateAction<user | null>>;
  loading: boolean;
  year: academicYear | null;
}>({
  user: null,
  setUser: () => {},
  loading: true,
  year: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<user | null>(null);
  const [loading, setLoading] = useState(true); // <--- Vital for preventing "flicker"
  const [year, setYear] = useState<academicYear | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/users/profile");
        setUser(data.user);
      } catch (error) {
        console.log(error);
        setLoading(false);
        setUser(null);
      }
    };
    const fetchYear = async () => {
      try {
        const { data } = await api.get("/academic-years/current");
        setYear(data);
        setLoading(false);
      } catch (error) {
        console.log(error);
        setLoading(false);
        setYear(null);
      }
    };

    checkAuth();
    fetchYear();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, year }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
