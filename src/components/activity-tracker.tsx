"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { logActivity } from "@/app/actions/activity";

/**
 * Tracks page views and session starts. Mount once at the app-layout level.
 * - Fires "session_start" once per ~30-minute window per browser
 * - Fires "page_view" on every route change
 * Errors are swallowed inside the action so this never breaks the UI.
 */
export function ActivityTracker() {
  const pathname = usePathname();
  const lastPage = useRef<string | null>(null);

  // Session start — throttled to once per 30 minutes via localStorage
  useEffect(() => {
    try {
      const last = Number(localStorage.getItem("cios-last-session") || 0);
      if (Date.now() - last > 30 * 60 * 1000) {
        localStorage.setItem("cios-last-session", String(Date.now()));
        logActivity("session_start").catch(() => {});
      }
    } catch {}
  }, []);

  // Page view — debounced in-memory so quick re-renders don't double-fire
  useEffect(() => {
    if (!pathname) return;
    if (lastPage.current === pathname) return;
    lastPage.current = pathname;
    const t = setTimeout(() => {
      logActivity("page_view", { path: pathname }).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}
