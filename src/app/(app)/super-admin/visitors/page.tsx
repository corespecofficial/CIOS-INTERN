/**
 * Super-admin: visitor pool. Shows everyone in the public_user role with
 * intent + signup risk + flags. Clicking a row reveals the captured spam
 * signals and a one-click suspend/restore.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Visitor {
  id: string;
  email: string;
  name: string;
  intent: string | null;
  signup_risk_score: number;
  signup_signals: { flags?: string[]; collisions?: { ip?: number; ua?: number } } | null;
  status: string;
  suspended_at: string | null;
  suspended_reason: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

export default async function SuperAdminVisitorsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; risk?: string }> }) {
  const me = await getCurrentDbUser();
  if (!me || me.role !== "super_admin") redirect("/dashboard");

  const { page: pageStr, q, risk } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const sb = supabaseAdmin();
  let query = sb
    .from("users")
    .select("id, email, name, intent, signup_risk_score, signup_signals, status, suspended_at, suspended_reason, created_at", { count: "exact" })
    .eq("role", "public_user")
    .order("created_at", { ascending: false })
    .range(from, to);
  if (q) query = query.ilike("email", `%${q}%`);
  if (risk === "review") query = query.gte("signup_risk_score", 50);
  if (risk === "block") query = query.gte("signup_risk_score", 90);

  const { data, count } = await query;
  const visitors = (data || []) as Visitor[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ maxWidth: 1100, padding: "32px 40px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 4px 0" }}>Visitors</h1>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 20px 0" }}>{total} total in the visitor pool</p>

      <form style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input name="q" defaultValue={q ?? ""} placeholder="Search email…" style={{ flex: 1, padding: "8px 12px", background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 6, color: "#E8EDF5", fontSize: 13 }} />
        <select name="risk" defaultValue={risk ?? ""} style={{ padding: "8px 12px", background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 6, color: "#E8EDF5", fontSize: 13 }}>
          <option value="">All risk levels</option>
          <option value="review">Flagged (50+)</option>
          <option value="block">Auto-blocked (90+)</option>
        </select>
        <button type="submit" style={{ padding: "8px 16px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Filter</button>
      </form>

      {visitors.length === 0 ? (
        <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 32, textAlign: "center", color: "#5A6478", fontSize: 13 }}>No visitors match.</div>
      ) : (
        <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, overflow: "hidden" }}>
          {visitors.map((v, i) => {
            const flags = v.signup_signals?.flags ?? [];
            return (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderTop: i === 0 ? "none" : "1px solid #1F2937" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{v.name || "—"}</span>
                    <span style={{ fontSize: 11, color: "#5A6478" }}>{v.email}</span>
                    {v.intent && <span style={{ fontSize: 10, color: "#8892A4", padding: "1px 6px", background: "#1E2937", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.5 }}>{v.intent}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#5A6478", marginTop: 2 }}>
                    Joined {new Date(v.created_at).toLocaleDateString()}
                    {flags.length > 0 && <> · flags: {flags.join(", ")}</>}
                  </div>
                </div>
                <RiskBadge score={v.signup_risk_score} />
                {v.suspended_at && <span style={{ fontSize: 10, padding: "3px 8px", background: "#3D1F1F", color: "#FF8A80", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }} title={v.suspended_reason ?? ""}>SUSPENDED</span>}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center" }}>
          {page > 1 && <Link href={`?page=${page - 1}${q ? `&q=${q}` : ""}${risk ? `&risk=${risk}` : ""}`} style={pagerStyle}>← Prev</Link>}
          <span style={{ ...pagerStyle, background: "#1E2937" }}>Page {page} / {totalPages}</span>
          {page < totalPages && <Link href={`?page=${page + 1}${q ? `&q=${q}` : ""}${risk ? `&risk=${risk}` : ""}`} style={pagerStyle}>Next →</Link>}
        </div>
      )}
    </div>
  );
}

function RiskBadge({ score }: { score: number }) {
  let color = "#26A69A", label = "OK";
  if (score >= 90) { color = "#FF8A80"; label = "BLOCK"; }
  else if (score >= 50) { color = "#FFA726"; label = "REVIEW"; }
  return <span style={{ fontSize: 11, padding: "3px 10px", background: `${color}22`, color, borderRadius: 999, fontWeight: 700, fontFamily: "ui-monospace, monospace" }}>{score} {label}</span>;
}

const pagerStyle: React.CSSProperties = { display: "inline-block", padding: "6px 12px", background: "#111827", border: "1px solid #1F2937", borderRadius: 6, color: "#8892A4", fontSize: 12, textDecoration: "none" };
