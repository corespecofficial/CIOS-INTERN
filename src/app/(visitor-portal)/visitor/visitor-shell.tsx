"use client";

import { useAppStore } from "@/store/use-app-store";
import { VisitorNav } from "./visitor-nav";
import { VisitorHeader } from "./visitor-header";
import { CommandPalette } from "@/components/command-palette";
import { MobileDrawer } from "@/components/portal/mobile-drawer";

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
      // Use raw #0A0E1A (not var(--bg-base, …)) so the global light-
      // theme attribute-selector override at [data-theme="light"]
      // [style*="background: #0A0E1A"] in globals.css can flip it. The
      // var() wrapper would have hidden the literal hex from the
      // selector, leaving the shell dark while the sidebar/header
      // (which use defined vars) flipped to light — broken half-and-
      // half look. Same for the text color.
      style={{
        minHeight: "100dvh",
        background: "#0A0E1A",
        color: "#E8EDF5",
        fontFamily: "'Nunito', system-ui, sans-serif",
      }}
    >
      <VisitorNav name={name} />
      <MobileDrawer />
      <div
        data-portal-main
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
        {/* Cmd+K palette — was firing `cios:open-palette` from the
            visitor-header search bar with no listener mounted, so the
            search affordance was a dead button. CommandPalette already
            role-filters its command list by Clerk publicMetadata.role,
            so visitors only see commands they can actually reach. */}
        <CommandPalette />
      </div>
    </div>
  );
}
