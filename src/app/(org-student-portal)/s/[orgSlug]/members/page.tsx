import { notFound } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

interface MemberRow {
  id: string;
  role: string;
  user: { id: string; name: string; avatar_url: string | null } | null;
}

export default async function StudentMembers({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("org_members")
    .select("id, role, user:users!org_members_user_id_fkey(id, name, avatar_url)")
    .eq("org_id", ctx.org.id)
    .eq("status", "active")
    .order("joined_at", { ascending: false });
  const members = (data || []) as unknown as MemberRow[];

  // Privacy: students see staff fully, but only first names of other students.
  const staff = members.filter((m) => m.role !== "student");
  const students = members.filter((m) => m.role === "student");

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px 0" }}>Classmates</h1>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 28px 0" }}>{members.length} active</p>

      {staff.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 12, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.6, margin: "0 0 10px 0" }}>Instructors</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
            {staff.map((m) => (
              <div key={m.id} style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={m.user?.name ?? "?"} url={m.user?.avatar_url ?? null} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{m.user?.name ?? "Unknown"}</div>
                  <div style={{ fontSize: 10, color: "#5A6478", textTransform: "uppercase" }}>{m.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {students.length > 0 && (
        <section>
          <h2 style={{ fontSize: 12, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.6, margin: "0 0 10px 0" }}>Students ({students.length})</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
            {students.map((m) => (
              <div key={m.id} style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={m.user?.name ?? "?"} url={m.user?.avatar_url ?? null} />
                <div style={{ fontSize: 13, fontWeight: 500 }}>{firstName(m.user?.name)}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function firstName(s: string | undefined | null) {
  if (!s) return "—";
  return s.split(" ")[0];
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  return (
    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1E2937", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#8892A4", overflow: "hidden", flexShrink: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : name[0]?.toUpperCase()}
    </div>
  );
}
