"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AICopilot } from "@/components/ai-copilot/ai-copilot";
import { AnnouncementTakeover } from "@/components/announcement-takeover";
import { CommandPalette } from "@/components/command-palette";
import { useAppStore } from "@/store/use-app-store";
import { claimDailyLogin } from "@/app/actions/daily-login";

// AI Copilot only appears on these strategic pages (plus root "/").
const AI_COPILOT_ROUTES = ["/dashboard"];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const setTheme = useAppStore((s) => s.setTheme);
  const showCopilot = AI_COPILOT_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const sidebarWidth = collapsed ? 64 : 240;

  // Daily login bonus — fires once per day per user (idempotent server-side)
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem("cios-daily-login") === today) return;
    } catch { return; }
    (async () => {
      const r = await claimDailyLogin();
      if (r.ok && r.data && !r.data.already) {
        toast.success(`+${r.data.xpGranted} XP — daily login! ${r.data.streak >= 7 ? "🔥" : ""}`, { duration: 4000 });
      }
      try { localStorage.setItem("cios-daily-login", today); } catch {}
    })();
  }, []);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cios-theme");
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
      }
    } catch {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, [setTheme]);

  return (
    <div suppressHydrationWarning style={{ minHeight: "100vh", background: "#0A0E1A", color: "#E8EDF5", fontFamily: "'Nunito', sans-serif" }}>
      {/* Fixed Sidebar */}
      <div className="sidebar-desktop" suppressHydrationWarning>
        <Sidebar />
      </div>

      {/* Main area — offset by sidebar width */}
      <div className="main-content-area" suppressHydrationWarning style={{
        marginLeft: sidebarWidth,
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        transition: "margin-left 0.2s ease",
      }}>
        <Header />
        <main id="main-content" role="main" style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />

      {/* AI Copilot — only on strategic routes (dashboard, and landing via marketing layout) */}
      {showCopilot && <AICopilot />}

      {/* Global announcement takeover — polls for undismissed high/critical alerts */}
      <AnnouncementTakeover />

      {/* Cmd+K / Ctrl+K command palette */}
      <CommandPalette />

      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .main-content-area { margin-left: 0 !important; }
          main:not(.cios-thread) { padding-bottom: 80px !important; }
        }
        @media (min-width: 769px) {
          .bottom-nav-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}
