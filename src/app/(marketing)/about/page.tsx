import type { Metadata } from "next";
import Link from "next/link";
import { Icon3D } from "@/components/marketing/icon3d";

export const metadata: Metadata = { title: "About · CIOS", description: "Our story, mission, and values." };

const MILESTONES = [
  { year: "Feb 2025", title: "COSPRONOS Media founded", desc: "Joshua Agbo launches COSPRONOS as a multi-brand AI + media house." },
  { year: "2025", title: "First CIOS cohort", desc: "The inaugural cohort begins the structured 6-month AI internship program." },
  { year: "Early 2026", title: "Partnership with Corespec Engineering Limited", desc: "COSPRONOS Media × Corespec — engineering backbone powering the CIOS platform." },
  { year: "2026", title: "CIOS Platform launches publicly", desc: "Every internship workflow — courses, tasks, hiring — on one OS." },
  { year: "Next", title: "Pan-African expansion", desc: "Kenya, Ghana, South Africa cohorts planned. Opening recruiter marketplace." },
];

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "60px 20px" }}>
      {/* Hero */}
      <section style={{ textAlign: "center", marginBottom: 48 }}>
        <Icon3D name="globe" size={96} />
        <div>
          <span style={{ display: "inline-block", padding: "4px 12px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 1, marginTop: 12 }}>OUR STORY</span>
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 800, color: "#E8EDF5", margin: "14px 0 10px 0", lineHeight: 1.1 }}>Operating system for the next generation of African talent</h1>
        <p style={{ fontSize: 17, color: "#8892A4", maxWidth: 640, margin: "0 auto", lineHeight: 1.6 }}>
          CIOS is the platform powering the COSPRONOS Internship Program — where ambitious learners train, build real projects, and get hired by verified companies worldwide.
        </p>
      </section>

      {/* Stats */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 48 }}>
        <Stat icon="people" value="500+" label="Interns trained" />
        <Stat icon="trophy" value="97%" label="Placement rate" />
        <Stat icon="globe" value="12" label="Countries" />
        <Stat icon="handshake" value="80+" label="Hiring partners" />
      </section>

      {/* Mission/Vision */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 48 }} className="cios-two-col">
        <Pillar icon="target" title="Mission" desc="Build the most trusted, end-to-end talent pipeline between African interns and global opportunities." />
        <Pillar icon="eye" title="Vision" desc="Where hiring is based on proven skills, real performance, and verified history — not résumé theater." />
      </section>

      {/* Values */}
      <section style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: 32, marginBottom: 48 }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: "0 0 20px 0", textAlign: "center" }}>What we value</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18 }}>
          <Value icon="shield" label="Verified, not vague" />
          <Value icon="brain" label="Evidence over noise" />
          <Value icon="globe" label="Global by default" />
          <Value icon="handshake" label="Fair hiring, always" />
          <Value icon="chart" label="Real measurable growth" />
          <Value icon="lightning" label="Speed with integrity" />
        </div>
      </section>

      {/* Timeline */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: "#E8EDF5", textAlign: "center", margin: "0 0 28px 0" }}>Our journey</h2>
        <div style={{ position: "relative", paddingLeft: 30, borderLeft: "2px dashed rgba(30,136,229,0.25)", maxWidth: 680, margin: "0 auto" }}>
          {MILESTONES.map((m, i) => (
            <div key={i} style={{ position: "relative", paddingBottom: 24 }}>
              <div style={{ position: "absolute", left: -40, top: 4, width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg, #1E88E5, #1565C0)", border: "3px solid #0A0E1A", boxShadow: "0 0 0 2px rgba(30,136,229,0.4)" }} />
              <div style={{ fontSize: 11, color: "#1E88E5", fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>{m.year}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#E8EDF5", margin: "2px 0" }}>{m.title}</div>
              <div style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.6 }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Founder */}
      <section style={{ background: "linear-gradient(135deg, rgba(30,136,229,0.1), rgba(171,71,188,0.05))", border: "1px solid rgba(30,136,229,0.25)", borderRadius: 18, padding: 32, marginBottom: 32, display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <Icon3D name="rocket" size={72} />
        <div style={{ flex: 1, minWidth: 250 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "0 0 10px 0" }}>Built by COSPRONOS Media × Corespec</h2>
          <p style={{ fontSize: 14, color: "#E8EDF5", lineHeight: 1.7, margin: 0 }}>
            Founded by <strong>Joshua Agbo</strong>, CIOS is the in-house platform operating the COSPRONOS AI internship program —
            designed to put structure, measurement, and dignity at the centre of junior-talent training and hiring. Every feature you see is used by our own interns every day.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: "center" }}>
        <Icon3D name="sparkles" size={56} />
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: "#E8EDF5", margin: "8px 0" }}>Be part of what's next</h2>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
          <Link href="/contact?category=intern" style={btnPrimary}>Join as intern</Link>
          <Link href="/contact?category=recruiter" style={btnGhost}>Apply to hire</Link>
          <Link href="/contact?category=investor" style={btnGhost}>Investor inquiry</Link>
        </div>
      </section>

      <style>{`@media (max-width: 720px) { .cios-two-col { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18, textAlign: "center" }}>
      <Icon3D name={icon} size={44} />
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: "#1E88E5", marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}
function Pillar({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 26 }}>
      <Icon3D name={icon} size={56} />
      <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 800, color: "#E8EDF5", margin: "10px 0 8px 0" }}>{title}</h3>
      <p style={{ fontSize: 14, color: "#8892A4", lineHeight: 1.6, margin: 0 }}>{desc}</p>
    </div>
  );
}
function Value({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Icon3D name={icon} size={42} />
      <span style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{label}</span>
    </div>
  );
}

const btnPrimary: React.CSSProperties = { display: "inline-block", padding: "11px 24px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none" };
const btnGhost: React.CSSProperties = { display: "inline-block", padding: "11px 22px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none" };
