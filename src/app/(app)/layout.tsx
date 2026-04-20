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
import { DailyMotivationPopup } from "@/components/daily-motivation-popup";
import { ActivityTracker } from "@/components/activity-tracker";
import { ComplianceGate } from "@/components/compliance/compliance-gate";
import { MobileInstallOnboarding } from "@/components/pwa-install-onboarding";
import { WellnessReminderBanner } from "@/components/wellness-reminder-banner";
import { PushNotificationManager } from "@/components/push-notification-manager";
import { NotificationBanners, AudioUnlocker } from "@/lib/use-server-notifications";
import { PortalEscapeBanner } from "@/components/portal/portal-escape-banner";
import { useAppStore } from "@/store/use-app-store";
import { claimDailyLogin } from "@/app/actions/daily-login";

// AI Copilot is no longer shown inside the app — it lives on the public landing
// for inquiries/support. Inside the portal users can use AI Hub directly.
const AI_COPILOT_ROUTES: string[] = [];

// These routes are public (no auth required) and should render WITHOUT the
// portal chrome (no sidebar, no header). They handle their own layout.
const STANDALONE_PUBLIC_ROUTES = ["/investors", "/guardian/", "/suspended"];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const setTheme = useAppStore((s) => s.setTheme);
  const showCopilot = AI_COPILOT_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  // Render public standalone pages without any portal chrome
  const isStandalone = STANDALONE_PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r)
  );
  if (isStandalone) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0E1A", color: "#E8EDF5", fontFamily: "'Nunito', sans-serif" }}>
        {children}
      </div>
    );
  }
  const sidebarWidth = collapsed ? 64 : 240;
  // sidebarCollapsed is now sourced from the same Zustand store the Sidebar writes to,
  // so marginLeft always stays in sync with the actual sidebar width.

  // Lock to portrait on mobile PWA (Android rotation override)
  useEffect(() => {
    try {
      if (screen?.orientation && typeof screen.orientation.lock === "function") {
        screen.orientation.lock("portrait").catch(() => {});
      }
    } catch {}
  }, []);

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

      {/* Main area — offset by sidebar width. height (not minHeight) so the
          inner <main> is the one true scroll container and the Header stays
          locked in place. */}
      <div className="main-content-area" suppressHydrationWarning style={{
        marginLeft: sidebarWidth,
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        maxHeight: "100dvh",
        overflow: "hidden",
        transition: "margin-left 0.2s ease",
      }}>
        <Header />
        <main
          id="main-content"
          role="main"
          className={pathname && pathname.split("/").filter(Boolean).length >= 2 ? "cios-inner-page" : "cios-root-page"}
          style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 20 }}
        >
          {/* Off-portal escape hatch: shows for recruiter/instructor/mentor/
              alumni/investor/etc when they wander into the shared intern
              shell (e.g. /messages, /community), so they're never stuck. */}
          <PortalEscapeBanner />
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

      {/* Once-per-day morning motivational popup */}
      <DailyMotivationPopup />

      {/* Fires "page_view" + "session_start" events for behavior analytics */}
      <ActivityTracker />

      {/* Compliance gate — checks for unpaid fines / suspensions on every page load */}
      <ComplianceGate />

      {/* Mobile PWA install onboarding — shows full-screen sheet for mobile users who haven't installed */}
      <MobileInstallOnboarding />

      {/* Daily wellness reminder — shows once per day until user checks in for the week */}
      <WellnessReminderBanner />

      {/* Web Push — registers service worker + subscribes for OS-level phone notifications */}
      <PushNotificationManager />

      {/* Top-drop in-app notification banners (like iOS/Android) */}
      <NotificationBanners />

      {/* Unlock AudioContext on first user gesture so notification sounds work on mobile */}
      <AudioUnlocker />

      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .main-content-area { margin-left: 0 !important; }
          /* Only add bottom padding on root pages (bottom nav visible) */
          main.cios-root-page:not(.cios-thread) { padding-bottom: 80px !important; }
        }
        @media (min-width: 769px) {
          .bottom-nav-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}
