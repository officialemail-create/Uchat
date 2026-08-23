import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/lib/auth";

interface AuthStore {
  user: AuthUser | null;
  isLoading: boolean;
  authError: string | null;
  setUser: (user: AuthUser | null) => void;
  setLoading: (v: boolean) => void;
  setAuthError: (error: string | null) => void;
  reset: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      authError: null,
      setUser: (user) => set({ user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      setAuthError: (authError) => set({ authError }),
      reset: () => set({ user: null, isLoading: false, authError: null }),
      logout: () => set({ user: null, authError: null }),
    }),
    {
      name: "uchat_auth",
      partialize: (s) => ({ user: s.user }),
    },
  ),
);
