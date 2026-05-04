/**
 * Org-student-portal root layout. The student-side mirror of (host-portal).
 * Same visual treatment so the platform feels consistent across portals.
 */

import type { ReactNode } from "react";

export default function OrgStudentPortalLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-portal="org-student"
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
