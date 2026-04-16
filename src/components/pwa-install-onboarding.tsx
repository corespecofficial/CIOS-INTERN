"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "cios-install-onboarding-v1";
const DISMISS_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

const LOGO =
  "https://res.cloudinary.com/detsk6uql/image/upload/w_120,h_120,c_fill,r_max,f_png,q_auto/v1775646964/Adobe_Express_-_file_lydnbc.png";

type Platform = "android" | "ios";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    setMobile(
      /android|iphone|ipad|ipod/i.test(navigator.userAgent) ||
        window.innerWidth < 768
    );
  }, []);
  return mobile;
}

function isAlreadyInstalled() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    !!(window.navigator as { standalone?: boolean }).standalone
  );
}

function wasDismissedRecently() {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    return !!ts && Date.now() - parseInt(ts) < DISMISS_TTL;
  } catch {
    return false;
  }
}

/* ── iOS step-by-step guide ─────────────────────────── */
function IOSGuide({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      emoji: "1️⃣",
      title: "Tap the Share button",
      desc: 'Look for the square with an arrow pointing up at the bottom of your Safari browser.',
      visual: (
        <div style={{ position: "relative", margin: "0 auto", width: 280 }}>
          {/* Fake Safari toolbar */}
          <div style={{
            background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <span style={{ fontSize: 12, color: "#8892A4", fontFamily: "monospace" }}>cios-intern.vercel.app</span>
            {/* Share icon highlighted */}
            <div style={{
              width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center",
              justifyContent: "center", background: "rgba(30,136,229,0.25)",
              border: "2px solid #1E88E5", animation: "pulse 1.4s infinite",
            }}>
              <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
                <path d="M8 1v11M4 5l4-4 4 4" stroke="#1E88E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1 13v3a1 1 0 001 1h12a1 1 0 001-1v-3" stroke="#1E88E5" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          {/* Arrow pointing to share button */}
          <div style={{
            position: "absolute", top: -34, right: 8,
            animation: "bounce 1.2s infinite",
          }}>
            <div style={{ fontSize: 28, transform: "rotate(180deg)" }}>☝️</div>
          </div>
        </div>
      ),
    },
    {
      emoji: "2️⃣",
      title: 'Tap "Add to Home Screen"',
      desc: "Scroll down in the share sheet until you see this option, then tap it.",
      visual: (
        <div style={{ width: 280, margin: "0 auto" }}>
          {/* Fake share sheet row */}
          <div style={{
            background: "rgba(255,255,255,0.06)", borderRadius: 14, overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            {["Copy Link", "AirDrop", "Message"].map((item) => (
              <div key={item} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.08)" }} />
                <span style={{ fontSize: 13, color: "#8892A4" }}>{item}</span>
              </div>
            ))}
            {/* Highlighted row */}
            <div style={{
              padding: "13px 16px", display: "flex", alignItems: "center", gap: 12,
              background: "rgba(30,136,229,0.2)", border: "1px solid rgba(30,136,229,0.4)",
              animation: "pulse 1.4s infinite",
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(30,136,229,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1" stroke="#1E88E5" strokeWidth="2"/>
                  <rect x="14" y="3" width="7" height="7" rx="1" stroke="#1E88E5" strokeWidth="2"/>
                  <rect x="3" y="14" width="7" height="7" rx="1" stroke="#1E88E5" strokeWidth="2"/>
                  <path d="M17.5 14v6M14.5 17h6" stroke="#1E88E5" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1E88E5" }}>Add to Home Screen</span>
              {/* Arrow */}
              <span style={{ marginLeft: "auto", fontSize: 20, animation: "arrowPulse 1s infinite" }}>👈</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      emoji: "3️⃣",
      title: 'Tap "Add" — you\'re done!',
      desc: "The CIOS icon will appear on your home screen, just like a real app.",
      visual: (
        <div style={{ width: 280, margin: "0 auto" }}>
          {/* Fake iOS confirm dialog */}
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ padding: "18px 16px 12px", textAlign: "center" }}>
              <img src={LOGO} alt="CIOS" style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>CIOS</div>
              <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>cios-intern.vercel.app</div>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex" }}>
              <button style={{ flex: 1, padding: 14, background: "transparent", border: "none", borderRight: "1px solid rgba(255,255,255,0.07)", color: "#8892A4", fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
              <button style={{
                flex: 1, padding: 14, background: "transparent", border: "none",
                color: "#1E88E5", fontSize: 14, fontWeight: 700, cursor: "pointer",
                animation: "pulse 1.4s infinite",
              }}>
                Add ✓
              </button>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: "100%", maxWidth: 340 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>{current.emoji}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>{current.title}</div>
        <div style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.6 }}>{current.desc}</div>
      </div>

      {current.visual}

      {/* Step dots */}
      <div style={{ display: "flex", gap: 6 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 20 : 6, height: 6, borderRadius: 99,
            background: i === step ? "#1E88E5" : "rgba(255,255,255,0.15)",
            transition: "all 0.3s",
          }} />
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, width: "100%" }}>
        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)} style={{
            flex: 1, padding: "13px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent", color: "#8892A4", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>Back</button>
        )}
        <button onClick={() => isLast ? onDone() : setStep((s) => s + 1)} style={{
          flex: 1, padding: "13px 0", borderRadius: 12, border: "none",
          background: isLast ? "linear-gradient(135deg, #66BB6A, #388E3C)" : "linear-gradient(135deg, #1E88E5, #1565C0)",
          color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
        }}>
          {isLast ? "Got it! ✓" : "Next →"}
        </button>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────── */
export function MobileInstallOnboarding() {
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  const dismiss = useCallback(() => {
    try { localStorage.setItem(DISMISS_KEY, Date.now().toString()); } catch {}
    setVisible(false);
  }, []);

  // Detect platform & decide whether to show
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAlreadyInstalled()) return;
    if (wasDismissedRecently()) return;
    if (!isMobile) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !/(chrome|crios|fxios)/i.test(navigator.userAgent);

    if (ios) {
      setPlatform("ios");
      // Small delay so user sees the page first
      const t = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(t);
    }
    // Android — set platform but wait for beforeinstallprompt event
    setPlatform("android");
  }, [isMobile]);

  // Capture Chrome install prompt
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      if (!isMobile) return;
      if (isAlreadyInstalled() || wasDismissedRecently()) return;
      setPlatform("android");
      const t = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(t);
    };

    const onInstalled = () => { setVisible(false); setInstallPrompt(null); };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [isMobile]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    setInstalling(true);
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") {
        setVisible(false);
        setInstallPrompt(null);
      }
    } catch {}
    setInstalling(false);
  };

  if (!visible || !platform) return null;

  return (
    <>
      <style>{`
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.55} }
        @keyframes bounce  { 0%,100%{transform:translateY(0) rotate(180deg)} 50%{transform:translateY(-6px) rotate(180deg)} }
        @keyframes arrowPulse { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-5px)} }
        @keyframes slideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={dismiss}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
          animation: "fadeIn 0.25s ease",
        }}
      />

      {/* Sheet */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
          background: "linear-gradient(180deg, #111827 0%, #0D1424 100%)",
          borderRadius: "24px 24px 0 0",
          border: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "none",
          padding: "12px 24px 40px",
          animation: "slideUp 0.35s cubic-bezier(0.16,1,0.3,1)",
          fontFamily: "'Nunito', sans-serif",
          maxHeight: "90dvh",
          overflowY: "auto",
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.15)", margin: "0 auto 20px" }} />

        {platform === "android" ? (
          /* ── Android: one-tap install ── */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center" }}>
            {/* App identity */}
            <div style={{ position: "relative" }}>
              <img src={LOGO} alt="CIOS" style={{ width: 80, height: 80, borderRadius: 20, boxShadow: "0 8px 24px rgba(30,136,229,0.35)" }} />
              <div style={{
                position: "absolute", bottom: -6, right: -6, width: 24, height: 24,
                borderRadius: "50%", background: "#66BB6A",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, border: "2px solid #0D1424",
              }}>✓</div>
            </div>

            <div>
              <div style={{ fontSize: 10, letterSpacing: 1.5, fontWeight: 700, color: "#1E88E5", textTransform: "uppercase", marginBottom: 6 }}>
                Install App
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: "#E8EDF5", margin: "0 0 8px" }}>
                Get CIOS on your phone
              </h2>
              <p style={{ fontSize: 13, color: "#8892A4", margin: 0, lineHeight: 1.6 }}>
                Install CIOS for instant access from your home screen — no app store needed.
              </p>
            </div>

            {/* Benefits */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", maxWidth: 320 }}>
              {[
                { icon: "⚡", text: "Faster launch" },
                { icon: "📵", text: "Works offline" },
                { icon: "🔔", text: "Push alerts" },
                { icon: "🏠", text: "Home screen icon" },
              ].map(({ icon, text }) => (
                <div key={text} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 12px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#C5CAD6" }}>{text}</span>
                </div>
              ))}
            </div>

            {/* Install button */}
            <button
              onClick={handleInstall}
              disabled={installing}
              style={{
                width: "100%", maxWidth: 320, padding: "15px 0", borderRadius: 14, border: "none",
                background: "linear-gradient(135deg, #1E88E5, #1565C0)",
                color: "#fff", fontSize: 16, fontWeight: 800, cursor: installing ? "not-allowed" : "pointer",
                boxShadow: "0 8px 24px rgba(30,136,229,0.4)",
                opacity: installing ? 0.8 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {installing ? "Installing…" : "📲 Install CIOS App"}
            </button>

            <button
              onClick={dismiss}
              style={{ background: "none", border: "none", color: "#5A6478", fontSize: 13, cursor: "pointer", padding: "4px 8px" }}
            >
              Skip for now
            </button>
          </div>
        ) : (
          /* ── iOS: step-by-step guide ── */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <img src={LOGO} alt="CIOS" style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 10, boxShadow: "0 6px 20px rgba(30,136,229,0.3)" }} />
              <div style={{ fontSize: 10, letterSpacing: 1.5, fontWeight: 700, color: "#1E88E5", textTransform: "uppercase", marginBottom: 4 }}>
                Install App — Safari
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#E8EDF5", margin: "0 0 4px" }}>
                Add CIOS to your home screen
              </h2>
              <p style={{ fontSize: 12, color: "#8892A4", margin: 0 }}>Follow the 3 steps below</p>
            </div>

            <IOSGuide onDone={dismiss} />

            <button
              onClick={dismiss}
              style={{ background: "none", border: "none", color: "#5A6478", fontSize: 13, cursor: "pointer", padding: "4px 8px", marginTop: -8 }}
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </>
  );
}
