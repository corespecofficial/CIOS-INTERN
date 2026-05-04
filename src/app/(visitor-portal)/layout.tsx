import type { ReactNode } from "react";

export default function VisitorPortalLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-portal="visitor"
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
