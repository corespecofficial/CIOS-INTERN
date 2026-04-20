/**
 * Investor-portal root layout (Phase 5).
 *
 * Minimal — just the page background + theme. The branded chrome lives
 * in the inner /investor/layout.tsx (sidebar + sticky header).
 */

import type { ReactNode } from "react";

export default function InvestorPortalLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-portal="investor"
      style={{
        minHeight: "100dvh",
        background: "#0A0E1A",
        color: "#E8EDF5",
        fontFamily: "'Nunito', system-ui, sans-serif",
      }}
    >
      {children}
    </div>
  );
}
