/**
 * Super-admin: role-application review queue. Shows every pending request
 * generated through /onboarding/intent's "applying as <role>" path and
 * lets the super-admin approve or reject with notes.
 */

import { redirect } from "next/navigation";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { ApplicationRow } from "./application-row";

export const dynamic = "force-dynamic";

interface App {
  id: string;
  user_id: string;
  applied_role: string;
  payload: Record<string, unknown>;
  status: string;
  notes: string | null;
  created_at: string;
  decided_at: string | null;
  user: { id: string; name: string; email: string; avatar_url: string | null; created_at?: string } | null;
}

const GOLD = "#FFC107";
const GOLD_DIM = "rgba(255,193,7,0.12)";
const GOLD_BORDER = "rgba(255,193,7,0.25)";

const ROLE_INFO: Record<string, { emoji: string; label: string; color: string }> = {
  recruiter:        { emoji: "💼", label: "Recruiter",        color: "#FB923C" },
  mentor:           { emoji: "🎓", label: "Mentor",           color: "#26C6DA" },
  company:          { emoji: "🏢", label: "Company",          color: "#0EA5E9" },
  partner_org:      { emoji: "🤝", label: "Partner org",      color: "#34D399" },
  investor:         { emoji: "💸", label: "Investor",         color: "#A855F7" },
  startup_founder:  { emoji: "🚀", label: "Startup founder",  color: "#F97316" },
};

export default async function SuperAdminApplications({ searchParams }: { searchParams: Promise<{ status?: string; role?: string }> }) {
  const me = await getCurrentDbUser();
  if (!me || me.role !== "super_admin") redirect("/dashboard");

  const sp = await searchParams;
  const filter = sp.status || "pending";
  const roleFilter = sp.role || null;

  const sb = supabaseAdmin();

  // Fetch counts for the stat tiles + the filtered list, in parallel.
  const [pendingRes, approvedRes, rejectedRes, listRes] = await Promise.all([
    sb.from("role_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("role_applications").select("id", { count: "exact", head: true }).eq("status", "approved"),
    sb.from("role_applications").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    (async () => {
      let q = sb
        .from("role_applications")
        .select("id, user_id, applied_role, payload, status, notes, created_at, decided_at, user:users!role_applications_user_id_fkey(id, name, email, avatar_url, created_at)")
        .eq("status", filter)
        .order("created_at", { ascending: false })
        .limit(200);
      if (roleFilter) q = q.eq("applied_role", roleFilter);
      return q;
    })(),
  ]);

  const apps = (listRes.data || []) as unknown as App[];
  const pendingCount = pendingRes.count ?? 0;
  const approvedCount = approvedRes.count ?? 0;
  const rejectedCount = rejectedRes.count ?? 0;

  // Group pending by role so the super-admin sees what's queued at a glance.
  const byRole: Record<string, number> = {};
  if (filter === "pending") {
    for (const a of apps) byRole[a.applied_role] = (byRole[a.applied_role] || 0) + 1;
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Nunito', sans-serif", padding: "32px 40px" }}>
      {/* Header */}
      <div style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <span style={{ fontSize: 11, color: GOLD, fontWeight: 700, letterSpacing: 0.5 }}>SUPER-ADMIN PANEL</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: "4px 0 4px", fontFamily: "'Space Grotesk', sans-serif" }}>
          🪪 Role applications
        </h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: 0, lineHeight: 1.5 }}>
          Visitors who applied as recruiter / mentor / company / etc. via the onboarding gate.
          Approval promotes their Clerk role and notifies them in-app. Rejection sends an explanatory note.
        </p>
      </div>

      {/* Stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 16 }}>
        <StatCard label="Pending" value={pendingCount} color={GOLD} />
        <StatCard label="Approved" value={approvedCount} color="#66BB6A" />
        <StatCard label="Rejected" value={rejectedCount} color="#FF8A80" />
        <StatCard label="Total" value={pendingCount + approvedCount + rejectedCount} color="#42A5F5" />
      </div>

      {/* Pending-by-role chips (only on pending tab) */}
      {filter === "pending" && Object.keys(byRole).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          <a
            href="?status=pending"
            style={{ padding: "6px 12px", borderRadius: 999, background: !roleFilter ? "rgba(30,136,229,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${!roleFilter ? "rgba(30,136,229,0.40)" : "rgba(255,255,255,0.08)"}`, color: !roleFilter ? "#1E88E5" : "#8892A4", fontSize: 11, fontWeight: 700, textDecoration: "none" }}
          >
            All ({pendingCount})
          </a>
          {Object.entries(byRole).map(([role, n]) => {
            const info = ROLE_INFO[role] || { emoji: "📋", label: role, color: "#8892A4" };
            const active = roleFilter === role;
            return (
              <a
                key={role}
                href={`?status=pending&role=${role}`}
                style={{ padding: "6px 12px", borderRadius: 999, background: active ? `${info.color}22` : "rgba(255,255,255,0.04)", border: `1px solid ${active ? `${info.color}55` : "rgba(255,255,255,0.08)"}`, color: active ? info.color : "#8892A4", fontSize: 11, fontWeight: 700, textDecoration: "none" }}
              >
                {info.emoji} {info.label} · {n}
              </a>
            );
          })}
        </div>
      )}

      {/* Status tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {(["pending", "approved", "rejected", "withdrawn"] as const).map((s) => (
          <a
            key={s}
            href={`?status=${s}`}
            style={{ padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", color: filter === s ? GOLD : "#8892A4", borderBottom: filter === s ? `2px solid ${GOLD}` : "2px solid transparent", textTransform: "capitalize" }}
          >
            {s}
          </a>
        ))}
      </div>

      {/* List */}
      {apps.length === 0 ? (
        <div style={{ background: "#111827", border: "1px dashed rgba(255,255,255,0.10)", borderRadius: 14, padding: 60, textAlign: "center", color: "#8892A4", fontSize: 13 }}>
          No {filter}{roleFilter ? ` ${roleFilter}` : ""} applications.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {apps.map((a) => <ApplicationRow key={a.id} app={a} />)}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 18px" }}>
      <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
    </div>
  );
}
