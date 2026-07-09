import { createContext } from "react";
import type { academicYear, user } from "@/types";

export const AuthContext = createContext<{
  user: user | null;
  setUser: React.Dispatch<React.SetStateAction<user | null>>;
  loading: boolean;
  year: academicYear | null;
  setYear: React.Dispatch<React.SetStateAction<academicYear | null>>;
  refreshAuth: () => Promise<void>;
}>(
  {
    user: null,
    setUser: () => {},
    loading: true,
    year: null,
    setYear: () => {},
    refreshAuth: async () => {},
  }
);
 