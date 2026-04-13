"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";

const LOGO = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

interface VerifyResult {
  valid: boolean;
  certificateNumber?: string;
  studentName?: string;
  courseTitle?: string;
  instructorName?: string;
  issuedAt?: string;
}

export default function VerifyPage() {
  const [number, setNumber] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function runCheck(value: string) {
    const q = value.trim();
    if (!q) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/verify-certificate/${encodeURIComponent(q)}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ valid: false });
    } finally {
      setBusy(false);
    }
  }

  function check() { runCheck(number); }

  // Auto-run if ?id=... passed
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const id = sp.get("id");
    if (id) {
      setNumber(id);
      runCheck(id);
    }
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0E1A", color: "#E8EDF5",
      fontFamily: "'Nunito', system-ui, sans-serif", padding: "40px 20px",
    }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src={LOGO} alt="CIOS" style={{ width: 80, height: 80, borderRadius: "50%", marginBottom: 14, display: "block", marginLeft: "auto", marginRight: "auto" }} />
          <div style={{ display: "inline-block", padding: "4px 12px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 1.5, marginBottom: 8 }}>
            CIOS · CERTIFICATE VERIFIER
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "4px 0 6px 0" }}>Verify a CIOS certificate</h1>
          <p style={{ fontSize: 14, color: "#8892A4", margin: 0 }}>
            Enter the certificate ID (e.g. <code style={{ background: "#111827", padding: "2px 6px", borderRadius: 4 }}>CIOS-XXX-XXXXXX</code>) to confirm authenticity.
          </p>
        </div>

        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") check(); }}
              placeholder="CIOS-2511-A4B2C9"
              style={{
                flex: 1, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, padding: "12px 16px", color: "#E8EDF5", fontSize: 14,
                outline: "none", fontFamily: "monospace", letterSpacing: 1,
              }}
              autoFocus
            />
            <button
              onClick={check}
              disabled={busy || !number.trim()}
              style={{
                background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff",
                border: "none", borderRadius: 10, padding: "12px 22px",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                opacity: (busy || !number.trim()) ? 0.5 : 1,
              }}
            >
              {busy ? "Checking…" : "Verify"}
            </button>
          </div>
        </div>

        {result && result.valid && (
          <div style={{
            background: "linear-gradient(135deg, rgba(102,187,106,0.12), rgba(30,136,229,0.08))",
            border: "2px solid rgba(102,187,106,0.3)", borderRadius: 16,
            padding: 28, position: "relative",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ fontSize: 32 }}>✅</div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#66BB6A", textTransform: "uppercase", letterSpacing: 1.5 }}>Authentic · Verified</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "2px 0" }}>This certificate is genuine</h2>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <Field label="Student" value={result.studentName!} />
              <Field label="Issued" value={new Date(result.issuedAt!).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} />
            </div>
            <Field label="Course" value={result.courseTitle!} />
            <div style={{ marginTop: 14 }}>
              <Field label="Instructor" value={result.instructorName!} />
            </div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <Field label="Certificate ID" value={result.certificateNumber!} mono />
            </div>
          </div>
        )}

        {result && !result.valid && (
          <div style={{
            background: "linear-gradient(135deg, rgba(239,83,80,0.12), rgba(0,0,0,0))",
            border: "2px solid rgba(239,83,80,0.3)", borderRadius: 16,
            padding: 32, textAlign: "center",
          }}>
            <div style={{ fontSize: 60, marginBottom: 10 }}>⚠️</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#EF5350", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Not Found · Invalid</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#EF5350", margin: "2px 0 10px 0" }}>Fake identity — certificate not found</h2>
            <p style={{ fontSize: 13, color: "#8892A4", margin: 0, lineHeight: 1.6 }}>
              No certificate matches the ID <b style={{ fontFamily: "monospace", color: "#E8EDF5" }}>{number}</b> in our records.
              If you believe this is a mistake, contact <b style={{ color: "#1E88E5" }}>support@cospronos.com</b>.
            </p>
          </div>
        )}

        <p style={{ fontSize: 11, color: "#5A6478", textAlign: "center", marginTop: 24 }}>
          Issued by COSPRONOS Media × Corespec Engineering · CIOS AI Internship Operating System
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5", fontFamily: mono ? "monospace" : "inherit", letterSpacing: mono ? 1 : 0 }}>{value}</div>
    </div>
  );
}
