"use client";
/* eslint-disable @next/next/no-img-element */

const LOGO = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

const features = [
  { icon: "📚", title: "Live Classes", desc: "Join real-time sessions with expert instructors" },
  { icon: "🏆", title: "Earn Rewards", desc: "XP, badges, leaderboards, and real cash prizes" },
  { icon: "🤖", title: "AI Copilot", desc: "Personal AI assistant for learning and tasks" },
  { icon: "💰", title: "Wallet System", desc: "Track earnings, fines, and payouts transparently" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "#0A0E1A",
      color: "#E8EDF5",
      fontFamily: "'Nunito', sans-serif",
    }}>
      {/* LEFT SIDE — Brand showcase (hidden on mobile) */}
      <div className="auth-left-panel" style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 48px",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, #0A0E1A 0%, #111827 50%, #0A0E1A 100%)",
      }}>
        {/* Background glows */}
        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(30,136,229,0.12), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-15%", right: "-10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,193,7,0.08), transparent 70%)", pointerEvents: "none" }} />

        {/* Stars */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute", width: 2, height: 2, background: "#fff", borderRadius: "50%",
            left: `${(i * 37 + 13) % 100}%`, top: `${(i * 53 + 7) % 100}%`,
            opacity: 0.08 + (i % 5) * 0.06,
            animation: `pulse ${2 + (i % 4)}s ease-in-out infinite ${(i % 7) * 0.5}s`,
          }} />
        ))}

        {/* Content */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 460, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <img
            src={LOGO}
            alt="CIOS Mascot"
            width={140}
            height={140}
            style={{
              display: "block",
              margin: "0 auto 32px",
              borderRadius: "50%",
              animation: "float 3.5s ease-in-out infinite",
              filter: "drop-shadow(0 20px 50px rgba(30,136,229,0.45))",
            }}
          />
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 36,
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: 12,
          }}>
            Welcome to{" "}
            <span style={{
              background: "linear-gradient(135deg, #1E88E5, #42A5F5, #FFC107)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>CIOS</span>
          </h1>
          <p style={{ fontSize: 16, color: "#8892A4", lineHeight: 1.7, marginBottom: 40 }}>
            The complete AI-powered internship operating system by COSPRONOS Media × Corespec Engineering.
          </p>

          {/* Feature highlights */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "left" }}>
            {features.map((f) => (
              <div key={f.title} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 18px", borderRadius: 14,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(30,136,229,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, flexShrink: 0,
                }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: "#8892A4" }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 11, color: "#5A6478", marginTop: 32 }}>
            Trusted by 120+ interns across Africa
          </p>
        </div>
      </div>

      {/* RIGHT SIDE — Auth form (Clerk) */}
      <div style={{
        width: 520,
        minWidth: 420,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 32px",
        background: "#111827",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
      }}>
        {children}
      </div>

      {/* Responsive: hide left panel on mobile */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
        @media (max-width: 900px) {
          .auth-left-panel { display: none !important; }
          div[style*="width: 520"] {
            width: 100% !important;
            min-width: unset !important;
            border-left: none !important;
          }
        }
      `}</style>
    </div>
  );
}
