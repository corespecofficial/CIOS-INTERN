"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useAppStore } from "@/store/use-app-store";
import { InvestorNav } from "./investor-nav";

const ACCENT = "#10B981";
const HEADER_H = 64;

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  dashboard: { title: "Dashboard",  sub: "Live overview of your deal flow" },
  dealflow:  { title: "Deal flow",  sub: "Pitches matched to your thesis" },
  watchlist: { title: "Watchlist",  sub: "Founders you're tracking" },
  settings:  { title: "Settings",   sub: "Your investor profile + preferences" },
};

export function InvestorShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const sidebarWidth = collapsed ? 64 : 240;

  const seg = pathname.split("/").filter(Boolean)[1] ?? "dashboard";
  const page = PAGE_TITLES[seg] ?? PAGE_TITLES.dashboard;

  return (
    <>
      <div className="investor-sidebar-desktop">
        <InvestorNav />
      </div>

      {/* Fixed top header */}
      <header
        className="investor-header-fixed"
        style={{
          position: "fixed",
          top: 0,
          left: sidebarWidth,
          right: 0,
          height: HEADER_H,
          zIndex: 40,
          background: "rgba(10,14,26,0.92)",
          backdropFilter: "saturate(140%) blur(14px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          transition: "left 0.18s ease",
          display: "flex",
          alignItems: "center",
          padding: "12px 24px",
          gap: 16,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: ACCENT, fontWeight: 800, textTransform: "uppercase" }}>
            Investor portal
          </div>
          <h1 style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 800, color: "#F8FAFC", letterSpacing: -0.3, fontFamily: "'Space Grotesk', 'Nunito', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {page.title}
            <span style={{ marginLeft: 10, fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>{page.sub}</span>
          </h1>
        </div>
        <Link
          href="/investors"
          className="iv-public"
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.04)",
            color: "#94A3B8",
            border: "1px solid rgba(255,255,255,0.08)",
            fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
          }}
        >
          Public board ↗
        </Link>
        <div style={{ display: "flex", alignItems: "center", paddingLeft: 6, borderLeft: "1px solid rgba(255,255,255,0.06)", marginLeft: 4, height: 28 }}>
          <UserButton appearance={{ elements: { avatarBox: { width: 32, height: 32 } } }} />
        </div>
      </header>

      <div
        className="investor-main-area"
        style={{
          marginLeft: sidebarWidth,
          minHeight: "100dvh",
          transition: "margin-left 0.18s ease",
          padding: `${HEADER_H + 24}px 24px 60px`,
        }}
      >
        <InvestorNav mobile />
        {children}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .investor-sidebar-desktop { display: none !important; }
          .investor-main-area { margin-left: 0 !important; padding-left: 16px !important; padding-right: 16px !important; }
          .investor-header-fixed { left: 0 !important; }
          .investor-mobile-tabs { display: flex !important; margin: 0 -16px 16px !important; }
        }
        @media (min-width: 769px) {
          .investor-mobile-tabs { display: none !important; }
        }
        @media (max-width: 540px) {
          .iv-public { display: none; }
        }
      `}</style>
    </>
  );
}
