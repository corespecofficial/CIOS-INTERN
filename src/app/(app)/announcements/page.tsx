import Link from "next/link";
import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { listAnnouncementsForUser } from "@/app/actions/announcements";

export const dynamic = "force-dynamic";

const PRIORITY_COLOR: Record<string, string> = { low: "#8892A4", medium: "#1E88E5", high: "#FFC107", critical: "#EF5350" };
const PRIORITY_LABEL: Record<string, string> = { low: "Low", medium: "Medium", high: "High priority", critical: "🚨 Critical" };

export default async function AnnouncementsPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const res = await listAnnouncementsForUser(60);
  const list = res.ok ? res.data! : [];

  const canSend = ["super_admin", "admin", "team_lead", "instructor", "moderator", "finance", "support"].includes(me.role);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(239,83,80,0.15)", color: "#EF5350", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>ANNOUNCEMENTS</span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>📢 Platform broadcasts</h1>
          <p style={{ fontSize: 13, color: "#8892A4", margin: "2px 0 0 0" }}>Alerts, updates, emergency notices, polls</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {canSend && <Link href="/announcements/create" style={btnPrimary}>+ New announcement</Link>}
          {me.role === "super_admin" && <Link href="/admin/announcement-control" style={btnGhost}>⚙️ Control</Link>}
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {list.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>No announcements right now.</div>}
        {list.map((a) => {
          const color = PRIORITY_COLOR[a.priority as string] || "#8892A4";
          const sender = a.sender as { name: string; avatar_url: string | null } | null;
          return (
            <Link key={a.id as string} href={`/announcements/${a.id}`} style={{
              display: "block", padding: 16, background: "#111827", borderRadius: 14,
              border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`,
              textDecoration: "none", color: "inherit",
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, padding: "2px 10px", borderRadius: 99, background: `${color}22`, color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{PRIORITY_LABEL[a.priority as string]}</span>
                <span style={{ fontSize: 11, color: "#8892A4" }}>{sender?.name || "—"} · {new Date(a.created_at as string).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                {a.require_confirmation && <span style={{ fontSize: 10, color: "#FFC107" }}>✓ confirmation required</span>}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5", marginBottom: 4 }}>{a.title as string}</div>
              <div style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.body as string}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = { padding: "10px 20px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none" };
const btnGhost: React.CSSProperties = { padding: "10px 16px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, fontWeight: 600, textDecoration: "none" };
