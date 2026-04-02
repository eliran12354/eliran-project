import { useContext } from "react";
import { AuthContext, type AuthContextValue, type UserProfile } from "@/context/AuthProvider";

export type { UserProfile };

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
