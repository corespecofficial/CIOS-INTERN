/* eslint-disable @next/next/no-img-element */
import { getReferrerByCode } from "@/app/actions/referrals";
import { redirect } from "next/navigation";

interface Props {
  searchParams: { ref?: string };
}

export default async function JoinPage({ searchParams }: Props) {
  const code = searchParams.ref?.trim().toUpperCase();

  // No code → send to normal sign-up
  if (!code) redirect("/sign-up");

  const referrer = await getReferrerByCode(code);

  // Invalid code → send to sign-up without ref (but don't 404)
  const signUpUrl = referrer ? `/sign-up?ref=${encodeURIComponent(code)}` : "/sign-up";

  const LOGO = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      {/* Referral welcome card */}
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "linear-gradient(135deg, rgba(30,136,229,0.12), rgba(255,193,7,0.08))",
        border: "1px solid rgba(30,136,229,0.3)",
        borderRadius: 20,
        padding: "28px 24px",
        textAlign: "center",
        marginBottom: 20,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Glow */}
        <div style={{ position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(30,136,229,0.2), transparent 70%)", pointerEvents: "none" }} />

        {/* Avatars */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 0, marginBottom: 16, position: "relative", zIndex: 1 }}>
          {/* Referrer avatar */}
          <div style={{ position: "relative" }}>
            <img
              src={referrer?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(referrer?.name || "C")}&background=1E88E5&color=fff&size=64`}
              alt={referrer?.name}
              style={{ width: 64, height: 64, borderRadius: "50%", border: "3px solid #1E88E5", objectFit: "cover" }}
            />
            <div style={{ position: "absolute", bottom: -2, right: -2, width: 18, height: 18, background: "#4CAF50", borderRadius: "50%", border: "2px solid #111827", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>✓</div>
          </div>

          {/* Connection line */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, margin: "0 -4px" }}>
            <div style={{ width: 16, height: 2, background: "linear-gradient(90deg, #1E88E5, #FFC107)" }} />
            <div style={{ fontSize: 16 }}>🤝</div>
            <div style={{ width: 16, height: 2, background: "linear-gradient(90deg, #FFC107, #1E88E5)" }} />
          </div>

          {/* New user avatar placeholder */}
          <div style={{ position: "relative" }}>
            <img
              src={LOGO}
              alt="You"
              style={{ width: 64, height: 64, borderRadius: "50%", border: "3px solid #FFC107", objectFit: "cover" }}
            />
            <div style={{ position: "absolute", bottom: -2, right: -2, width: 18, height: 18, background: "#FFC107", borderRadius: "50%", border: "2px solid #111827", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>?</div>
          </div>
        </div>

        {/* Message */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "#1E88E5", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, position: "relative", zIndex: 1 }}>
          Personal Invitation
        </div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, color: "#E8EDF5", marginBottom: 6, lineHeight: 1.3, position: "relative", zIndex: 1 }}>
          {referrer ? (
            <>You were invited by<br /><span style={{ color: "#FFC107" }}>{referrer.name}</span></>
          ) : (
            <>Welcome to <span style={{ color: "#1E88E5" }}>CIOS</span>!</>
          )}
        </h2>
        <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.6, marginBottom: 20, position: "relative", zIndex: 1 }}>
          {referrer
            ? `${referrer.name} thinks you'd be a great fit for the CIOS internship program. Join now and both of you earn rewards!`
            : "Join the CIOS AI Internship Program and start your journey."}
        </p>

        {/* Reward badges */}
        {referrer && (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 20, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, background: "rgba(76,175,80,0.15)", border: "1px solid rgba(76,175,80,0.3)" }}>
              <span style={{ fontSize: 14 }}>⚡</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#81C784" }}>You get +100 XP</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, background: "rgba(255,193,7,0.12)", border: "1px solid rgba(255,193,7,0.3)" }}>
              <span style={{ fontSize: 14 }}>🏆</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#FFD54F" }}>{referrer.name.split(" ")[0]} gets +500 XP</span>
            </div>
          </div>
        )}

        {/* CTA button */}
        <a
          href={signUpUrl}
          style={{
            display: "block",
            width: "100%",
            padding: "13px 0",
            borderRadius: 12,
            background: "linear-gradient(135deg, #1E88E5, #1565C0)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 800,
            textAlign: "center",
            textDecoration: "none",
            boxShadow: "0 4px 20px rgba(30,136,229,0.35)",
            letterSpacing: 0.3,
            position: "relative",
            zIndex: 1,
          }}
        >
          Create Account &amp; Claim Reward
        </a>
      </div>

      {/* Referral code badge */}
      {referrer && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: "#5A6478", fontWeight: 600 }}>Referral code:</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#E8EDF5", letterSpacing: 1 }}>{code}</span>
        </div>
      )}

      {/* Sign in link */}
      <p style={{ fontSize: 12, color: "#5A6478", textAlign: "center" }}>
        Already have an account?{" "}
        <a href="/sign-in" style={{ color: "#1E88E5", fontWeight: 600, textDecoration: "none" }}>Sign In</a>
      </p>

      {/* CIOS branding */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20, opacity: 0.4 }}>
        <img src={LOGO} alt="CIOS" style={{ width: 24, height: 24, borderRadius: "50%" }} />
        <span style={{ fontSize: 11, color: "#8892A4", fontWeight: 600 }}>Powered by CIOS Internship Platform</span>
      </div>
    </div>
  );
}
