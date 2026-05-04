"use client";

import { useAppStore } from "@/store/use-app-store";
import { VisitorNav } from "./visitor-nav";
import { VisitorHeader } from "./visitor-header";

/**
 * Visitor portal shell. Mirrors the (app) layout structure: fixed sidebar
 * on the left, sticky header at top of the content column, scrollable main.
 *
 * Reads `sidebarCollapsed` from the same Zustand store the (app) sidebar
 * writes to so the user's collapsed-or-not preference travels across
 * portals on this device.
 */
export function VisitorShell({ name, children }: { name: string; children: React.ReactNode }) {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg-base, #0A0E1A)",
        color: "var(--text-primary, #E8EDF5)",
        fontFamily: "'Nunito', system-ui, sans-serif",
      }}
    >
      <VisitorNav name={name} />
      <div
        style={{
          marginLeft: sidebarWidth,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          transition: "margin-left 0.2s ease",
        }}
      >
        <VisitorHeader />
        <main style={{ flex: 1, padding: "32px 40px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
