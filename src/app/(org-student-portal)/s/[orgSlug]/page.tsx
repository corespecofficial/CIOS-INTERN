import { notFound } from "next/navigation";
import Link from "next/link";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";
import { DigestTracker } from "./digest-tracker";

export const dynamic = "force-dynamic";

export default async function StudentDashboard({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();

  const sb = supabaseAdmin();
  // 7-day window for the "What's new" digest. Filtered to actions
  // students actually care about: announcements, new lessons, new
  // assignments. Member churn / channel-creation noise is hidden.
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [pinned, upcoming, recent, digest] = await Promise.all([
    sb.from("org_announcements").select("id, title, body, created_at").eq("org_id", ctx.org.id).eq("pinned", true).order("created_at", { ascending: false }).limit(3),
    sb.from("org_assignments").select("id, title, due_at").eq("org_id", ctx.org.id).gt("due_at", new Date().toISOString()).order("due_at", { ascending: true }).limit(5),
    sb.from("org_lessons").select("id, title, position").eq("org_id", ctx.org.id).order("created_at", { ascending: false }).limit(5),
    sb.from("org_audit_log")
      .select("id, action, meta, created_at")
      .eq("org_id", ctx.org.id)
      .in("action", ["announcement.posted", "lesson.created", "assignment.created"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  const digestRows = (digest.data || []) as Array<{
    id: string; action: string; meta: Record<string, unknown>; created_at: string;
  }>;

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 4px 0" }}>Welcome back</h1>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 28px 0" }}>{ctx.org.name}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card title="📌 Pinned" link={`/s/${orgSlug}/announcements`} linkLabel="All announcements →">
          {(pinned.data || []).length === 0 ? <Empty text="Nothing pinned." /> :
            (pinned.data as { id: string; title: string; body: string; created_at: string }[]).map((a) => (
              <Item key={a.id} title={a.title} subtitle={new Date(a.created_at).toLocaleDateString()} />
            ))
          }
        </Card>

        <Card title="⏰ Upcoming assignments" link={`/s/${orgSlug}/assignments`} linkLabel="All assignments →">
          {(upcoming.data || []).length === 0 ? <Empty text="No upcoming work." /> :
            (upcoming.data as { id: string; title: string; due_at: string }[]).map((a) => (
              <Item key={a.id} title={a.title} subtitle={`Due ${new Date(a.due_at).toLocaleDateString()}`} href={`/s/${orgSlug}/assignments/${a.id}`} />
            ))
          }
        </Card>
      </div>

      <Card title="🆕 What's new this week" link={`/s/${orgSlug}/announcements`} linkLabel="All announcements →">
        {digestRows.length === 0
          ? <Empty text="No new posts in the last 7 days." />
          : digestRows.map((row) => {
              const m = row.meta as Record<string, string | number | undefined>;
              const ago = relTime(row.created_at);
              if (row.action === "announcement.posted") {
                return <Item key={row.id} title={`📣 ${m.title || "New announcement"}`} subtitle={ago} href={`/s/${orgSlug}/announcements`} time={row.created_at} />;
              }
              if (row.action === "lesson.created") {
                return <Item key={row.id} title={`📚 New lesson: ${m.title || "Untitled"}`} subtitle={ago} href={`/s/${orgSlug}/lessons`} time={row.created_at} />;
              }
              return <Item key={row.id} title={`📝 New assignment: ${m.title || "Untitled"}`} subtitle={ago} href={`/s/${orgSlug}/assignments`} time={row.created_at} />;
            })}
      </Card>
      <DigestTracker orgId={ctx.org.id} newest={digestRows[0]?.created_at ?? null} />

      <Card title="📚 Latest lessons" link={`/s/${orgSlug}/lessons`} linkLabel="All lessons →">
        {(recent.data || []).length === 0 ? <Empty text="No lessons yet." /> :
          (recent.data as { id: string; title: string; position: number }[]).map((l) => (
            <Item key={l.id} title={l.title} subtitle={`Lesson ${l.position || "—"}`} href={`/s/${orgSlug}/lessons/${l.id}`} />
          ))
        }
      </Card>
    </div>
  );
}

function Card({ title, link, linkLabel, children }: { title: string; link?: string; linkLabel?: string; children: React.ReactNode }) {
  return (
    <section style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 18, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{title}</h2>
        {link && <Link href={link} style={{ fontSize: 11, color: "#1E88E5", textDecoration: "none" }}>{linkLabel}</Link>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </section>
  );
}
function Item({ title, subtitle, href, time }: { title: string; subtitle: string; href?: string; time?: string }) {
  const inner = (
    <div data-digest-time={time} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#0A0E1A", borderRadius: 6, fontSize: 13 }}>
      <span style={{ color: "#E8EDF5" }}>{title}</span>
      <span style={{ color: "#5A6478", fontSize: 11 }}>{subtitle}</span>
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: "none" }}>{inner}</Link> : inner;
}
function Empty({ text }: { text: string }) {
  return <div style={{ padding: "10px 12px", color: "#5A6478", fontSize: 12 }}>{text}</div>;
}

function relTime(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}
