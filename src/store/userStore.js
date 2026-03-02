import { create } from "zustand";

export const useUserStore = create((set) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  currentStaff:null,
  loading: true,
  setUser: (user) => set({ user }),
  setCurrentStaff: (currentStaff) => set({ currentStaff }),
  setSession: (session) => set({ session }),
  setIsAuthenticated: (auth) => set({ isAuthenticated: auth }),
  setLoading: (loading) => set({ loading }),
  clearUser: () =>
    set({ user: null, session: null, isAuthenticated: false }),
}));
