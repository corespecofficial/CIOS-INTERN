import { notFound } from "next/navigation";
import { verifyAlumniBadge } from "@/app/actions/alumni-badge";

export const dynamic = "force-dynamic";

const TIER_COLOR: Record<string, { bg: string; emoji: string; label: string }> = {
  standard: { bg: "#4DA8FF", emoji: "🎓", label: "Standard" },
  honours: { bg: "#66BB6A", emoji: "🏅", label: "Honours" },
  distinction: { bg: "#FFC107", emoji: "🏆", label: "Distinction" },
};

export default async function VerifyAlumniPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const res = await verifyAlumniBadge(code);
  if (!res.ok || !res.data) notFound();
  const b = res.data;
  const tier = TIER_COLOR[b.tier];

  return (
    <div style={{ maxWidth: 580, margin: "60px auto", padding: "0 20px", color: "#E8EDF5", textAlign: "center" }}>
      {b.revoked ? (
        <div style={{ padding: 40, background: "rgba(239,83,80,0.12)", border: "1px solid rgba(239,83,80,0.35)", borderRadius: 16 }}>
          <div style={{ fontSize: 50 }}>⚠</div>
          <h1 style={{ color: "#EF5350", fontSize: 22 }}>Badge Revoked</h1>
          <p style={{ color: "#8892A4", fontSize: 13 }}>
            This alumni badge has been revoked and is no longer valid.
            {b.revoked_reason && <><br />Reason: {b.revoked_reason}</>}
          </p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "inline-block", padding: "5px 14px", background: "rgba(102,187,106,0.12)", border: "1px solid rgba(102,187,106,0.3)", color: "#66BB6A", fontSize: 11, fontWeight: 800, letterSpacing: 2, borderRadius: 999, textTransform: "uppercase" }}>
              ✓ Verified Badge
            </div>
          </div>
          <div
            style={{
              background: `linear-gradient(155deg, ${tier.bg}, #1a1a2e 70%)`,
              borderRadius: 20,
              padding: 40,
              color: "#fff",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ fontSize: 60, marginBottom: 10 }}>{tier.emoji}</div>
            <div style={{ fontSize: 10, letterSpacing: 3, opacity: 0.85, textTransform: "uppercase", fontWeight: 700 }}>CIOS Verified Alumni</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 800, margin: "14px 0 4px", letterSpacing: -0.5 }}>
              {b.user_name ?? "Alumni"}
            </div>
            <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 600 }}>
              {b.cohort ? `Cohort ${b.cohort}` : ""} {b.cohort && b.final_score !== null ? "·" : ""} {b.final_score !== null ? `Final score ${b.final_score}/100` : ""}
            </div>
            <div style={{ marginTop: 22, display: "inline-flex", padding: "6px 16px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>
              {tier.label}
            </div>
            <div style={{ marginTop: 16, fontSize: 11, opacity: 0.55 }}>
              Issued {new Date(b.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
          <p style={{ color: "#8892A4", fontSize: 13, marginTop: 24, lineHeight: 1.7 }}>
            This badge is cryptographically verified. The holder completed the CIOS Intern Programme at the {tier.label} level.
          </p>
          <a href="/" style={{ display: "inline-block", marginTop: 20, padding: "11px 22px", background: "#4DA8FF", color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
            Learn about CIOS →
          </a>
        </>
      )}
    </div>
  );
}
