"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon3D } from "@/components/marketing/icon3d";

const CATEGORIES: Record<string, { label: string; icon: string; color: string; skills: { icon: string; name: string; desc: string }[] }> = {
  creative: {
    label: "Creative", icon: "palette", color: "#AB47BC",
    skills: [
      { icon: "palette", name: "Graphic Design", desc: "Brand, print, digital" },
      { icon: "video", name: "Video Editing", desc: "Short-form, long-form" },
      { icon: "sparkles", name: "Motion Graphics", desc: "After Effects, Lottie" },
      { icon: "gem", name: "Branding", desc: "Identity systems" },
      { icon: "laptop", name: "UI/UX Design", desc: "Figma, prototyping" },
    ],
  },
  marketing: {
    label: "Marketing", icon: "megaphone", color: "#FF7043",
    skills: [
      { icon: "megaphone", name: "Social Media Marketing", desc: "Strategy + execution" },
      { icon: "magnify", name: "SEO", desc: "Technical + content" },
      { icon: "chart", name: "Paid Ads", desc: "Meta, Google, TikTok" },
      { icon: "envelope", name: "Email Marketing", desc: "Klaviyo, lifecycle" },
      { icon: "memo", name: "Copywriting", desc: "Web, ads, email" },
    ],
  },
  tech: {
    label: "Tech", icon: "laptop", color: "#1E88E5",
    skills: [
      { icon: "laptop", name: "Web Development", desc: "React, Next.js, APIs" },
      { icon: "mobile", name: "Mobile Apps", desc: "React Native, Flutter" },
      { icon: "lock", name: "Cybersecurity", desc: "Blue team, CTF" },
      { icon: "chart", name: "Data Analysis", desc: "SQL, Python, BI" },
      { icon: "lightning", name: "Automation", desc: "n8n, Zapier, scripts" },
    ],
  },
  business: {
    label: "Business", icon: "briefcase", color: "#66BB6A",
    skills: [
      { icon: "phone", name: "Virtual Assistance", desc: "Admin, inbox mgmt" },
      { icon: "chat", name: "Customer Support", desc: "Chat, email, phone" },
      { icon: "handshake", name: "Sales", desc: "Outbound, CRM" },
      { icon: "calendar", name: "Project Management", desc: "Agile, stakeholder mgmt" },
    ],
  },
  ai: {
    label: "AI Core", icon: "robot", color: "#26C6DA",
    skills: [
      { icon: "megaphone", name: "AI for Marketing", desc: "Campaigns, personalization" },
      { icon: "palette", name: "AI for Graphic Design", desc: "Midjourney, Stable Diffusion" },
      { icon: "video", name: "AI for Video", desc: "Runway, Sora, Descript" },
      { icon: "laptop", name: "AI for Coding", desc: "Copilot, Cursor, Claude" },
      { icon: "books", name: "AI for Research", desc: "Perplexity, deep analysis" },
      { icon: "chat", name: "AI for Customer Support", desc: "Chatbot agents" },
      { icon: "handshake", name: "AI for Sales", desc: "Outreach automation" },
      { icon: "lightning", name: "AI Automation", desc: "Agents, n8n, workflows" },
      { icon: "brain", name: "Prompt Engineering", desc: "Craft + evaluate prompts" },
      { icon: "chart", name: "AI Analytics", desc: "Explain + predict" },
    ],
  },
};

const TABS = ["all", "creative", "marketing", "tech", "business", "ai"] as const;

export default function TalentShowcasePage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [q, setQ] = useState("");

  const groups = tab === "all" ? Object.keys(CATEGORIES) : [tab];
  const query = q.toLowerCase();

  return (
    <div>
      {/* Hero */}
      <section style={{ padding: "70px 20px 30px", textAlign: "center", maxWidth: 960, margin: "0 auto" }}>
        <Icon3D name="brain" size={96} />
        <div>
          <span style={{ display: "inline-block", padding: "4px 12px", background: "rgba(38,198,218,0.15)", color: "#26C6DA", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 1, marginTop: 12 }}>OUR TALENT</span>
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 800, color: "#E8EDF5", margin: "14px 0 14px 0", lineHeight: 1.1 }}>Digital skills + AI-native talent.</h1>
        <p style={{ fontSize: 17, color: "#8892A4", maxWidth: 660, margin: "0 auto", lineHeight: 1.6 }}>
          Our interns don't just take courses — they ship real projects, contribute to peer reviews, and build portfolios.
        </p>
      </section>

      {/* Filters */}
      <section style={{ padding: "10px 20px 30px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", alignItems: "center", marginBottom: 20 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Search skills…" style={{ padding: "10px 14px", background: "#111827", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 13, minWidth: 220, flex: 1, maxWidth: 320 }} />
          <div style={{ display: "flex", gap: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 4, overflowX: "auto" }}>
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "8px 14px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: tab === t ? "rgba(38,198,218,0.15)" : "transparent",
                color: tab === t ? "#26C6DA" : "#8892A4",
                border: "none", whiteSpace: "nowrap", textTransform: "capitalize",
              }}>{t === "all" ? "All" : CATEGORIES[t]?.label || t}</button>
            ))}
          </div>
        </div>

        {/* Groups */}
        {groups.map((gk) => {
          const group = CATEGORIES[gk];
          if (!group) return null;
          const skills = group.skills.filter((s) => !query || s.name.toLowerCase().includes(query) || s.desc.toLowerCase().includes(query));
          if (skills.length === 0) return null;
          return (
            <div key={gk} style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <Icon3D name={group.icon} size={48} />
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>{group.label}</h2>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: `${group.color}22`, color: group.color, fontWeight: 700 }}>{skills.length} skills</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {skills.map((s) => (
                  <div key={s.name} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 }}>
                    <Icon3D name={s.icon} size={42} />
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5", marginTop: 6 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "#8892A4", lineHeight: 1.5, marginTop: 2 }}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* CTA */}
      <section style={{ padding: "40px 20px 60px", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
        <Icon3D name="trophy" size={64} />
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 800, color: "#E8EDF5", margin: "8px 0 14px 0" }}>Every candidate has a verified track record</h2>
        <p style={{ fontSize: 14, color: "#8892A4", marginBottom: 22, lineHeight: 1.6 }}>
          Performance scores · attendance streaks · peer reputation · real projects shipped. You hire on evidence, not promises.
        </p>
        <Link href="/contact?category=recruiter" style={{ display: "inline-block", padding: "14px 32px", background: "linear-gradient(135deg, #26C6DA, #00ACC1)", color: "#fff", borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>Apply to hire →</Link>
      </section>
    </div>
  );
}
