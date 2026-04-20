"use client";

import type { ReactNode } from "react";
import { useAppStore } from "@/store/use-app-store";
import { RecruiterNav } from "./recruiter-nav";
import { RecruiterHeader } from "./recruiter-header";

/**
 * Client shell for the recruiter portal: fixed collapsible sidebar +
 * sticky in-area header + main content. Mirrors the intern app shell pattern
 * (Sidebar, Header, main) so collapse behaviour and visual rhythm feel
 * native across portals.
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

      <div
        className="recruiter-main-area"
        style={{
          marginLeft: sidebarWidth,
          minHeight: "100dvh",
          transition: "margin-left 0.18s ease",
          padding: "24px 24px 60px",
        }}
      >
        {/* Mobile-only horizontal nav row, then the sticky header */}
        <RecruiterNav mobile />
        <RecruiterHeader />
        {children}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .recruiter-sidebar-desktop { display: none !important; }
          .recruiter-main-area { margin-left: 0 !important; padding: 16px 16px 60px !important; }
          .recruiter-mobile-tabs { display: flex !important; margin: 0 -16px 16px !important; }
        }
        @media (min-width: 769px) {
          .recruiter-mobile-tabs { display: none !important; }
        }
      `}</style>
    </>
  );
}
