import { createContext } from "react";
import type { academicYear, user } from "@/types";

export const AuthContext = createContext<{
  user: user | null;
  setUser: React.Dispatch<React.SetStateAction<user | null>>;
  loading: boolean;
  year: academicYear | null;
}>(
  {
    user: null,
    setUser: () => {},
    loading: true,
    year: null,
  }
);
 