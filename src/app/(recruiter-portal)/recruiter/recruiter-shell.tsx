"use client";

import type { ReactNode } from "react";
import { useAppStore } from "@/store/use-app-store";
import { RecruiterNav } from "./recruiter-nav";
import { RecruiterHeader, RECRUITER_HEADER_HEIGHT } from "./recruiter-header";

/**
 * Client shell for the recruiter portal: fixed collapsible sidebar +
 * fixed top header + scrollable main content. Mirrors the intern app
 * shell pattern (Sidebar, Header, main) — the header is LOCKED in place
 * (position: fixed) so it never scrolls away, even on long pages.
 *
 * Server-side parts of the recruiter layout (onboarding gate, profile fetch)
 * stay in the parent layout.tsx; this is purely the visual wrapper that needs
 * client state for the collapse animation.
 */
export function RecruiterShell({ children }: { children: ReactNode }) {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <>
      <div className="recruiter-sidebar-desktop">
        <RecruiterNav />
      </div>

      {/* Fixed top header — sits above main content area, offset by sidebar */}
      <RecruiterHeader />

      <div
        className="recruiter-main-area"
        style={{
          marginLeft: sidebarWidth,
          minHeight: "100dvh",
          transition: "margin-left 0.18s ease",
          // Top padding compensates for the fixed header height so content
          // doesn't slide under the locked bar.
          padding: `${RECRUITER_HEADER_HEIGHT + 24}px 24px 60px`,
        }}
      >
        {/* Mobile-only horizontal nav row */}
        <RecruiterNav mobile />
        {children}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .recruiter-sidebar-desktop { display: none !important; }
          .recruiter-main-area { margin-left: 0 !important; padding-left: 16px !important; padding-right: 16px !important; padding-bottom: 60px !important; }
          .recruiter-mobile-tabs { display: flex !important; margin: 0 -16px 16px !important; }
        }
        @media (min-width: 769px) {
          .recruiter-mobile-tabs { display: none !important; }
        }
      `}</style>
    </>
  );
}
