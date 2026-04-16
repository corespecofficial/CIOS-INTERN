"use client";

import { useState } from "react";

const TRACKS = ["AI & Machine Learning", "Digital Marketing", "UI/UX Design", "Web Development", "Data Analytics", "Content Creation"];
const ROLES = ["University Student", "Recent Graduate", "Working Professional", "Recruiter / HR", "School / Institution", "Other"];

export default function DemoPage() {
  const [form, setForm] = useState({ name: "", email: "", role: "", track: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    await new Promise((r) => setTimeout(r, 1200));
    setStatus("sent");
  }

  const features = [
    { icon: "🎯", title: "Full Dashboard Tour", desc: "30-minute walkthrough of the intern dashboard, task system, gamification, and AI tools." },
    { icon: "🤖", title: "AI Features Demo", desc: "Live demo of AI Resume Builder, Interview Prep, Plagiarism Detection, and AI Copilot." },
    { icon: "🏆", title: "Gamification System", desc: "See XP, streaks, challenges, leaderboards, and reward payouts in action." },
    { icon: "💼", title: "Recruiter Portal", desc: "How companies find, filter, and hire talent directly from the platform." },
    { icon: "📊", title: "Admin Controls", desc: "Full tour of the admin and super-admin panels — compliance, analytics, and controls." },
    { icon: "💰", title: "Finance & Wallet", desc: "How monetary rewards, fines, and wallet payouts work in real time." },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px 80px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <span style={{ display: "inline-block", padding: "4px 14px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 1.5, marginBottom: 16 }}>LIVE DEMO</span>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 800, color: "#E8EDF5", margin: "0 0 16px", lineHeight: 1.1 }}>
          See CIOS in action
        </h1>
        <p style={{ fontSize: 17, color: "#8892A4", maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
          Book a personalized demo call and watch how CIOS transforms an internship program into a full talent economy — live, end-to-end.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}>
        {/* Left — what you'll see */}
        <div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "#E8EDF5", marginBottom: 24 }}>What we&apos;ll cover</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {features.map((f) => (
              <div key={f.title} style={{ display: "flex", gap: 16, padding: "16px 20px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", marginBottom: 4 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div style={{ marginTop: 32, padding: "20px 24px", borderRadius: 12, background: "rgba(30,136,229,0.08)", border: "1px solid rgba(30,136,229,0.2)" }}>
            <p style={{ fontSize: 14, color: "#B0BEC5", lineHeight: 1.7, fontStyle: "italic", margin: "0 0 12px" }}>
              &ldquo;The demo call convinced us in 20 minutes. We enrolled our entire 40-person cohort the following week.&rdquo;
            </p>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1E88E5" }}>— Training Manager, Lagos Tech Hub</div>
          </div>
        </div>

        {/* Right — form */}
        <div style={{ padding: "32px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {status === "sent" ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "#E8EDF5", marginBottom: 8 }}>Request received!</h3>
              <p style={{ color: "#8892A4", fontSize: 14, lineHeight: 1.6 }}>
                We&apos;ll reach out within 24 hours to confirm your demo time. Check your inbox at <strong style={{ color: "#E8EDF5" }}>{form.email}</strong>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "#E8EDF5", marginBottom: 24 }}>Book your demo</h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Name */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#8892A4", marginBottom: 6 }}>Full Name *</label>
                  <input
                    required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your full name"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#E8EDF5", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#8892A4", marginBottom: 6 }}>Email Address *</label>
                  <input
                    required type="email" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@company.com"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#E8EDF5", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                {/* Role */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#8892A4", marginBottom: 6 }}>Your Role</label>
                  <select
                    value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", color: form.role ? "#E8EDF5" : "#5A6478", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  >
                    <option value="">Select your role</option>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {/* Track interest */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#8892A4", marginBottom: 6 }}>Track of Interest</label>
                  <select
                    value={form.track} onChange={(e) => setForm({ ...form, track: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", color: form.track ? "#E8EDF5" : "#5A6478", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  >
                    <option value="">Select a track</option>
                    {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#8892A4", marginBottom: 6 }}>What do you want to learn?</label>
                  <textarea
                    value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="e.g. How does the gamification system work? How do recruiters find talent?"
                    rows={3}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#E8EDF5", fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box" }}
                  />
                </div>

                <button
                  type="submit" disabled={status === "sending"}
                  style={{ padding: "13px", borderRadius: 12, background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: status === "sending" ? "wait" : "pointer", boxShadow: "0 4px 20px rgba(30,136,229,0.35)" }}
                >
                  {status === "sending" ? "Sending…" : "Book Demo Call →"}
                </button>

                <p style={{ fontSize: 11, color: "#5A6478", textAlign: "center", margin: 0 }}>
                  Usually responds within 24 hours · Free, no commitment
                </p>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Mobile responsive override */}
      <style>{`
        @media (max-width: 768px) {
          .demo-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
