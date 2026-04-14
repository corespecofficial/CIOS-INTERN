"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Shared scaffold for all note editors (Docs, Slides, Table, PDF).
 *
 * Responsible for:
 * - Locking top and bottom bars on mobile + desktop (only the middle scrolls).
 * - Body-class toggle so the parent CIOS shell stops scrolling while we're here.
 * - Auto-save debounce + sync badge behaviour.
 *
 * The caller passes in the doc-type-specific top bar children, content, and
 * bottom toolbar children. Each editor keeps its own state.
 */

export type SyncStatus = "saved" | "saving" | "offline" | "pending";

export function useAutoSave(opts: { saver: () => Promise<boolean>; interval?: number }) {
  const [sync, setSync] = useState<SyncStatus>("saved");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saverRef = useRef(opts.saver);
  saverRef.current = opts.saver;

  useEffect(() => {
    const goOnline = () => setSync((s) => (s === "offline" ? "pending" : s));
    const goOffline = () => setSync("offline");
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    if (typeof navigator !== "undefined" && !navigator.onLine) setSync("offline");
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  const schedule = () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) { setSync("offline"); return; }
    setSync("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSync("saving");
      const ok = await saverRef.current();
      setSync(ok ? "saved" : "pending");
    }, opts.interval ?? 1500);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  return { sync, schedule, setSync };
}

export function SyncBadge({ status }: { status: SyncStatus }) {
  const cfg =
    status === "saving"  ? { label: "Saving…",  color: "#FFC107", dot: "#FFC107", spin: true } :
    status === "pending" ? { label: "Syncing…", color: "#42A5F5", dot: "#42A5F5", spin: true } :
    status === "offline" ? { label: "Offline",  color: "#EF5350", dot: "#EF5350", spin: false } :
                           { label: "Saved",    color: "#66BB6A", dot: "#66BB6A", spin: false };
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 12px", borderRadius: 999,
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
      color: cfg.color, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%", background: cfg.dot,
        animation: cfg.spin ? "cios-pulse 1s infinite" : "none",
      }} />
      {cfg.label}
      <style>{`@keyframes cios-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.35 } }`}</style>
    </div>
  );
}

export function EditorShell({ accent, topBar, content, bottomBar }: {
  accent: string;
  topBar: React.ReactNode;
  content: React.ReactNode;
  bottomBar: React.ReactNode;
}) {
  useEffect(() => {
    document.body.classList.add("cios-notes-active");
    return () => { document.body.classList.remove("cios-notes-active"); };
  }, []);

  return (
    <div className="notes-editor-root" style={{
      fontFamily: "'Nunito', sans-serif",
      background: "#0A0E1A",
      height: "100%", minHeight: 0,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <style>{`
        body.cios-notes-active { overflow: hidden !important; }
        body.cios-notes-active .main-content-area {
          height: 100dvh !important;
          min-height: 0 !important;
          max-height: 100dvh !important;
          overflow: hidden !important;
        }
        body.cios-notes-active .main-content-area > main {
          flex: 1 1 auto !important;
          overflow: hidden !important;
          padding: 0 !important;
          min-height: 0 !important;
        }
        @media (max-width: 900px) {
          .notes-editor-root {
            position: fixed !important;
            inset: 0 !important;
            z-index: 100 !important;
            height: 100dvh !important;
          }
        }
      `}</style>

      {/* Locked top bar */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "#0A0E1A", zIndex: 10, borderTop: `3px solid ${accent}` }}>
        {topBar}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {content}
      </div>

      {/* Locked bottom bar */}
      <div style={{ flexShrink: 0, width: "100%", background: "rgba(10,14,26,0.98)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {bottomBar}
      </div>
    </div>
  );
}

export function useBackHandler() {
  const router = useRouter();
  return () => router.push("/notes");
}
