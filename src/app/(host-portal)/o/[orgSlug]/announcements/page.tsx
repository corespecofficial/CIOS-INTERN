import { notFound } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";
import { AnnouncementComposer } from "./announcement-composer";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
}

export default async function AnnouncementsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();
  const isHost = ctx.isSuperAdmin || (ctx.memberRole && ["owner", "org_admin", "instructor"].includes(ctx.memberRole));

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("org_announcements")
    .select("id, title, body, pinned, created_at")
    .eq("org_id", ctx.org.id)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  const rows = (data || []) as Row[];

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px 0" }}>Announcements</h1>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 24px 0" }}>
        {rows.length} total · pinned posts surface first for every member
      </p>

      {isHost && <AnnouncementComposer orgId={ctx.org.id} />}

      {rows.length === 0 ? (
        <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 32, textAlign: "center", color: "#5A6478", fontSize: 13 }}>
          No announcements yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((a) => (
            <article key={a.id} style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                {a.pinned && <span style={{ fontSize: 10, color: "#FFA726", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>📌 Pinned</span>}
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{a.title}</h2>
              </div>
              <p style={{ color: "#8892A4", fontSize: 13, lineHeight: 1.6, margin: "0 0 8px 0" }}>{a.body}</p>
              <div style={{ fontSize: 11, color: "#5A6478" }}>{new Date(a.created_at).toLocaleString()}</div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
