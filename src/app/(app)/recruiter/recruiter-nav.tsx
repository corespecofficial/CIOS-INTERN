"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/recruiter",                label: "🏠 Hub",            exact: true },
  { href: "/recruiter/dashboard",      label: "📊 Dashboard" },
  { href: "/recruiter/opportunities",  label: "💼 Opportunities" },
  { href: "/recruiter/talent-pool",    label: "🌟 Talent Pool" },
  { href: "/recruiter/interviews",     label: "🎯 Interviews" },
  { href: "/recruiter/messages",       label: "💬 Messages" },
  { href: "/recruiter/notifications",  label: "🔔 Notifications" },
  { href: "/recruiter/reports",        label: "📈 Reports" },
  { href: "/recruiter/profile",        label: "🏢 Profile" },
  { href: "/recruiter/settings",       label: "⚙️ Settings" },
];

export function RecruiterNav() {
  const pathname = usePathname();
  return (
    <aside style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 10, height: "fit-content", position: "sticky", top: 16 }}>
      <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700, padding: "6px 10px 10px 10px" }}>Recruiter Portal</div>
      {NAV.map((n) => {
        const active = n.exact ? pathname === n.href : pathname?.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} style={{
            display: "block", padding: "9px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 2,
            background: active ? "rgba(30,136,229,0.15)" : "transparent",
            color: active ? "#1E88E5" : "#E8EDF5",
            textDecoration: "none",
          }}>{n.label}</Link>
        );
      })}
    </aside>
  );
}
