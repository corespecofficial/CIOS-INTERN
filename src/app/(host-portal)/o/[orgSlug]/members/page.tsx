import { notFound } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ orgSlug: string }>;
}

interface MemberRow {
  id: string;
  role: string;
  status: string;
  joined_at: string;
  user: { id: string; name: string; email: string; avatar_url: string | null } | null;
}

export default async function MembersPage({ params }: Props) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("org_members")
    .select("id, role, status, joined_at, user:users!org_members_user_id_fkey(id, name, email, avatar_url)")
    .eq("org_id", ctx.org.id)
    .order("joined_at", { ascending: false });
  const members = (data || []) as unknown as MemberRow[];

  const grouped = {
    owner: members.filter((m) => m.role === "owner"),
    org_admin: members.filter((m) => m.role === "org_admin"),
    instructor: members.filter((m) => m.role === "instructor"),
    student: members.filter((m) => m.role === "student"),
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px 0" }}>Members</h1>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 28px 0" }}>
        {members.length} active in {ctx.org.name}
      </p>

      {(["owner", "org_admin", "instructor", "student"] as const).map((role) => {
        const list = grouped[role];
        if (list.length === 0) return null;
        const label = role === "org_admin" ? "Org admins" : role === "owner" ? "Owner" : role === "instructor" ? "Instructors" : "Students";
        return (
          <section key={role} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 12, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.6, margin: "0 0 10px 0" }}>
              {label} ({list.length})
            </h2>
            <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, overflow: "hidden" }}>
              {list.map((m, i) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderTop: i === 0 ? "none" : "1px solid #1F2937",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#1E2937",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#8892A4",
                      overflow: "hidden",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {m.user?.avatar_url ? <img src={m.user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (m.user?.name?.[0]?.toUpperCase() ?? "?")}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.user?.name ?? "Unknown"}</div>
                    <div style={{ fontSize: 11, color: "#5A6478" }}>{m.user?.email}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#5A6478" }}>
                    {new Date(m.joined_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {members.length === 0 && (
        <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 32, textAlign: "center", color: "#5A6478", fontSize: 13 }}>
          No members yet. Once students enrol on the public listing they'll appear here automatically.
        </div>
      )}
    </div>
  );
}
