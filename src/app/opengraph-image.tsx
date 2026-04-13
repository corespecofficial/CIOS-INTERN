import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "CIOS — AI-powered internship operating system";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, #0A0E1A 0%, #111827 60%, #1E88E5 140%)",
          color: "#E8EDF5", fontFamily: "system-ui, sans-serif", padding: 80,
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 700, color: "#26C6DA", letterSpacing: 4, marginBottom: 24 }}>
          COSPRONOS × CORESPEC
        </div>
        <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: -2, lineHeight: 1.05, textAlign: "center", marginBottom: 22 }}>
          CIOS
        </div>
        <div style={{ fontSize: 38, fontWeight: 700, color: "#E8EDF5", textAlign: "center", lineHeight: 1.2, marginBottom: 16 }}>
          The AI-powered internship operating system
        </div>
        <div style={{ fontSize: 22, color: "#8892A4", textAlign: "center" }}>
          Learn · Perform · Earn — 6 months · real projects · verified talent
        </div>
      </div>
    ),
    size,
  );
}
