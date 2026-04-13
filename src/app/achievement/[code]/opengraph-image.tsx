import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "CIOS achievement";

/**
 * Achievement card generator.
 *
 * URL format:  /achievement/[code]/opengraph-image
 * code is base64url-encoded JSON: { name, body, emoji, xp, user }
 *
 * Example payload encoded:
 *   const payload = { name: "Adaeze Okonkwo", body: "First Course Completed", emoji: "🎓", xp: 250 };
 *   const code = btoa(JSON.stringify(payload)).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
 */
function decodePayload(code: string) {
  try {
    const padded = code.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((code.length + 3) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf-8")) as { name?: string; body?: string; emoji?: string; xp?: number };
  } catch { return null; }
}

export default function Image({ params }: { params: { code: string } }) {
  const payload = decodePayload(params.code) || { name: "CIOS Intern", body: "Achievement unlocked", emoji: "🏆", xp: 0 };
  const name = (payload.name || "CIOS Intern").slice(0, 40);
  const body = (payload.body || "Achievement unlocked").slice(0, 60);
  const emoji = payload.emoji || "🏆";
  const xp = payload.xp || 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%",
          background: "linear-gradient(135deg, #0A0E1A 0%, #111827 50%, #1565C0 130%)",
          color: "#E8EDF5", fontFamily: "system-ui, sans-serif",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 70,
        }}
      >
        {/* Top tag */}
        <div style={{ fontSize: 22, color: "#FFC107", fontWeight: 700, letterSpacing: 5, marginBottom: 20 }}>
          🏆  ACHIEVEMENT UNLOCKED
        </div>

        {/* Big emoji */}
        <div style={{ fontSize: 180, lineHeight: 1, marginBottom: 14 }}>{emoji}</div>

        {/* Achievement title */}
        <div style={{ fontSize: 60, fontWeight: 900, color: "#fff", textAlign: "center", lineHeight: 1.1, marginBottom: 14, letterSpacing: -1 }}>
          {body}
        </div>

        {/* User name + XP pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
          <div style={{ fontSize: 28, color: "#B0BEC5", fontWeight: 600 }}>by {name}</div>
          {xp > 0 && (
            <div style={{ padding: "10px 22px", background: "rgba(255,193,7,0.18)", color: "#FFC107", fontSize: 24, fontWeight: 800, borderRadius: 99 }}>
              +{xp.toLocaleString()} XP
            </div>
          )}
        </div>

        {/* Footer brand */}
        <div style={{ position: "absolute", bottom: 30, fontSize: 18, color: "#5A6478", letterSpacing: 3 }}>
          CIOS · COSPRONOS MEDIA × CORESPEC
        </div>
      </div>
    ),
    size,
  );
}
