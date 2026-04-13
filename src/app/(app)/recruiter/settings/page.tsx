import Link from "next/link";

export default function RecruiterSettingsPage() {
  const sections = [
    { emoji: "🔐", title: "Account",       desc: "Name, email, password, 2FA, sessions",     href: "/settings" },
    { emoji: "🔔", title: "Notifications", desc: "Email, push, quiet hours",                 href: "/settings" },
    { emoji: "🛡️", title: "Privacy",       desc: "Data retention, candidate visibility",    href: "/settings" },
    { emoji: "💳", title: "Billing",       desc: "Plan, credits, invoices (coming soon)",    href: "#", disabled: true },
    { emoji: "👥", title: "Team",          desc: "Hiring managers, roles (coming soon)",     href: "#", disabled: true },
    { emoji: "🔌", title: "Integrations",  desc: "Calendar, Zoom, webhooks (coming soon)",   href: "#", disabled: true },
  ];
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>⚙️ Settings</h1>
        <p style={{ fontSize: 12, color: "#8892A4", margin: "2px 0 0 0" }}>Account, privacy, team, billing, and integrations</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        {sections.map((s) => (
          <Link key={s.title} href={s.href} style={{
            background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16,
            textDecoration: "none", display: "block", opacity: s.disabled ? 0.6 : 1, pointerEvents: s.disabled ? "none" : "auto",
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.emoji}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{s.title}</div>
            <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>{s.desc}</div>
            {s.disabled && <div style={{ fontSize: 10, color: "#FFC107", marginTop: 6, fontWeight: 700 }}>SOON</div>}
          </Link>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: 16, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, fontSize: 12, color: "#8892A4" }}>
        💡 Account-level settings are shared with the main platform at <Link href="/settings" style={{ color: "#1E88E5" }}>/settings</Link>.
      </div>
    </div>
  );
}
