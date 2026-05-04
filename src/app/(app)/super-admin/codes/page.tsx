import { redirect } from "next/navigation";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { CodeComposer } from "./code-composer";
import { CodeRow } from "./code-row";

export const dynamic = "force-dynamic";

interface Code {
  id: string;
  code: string;
  role: string;
  org_id: string | null;
  notes: string | null;
  expires_at: string;
  max_uses: number;
  use_count: number;
  redeemed_at: string | null;
  redeemed_user: { id: string; name: string; email: string } | null;
  created_at: string;
}

export default async function SuperAdminCodesPage() {
  const me = await getCurrentDbUser();
  if (!me || me.role !== "super_admin") redirect("/dashboard");

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("super_admin_codes")
    .select("id, code, role, org_id, notes, expires_at, max_uses, use_count, redeemed_at, created_at, redeemed_user:users!super_admin_codes_redeemed_by_fkey(id, name, email)")
    .order("created_at", { ascending: false })
    .limit(200);
  const codes = (data || []) as unknown as Code[];

  const now = new Date();
  const live = codes.filter((c) => new Date(c.expires_at) > now && c.use_count < c.max_uses);
  const used = codes.filter((c) => c.use_count >= c.max_uses);
  const expired = codes.filter((c) => new Date(c.expires_at) <= now && c.use_count < c.max_uses);

  return (
    <div style={{ maxWidth: 900, padding: "32px 40px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 4px 0" }}>One-time signup codes</h1>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 20px 0" }}>
        Issue a code, hand it to your hire, they redeem during onboarding → instant role.
      </p>

      <CodeComposer />

      <Section title={`Live (${live.length})`}>
        {live.length === 0 ? <Empty /> : live.map((c) => <CodeRow key={c.id} code={c} />)}
      </Section>

      {used.length > 0 && (
        <Section title={`Redeemed (${used.length})`}>
          {used.map((c) => <CodeRow key={c.id} code={c} />)}
        </Section>
      )}

      {expired.length > 0 && (
        <Section title={`Expired (${expired.length})`}>
          {expired.map((c) => <CodeRow key={c.id} code={c} />)}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 12, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.6, margin: "0 0 10px 0" }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </section>
  );
}

function Empty() {
  return <div style={{ padding: "14px 18px", background: "#111827", border: "1px solid #1F2937", borderRadius: 10, color: "#5A6478", fontSize: 13, textAlign: "center" }}>None yet.</div>;
}
