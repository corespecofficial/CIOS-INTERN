/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";

interface Profile {
  user_id: string;
  company_name?: string;
  company_website?: string;
  company_logo_url?: string;
  banner_url?: string;
  industry?: string;
  company_size?: string;
  about?: string;
  verified?: boolean;
  hires_count?: number;
  rating?: number;
  plan_tier?: string;
  country?: string;
  office_address?: string;
  year_founded?: number;
  user?: { id: string; name: string; avatar_url: string | null } | Array<{ id: string; name: string; avatar_url: string | null }>;
}

interface Listing {
  id: string;
  title: string;
  kind: string;
  location: string | null;
  remote: boolean;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  applications_count: number;
  created_at: string;
  cover_image_url?: string | null;
}

const ACCENT = "#FB923C";
const INK = "var(--text-primary, #F8FAFC)";
const DIM = "var(--text-tertiary, #94A3B8)";
const MUTED = "var(--text-muted, #64748B)";

export function RecruiterPublicClient({ profile, listings }: { profile: Profile; listings: Listing[] }) {
  const company = profile.company_name || "CIOS Recruiter";

  return (
    <div style={{ width: "100%" }}>
      <div
        className="rp-cover"
        style={{
          height: 220,
          background: profile.banner_url
            ? `linear-gradient(180deg, rgba(10,14,26,0.3), rgba(10,14,26,0.9)), url(${profile.banner_url}) center/cover no-repeat`
            : `radial-gradient(900px 280px at 20% 0%, rgba(251,146,60,0.25), transparent 60%), radial-gradient(800px 280px at 80% 20%, rgba(239,68,68,0.16), transparent 60%), #0F172A`,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      />

      <div style={{ maxWidth: 1080, margin: "-90px auto 0", padding: "0 20px 60px", position: "relative", zIndex: 1 }}>
        <Link href="/opportunities" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 14px", borderRadius: 999,
          background: "rgba(10,14,26,0.7)", backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.1)", color: DIM,
          fontSize: 12, fontWeight: 700, textDecoration: "none", marginBottom: 16,
        }}>
          ← Opportunities
        </Link>

        {/* Identity */}
        <div style={{
          padding: 24,
          background: "rgba(255,255,255,0.035)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 20,
          display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap",
          marginBottom: 22,
        }}>
          {profile.company_logo_url ? (
            <img src={profile.company_logo_url} alt={company} style={{ width: 80, height: 80, borderRadius: 16, objectFit: "cover", border: `2px solid rgba(251,146,60,0.35)`, flexShrink: 0, background: "#0F172A" }} />
          ) : (
            <span style={{ width: 80, height: 80, borderRadius: 16, background: `linear-gradient(135deg, ${ACCENT}, #EF4444)`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
              {company.charAt(0).toUpperCase()}
            </span>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: INK, letterSpacing: -0.6, fontFamily: "'Space Grotesk', 'Nunito', sans-serif" }}>
              {company}
            </h1>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {profile.verified && <span style={pill("#60A5FA")}>✓ CIOS-verified</span>}
              {profile.industry && <span style={pill(DIM)}>{profile.industry}</span>}
              {profile.company_size && <span style={pill(DIM)}>{profile.company_size} team</span>}
              {profile.country && <span style={pill(DIM)}>📍 {profile.country}</span>}
              {profile.plan_tier && profile.plan_tier !== "free" && <span style={pill("#FBBF24")}>{profile.plan_tier.toUpperCase()}</span>}
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: MUTED }}>
              {typeof profile.hires_count === "number" && profile.hires_count > 0 && <span>{profile.hires_count} CIOS hires · </span>}
              {typeof profile.rating === "number" && profile.rating > 0 && <span>★ {profile.rating.toFixed(1)} · </span>}
              {listings.length} open role{listings.length === 1 ? "" : "s"}
            </div>
          </div>
          {profile.company_website && (
            <a href={profile.company_website} target="_blank" rel="noopener noreferrer" style={{
              padding: "10px 18px",
              borderRadius: 12,
              background: "rgba(251,146,60,0.14)",
              color: ACCENT,
              border: "1px solid rgba(251,146,60,0.32)",
              fontSize: 13, fontWeight: 800, textDecoration: "none",
            }}>
              Website ↗
            </a>
          )}
        </div>

        {profile.about && (
          <div style={{ padding: 22, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, marginBottom: 22 }}>
            <p style={{ margin: 0, fontSize: 14, color: INK, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{profile.about}</p>
          </div>
        )}

        <h2 style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontWeight: 800, color: MUTED, margin: "0 0 14px" }}>
          Open roles
        </h2>
        {listings.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16, color: DIM }}>
            No open roles right now. Follow on{" "}
            {profile.company_website ? (
              <a href={profile.company_website} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none", fontWeight: 700 }}>their website</a>
            ) : "CIOS"} for updates.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {listings.map((l) => (
              <Link key={l.id} href={`/opportunities/${l.id}`} style={{
                display: "block", padding: 18,
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14,
                textDecoration: "none", color: "inherit",
              }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  <span style={pill(ACCENT)}>{l.kind}</span>
                  {l.remote && <span style={pill("#34D399")}>Remote</span>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: INK, letterSpacing: -0.2, marginBottom: 6 }}>{l.title}</div>
                <div style={{ fontSize: 12, color: MUTED, display: "flex", justifyContent: "space-between" }}>
                  <span>{l.location || "Anywhere"}</span>
                  <span>{l.applications_count} applicants</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .rp-cover { height: 150px !important; }
        }
      `}</style>
    </div>
  );
}

function pill(color: string): React.CSSProperties {
  return { padding: "3px 10px", fontSize: 10, letterSpacing: 0.8, fontWeight: 800, textTransform: "uppercase", background: `${color}22`, color, border: `1px solid ${color}55`, borderRadius: 999, whiteSpace: "nowrap" };
}
