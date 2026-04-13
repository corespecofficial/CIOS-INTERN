import { create } from "zustand";

export type Role =
  | "intern"
  | "team_lead"
  | "admin"
  | "super_admin"
  | "instructor"
  | "moderator"
  | "finance"
  | "support"
  | "recruiter";

export function getRoleColor(role: Role): string {
  const colors: Record<Role, string> = {
    intern: "#1E88E5",
    team_lead: "#43A047",
    admin: "#FFC107",
    super_admin: "#E53935",
    instructor: "#8E24AA",
    moderator: "#FF7043",
    finance: "#FB8C00",
    support: "#26C6DA",
    recruiter: "#AB47BC",
  };
  return colors[role] ?? "#1E88E5";
}

export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    intern: "Intern",
    team_lead: "Team Lead",
    admin: "Admin",
    super_admin: "Super Admin",
    instructor: "Instructor",
    moderator: "Moderator",
    finance: "Finance",
    support: "Support",
    recruiter: "Recruiter",
  };
  return labels[role] ?? "Intern";
}

interface AppState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (v: boolean) => void;

  theme: "dark" | "light";
  toggleTheme: () => void;
  setTheme: (theme: "dark" | "light") => void;

  role: Role;
  setRole: (r: Role) => void;

  notifications: number;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

  mobileSidebarOpen: false,
  setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),

  theme: "dark",
  toggleTheme: () =>
    set((s) => {
      const newTheme = s.theme === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        document.documentElement.setAttribute("data-theme", newTheme);
        try { localStorage.setItem("cios-theme", newTheme); } catch {}
      }
      return { theme: newTheme };
    }),
  setTheme: (theme: "dark" | "light") =>
    set(() => {
      if (typeof window !== "undefined") {
        document.documentElement.setAttribute("data-theme", theme);
        try { localStorage.setItem("cios-theme", theme); } catch {}
      }
      return { theme };
    }),

  role: "intern",
  setRole: (r) => set({ role: r }),

  notifications: 3,
}));
