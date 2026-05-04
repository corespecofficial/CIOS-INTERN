"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSuperAdminCode } from "@/app/actions/super-admin-codes";
import type { Role } from "@/lib/db";

const ROLES: Role[] = [
  "intern", "team_lead", "admin", "super_admin",
  "instructor", "moderator", "finance", "support",
  "recruiter", "mentor", "alumni", "creative_host",
];

export function CodeComposer() {
  const [role, setRole] = useState<Role>("instructor");
  const [days, setDays] = useState(14);
  const [notes, setNotes] = useState("");
  const [generated, setGenerated] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function generate() {
    setErr(null); setGenerated(null);
    start(async () => {
      const r = await createSuperAdminCode({ role, expiresInDays: days, notes });
      if (!r.ok) { setErr(r.error); return; }
      setGenerated(r.data!.code);
      setNotes("");
      router.refresh();
    });
  }

  return (
    <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 18, marginTop: 8 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px 0" }}>Issue a new code</h2>
      <div style={{ display: "grid", gridTemplateColumns: "180px 120px 1fr auto", gap: 8, alignItems: "stretch" }}>
        <select value={role} onChange={(e) => setRole(e.target.value as Role)} style={inputStyle}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} min={1} max={365} style={inputStyle} />
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (e.g. for Jane @ Acme)" style={inputStyle} />
        <button onClick={generate} disabled={pending} style={{ padding: "8px 18px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          {pending ? "Generating…" : "Generate"}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "180px 120px 1fr auto", gap: 8, fontSize: 10, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 6 }}>
        <span>Role</span>
        <span>Days</span>
        <span>Notes</span>
        <span></span>
      </div>

      {err && <div style={{ marginTop: 10, padding: "8px 10px", background: "#3D1F1F", color: "#FF8A80", fontSize: 12, borderRadius: 6 }}>{err}</div>}

      {generated && (
        <div style={{ marginTop: 12, padding: 14, background: "#0E2723", border: "1px solid #1A4640", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Code (copy now — won&apos;t be shown again)</div>
          <code style={{ fontSize: 18, fontFamily: "ui-monospace, monospace", color: "#26A69A", letterSpacing: 1 }}>{generated}</code>
          <button onClick={() => navigator.clipboard?.writeText(generated)} style={{ marginLeft: 12, padding: "4px 10px", background: "transparent", color: "#26A69A", border: "1px solid #1A4640", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
            Copy
          </button>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = { padding: "8px 12px", background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 6, color: "#E8EDF5", fontSize: 13 };
