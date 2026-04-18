"use client";

/* eslint-disable @next/next/no-img-element */

import { useIsMobile } from "@/hooks/use-is-mobile";

const COVENANT_LINES = [
  "I will show up, even when inconvenient.",
  "I will submit assignments on time because my name is on them.",
  "I will not bribe my growth with a fine.",
  "I will be sincere in learning, dedicated in effort, sacrificial in commitment.",
  "I will be disciplined — not because someone watches, but because I am becoming.",
  "I will look up. And when I see the sky, I will answer it.",
];

interface Signatory {
  id: string;
  full_name: string;
  track: string | null;
  avatar_url: string | null;
  signature_name: string;
  signed_at: string;
}

interface Props {
  signatories: Signatory[];
}

export function CovenantWallClient({ signatories }: Props) {
  const isMobile = useIsMobile();
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "0 0 40px" : undefined }}>
      {/* Hero */}
      <div style={{
        textAlign: "center", marginBottom: 32,
        background: "linear-gradient(135deg, rgba(255,193,7,0.07) 0%, rgba(30,136,229,0.05) 100%)",
        border: "1px solid rgba(255,193,7,0.15)", borderRadius: 16, padding: isMobile ? "24px 16px" : "36px 24px",
      }}>
        <div style={{ fontSize: isMobile ? 40 : 52, marginBottom: 8 }}>🦅</div>
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 800, color: "#E8EDF5" }}>The Eagle Covenant Wall</h1>
        <p style={{ margin: "10px 0 0", color: "#9CA3AF", fontSize: 15 }}>
          Every name here is an eagle that looked up.
        </p>
        <div style={{ margin: "20px auto 0", maxWidth: 520, background: "rgba(255,193,7,0.06)", borderRadius: 10, padding: isMobile ? "12px 14px" : "16px 20px", textAlign: "left" }}>
          {COVENANT_LINES.map((line, i) => (
            <p key={i} style={{ margin: "0 0 6px", color: "#B0BEC5", fontSize: 13, lineHeight: 1.7, fontStyle: "italic" }}>
              &ldquo;{line}&rdquo;
            </p>
          ))}
        </div>
        <p style={{ margin: "12px 0 0", color: "#5A6478", fontSize: 12 }}>
          {signatories.length} intern{signatories.length !== 1 ? "s" : ""} have signed this covenant
        </p>
      </div>

      {signatories.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#5A6478" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🪶</div>
          <p>No signatures yet. Be the first to sign the covenant.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {signatories.map((s, idx) => (
            <div
              key={s.id}
              style={{
                background: "#131929",
                border: "1px solid rgba(255,193,7,0.12)",
                borderRadius: 12, padding: "18px 20px",
                position: "relative", overflow: "hidden",
              }}
            >
              {/* subtle background number */}
              <span style={{
                position: "absolute", top: 8, right: 14,
                fontSize: 48, fontWeight: 900, color: "rgba(255,255,255,0.03)",
                pointerEvents: "none",
              }}>{idx + 1}</span>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                {s.avatar_url ? (
                  <img src={s.avatar_url} alt={s.full_name} width={40} height={40}
                    style={{ borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,193,7,0.3)" }} />
                ) : (
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "linear-gradient(135deg,#1E88E5,#FFC107)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#0A0E1A", fontWeight: 800, fontSize: 16,
                  }}>
                    {s.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ color: "#E8EDF5", fontWeight: 700, fontSize: 14 }}>{s.full_name}</div>
                  {s.track && <div style={{ color: "#5A6478", fontSize: 12 }}>{s.track}</div>}
                </div>
              </div>

              <div style={{
                fontFamily: "Georgia, serif", fontSize: 15, color: "#FFC107",
                fontStyle: "italic", marginBottom: 10, lineHeight: 1.4,
                borderLeft: "2px solid rgba(255,193,7,0.3)", paddingLeft: 10,
              }}>
                {s.signature_name}
              </div>

              <div style={{ color: "#5A6478", fontSize: 11 }}>
                Signed {new Date(s.signed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
