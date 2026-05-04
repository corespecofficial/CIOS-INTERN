/**
 * /o — landing for the host portal with no slug. Three cases:
 *   1. User owns / belongs to one or more orgs → redirect to most-recent
 *   2. User has no host-portal memberships → friendly empty state (likely
 *      hit this by typing /o while still pending approval)
 *   3. Unauthed → middleware would have already redirected
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HostPortalIndex() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in?redirect_url=/o");

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("org_members")
    .select("creative_orgs!inner(slug, name, status)")
    .eq("user_id", me.id)
    .eq("status", "active")
    .in("role", ["owner", "org_admin", "instructor"])
    .order("joined_at", { ascending: false })
    .limit(1);

  type Row = { creative_orgs: { slug: string; name: string; status: string } };
  const first = (data as Row[] | null)?.[0]?.creative_orgs;
  if (first && first.status === "active") redirect(`/o/${first.slug}`);

  return (
    <div style={{ maxWidth: 560, margin: "60px auto", padding: 24 }}>
      <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 16, padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏫</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px 0" }}>No active host orgs yet</h1>
        <p style={{ fontSize: 14, color: "#8892A4", lineHeight: 1.6, margin: "0 0 20px 0" }}>
          Once a Creative Space you applied for is approved, your host portal will land here.
        </p>
        <Link
          href="/creative-space/apply"
          style={{ display: "inline-block", padding: "10px 22px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none" }}
        >
          Apply to host a Creative Space →
        </Link>
      </div>
    </div>
  );
}
