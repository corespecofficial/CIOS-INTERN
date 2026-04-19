"use client";

import type { AlumniBadge } from "@/app/actions/alumni-badge";

const C = {
  bg: "#05070F",
  card: "#0D1220",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.08)",
};

const TIER_COLOR: Record<string, { bg: string; text: string; emoji: string; label: string }> = {
  standard: { bg: "#4DA8FF", text: "#fff", emoji: "🎓", label: "Standard" },
  honours: { bg: "#66BB6A", text: "#000", emoji: "🏅", label: "Honours" },
  distinction: { bg: "#FFC107", text: "#000", emoji: "🏆", label: "Distinction" },
};

interface Props {
  badge: AlumniBadge | null;
  userName: string;
}

export default function AlumniBadgeClient({ badge, userName }: Props) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://cios-intern.vercel.app";

  if (!badge) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "40px 20px", maxWidth: 620, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>🎓 Alumni Verified Badge</h1>
        <p style={{ margin: "8px 0 24px", color: C.dim, fontSize: 14, lineHeight: 1.6 }}>
          You haven&apos;t earned your alumni badge yet. The badge is issued when you complete the CIOS program with a final score of 60+. It lives on your profile forever.
        </p>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>Badge tiers</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(["standard", "honours", "distinction"] as const).map((t) => {
              const tc = TIER_COLOR[t];
              return (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "#0A0E1A", borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                    {tc.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{tc.label}</div>
                    <div style={{ fontSize: 11, color: C.dim }}>
                      {t === "distinction" ? "Score 90+" : t === "honours" ? "Score 75–89" : "Score 60–74"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const tier = TIER_COLOR[badge.tier];
  const verifyUrl = `${origin}/verify-alumni/${badge.verification_code}`;

  function copyLink() {
    navigator.clipboard.writeText(verifyUrl).then(() => alert("Verification link copied"));
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "32px 20px 80px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>Your Alumni Badge</h1>
      <p style={{ margin: "6px 0 24px", color: C.dim, fontSize: 13 }}>Permanent. Globally verifiable. Yours forever.</p>

      {/* Badge card */}
      <div
        style={{
          background: `linear-gradient(155deg, ${tier.bg} 0%, #1a1a2e 70%)`,
          borderRadius: 20,
          padding: 36,
          textAlign: "center",
          color: tier.text,
          position: "relative",
          overflow: "hidden",
          marginBottom: 22,
        }}
      >
        <div style={{ position: "absolute", top: -30, right: -30, width: 180, height: 180, background: "rgba(255,255,255,0.08)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 200, height: 200, background: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 60, marginBottom: 10 }}>{tier.emoji}</div>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", opacity: 0.85, fontWeight: 700 }}>CIOS Verified Alumni</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 800, margin: "12px 0 4px", letterSpacing: -0.5 }}>
            {userName}
          </div>
          <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 600 }}>
            {badge.cohort ? `Cohort ${badge.cohort}` : ""} {badge.cohort && badge.final_score !== null ? "·" : ""} {badge.final_score !== null ? `Final score ${badge.final_score}/100` : ""}
          </div>
          <div style={{ marginTop: 22, display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 18px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>
            {tier.label}
          </div>
          <div style={{ marginTop: 20, fontSize: 10, opacity: 0.7, fontFamily: "monospace", letterSpacing: 1 }}>
            Verify: /verify-alumni/{badge.verification_code.slice(0, 12)}…
          </div>
          <div style={{ marginTop: 6, fontSize: 10, opacity: 0.5 }}>
            Issued {new Date(badge.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      {badge.revoked && (
        <div style={{ padding: 16, background: "rgba(239,83,80,0.12)", border: "1px solid rgba(239,83,80,0.35)", borderRadius: 10, marginBottom: 16, color: "#EF5350", fontSize: 13 }}>
          <strong>⚠ This badge has been revoked.</strong>
          {badge.revoked_reason && <div style={{ marginTop: 4, color: C.text, fontSize: 12 }}>Reason: {badge.revoked_reason}</div>}
        </div>
      )}

      {/* Share actions */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={copyLink} style={{ flex: 1, padding: "12px 18px", background: "#4DA8FF", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
          🔗 Copy Verify Link
        </button>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`}
          target="_blank"
          rel="noreferrer"
          style={{ padding: "12px 18px", background: "transparent", color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: "none", textAlign: "center" }}
        >
          📎 Share to LinkedIn
        </a>
      </div>

      <div style={{ marginTop: 24, padding: "14px 16px", background: "rgba(77,168,255,0.06)", border: "1px solid rgba(77,168,255,0.2)", borderRadius: 10, fontSize: 12, color: C.dim, lineHeight: 1.6 }}>
        💡 <strong style={{ color: C.text }}>This badge lives forever.</strong> Employers can verify it in one click. It&apos;s the credential that turns your internship into a lifetime asset.
      </div>
    </div>
  );
}
