/**
 * /o/<slug>/audit — append-only ops trail for the org. Visible to
 * owners + org_admins; instructors and students get a 404.
 *
 * Lists rows from org_audit_log paginated by created_at DESC.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

interface AuditRow {
  id: string;
  action: string;
  target: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  actor: { id: string; name: string; email: string; avatar_url: string | null } | null;
}

const PAGE_SIZE = 50;

const ACTION_META: Record<string, { emoji: string; color: string; label: string }> = {
  "org.created":           { emoji: "🏫", color: "#26A69A", label: "Org created" },
  "org.suspended":         { emoji: "⏸",  color: "#FF8A80", label: "Org suspended" },
  "org.archived":          { emoji: "🗄",  color: "#5A6478", label: "Org archived" },
  "org.unsuspended":       { emoji: "▶️",  color: "#26A69A", label: "Org unsuspended" },
  "member.invited":        { emoji: "✉️",  color: "#1E88E5", label: "Member invited" },
  "member.joined":         { emoji: "👋",  color: "#26A69A", label: "Member joined" },
  "member.role_updated":   { emoji: "🔁", color: "#FFA726", label: "Member role changed" },
  "member.removed":        { emoji: "🚪", color: "#FF8A80", label: "Member removed" },
  "code.created":          { emoji: "🎟",  color: "#26C6DA", label: "Class code created" },
  "code.revoked":          { emoji: "🚫", color: "#FF8A80", label: "Class code revoked" },
  "channel.created":       { emoji: "💬", color: "#1E88E5", label: "Channel created" },
  "announcement.posted":   { emoji: "📣", color: "#FFA726", label: "Announcement posted" },
  "lesson.created":        { emoji: "📚", color: "#1E88E5", label: "Lesson created" },
  "assignment.created":    { emoji: "📝", color: "#A855F7", label: "Assignment created" },
  "submission.graded":     { emoji: "✅", color: "#26A69A", label: "Submission graded" },
};

const STAFF = new Set(["owner", "org_admin"]);

export default async function OrgAuditPage({ params, searchParams }: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  const { orgSlug } = await params;
  const { page: pageStr, action: actionFilter } = await searchParams;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();
  const allowed = ctx.isSuperAdmin || (ctx.memberRole && STAFF.has(ctx.memberRole));
  if (!allowed) notFound();

  const page = Math.max(1, Number(pageStr) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const sb = supabaseAdmin();
  let q = sb
    .from("org_audit_log")
    .select(
      "id, action, target, meta, created_at, actor:users!org_audit_log_actor_id_fkey(id, name, email, avatar_url)",
      { count: "exact" },
    )
    .eq("org_id", ctx.org.id)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (actionFilter) q = q.eq("action", actionFilter);
  const { data, count } = await q;
  const rows = (data || []) as unknown as AuditRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Distinct actions for the filter chips — limited query (top 20
  // distinct actions seen in this org). Not bothering with a count() per
  // action to keep page fast.
  const { data: actsRaw } = await sb
    .from("org_audit_log")
    .select("action")
    .eq("org_id", ctx.org.id)
    .limit(500);
  const actionSet = new Set<string>();
  for (const a of (actsRaw || []) as { action: string }[]) actionSet.add(a.action);
  const distinctActions = Array.from(actionSet).sort();

  return (
    <div style={{ maxWidth: 920 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Audit log</h1>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 18px" }}>
        Append-only ops trail. {total} event{total === 1 ? "" : "s"} · visible to owners and org admins.
      </p>

      {/* Action filter chips */}
      {distinctActions.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          <Link
            href={`/o/${orgSlug}/audit`}
            style={{ padding: "5px 11px", borderRadius: 999, background: !actionFilter ? "rgba(30,136,229,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${!actionFilter ? "rgba(30,136,229,0.40)" : "rgba(255,255,255,0.08)"}`, color: !actionFilter ? "#1E88E5" : "#8892A4", fontSize: 11, fontWeight: 700, textDecoration: "none" }}
          >
            All
          </Link>
          {distinctActions.map((a) => {
            const meta = ACTION_META[a] || { emoji: "•", color: "#8892A4", label: a };
            const active = actionFilter === a;
            return (
              <Link
                key={a}
                href={`/o/${orgSlug}/audit?action=${encodeURIComponent(a)}`}
                style={{ padding: "5px 11px", borderRadius: 999, background: active ? `${meta.color}22` : "rgba(255,255,255,0.04)", border: `1px solid ${active ? `${meta.color}55` : "rgba(255,255,255,0.08)"}`, color: active ? meta.color : "#8892A4", fontSize: 11, fontWeight: 700, textDecoration: "none" }}
              >
                {meta.emoji} {meta.label}
              </Link>
            );
          })}
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ background: "#111827", border: "1px dashed #1F2937", borderRadius: 12, padding: 60, textAlign: "center", color: "#5A6478", fontSize: 13 }}>
          No events yet. Org activity will appear here as it happens.
        </div>
      ) : (
        <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, overflow: "hidden" }}>
          {rows.map((r, i) => {
            const meta = ACTION_META[r.action] || { emoji: "•", color: "#8892A4", label: r.action };
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid #1F2937" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${meta.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                  {meta.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.label}</span>
                    {r.actor && <span style={{ fontSize: 12, color: "#8892A4" }}>by {r.actor.name || r.actor.email}</span>}
                  </div>
                  {r.target && <div style={{ fontSize: 11, color: "#5A6478", fontFamily: "ui-monospace, monospace", marginTop: 2 }}>{r.target}</div>}
                  {r.meta && Object.keys(r.meta).length > 0 && (
                    <div style={{ fontSize: 11, color: "#8892A4", marginTop: 4, lineHeight: 1.5 }}>
                      {Object.entries(r.meta).slice(0, 6).map(([k, v]) => (
                        <span key={k} style={{ marginRight: 12 }}>
                          <span style={{ color: "#5A6478" }}>{k}=</span>
                          <span style={{ color: "#C7CFD8" }}>{typeof v === "string" ? v : JSON.stringify(v)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#5A6478", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "center" }}>
          {page > 1 && <Link href={`/o/${orgSlug}/audit?page=${page - 1}${actionFilter ? `&action=${encodeURIComponent(actionFilter)}` : ""}`} style={pagerStyle}>← Prev</Link>}
          <span style={{ ...pagerStyle, background: "#1E2937" }}>Page {page} / {totalPages}</span>
          {page < totalPages && <Link href={`/o/${orgSlug}/audit?page=${page + 1}${actionFilter ? `&action=${encodeURIComponent(actionFilter)}` : ""}`} style={pagerStyle}>Next →</Link>}
        </div>
      )}
    </div>
  );
}

const pagerStyle: React.CSSProperties = { display: "inline-block", padding: "6px 12px", background: "#111827", border: "1px solid #1F2937", borderRadius: 6, color: "#8892A4", fontSize: 12, textDecoration: "none" };
