import Link from "next/link";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RecruiterNotificationsPage() {
  const me = await getCurrentDbUser();
  let rows: Array<{ id: string; title: string; body: string; kind: string; url: string | null; read_at: string | null; created_at: string }> = [];
  try {
    const { data } = await supabaseAdmin().from("notifications").select("id, title, body, kind, url, read_at, created_at")
      .eq("user_id", me!.id).order("created_at", { ascending: false }).limit(50);
    rows = (data || []) as typeof rows;
  } catch {/* ignore */}

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🔔 Notifications</h1>
          <p style={{ fontSize: 12, color: "#8892A4", margin: "2px 0 0 0" }}>New applicants, interview updates, hires, and system alerts</p>
        </div>
        <Link href="/notifications" style={btnGhost}>Full inbox →</Link>
      </div>

      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
        {rows.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#8892A4", fontSize: 13 }}>You're all caught up.</div>}
        {rows.map((n) => (
          <Link key={n.id} href={n.url || "/recruiter"} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", textDecoration: "none", background: n.read_at ? "transparent" : "rgba(30,136,229,0.05)" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{n.title}</div>
              <div style={{ fontSize: 12, color: "#8892A4", marginTop: 2 }}>{n.body}</div>
            </div>
            <div style={{ fontSize: 11, color: "#8892A4", whiteSpace: "nowrap", marginLeft: 12 }}>
              {!n.read_at && <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#1E88E5", marginRight: 6 }} />}
              {new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const btnGhost: React.CSSProperties = { padding: "8px 14px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none" };
