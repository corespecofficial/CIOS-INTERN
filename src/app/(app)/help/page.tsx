"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

const FAQS: Array<{ q: string; a: string; tags: string }> = [
  { q: "How do I join a live class?", a: "Open Classroom from the sidebar. Active classes show a green pulse. Click Join to enter.", tags: "classroom live class attend" },
  { q: "What happens when I miss a class?", a: "A ₦500 fine is added to your wallet. Pay it from Wallet → Outstanding to resume full access.", tags: "fine missed absent penalty" },
  { q: "How do I earn XP and climb the leaderboard?", a: "Complete tasks on time, attend classes, respond to community posts, and ship projects. XP converts to levels and rewards.", tags: "xp rank leaderboard reward level" },
  { q: "How do I request a contact (message someone new)?", a: "Go to Messages → Contacts → Request by Intern ID. Admins approve requests.", tags: "contact dm request intern id messaging" },
  { q: "How do I export my certificate?", a: "Certificates → pick a certificate → Download PDF. Verified via /verify.", tags: "certificate pdf download" },
  { q: "How do I withdraw wallet earnings?", a: "Wallet → Withdraw → choose bank/mobile money. Payouts process within 24–72 hours.", tags: "wallet withdraw payout bank" },
  { q: "Where do I change my display name / avatar?", a: "Settings → Profile. Changes sync across the platform and to Clerk.", tags: "profile name avatar settings" },
  { q: "How do I report harassment or abuse?", a: "Tap ⋯ on any message → Report, or email support@cospronos.com with screenshots.", tags: "report abuse harassment safety" },
  { q: "Why can't I message someone?", a: "Messaging requires an allocated contact pair. Admins grant these. Request via Intern ID.", tags: "cant message blocked permission" },
  { q: "How do streaks work?", a: "Log in and complete at least one task daily. Missing a day resets your streak unless you have a Streak Freeze.", tags: "streak daily freeze" },
  { q: "What is the AI Copilot?", a: "An in-app assistant trained on CIOS policies and your progress. Find it on the Dashboard.", tags: "ai copilot assistant help" },
  { q: "Can I get promoted during the program?", a: "Yes. The ladder is: New → Active → Senior → Team Lead → Department Lead → Trainer → Manager. Promotion is score-based.", tags: "promotion rank role ladder" },
];

const QUICK_LINKS = [
  { label: "Onboarding", href: "/onboarding", emoji: "🚀" },
  { label: "Terms & Policies", href: "/terms", emoji: "📜" },
  { label: "My Wallet", href: "/wallet", emoji: "💰" },
  { label: "Settings", href: "/settings", emoji: "⚙️" },
  { label: "Verify a certificate", href: "/verify", emoji: "✅" },
  { label: "Announcements", href: "/announcements", emoji: "📣" },
];

export default function HelpPage() {
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [sending, setSending] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return FAQS;
    return FAQS.filter((f) => (f.q + " " + f.a + " " + f.tags).toLowerCase().includes(query));
  }, [q]);

  const submit = async () => {
    if (!subject.trim() || !message.trim()) { toast.error("Subject and message are required"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim(), priority }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Failed"));
      toast.success("Ticket submitted — we'll reach out soon");
      setSubject(""); setMessage(""); setPriority("medium");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send");
    } finally { setSending(false); }
  };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(38,198,218,0.15)", color: "#26C6DA", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>HELP CENTER</span>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>💬 How can we help?</h1>
        <p style={{ color: "#8892A4", fontSize: 13, margin: "4px 0 0 0" }}>Search FAQs, browse shortcuts, or contact support directly.</p>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔍 Search articles — e.g. “fine”, “wallet”, “streak”…"
        style={{ width: "100%", padding: "14px 18px", background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, color: "#E8EDF5", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 18 }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 26 }}>
        {QUICK_LINKS.map((l) => (
          <Link key={l.href} href={l.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, color: "#E8EDF5", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            <span style={{ fontSize: 20 }}>{l.emoji}</span>{l.label}
          </Link>
        ))}
      </div>

      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 18, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5", margin: "0 0 12px 0" }}>Frequently asked ({filtered.length})</h2>
        {filtered.length === 0 && <p style={{ fontSize: 13, color: "#8892A4" }}>No match. Try different keywords, or send us a ticket below.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((f) => (
            <details key={f.q} style={{ background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10 }}>
              <summary style={{ cursor: "pointer", padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#E8EDF5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{f.q}</span><span style={{ color: "#5A6478" }}>+</span>
              </summary>
              <div style={{ padding: "0 14px 14px 14px", fontSize: 13, color: "#B0BEC5", lineHeight: 1.65 }}>{f.a}</div>
            </details>
          ))}
        </div>
      </div>

      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5", margin: "0 0 4px 0" }}>📨 Still need help?</h2>
        <p style={{ fontSize: 12, color: "#8892A4", margin: "0 0 14px 0" }}>Send a ticket and our team will reply on the platform + by email.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 10, marginBottom: 10 }}>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" style={inputStyle} />
          <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} style={inputStyle}>
            <option value="low">Priority · Low</option>
            <option value="medium">Priority · Medium</option>
            <option value="high">Priority · High</option>
          </select>
        </div>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe what's happening, steps to reproduce, screenshots (paste URLs)…" rows={5} style={{ ...inputStyle, resize: "vertical" as const }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
          <span style={{ fontSize: 11, color: "#5A6478" }}>Typical reply time: 4–12 hrs (Mon–Fri WAT)</span>
          <button onClick={submit} disabled={sending} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.6 : 1 }}>
            {sending ? "Sending…" : "Send ticket →"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#E8EDF5", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
