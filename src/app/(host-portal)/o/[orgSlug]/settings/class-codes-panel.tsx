"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPublicEnrollmentCode, revokePublicEnrollmentCode, type PublicEnrollmentCode } from "@/app/actions/enrollment-codes";

interface Props {
  orgId: string;
  orgSlug: string;
  initialCodes: PublicEnrollmentCode[];
}

export function ClassCodesPanel({ orgId, orgSlug, initialCodes }: Props) {
  const [codes, setCodes] = useState(initialCodes);
  const [days, setDays] = useState(90);
  const [generated, setGenerated] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function generate() {
    setErr(null); setGenerated(null);
    start(async () => {
      const r = await createPublicEnrollmentCode(orgId, { role: "student", expiresInDays: days });
      if (!r.ok) { setErr(r.error); return; }
      setGenerated(r.data!.token);
      router.refresh();
    });
  }

  function revoke(id: string) {
    if (!confirm("Revoke this code? Anyone who hasn't joined yet won't be able to use it.")) return;
    start(async () => {
      const r = await revokePublicEnrollmentCode(orgId, id);
      if (!r.ok) { setErr(r.error); return; }
      setCodes((prev) => prev.filter((c) => c.id !== id));
    });
  }

  // Build the share-link the admin posts on social. Auto-fills the code
  // on the enrollment page so the user doesn't retype it.
  function shareLink(token: string) {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/onboarding/enrollment?code=${encodeURIComponent(token)}`;
  }

  const live = codes;
  const expired: PublicEnrollmentCode[] = [];

  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px 0", fontFamily: "'Space Grotesk', sans-serif" }}>
        Organization enrollment codes
      </h2>
      <p style={{ color: "#8892A4", fontSize: 12, margin: "0 0 14px 0", lineHeight: 1.5 }}>
        Share these on social or in a post - anyone with the code joins your organization space as an intern.
        They&apos;ll auto-route into <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>/s/{orgSlug}</code>.
      </p>

      <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 16 }}>
        {/* Generate */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px auto", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "#8892A4" }}>
            Codes never expose your org until used. Default lifetime: <strong style={{ color: "#E8EDF5" }}>{days} days</strong>.
          </div>
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            min={1}
            max={365}
            aria-label="Code lifetime in days"
            style={{ padding: "8px 10px", background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 6, color: "#E8EDF5", fontSize: 13 }}
          />
          <button type="button" onClick={generate} disabled={pending} style={{ padding: "8px 16px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: pending ? "not-allowed" : "pointer" }}>
            {pending ? "…" : "+ Generate"}
          </button>
        </div>

        {err && <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(239,83,80,0.10)", color: "#FF8A80", fontSize: 12, borderRadius: 6 }}>{err}</div>}

        {generated && (
          <div style={{ marginTop: 12, padding: 14, background: "rgba(38,166,154,0.10)", border: "1px solid rgba(38,166,154,0.30)", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, fontWeight: 700 }}>New code (copy now)</div>
            <code style={{ fontSize: 16, fontFamily: "ui-monospace, monospace", color: "#26A69A", letterSpacing: 1 }}>{generated}</code>
            <div style={{ marginTop: 8, fontSize: 11, color: "#8892A4" }}>
              Share link: <code style={{ background: "rgba(255,255,255,0.04)", padding: "2px 6px", borderRadius: 4, color: "#E8EDF5", fontSize: 10 }}>{shareLink(generated)}</code>
              <button type="button" onClick={() => navigator.clipboard?.writeText(shareLink(generated))} style={{ marginLeft: 8, padding: "3px 10px", background: "transparent", color: "#26A69A", border: "1px solid rgba(38,166,154,0.30)", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                Copy link
              </button>
            </div>
          </div>
        )}

        {/* Live codes */}
        {live.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 }}>
              Live ({live.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {live.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#0A0E1A", borderRadius: 8, fontSize: 12 }}>
                  <code style={{ fontFamily: "ui-monospace, monospace", color: "#26A69A", letterSpacing: 0.5, flex: 1 }}>{c.token}</code>
                  <span style={{ color: "#8892A4" }}>{c.role}</span>
                  <span style={{ color: "#5A6478" }}>exp {new Date(c.expires_at).toLocaleDateString()}</span>
                  <button type="button" onClick={() => navigator.clipboard?.writeText(shareLink(c.token))} style={{ padding: "3px 10px", background: "transparent", color: "#26A69A", border: "1px solid rgba(38,166,154,0.30)", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                    Copy
                  </button>
                  <button type="button" onClick={() => revoke(c.id)} disabled={pending} style={{ padding: "3px 10px", background: "transparent", color: "#FF8A80", border: "1px solid rgba(239,83,80,0.30)", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {expired.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 10, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 }}>
              Expired / revoked ({expired.length})
            </div>
            <div style={{ fontSize: 11, color: "#5A6478" }}>
              {expired.slice(0, 5).map((c) => c.token).join(" · ")}
              {expired.length > 5 && ` +${expired.length - 5}`}
            </div>
          </div>
        )}

        {codes.length === 0 && (
          <div style={{ marginTop: 12, padding: 14, color: "#5A6478", fontSize: 12, textAlign: "center" }}>
            No codes yet. Generate one above to start sharing.
          </div>
        )}
      </div>
    </section>
  );
}
