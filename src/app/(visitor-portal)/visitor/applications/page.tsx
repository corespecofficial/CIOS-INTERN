import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

interface App {
  id: string;
  applied_role: string;
  status: string;
  payload: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  decided_at: string | null;
}

export default async function MyApplications() {
  const me = await getCurrentDbUser();
  if (!me) return null;

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("role_applications")
    .select("id, applied_role, status, payload, notes, created_at, decided_at")
    .eq("user_id", me.id)
    .order("created_at", { ascending: false });
  const apps = (data || []) as App[];

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px 0" }}>My applications</h1>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 24px 0" }}>
        Track decisions on your role applications. Approval lifts you out of the visitor portal automatically.
      </p>

      {apps.length === 0 ? (
        <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 32, textAlign: "center", color: "#5A6478", fontSize: 13 }}>
          No applications yet. <a href="/onboarding/intent" style={{ color: "#1E88E5" }}>Apply for a role →</a>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {apps.map((a) => (
            <article key={a.id} style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5 }}>Applied as</div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{a.applied_role}</div>
                </div>
                <Status value={a.status} />
              </div>
              <div style={{ fontSize: 11, color: "#5A6478" }}>
                Submitted {new Date(a.created_at).toLocaleString()}
                {a.decided_at && <> · Decided {new Date(a.decided_at).toLocaleString()}</>}
              </div>
              {(a.payload?.why as string) && (
                <p style={{ marginTop: 10, fontSize: 13, color: "#C7CFD8", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {String(a.payload.why)}
                </p>
              )}
              {a.notes && (
                <div style={{ marginTop: 10, padding: "10px 12px", background: "#0A0E1A", borderRadius: 8, fontSize: 13, color: "#C7CFD8" }}>
                  <div style={{ fontSize: 10, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Reviewer notes</div>
                  {a.notes}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Status({ value }: { value: string }) {
  const map: Record<string, { color: string; label: string }> = {
    pending: { color: "#FFA726", label: "Pending review" },
    approved: { color: "#26A69A", label: "Approved" },
    rejected: { color: "#FF8A80", label: "Not approved" },
    withdrawn: { color: "#5A6478", label: "Withdrawn" },
  };
  const x = map[value] || map.pending;
  return <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 999, background: `${x.color}22`, color: x.color, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>{x.label}</span>;
}
