import Link from "next/link";
import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { listMyContactRequests } from "@/app/actions/messaging-privacy";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = { pending: "#FFC107", approved: "#66BB6A", rejected: "#EF5350" };

export default async function RequestsPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const res = await listMyContactRequests();
  const rows = res.ok ? (res.data as Array<Record<string, unknown>>) : [];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>📨 My contact requests</h1>
          <p style={{ fontSize: 12, color: "#8892A4", margin: "2px 0 0 0" }}>Track your pending and past requests for new contacts</p>
        </div>
        <Link href="/messages/contacts" style={{ padding: "9px 14px", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>← Contacts</Link>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {rows.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>No contact requests yet.</div>}
        {rows.map((r) => (
          <div key={r.id as string} style={{ background: "#111827", border: `1px solid ${STATUS_COLOR[r.status as string] || "#8892A4"}33`, borderLeft: `4px solid ${STATUS_COLOR[r.status as string] || "#8892A4"}`, borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", fontFamily: "monospace" }}>{r.target_intern_id as string}</div>
                {r.reason ? <div style={{ fontSize: 12, color: "#8892A4", marginTop: 4 }}>{r.reason as string}</div> : null}
                <div style={{ fontSize: 10, color: "#5A6478", marginTop: 4 }}>Sent {new Date(r.created_at as string).toLocaleString()}</div>
                {(r.status === "rejected" || r.status === "approved") && r.admin_note ? <div style={{ fontSize: 11, color: "#FFC107", marginTop: 4 }}>Admin: {r.admin_note as string}</div> : null}
              </div>
              <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 99, background: `${STATUS_COLOR[r.status as string] || "#8892A4"}22`, color: STATUS_COLOR[r.status as string] || "#8892A4", fontWeight: 700, textTransform: "uppercase" }}>{r.status as string}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
