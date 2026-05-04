import { notFound } from "next/navigation";
import Link from "next/link";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function StudentDashboard({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();

  const sb = supabaseAdmin();
  const [pinned, upcoming, recent] = await Promise.all([
    sb.from("org_announcements").select("id, title, body, created_at").eq("org_id", ctx.org.id).eq("pinned", true).order("created_at", { ascending: false }).limit(3),
    sb.from("org_assignments").select("id, title, due_at").eq("org_id", ctx.org.id).gt("due_at", new Date().toISOString()).order("due_at", { ascending: true }).limit(5),
    sb.from("org_lessons").select("id, title, position").eq("org_id", ctx.org.id).order("created_at", { ascending: false }).limit(5),
  ]);

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
function Item({ title, subtitle, href }: { title: string; subtitle: string; href?: string }) {
  const inner = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#0A0E1A", borderRadius: 6, fontSize: 13 }}>
      <span style={{ color: "#E8EDF5" }}>{title}</span>
      <span style={{ color: "#5A6478", fontSize: 11 }}>{subtitle}</span>
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: "none" }}>{inner}</Link> : inner;
}
function Empty({ text }: { text: string }) {
  return <div style={{ padding: "10px 12px", color: "#5A6478", fontSize: 12 }}>{text}</div>;
}
