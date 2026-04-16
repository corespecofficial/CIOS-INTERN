"use client";

import { useState } from "react";

const TRACKS = [
  "AI & Automation", "Development & Engineering", "Design & Creative",
  "Marketing & Growth", "Data & Analytics", "Business & Entrepreneurship",
];
const ROLES = [
  "University Student", "Recent Graduate", "Working Professional",
  "Recruiter / HR", "School / Institution", "Other",
];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#E8EDF5", fontSize: 14, outline: "none", boxSizing: "border-box",
  fontFamily: "inherit",
};

export function DemoForm() {
  const [form, setForm] = useState({ name: "", email: "", role: "", track: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    await new Promise(r => setTimeout(r, 1200));
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div style={{
        padding: "32px", borderRadius: 16, textAlign: "center",
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "#E8EDF5", marginBottom: 8 }}>
          Request received!
        </h3>
        <p style={{ color: "#8892A4", fontSize: 14, lineHeight: 1.6 }}>
          We&apos;ll reach out within 24 hours to confirm your demo time.
          Check your inbox at <strong style={{ color: "#E8EDF5" }}>{form.email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "#E8EDF5", marginBottom: 6 }}>
        Request a demo call
      </h2>
      <p style={{ fontSize: 13, color: "#5A6478", marginBottom: 22 }}>
        We&apos;ll email you within 24 hours to confirm a time.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Full Name *</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Your full name" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Email *</label>
              <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="you@company.com" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Your Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                style={{ ...inputStyle, background: "#0A0E1A", color: form.role ? "#E8EDF5" : "#5A6478" }}>
                <option value="">Select role</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Track Interest</label>
              <select value={form.track} onChange={e => setForm({ ...form, track: e.target.value })}
                style={{ ...inputStyle, background: "#0A0E1A", color: form.track ? "#E8EDF5" : "#5A6478" }}>
                <option value="">Select track</option>
                {TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>What do you want to learn?</label>
            <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
              placeholder="e.g. How does the gamification system work? How do recruiters find talent?"
              rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          <button type="submit" disabled={status === "sending"} style={{
            padding: "13px", borderRadius: 12, background: "linear-gradient(135deg, #1E88E5, #1565C0)",
            color: "#fff", fontWeight: 700, fontSize: 15, border: "none",
            cursor: status === "sending" ? "wait" : "pointer",
            boxShadow: "0 4px 20px rgba(30,136,229,0.35)",
            opacity: status === "sending" ? 0.8 : 1,
          }}>
            {status === "sending" ? "Sending…" : "Request Demo Call →"}
          </button>

          <p style={{ fontSize: 11, color: "#5A6478", textAlign: "center", margin: 0 }}>
            Usually responds within 24 hours · Free, no commitment
          </p>
        </div>
      </form>
    </div>
  );
}
