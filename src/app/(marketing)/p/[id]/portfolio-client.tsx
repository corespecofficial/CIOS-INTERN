"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import Link from "next/link";
import type { PortfolioData, PortfolioProject } from "@/app/actions/portfolio";

const C = {
  bg: "#05070F",
  card: "#0D1220",
  card2: "#141A2B",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.08)",
  accent: "#4DA8FF",
  green: "#4dd88b",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
}

interface Props {
  data: PortfolioData;
}

export default function PortfolioClient({ data }: Props) {
  const [activeTab, setActiveTab] = useState<"projects" | "certificates" | "about">("projects");
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/p/${data.id}` : `/p/${data.id}`;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 80px", position: "relative" }}>
      <style>{`
        .pf-projects { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .pf-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        @media (max-width: 900px) { .pf-projects { grid-template-columns: repeat(2, 1fr); } .pf-stat-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .pf-projects { grid-template-columns: 1fr; } }
      `}</style>

      {/* Cover + avatar */}
      <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", marginBottom: 80 }}>
        <div
          style={{
            height: 180,
            background: data.cover_url
              ? `url(${data.cover_url}) center/cover`
              : "linear-gradient(135deg, #1E88E5 0%, #6B3FD4 60%, #EC4899 100%)",
          }}
        />
        <div style={{ position: "absolute", bottom: -48, left: 28, display: "flex", alignItems: "end", gap: 16 }}>
          {data.avatar_url ? (
            <img
              src={data.avatar_url}
              alt={data.name}
              style={{ width: 110, height: 110, borderRadius: "50%", border: `4px solid ${C.bg}`, objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: "50%",
                border: `4px solid ${C.bg}`,
                background: "linear-gradient(135deg, #4DA8FF, #AB47BC)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 36,
                fontWeight: 800,
              }}
            >
              {initials(data.name)}
            </div>
          )}
        </div>
        <div style={{ position: "absolute", top: 16, right: 16, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 999, padding: "6px 14px", fontSize: 11, color: "#fff", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", backdropFilter: "blur(10px)" }}>
          ✓ CIOS Verified
        </div>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>{data.name}</h1>
          {data.headline && <div style={{ color: C.dim, fontSize: 15, marginTop: 4 }}>{data.headline}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap", fontSize: 12, color: C.dim }}>
            {data.location && <span>📍 {data.location}</span>}
            <span>🎓 {data.role.replace("_", " ")}</span>
            <span>📅 Joined {fmtDate(data.joined_at)}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => navigator.clipboard?.writeText(shareUrl).then(() => alert("Portfolio link copied"))}
            style={{ padding: "10px 16px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            🔗 Copy Link
          </button>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noreferrer"
            style={{ padding: "10px 16px", background: "transparent", color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: "none" }}
          >
            📎 LinkedIn
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="pf-stat-grid" style={{ marginBottom: 28 }}>
        <Stat label="Performance" value={`${data.performance_score}/100`} accent="#66BB6A" />
        <Stat label="Projects" value={String(data.projects_count)} accent="#4DA8FF" />
        <Stat label="Certificates" value={String(data.certificates_count)} accent="#FFC107" />
        <Stat label="Streak" value={`🔥 ${data.streak}d`} accent="#FF7043" />
      </div>

      {/* Skills */}
      {data.skills.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
            Verified Skills
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {data.skills.map((s) => (
              <span key={s} style={{ padding: "5px 12px", background: `${C.accent}22`, color: C.accent, borderRadius: 999, fontSize: 12, fontWeight: 600, border: `1px solid ${C.accent}44` }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4, marginBottom: 20 }}>
        {[
          { k: "projects" as const, label: `📁 Projects (${data.projects.length})` },
          { k: "certificates" as const, label: `🏅 Certificates (${data.certificates.length})` },
          { k: "about" as const, label: "👤 About" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setActiveTab(t.k)}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: activeTab === t.k ? C.accent : "transparent",
              color: activeTab === t.k ? "#fff" : C.dim,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Projects tab */}
      {activeTab === "projects" && (
        <>
          {data.projects.length === 0 ? (
            <Empty text="No projects yet — this intern is just getting started." />
          ) : (
            <div className="pf-projects">
              {data.projects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProject(proj)}
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 14,
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ height: 140, background: proj.thumbnail_url ? `url(${proj.thumbnail_url}) center/cover` : `linear-gradient(135deg, ${C.accent}22, ${C.card2})`, position: "relative" }}>
                    {proj.score != null && (
                      <div style={{ position: "absolute", top: 10, right: 10, background: C.green, color: "#000", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>
                        {proj.score}/10
                      </div>
                    )}
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4, lineHeight: 1.3 }}>
                      {proj.title}
                    </div>
                    {proj.category && (
                      <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
                        {proj.category}
                      </div>
                    )}
                    {proj.description && (
                      <p style={{ fontSize: 12, color: C.dim, margin: "8px 0 0", lineHeight: 1.5 }}>
                        {proj.description.length > 100 ? `${proj.description.slice(0, 100)}…` : proj.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Certificates tab */}
      {activeTab === "certificates" && (
        <>
          {data.certificates.length === 0 ? (
            <Empty text="No certificates issued yet." />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {data.certificates.map((cert) => (
                <a
                  key={cert.id}
                  href={cert.url ?? (cert.verification_code ? `/verify/${cert.verification_code}` : "#")}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: 18,
                    textDecoration: "none",
                    color: C.text,
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: 30 }}>🏅</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{cert.title}</div>
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
                      Issued {fmtDate(cert.issued_at)}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: C.accent, fontWeight: 700 }}>VERIFY →</span>
                </a>
              ))}
            </div>
          )}
        </>
      )}

      {/* About tab */}
      {activeTab === "about" && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
          {data.bio ? (
            <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{data.bio}</p>
          ) : (
            <p style={{ color: C.dim, fontSize: 13, margin: 0 }}>No bio yet.</p>
          )}
          {Object.keys(data.social_links).length > 0 && (
            <div style={{ marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.entries(data.social_links).map(([k, v]) => (
                <a key={k} href={v} target="_blank" rel="noreferrer" style={{ padding: "6px 12px", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 999, fontSize: 12, color: C.accent, textDecoration: "none" }}>
                  {k} →
                </a>
              ))}
            </div>
          )}
          {data.top_badges.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11, color: C.dim, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
                Top Badges
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {data.top_badges.map((b) => (
                  <div key={b.name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 999, fontSize: 12, color: C.text }}>
                    <span>🎖</span> {b.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer CTA */}
      <div style={{ marginTop: 60, textAlign: "center", padding: "30px 24px", background: "linear-gradient(135deg, rgba(77,168,255,0.08), rgba(255,193,7,0.05))", border: `1px solid ${C.border}`, borderRadius: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Want to build a portfolio like this?</div>
        <div style={{ color: C.dim, fontSize: 13, marginTop: 6 }}>
          Join CIOS Intern — earn verified projects, certificates, and a public portfolio recruiters trust.
        </div>
        <Link href="/" style={{ display: "inline-block", marginTop: 16, padding: "11px 24px", background: C.accent, color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
          Join the programme →
        </Link>
      </div>

      {/* Project modal */}
      {selectedProject && (
        <div
          onClick={() => setSelectedProject(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, maxWidth: 560, width: "100%", padding: 28, maxHeight: "85vh", overflowY: "auto" }}
          >
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3, marginBottom: 6 }}>{selectedProject.title}</div>
            {selectedProject.category && <div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>{selectedProject.category}</div>}
            {selectedProject.thumbnail_url && (
              <img src={selectedProject.thumbnail_url} alt="" style={{ width: "100%", borderRadius: 10, marginBottom: 16 }} />
            )}
            {selectedProject.description && (
              <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>{selectedProject.description}</p>
            )}
            {selectedProject.score != null && (
              <div style={{ marginTop: 14, padding: "10px 14px", background: `${C.green}15`, borderRadius: 8, border: `1px solid ${C.green}44` }}>
                <div style={{ fontSize: 11, color: C.green, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Score: {selectedProject.score}/10</div>
                {selectedProject.feedback && <div style={{ fontSize: 13, color: C.text, marginTop: 6, lineHeight: 1.6 }}>{selectedProject.feedback}</div>}
              </div>
            )}
            {selectedProject.artifact_url && (
              <a href={selectedProject.artifact_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 16, padding: "9px 18px", background: C.accent, color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
                View artifact →
              </a>
            )}
            <button onClick={() => setSelectedProject(null)} style={{ marginTop: 16, marginLeft: 10, padding: "9px 18px", background: "transparent", color: C.dim, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, color: C.dim, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ padding: 40, textAlign: "center", color: C.dim, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 14 }}>
      {text}
    </div>
  );
}
