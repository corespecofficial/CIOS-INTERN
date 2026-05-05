import Link from "next/link";
import type { Metadata } from "next";
import { Icon3D } from "@/components/marketing/icon3d";

export const metadata: Metadata = { title: "For Recruiters · CIOS", description: "Hire verified African talent through the COSPRONOS Internship Platform." };

const BENEFITS = [
  { icon: "trophy", title: "Trained, not just talented", desc: "Every intern completes a structured 6-month program with measurable milestones." },
  { icon: "chart", title: "Evidence-backed profiles", desc: "Real performance scores from tasks, attendance, peer reviews — updated daily." },
  { icon: "robot", title: "AI skill-matching", desc: "Every applicant is scored against your job requirements automatically." },
  { icon: "lightning", title: "Fast, honest hiring", desc: "Average time-to-hire under 2 weeks. Messaging, interviews, contracts in-platform." },
  { icon: "chat", title: "Direct communication", desc: "Real-time chat with candidates — no recruiter middlemen." },
  { icon: "shield", title: "Verified companies only", desc: "Every recruiter is manually approved. No scam postings. No fake jobs." },
];

const STEPS = [
  { icon: "memo", title: "Apply", desc: "Submit the Contact Us form with your company details." },
  { icon: "shield", title: "Get verified", desc: "Our team reviews your company within 1–2 days." },
  { icon: "briefcase", title: "Post opportunities", desc: "Share jobs, gigs, internships, or scholarships." },
  { icon: "trophy", title: "Hire the best", desc: "Review AI-ranked applicants, interview, hire." },
];

export default function RecruitersPage() {
  return (
    <div>
      {/* Hero */}
      <section style={{ padding: "80px 20px 50px", textAlign: "center", maxWidth: 1000, margin: "0 auto" }}>
        <Icon3D name="office" size={100} />
        <div>
          <span style={{ display: "inline-block", padding: "4px 12px", background: "rgba(255,112,67,0.15)", color: "#FF7043", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 1, marginTop: 12 }}>FOR COMPANIES & RECRUITERS</span>
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 56, fontWeight: 800, color: "#E8EDF5", margin: "14px 0 16px 0", lineHeight: 1.05, letterSpacing: -1 }}>Hire verified African talent in days, not months.</h1>
        <p style={{ fontSize: 18, color: "#8892A4", maxWidth: 660, margin: "0 auto 28px", lineHeight: 1.6 }}>
          Every candidate on CIOS has a public performance record. Real projects, real attendance, real skills — not a polished CV.
        </p>
        <Link href="/contact?category=recruiter" style={primaryBtn}>📨 Apply for recruiter access →</Link>
        <p style={{ fontSize: 11, color: "#5A6478", marginTop: 14 }}>Access is invitation-only. We approve legitimate companies within 1–2 business days.</p>
      </section>

      {/* ROI Stats Strip */}
      <section style={{ padding: "20px 20px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <RoiStat icon="lightning" value="14 days" label="Avg time to hire" />
          <RoiStat icon="money" value="70%" label="Lower hiring cost" />
          <RoiStat icon="chart" value="3.2×" label="Faster than traditional" />
          <RoiStat icon="trophy" value="97%" label="Placement success" />
        </div>
      </section>

      {/* Benefits */}
      <section style={{ padding: "60px 20px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>Why companies hire through CIOS</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
          {BENEFITS.map((b) => (
            <div key={b.title} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 24, transition: "transform 0.2s, border-color 0.2s" }}>
              <Icon3D name={b.icon} size={56} />
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 800, color: "#E8EDF5", margin: "10px 0 6px 0" }}>{b.title}</h3>
              <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.6, margin: 0 }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "40px 20px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 800, color: "#E8EDF5", margin: "0 0 40px 0" }}>How it works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {STEPS.map((s, i) => (
            <div key={s.title} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 22, position: "relative" }}>
              <div style={{ position: "absolute", top: 12, right: 14, fontSize: 44, fontWeight: 900, color: "rgba(30,136,229,0.12)", fontFamily: "'Space Grotesk', sans-serif" }}>{i + 1}</div>
              <Icon3D name={s.icon} size={54} />
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5", margin: "8px 0 4px 0" }}>{s.title}</h3>
              <p style={{ fontSize: 12, color: "#8892A4", lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section style={{ padding: "60px 20px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: "#E8EDF5", margin: "0 0 24px 0" }}>CIOS vs traditional hiring</h2>
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
          <CompareRow col1="Metric" col2="Traditional recruiting" col3="CIOS" header />
          <CompareRow col1="Time to first hire" col2="45+ days" col3="14 days" />
          <CompareRow col1="Cost per hire" col2="$1,500–$8,000" col3="$99–$299/mo flat" />
          <CompareRow col1="Candidate evidence" col2="Resume + interview" col3="Verified performance record" />
          <CompareRow col1="Skill matching" col2="Keyword search" col3="AI-ranked match score" />
          <CompareRow col1="Scam risk" col2="High" col3="Zero — all companies verified" />
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "60px 20px 40px", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
        <Icon3D name="handshake" size={72} />
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 800, color: "#E8EDF5", margin: "10px 0 12px 0" }}>Ready to meet your next hire?</h2>
        <p style={{ fontSize: 15, color: "#8892A4", marginBottom: 22 }}>Access is invitation-only. Apply in under 2 minutes.</p>
        <Link href="/contact?category=recruiter" style={primaryBtn}>Apply for recruiter access →</Link>
      </section>
    </div>
  );
}

function RoiStat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#111827", border: "1px solid rgba(30,136,229,0.15)", borderRadius: 14, padding: 14 }}>
      <Icon3D name={icon} size={44} />
      <div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, color: "#FF7043" }}>{value}</div>
        <div style={{ fontSize: 11, color: "#8892A4", letterSpacing: 0.3 }}>{label}</div>
      </div>
    </div>
  );
}

function CompareRow({ col1, col2, col3, header }: { col1: string; col2: string; col3: string; header?: boolean }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
      padding: "14px 18px",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      background: header ? "rgba(30,136,229,0.08)" : "transparent",
      fontSize: 13,
    }}>
      <div style={{ color: "#8892A4", fontWeight: header ? 700 : 400 }}>{col1}</div>
      <div style={{ color: "#EF5350" }}>{header ? col2 : `❌ ${col2}`}</div>
      <div style={{ color: "#66BB6A", fontWeight: header ? 700 : 600 }}>{header ? col3 : `✓ ${col3}`}</div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = { display: "inline-block", padding: "14px 32px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: "none" };
