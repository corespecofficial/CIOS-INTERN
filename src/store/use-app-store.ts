import { create } from "zustand";

export type ThemeChoice = "dark" | "light" | "system";

function systemPref(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(choice: ThemeChoice): "dark" | "light" {
  return choice === "system" ? systemPref() : choice;
}

function applyThemeChoice(choice: ThemeChoice): "dark" | "light" {
  const resolved = resolveTheme(choice);
  if (typeof window === "undefined") return resolved;
  document.documentElement.setAttribute("data-theme", resolved);
  // Remember BOTH: the user's choice (for UI state) and the resolved value
  // (so the server cookie keeps rendering the right theme on first paint).
  try { localStorage.setItem("cios-theme-choice", choice); } catch { /* ignore */ }
  try { localStorage.setItem("cios-theme", resolved); } catch { /* ignore */ }
  try {
    const year = 60 * 60 * 24 * 365;
    document.cookie = `cios-theme=${resolved}; path=/; max-age=${year}; samesite=lax`;
  } catch { /* ignore */ }
  return resolved;
}

// Keep the old helper name for any existing callers.
function applyTheme(theme: "dark" | "light") {
  applyThemeChoice(theme);
}

// Listen for OS theme changes — only relevant when the user picked "system".
if (typeof window !== "undefined" && window.matchMedia) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    try {
      const choice = (localStorage.getItem("cios-theme-choice") as ThemeChoice) || "dark";
      if (choice === "system") {
        const resolved = applyThemeChoice("system");
        // Sync zustand state so any UI bound to `theme` re-renders.
        useAppStore.setState({ theme: resolved });
      }
    } catch { /* ignore */ }
  };
  if (mq.addEventListener) mq.addEventListener("change", onChange);
  else mq.addListener(onChange);
}

export type Role =
  | "intern"
  | "team_lead"
  | "admin"
  | "super_admin"
  | "instructor"
  | "moderator"
  | "finance"
  | "support"
  | "recruiter"
  | "mentor"
  | "alumni"
  // Public-portal roles (Phase 0 — masterplan §2.2)
  | "public_user"
  | "investor"
  | "startup_founder"
  | "partner_org";

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
    mentor: "#26C6DA",
    alumni: "#FFC107",
    public_user: "#64748B",
    investor: "#10B981",
    startup_founder: "#F97316",
    partner_org: "#0EA5E9",
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
    mentor: "Mentor",
    alumni: "Alumni",
    public_user: "Public User",
    investor: "Investor",
    startup_founder: "Startup Founder",
    partner_org: "Partner Organisation",
  };
  return labels[role] ?? "Intern";
}

interface AppState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (v: boolean) => void;

  theme: "dark" | "light";                    // resolved, applied to data-theme
  themeChoice: ThemeChoice;                    // the user's preference (may be "system")
  toggleTheme: () => void;
  setTheme: (theme: "dark" | "light") => void;
  setThemeChoice: (choice: ThemeChoice) => void;

  role: Role;
  setRole: (r: Role) => void;

  notifications: number;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => {
    const next = !s.sidebarCollapsed;
    try { localStorage.setItem("cios-sidebar-collapsed", String(next)); } catch {}
    return { sidebarCollapsed: next };
  }),
  setSidebarCollapsed: (v) => {
    try { localStorage.setItem("cios-sidebar-collapsed", String(v)); } catch {}
    set({ sidebarCollapsed: v });
  },

  mobileSidebarOpen: false,
  setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),

  theme: "dark",
  themeChoice: "dark",
  toggleTheme: () =>
    set((s) => {
      const newTheme = s.theme === "dark" ? "light" : "dark";
      applyTheme(newTheme);
      return { theme: newTheme, themeChoice: newTheme };
    }),
  setTheme: (theme: "dark" | "light") =>
    set(() => {
      applyTheme(theme);
      return { theme, themeChoice: theme };
    }),
  setThemeChoice: (choice: ThemeChoice) =>
    set(() => {
      const resolved = applyThemeChoice(choice);
      return { theme: resolved, themeChoice: choice };
    }),

  role: "intern",
  setRole: (r) => set({ role: r }),

  notifications: 3,
}));
