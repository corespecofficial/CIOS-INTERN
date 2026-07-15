/**
 * Host-portal dashboard — the first thing the host sees when entering
 * their org. Shows headline counts + a recent-activity feed so creators
 * can see signups, posts, and grading happening in near real-time.
 */

import { notFound } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";
import { cached, orgCacheKey, TTL } from "@/lib/cache";
import { ActivityFeed, type ActivityRow } from "./activity-feed";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ orgSlug: string }>;
}

interface DashboardCounts {
  interns: number;
  instructors: number;
  lessons: number;
  assignments: number;
}

/**
 * Recent org events — drawn from org_audit_log because every meaningful
 * mutation already logs there (member.joined, announcement.posted,
 * lesson.created, submission.graded, etc.). Joining users for actor name
 * keeps it one round-trip; fall back to "System" when actor_id is null
 * (provisioning, system-triggered actions).
 *
 * Not cached — the whole point is "real-time-ish" and the query is
 * indexed (org_audit_log_org_idx on org_id, created_at DESC).
 */
async function getRecentActivity(orgId: string, limit = 12): Promise<ActivityRow[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("org_audit_log")
    .select("id, action, target, meta, created_at, users:actor_id(name)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as unknown as Array<{
    id: string; action: string; target: string | null;
    meta: Record<string, unknown>; created_at: string;
    users: { name: string | null } | null;
  }>).map((r) => ({
    id: r.id,
    action: r.action,
    target: r.target,
    meta: r.meta || {},
    created_at: r.created_at,
    actor_name: r.users?.name ?? null,
  }));
}

/**
 * Dashboard counts. Cached at TTL.short (60s) + busted on every write via
 * bustOrgCache() in org-portal.ts. At 1000 students × 100 orgs × 10 page
 * views/day this drops Postgres count() traffic by >95%.
 */
async function getCounts(orgId: string): Promise<DashboardCounts> {
  return cached<DashboardCounts>(orgCacheKey.dashboard(orgId), TTL.short, async () => {
    const sb = supabaseAdmin();
    const [interns, instructors, lessons, assignments] = await Promise.all([
      sb.from("org_members").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("role", "student").eq("status", "active"),
      sb.from("org_members").select("id", { count: "exact", head: true }).eq("org_id", orgId).neq("role", "student").eq("status", "active"),
      sb.from("org_lessons").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      sb.from("org_assignments").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    ]);
    return {
      interns: interns.count ?? 0,
      instructors: instructors.count ?? 0,
      lessons: lessons.count ?? 0,
      assignments: assignments.count ?? 0,
    };
  });
}

export default async function OrgDashboard({ params }: Props) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();

  // Marketplace status of the underlying creative_space — drives the
  // status pill below the org name. The org itself is always "live for
  // the host" (provisioned on apply); this column only controls public
  // marketplace visibility.
  const sb = supabaseAdmin();
  const { data: spaceRow } = await sb
    .from("creative_spaces")
    .select("status, review_notes")
    .eq("org_id", ctx.org.id)
    .maybeSingle();
  const spaceStatus = (spaceRow as { status?: string; review_notes?: string | null } | null) || null;

  const [counts, activity] = await Promise.all([
    getCounts(ctx.org.id),
    getRecentActivity(ctx.org.id, 15),
  ]);

  const cards = [
    { label: "Interns", value: counts.interns, color: "#1E88E5" },
    { label: "Staff", value: counts.instructors, color: "#9C27B0" },
    { label: "Lessons", value: counts.lessons, color: "#26A69A" },
    { label: "Assignments", value: counts.assignments, color: "#FFA726" },
  ];

  return (
    <div style={{ maxWidth: 1080 }}>
      <div style={{ display: "inline-flex", padding: "4px 9px", borderRadius: 999, background: "rgba(171,71,188,.10)", color: "#AB47BC", fontSize: 10, fontWeight: 900, letterSpacing: .7, marginBottom: 7 }}>HOST WORKSPACE</div>
      <h1 style={{ fontSize: 25, fontWeight: 800, margin: "0 0 4px 0" }}>{ctx.org.name}</h1>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 14px 0" }}>
        Welcome back. This is your private host portal — nothing here is visible to other orgs.
      </p>

      {/* Status pill — clarifies the difference between "your portal
          is live for you" (always true, post-provisioning) and
          "your space is in the public marketplace" (gated on
          super-admin approval of creative_spaces.status). Was a
          frequent point of host confusion before this. */}
      {spaceStatus && (
        <StatusPill status={spaceStatus.status} notes={spaceStatus.review_notes ?? null} />
      )}

      <div style={{ height: 8 }} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {cards.map((c) => (
          <div
            key={c.label}
            style={{
              background: "#111827",
              border: "1px solid #1F2937",
              borderRadius: 10,
              padding: "13px 15px",
            }}
          >
            <div style={{ fontSize: 11, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 23, lineHeight: 1.1, fontWeight: 800, color: c.color }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity feed — drawn straight from org_audit_log so it
          covers everything: signups, invites, announcements, lessons,
          grading. Hidden when truly empty (brand-new org with only the
          org.created entry shows that single row, which is fine). */}
      <div style={{ marginTop: 18, padding: 16, background: "#111827", border: "1px solid #1F2937", borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Recent activity</h2>
          <a href={`/o/${ctx.org.slug}/audit`} style={{ fontSize: 11, color: "#1E88E5", textDecoration: "none" }}>Full log →</a>
        </div>
        <ActivityFeed orgId={ctx.org.id} orgSlug={ctx.org.slug} initial={activity} />
      </div>

      <div style={{ marginTop: 12, padding: 16, background: "#111827", border: "1px solid #1F2937", borderRadius: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px 0" }}>Get started</h2>
        <ul style={{ margin: 0, padding: "0 0 0 18px", color: "#8892A4", fontSize: 13, lineHeight: 1.8 }}>
          <li>Add your first lesson under <strong style={{ color: "#E8EDF5" }}>Lessons</strong></li>
          <li>Invite staff and interns from <strong style={{ color: "#E8EDF5" }}>Interns & staff</strong></li>
          <li>Pin an announcement so new interns see it first</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Marketplace-listing status pill. Distinct from "is this org real?"
 * (always true for a host loading this page) — this is purely about
 * whether the public /creative-space listing shows the space.
 */
function StatusPill({ status, notes }: { status: string | undefined; notes: string | null }) {
  const cfg = (() => {
    switch (status) {
      case "approved":
        return {
          dot: "#26A69A",
          tint: "rgba(38,166,154,0.10)",
          border: "rgba(38,166,154,0.32)",
          label: "Approved · listed publicly",
          body: "Your space is live in the public marketplace. New enrolments will appear in your activity feed.",
        };
      case "rejected":
        return {
          dot: "#EF5350",
          tint: "rgba(239,83,80,0.10)",
          border: "rgba(239,83,80,0.32)",
          label: "Not approved · revise & resubmit",
          body: notes
            ? `Reviewer notes: ${notes}`
            : "Your application wasn't approved this round. Check notifications for the reviewer's feedback, then update your space and resubmit.",
        };
      case "pending":
      default:
        return {
          dot: "#FFA726",
          tint: "rgba(255,167,38,0.10)",
          border: "rgba(255,167,38,0.32)",
          label: "Pending review · portal is live for you",
          body: "Your portal is fully usable now — build lessons, channels, and announcements. Public marketplace listing unlocks once super-admin approves (typically under 48h).",
        };
    }
  })();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 10,
        background: cfg.tint,
        border: `1px solid ${cfg.border}`,
        marginBottom: 4,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: cfg.dot,
          flexShrink: 0,
          marginTop: 6,
          boxShadow: `0 0 0 4px ${cfg.tint}`,
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: cfg.dot, letterSpacing: 0.4, textTransform: "uppercase" }}>
          {cfg.label}
        </div>
        <div style={{ fontSize: 12, color: "#B0BEC5", lineHeight: 1.6, marginTop: 2 }}>
          {cfg.body}
        </div>
      </div>
    </div>
  );
}
