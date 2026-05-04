/**
 * Host-portal root layout. Mirrors (recruiter-portal)/layout.tsx — minimal
 * shell, all chrome lives in the inner [orgSlug] layout's sidebar.
 */

import type { ReactNode } from "react";

export default function HostPortalLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-portal="host"
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
