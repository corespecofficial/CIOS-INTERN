import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

interface OrgRow {
  org_id: string;
  role: string;
  creative_orgs: { slug: string; name: string; status: string };
}

export default async function StudentPortalIndex() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in?redirect_url=/s");

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("org_members")
    .select("org_id, role, creative_orgs!inner(slug, name, status)")
    .eq("user_id", me.id)
    .eq("status", "active")
    .order("joined_at", { ascending: false });
  const memberships = ((data || []) as unknown as OrgRow[]).filter((m) => m.creative_orgs.status === "active");

  if (memberships.length === 1) redirect(`/s/${memberships[0].creative_orgs.slug}`);

  return (
    <div style={{ maxWidth: 720, margin: "60px auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px 0" }}>Your spaces</h1>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 24px 0" }}>
        Pick a space to enter. {memberships.length === 0 && "You haven't enrolled in any creative spaces yet."}
      </p>

      {memberships.length === 0 ? (
        <Link href="/creative-space" style={{ display: "inline-block", padding: "10px 22px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
          Browse the marketplace →
        </Link>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {memberships.map((m) => (
            <Link
              key={m.org_id}
              href={`/s/${m.creative_orgs.slug}`}
              style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 18, textDecoration: "none", color: "#E8EDF5" }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{m.creative_orgs.name}</div>
              <div style={{ fontSize: 11, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5 }}>{m.role}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
