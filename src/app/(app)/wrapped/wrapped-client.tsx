"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import type { WrappedData } from "@/app/actions/wrapped";

const C = { bg: "#05070F", card: "#0D1220", text: "#E8EDF5", dim: "#8892A4" };

// Each palette: primary ink + bright accent. Both layouts use the same palette.
const PALETTES = [
  { id: "teal",    name: "Teal",    accent: "#14B8A6", ink: "#0F172A", paper: "#FFFFFF", soft: "#CCFBF1" },
  { id: "orange",  name: "Orange",  accent: "#F97316", ink: "#1F2937", paper: "#FFFFFF", soft: "#FED7AA" },
  { id: "indigo",  name: "Indigo",  accent: "#4F46E5", ink: "#0F172A", paper: "#FFFFFF", soft: "#C7D2FE" },
  { id: "rose",    name: "Rose",    accent: "#E11D48", ink: "#0F172A", paper: "#FFFFFF", soft: "#FECDD3" },
  { id: "emerald", name: "Emerald", accent: "#059669", ink: "#0F172A", paper: "#FFFFFF", soft: "#A7F3D0" },
];

const LAYOUTS = ["script", "editorial"] as const;
type Layout = typeof LAYOUTS[number];

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

interface Props { data: WrappedData; }

// ── Real CIOS logo (Cloudinary). crossOrigin lets html2canvas pull pixels
//    into the PNG export without tainting the canvas. ────────────────────────
const CIOS_LOGO_URL = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";
function LogoMark() {
  return (
    <img
      src={CIOS_LOGO_URL}
      alt="CIOS"
      width={36}
      height={36}
      crossOrigin="anonymous"
      style={{ width: 36, height: 36, objectFit: "contain", display: "block" }}
    />
  );
}

// ── Share destinations with real deep-links + proper brand SVG marks ─────────
// Inline SVGs (not imported components) so html2canvas serialises them cleanly into the PNG.
const ICONS: Record<string, React.ReactElement> = {
  linkedin: (
    <svg viewBox="0 0 24 24" fill="#fff" aria-hidden width="14" height="14">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 110-4.13 2.06 2.06 0 010 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/>
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" fill="#fff" aria-hidden width="13" height="13">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.16 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="#fff" aria-hidden width="14" height="14">
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 011.141.195v3.325a8.623 8.623 0 00-.653-.036 26.805 26.805 0 00-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 00-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647z"/>
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" fill="#fff" aria-hidden width="14" height="14">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
    </svg>
  ),
  telegram: (
    <svg viewBox="0 0 24 24" fill="#fff" aria-hidden width="14" height="14">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  ),
  threads: (
    <svg viewBox="0 0 24 24" fill="#fff" aria-hidden width="14" height="14">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.74-1.757-.501-.586-1.27-.88-2.292-.88-.84.006-1.973.225-2.703 1.327L7.677 7.93c.98-1.479 2.59-2.272 4.487-2.272 4.063 0 6.435 2.469 6.55 6.842l.107-.085c1.43.91 2.395 2.224 2.78 3.794.554 2.241-.098 5.093-2.215 7.13-1.778 1.797-3.918 2.659-7.193 2.661Z"/>
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" fill="#fff" aria-hidden width="14" height="14">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  ),
  email: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden width="14" height="14">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <path d="m21 7-9 6L3 7"/>
    </svg>
  ),
};

type ShareTarget = { id: string; label: string; build: (text: string, url: string) => string | null };
const SHARE_TARGETS: ShareTarget[] = [
  { id: "linkedin",  label: "LinkedIn",  build: (_t, u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}` },
  { id: "twitter",   label: "Twitter/X", build: (t, u)  => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}` },
  { id: "facebook",  label: "Facebook",  build: (_t, u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { id: "whatsapp",  label: "WhatsApp",  build: (t)     => `https://wa.me/?text=${encodeURIComponent(t)}` },
  { id: "telegram",  label: "Telegram",  build: (t, u)  => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { id: "threads",   label: "Threads",   build: (t)     => `https://www.threads.net/intent/post?text=${encodeURIComponent(t)}` },
  // Instagram has no web share URL — we copy caption + download PNG, user pastes it
  { id: "instagram", label: "Instagram", build: ()      => null },
  { id: "email",     label: "Email",     build: (t)     => `mailto:?subject=${encodeURIComponent("My CIOS month")}&body=${encodeURIComponent(t)}` },
];

export default function WrappedClient({ data }: Props) {
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [layout, setLayout] = useState<Layout>("editorial");
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [instaHint, setInstaHint] = useState(false);
  const p = PALETTES[paletteIdx];

  const siteUrl = "https://cios-intern.vercel.app/wrapped";
  const shareCaption = [
    `My ${data.monthLabel} on CIOS 🔥`,
    `${data.tasksCompleted} tasks · ${fmtNum(data.xpEarned)} XP · #${data.rank ?? "–"} rank · Top ${data.percentileTop}% of cohort`,
    `"${data.monthlyHighlight}"`,
    ``,
    `Join me — build your career with 6-month AI internships at CIOS 👇`,
    siteUrl,
  ].join("\n");

  async function copyShareText() {
    try { await navigator.clipboard.writeText(shareCaption); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }

  async function triggerShare(t: ShareTarget) {
    if (t.id === "instagram") {
      try { await navigator.clipboard.writeText(shareCaption); } catch {}
      await downloadAsPng();
      setInstaHint(true);
      setTimeout(() => setInstaHint(false), 6000);
      return;
    }
    const url = t.build(shareCaption, siteUrl);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  async function downloadAsPng() {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 3, useCORS: true });
      const link = document.createElement("a");
      link.download = `cios-wrapped-${data.year}-${data.month}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("Download failed — try taking a screenshot instead.");
    }
  }

  const firstName = data.userName.split(" ")[0];
  const initial = firstName.charAt(0).toUpperCase();

  const headline =
    data.rank === 1 ? "Outstanding" :
    (data.rank ?? 99) <= 3 ? "Incredible" :
    data.percentileTop <= 15 ? "Well done" :
    data.vsLastMonth > 500 ? "Unstoppable" :
    data.streak >= 7 ? "Consistent" : "Congratulations";

  // Two-word editorial headline: first word in ink, second word in accent.
  const editorial = (() => {
    if (data.rank === 1) return ["CHAMPION", "MONTH"];
    if ((data.rank ?? 99) <= 3) return ["TOP", "PERFORMER"];
    if (data.percentileTop <= 15) return ["ELITE", "ENERGY"];
    if (data.vsLastMonth > 500) return ["BREAK", "THROUGH"];
    if (data.streak >= 7) return ["LOCKED", "IN"];
    return ["BUILDING", "MOMENTUM"];
  })();

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "24px 16px 80px", maxWidth: 780, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Dancing+Script:wght@700&family=Fraunces:wght@700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap');

        .wr-sans { font-family: 'Inter', system-ui, sans-serif; }
        .wr-script { font-family: 'Dancing Script', 'Caveat', cursive; }
        .wr-serif  { font-family: 'Fraunces', Georgia, serif; }

        .wr-btn { padding: 11px 18px; border-radius: 999px; font-weight: 700; font-size: 13px; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 6px; transition: transform 120ms ease; }
        .wr-btn:hover { transform: translateY(-1px); }
        .wr-btn-primary { background: #fff; color: #000; }
        .wr-btn-ghost { background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.15); }

        .wr-dot { width: 32px; height: 32px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.12); cursor: pointer; transition: transform 150ms ease; }
        .wr-dot:hover { transform: scale(1.1); }
        .wr-dot.active { border-color: #fff; box-shadow: 0 0 0 3px rgba(255,255,255,0.1); }

        .wr-social {
          width: 28px; height: 28px; border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 800; font-size: 13px;
          cursor: pointer; border: none;
          transition: transform 120ms ease, box-shadow 120ms ease;
        }
        .wr-social:hover { transform: translateY(-2px) scale(1.05); box-shadow: 0 8px 18px rgba(0,0,0,0.25); }

        .wr-tab-btn { padding: 8px 14px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color: #9CA3AF; border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer; letter-spacing: 0.5px; }
        .wr-tab-btn.active { background: #fff; color: #000; border-color: #fff; }

        /* Card responsive classes — the grid collapses to a single column on mobile.
           Both cards cap at 620px so the downloaded PNG stays portrait-friendly
           (social feeds favour square/tall; 780px wide cards look landscape). */
        .wr-card-ed { padding: 36px 36px 56px; max-width: 620px; margin: 0 auto; }
        .wr-card-sc { padding: 40px 36px 56px; max-width: 620px; margin: 0 auto; }

        .wr-ed-body { display: grid; grid-template-columns: 1fr 1px 0.9fr; gap: 22px; align-items: stretch; min-height: 380px; }
        .wr-sc-body { display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; margin-top: 28px; align-items: center; }

        .wr-h1-ed { font-size: 38px; }
        .wr-h2-ed { font-size: 48px; }
        .wr-h3-ed { font-size: 22px; }
        .wr-h-sc  { font-size: 52px; }

        /* Square the portrait so the avatar stays circular regardless of how tall
           the left column grows. max-width caps it so it never balloons on wide cards. */
        .wr-portrait-size { aspect-ratio: 1 / 1; width: 100%; max-width: 240px; margin: 0 auto; }

        @media (max-width: 640px) {
          .wr-card-ed { padding: 24px 20px 48px; }
          .wr-card-sc { padding: 24px 20px 52px; }
          .wr-ed-body {
            grid-template-columns: 1fr;
            gap: 16px;
            min-height: 0;
          }
          /* Script mobile: portrait becomes the hero at the top, content below */
          .wr-sc-body {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-top: 18px;
          }
          .wr-sc-body > .wr-sc-portrait { order: -1; }
          .wr-ed-divider { display: none; }
          .wr-h1-ed { font-size: 28px; }
          .wr-h2-ed { font-size: 36px; }
          .wr-h3-ed { font-size: 18px; }
          .wr-h-sc  { font-size: 44px; }
          .wr-portrait-size { max-width: 200px; }
          .wr-sc-portrait { max-width: 180px; margin: 0 auto; }
          .wr-script-sig { text-align: center !important; }
          .wr-bottom-row { grid-template-columns: 1fr !important; text-align: left !important; gap: 8px !important; }
          .wr-bottom-row > div { text-align: left !important; }
          .wr-share-buttons button { flex: 1; min-width: 0; }
        }

        @media (max-width: 420px) {
          .wr-h1-ed { font-size: 24px; }
          .wr-h2-ed { font-size: 30px; }
          .wr-h-sc  { font-size: 32px; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2.4, color: C.dim, textTransform: "uppercase", fontWeight: 700 }}>
            Your month · <span style={{ color: "#fff" }}>CIOS Wrapped</span>
          </div>
          <h1 className="wr-serif" style={{ margin: "4px 0 0", fontSize: 34, fontWeight: 900, letterSpacing: -0.8 }}>
            {data.monthLabel}
          </h1>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {PALETTES.map((pal, i) => (
            <button key={pal.id} onClick={() => setPaletteIdx(i)} title={pal.name} aria-label={pal.name}
              className={`wr-dot ${paletteIdx === i ? "active" : ""}`} style={{ background: pal.accent }} />
          ))}
        </div>
      </div>

      {/* Layout picker */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        <button className={`wr-tab-btn ${layout === "editorial" ? "active" : ""}`} onClick={() => setLayout("editorial")}>
          Editorial
        </button>
        <button className={`wr-tab-btn ${layout === "script" ? "active" : ""}`} onClick={() => setLayout("script")}>
          Script
        </button>
      </div>

      {/* ── Card ─────────────────────────────────────────────────────────────── */}
      {layout === "editorial" ? (
        <EditorialCard cardRef={cardRef} data={data} p={p} words={editorial} triggerShare={triggerShare} />
      ) : (
        <ScriptCard cardRef={cardRef} data={data} p={p} headline={headline} firstName={firstName} initial={initial} triggerShare={triggerShare} />
      )}

      {/* Action buttons */}
      <div className="wr-share-buttons" style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
        <button className="wr-btn wr-btn-primary" onClick={downloadAsPng}>⬇ Download PNG</button>
        <button className="wr-btn wr-btn-ghost" onClick={copyShareText}>{copied ? "✓ Caption copied" : "📋 Copy caption"}</button>
      </div>

      {/* Share grid — all destinations */}
      <div style={{ marginTop: 22, background: C.card, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: 2.5, color: C.dim, textTransform: "uppercase", fontWeight: 800, marginBottom: 14 }}>
          Share to
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
          {SHARE_TARGETS.map((t) => (
            <button
              key={t.id}
              onClick={() => triggerShare(t)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, cursor: "pointer",
                color: C.text, fontSize: 12, fontWeight: 700,
                transition: "background 120ms ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
            >
              <span className="wr-social" style={{ background: SHARE_COLOR[t.id] }}>{ICONS[t.id]}</span>
              {t.label}
            </button>
          ))}
        </div>
        {instaHint && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(225,29,72,0.1)", border: "1px solid rgba(225,29,72,0.35)", borderRadius: 10, fontSize: 12, color: "#FECDD3" }}>
            📸 PNG saved + caption copied — open Instagram app and paste into a new post/story.
          </div>
        )}
      </div>

      {/* MoM comparison */}
      <div style={{ marginTop: 22, background: C.card, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: 22, display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, alignItems: "center" }}>
        <div style={{ width: 58, height: 58, borderRadius: 14, background: p.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, color: "#fff" }}>
          {data.vsLastMonth > 0 ? "↑" : data.vsLastMonth < 0 ? "↓" : "="}
        </div>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, color: C.dim, textTransform: "uppercase", fontWeight: 800, marginBottom: 4 }}>Vs last month</div>
          <div className="wr-serif" style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.8 }}>
            {data.vsLastMonth > 0 ? (<span style={{ color: "#4dd88b" }}>+{fmtNum(data.vsLastMonth)} XP</span>)
              : data.vsLastMonth < 0 ? (<span style={{ color: "#EF5350" }}>{fmtNum(data.vsLastMonth)} XP</span>)
              : (<span style={{ color: C.dim }}>Same output</span>)}
          </div>
          <p style={{ fontSize: 13, color: C.dim, margin: "4px 0 0", lineHeight: 1.55 }}>
            {data.vsLastMonth > 500 ? "Huge jump — your hustle is compounding."
              : data.vsLastMonth > 0 ? "Steady growth. Keep stacking."
              : data.vsLastMonth < 0 ? "Dip month — every builder has them. Reset and go."
              : "Consistent output."}
          </p>
        </div>
      </div>

      <div style={{ marginTop: 14, padding: "14px 18px", background: `${p.accent}1a`, border: `1px solid ${p.accent}55`, borderRadius: 14, fontSize: 13, color: C.dim, lineHeight: 1.55 }}>
        💡 <strong style={{ color: C.text }}>Every share</strong> = 200–2,000 new eyes on CIOS. Your network sees your wins; recruiters notice your hustle; future interns find their path.
      </div>
    </div>
  );
}

const SHARE_COLOR: Record<string, string> = {
  linkedin: "#0A66C2",
  twitter: "#000000",
  facebook: "#1877F2",
  whatsapp: "#25D366",
  telegram: "#0088CC",
  threads: "#000000",
  instagram: "linear-gradient(135deg,#F58529,#DD2A7B,#8134AF,#515BD4)",
  email: "#6B7280",
};

// ══ EDITORIAL CARD ═══════════════════════════════════════════════════════════
// Two-column marketing-poster layout: text left, portrait right, social row top.
// ═════════════════════════════════════════════════════════════════════════════

function EditorialCard({
  cardRef, data, p, words, triggerShare,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  data: WrappedData;
  p: typeof PALETTES[number];
  words: string[];
  triggerShare: (t: ShareTarget) => void;
}) {
  const firstName = data.userName.split(" ")[0];
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <div
      ref={cardRef}
      className="wr-sans wr-card-ed"
      style={{
        background: p.paper,
        color: p.ink,
        borderRadius: 24,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 30px 80px -20px rgba(0,0,0,0.45)",
      }}
    >
      {/* Top row: logo + social icons */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoMark />
          <div>
            <div className="wr-serif" style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1.5, color: p.ink, lineHeight: 1 }}>CIOS</div>
            <div style={{ fontSize: 8, letterSpacing: 2, color: p.accent, fontWeight: 800, marginTop: 2, textTransform: "uppercase" }}>
              Internship · Wrapped
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {SHARE_TARGETS.filter((t) => ["facebook", "twitter", "whatsapp", "instagram"].includes(t.id)).map((t) => (
            <button key={t.id} className="wr-social" onClick={() => triggerShare(t)}
              style={{ background: SHARE_COLOR[t.id], width: 28, height: 28 }}
              title={`Share to ${t.label}`}
            >
              {ICONS[t.id]}
            </button>
          ))}
        </div>
      </div>

      {/* Content grid: text left + portrait right */}
      <div className="wr-ed-body">
        {/* Left column */}
        <div>
          <div style={{ fontSize: 13, color: p.accent, fontStyle: "italic", fontWeight: 600, marginBottom: 2 }}>
            i had a
          </div>
          {/* lineHeight 1.05 + explicit row gap so MONTH's descender clears the
              "on CIOS" line below — old 0.95 collapsed them together in PNG export. */}
          <div className="wr-sans" style={{ lineHeight: 1.05, letterSpacing: -1.5 }}>
            <div className="wr-h1-ed" style={{ fontWeight: 900, color: p.ink }}>{words[0]}</div>
            <div className="wr-h2-ed" style={{ fontWeight: 900, color: p.accent, marginTop: 4 }}>{words[1]}</div>
            <div className="wr-h3-ed" style={{ fontWeight: 800, color: p.ink, marginTop: 8, letterSpacing: -0.5 }}>on CIOS</div>
          </div>

          <div style={{ width: 60, height: 2, background: p.ink, marginTop: 16, marginBottom: 14 }} />

          <div style={{ fontSize: 18, fontWeight: 800, color: p.ink, letterSpacing: -0.3 }}>
            {data.monthLabel} · #{data.rank ?? "—"} of {data.totalInCohort}
          </div>

          {/* Body stats — flowing like a paragraph */}
          <p style={{ fontSize: 12, color: p.ink, opacity: 0.82, lineHeight: 1.65, margin: "10px 0 0" }}>
            Shipped <strong style={{ color: p.accent }}>{data.tasksCompleted} tasks</strong>, earned <strong style={{ color: p.accent }}>{fmtNum(data.xpEarned)} XP</strong>,
            held a <strong style={{ color: p.accent }}>{data.streak}-day streak</strong>, and finished in the top <strong style={{ color: p.accent }}>{data.percentileTop}%</strong> of the cohort.
            Top skill this month: <strong style={{ color: p.accent }}>{data.topSkill}</strong>.
          </p>

          {/* Invite CTA */}
          <div style={{
            marginTop: 16,
            padding: "12px 14px",
            background: `${p.accent}12`,
            border: `1px dashed ${p.accent}`,
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: p.accent, fontWeight: 800, textTransform: "uppercase", marginBottom: 3 }}>
              This is my progress
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: p.ink, lineHeight: 1.4 }}>
              Build yours too — apply to the next cohort at CIOS.
            </div>
          </div>

          <div style={{
            marginTop: 12,
            display: "inline-block",
            padding: "8px 16px",
            background: p.ink,
            color: "#fff",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1.5,
            borderRadius: 999,
            textTransform: "uppercase",
          }}>
            Join CIOS →
          </div>
        </div>

        {/* Vertical divider — a thin line with small tick halfway */}
        <div className="wr-ed-divider" style={{ position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, borderLeft: `1px solid ${p.ink}`, opacity: 0.25 }} />
        </div>

        {/* Right column — portrait */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
          <div className="wr-portrait-size" style={{ position: "relative" }}>
            {/* Accent rectangle peeking out behind portrait — kept inside the column
                so card overflow:hidden doesn't shave it off in the PNG export. */}
            <div style={{
              position: "absolute", right: "-6%", top: "55%",
              width: "18%", height: "18%",
              background: p.accent,
              borderRadius: 6,
              zIndex: 1,
            }} />
            {data.avatarUrl ? (
              <img
                src={data.avatarUrl}
                alt={firstName}
                style={{
                  width: "100%", height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                  filter: "grayscale(10%) contrast(1.05)",
                  border: `4px solid ${p.accent}`,
                  boxShadow: `0 12px 30px rgba(0,0,0,0.15)`,
                  position: "relative", zIndex: 2,
                }}
                crossOrigin="anonymous"
              />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${p.accent}, ${p.soft})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `4px solid ${p.accent}`,
                boxShadow: `0 12px 30px rgba(0,0,0,0.15)`,
                position: "relative", zIndex: 2,
              }}>
                <span className="wr-serif" style={{ fontSize: 100, fontWeight: 900, color: "#fff", letterSpacing: -3, textShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                  {initial}
                </span>
              </div>
            )}
            {/* Streak bubble */}
            <div style={{
              position: "absolute", top: 8, right: 8, zIndex: 3,
              background: "#fff", color: p.ink,
              padding: "4px 10px", borderRadius: 999,
              fontSize: 10, fontWeight: 800,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}>
              🔥 {data.streak}d
            </div>
          </div>

          {/* Script signature — Dancing Script has very tall ascenders/descenders.
              lineHeight 1.1 + paddingBottom keeps the 'J' tail from crashing into the role caption. */}
          <div className="wr-script-sig" style={{ textAlign: "right" }}>
            <div className="wr-script" style={{ fontSize: 32, color: p.accent, lineHeight: 1.1, paddingBottom: 6 }}>
              {firstName}
            </div>
            <div style={{ fontSize: 9, letterSpacing: 2.5, color: p.ink, opacity: 0.7, fontWeight: 800, textTransform: "uppercase" }}>
              {data.role.replace("_", " ")} · {data.topSkill}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="wr-bottom-row" style={{
        marginTop: 18,
        paddingTop: 14,
        borderTop: `1px dashed ${p.ink}33`,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        fontSize: 10,
        color: p.ink,
        alignItems: "center",
      }}>
        <div>
          <div style={{ color: p.accent, fontWeight: 800, fontSize: 13 }}>
            📞 More @ <span style={{ color: p.ink }}>cios-intern.vercel.app</span>
          </div>
          <div style={{ letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700, fontSize: 9, opacity: 0.7, marginTop: 1 }}>
            Visit the platform
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: p.ink }}>
            🌐 @{firstName.toLowerCase()}
          </div>
          <div style={{ letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700, fontSize: 9, opacity: 0.7, marginTop: 1 }}>
            Certified · {data.monthLabel}
          </div>
        </div>
      </div>

      {/* Decorative bottom banner closes the card — no more trailing whitespace */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        padding: "10px 16px",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
        background: p.accent, color: "#fff",
        fontSize: 10, letterSpacing: 2.5, fontWeight: 800, textTransform: "uppercase",
      }}>
        <span>Certified Performance</span>
        <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
          <span style={{ width: 4, height: 4, background: "#fff", borderRadius: "50%" }} />
          <span style={{ width: 4, height: 4, background: "#fff", borderRadius: "50%", opacity: 0.6 }} />
          <span style={{ width: 4, height: 4, background: "#fff", borderRadius: "50%", opacity: 0.3 }} />
        </span>
        <span>{data.monthLabel} · @{firstName.toLowerCase()}</span>
      </div>
    </div>
  );
}

// ══ SCRIPT CARD ══════════════════════════════════════════════════════════════
// Cream + script "Congratulations" design (the earlier variant).
// ═════════════════════════════════════════════════════════════════════════════

function ScriptCard({
  cardRef, data, p, headline, firstName, initial, triggerShare,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  data: WrappedData;
  p: typeof PALETTES[number];
  headline: string;
  firstName: string;
  initial: string;
  triggerShare: (t: ShareTarget) => void;
}) {
  const subhead =
    data.rank && data.rank <= 3 ? `On your top-${data.rank} finish` :
    data.percentileTop <= 15 ? `On your top ${data.percentileTop}% month` :
    data.vsLastMonth > 0 ? `On your ${data.monthLabel} momentum` :
    `On completing ${data.monthLabel}`;

  const paperBg = p.accent === "#F97316" ? "#F7F1E5" :
                  p.accent === "#14B8A6" ? "#F4F7F2" :
                  p.accent === "#4F46E5" ? "#F4F3F8" :
                  p.accent === "#E11D48" ? "#FBF3F0" :
                  "#FAF7EC";

  return (
    <div
      ref={cardRef}
      className="wr-sans wr-card-sc"
      style={{
        background: paperBg,
        color: p.ink,
        borderRadius: 28,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 30px 80px -20px rgba(0,0,0,0.45)",
      }}
    >
      {/* Top row: logo + social icons */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoMark />
          <div>
            <div className="wr-serif" style={{ fontSize: 20, fontWeight: 900, letterSpacing: 2, color: p.ink }}>CIOS</div>
            <div style={{ fontSize: 9, letterSpacing: 2.4, color: p.accent, fontWeight: 700, marginTop: 2, textTransform: "uppercase" }}>
              Internship · Wrapped
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {SHARE_TARGETS.filter((t) => ["linkedin", "twitter", "whatsapp", "instagram"].includes(t.id)).map((t) => (
            <button key={t.id} className="wr-social" onClick={() => triggerShare(t)}
              style={{ background: SHARE_COLOR[t.id], width: 28, height: 28 }}
              title={`Share to ${t.label}`}
            >
              {ICONS[t.id]}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="wr-sc-body">
        <div>
          {/* Script uses generous line-height + padding-bottom so descenders in
              'g'/'y' don't crash into the subhead underneath */}
          <div className="wr-script wr-h-sc" style={{ color: p.accent, lineHeight: 1.15, fontWeight: 700, paddingBottom: 4 }}>
            {headline}
          </div>
          <div style={{ fontSize: 11, letterSpacing: 2.5, color: p.ink, textTransform: "uppercase", fontWeight: 700, marginTop: 10, opacity: 0.85 }}>
            {subhead}
          </div>
          {/* paddingBottom on the name leaves room for serif descenders so the
              pill below doesn't collide with the 'J' tail. */}
          <div className="wr-serif" style={{ fontSize: 28, fontWeight: 900, marginTop: 22, letterSpacing: -0.5, color: p.ink, lineHeight: 1.15, paddingBottom: 6 }}>
            {firstName}
          </div>
          <div>
            <span style={{
              display: "inline-block", marginTop: 4, padding: "6px 14px",
              background: p.accent, color: "#fff",
              fontSize: 10, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase",
              borderRadius: 999,
            }}>
              {data.role.replace("_", " ")} · {data.topSkill}
            </span>
          </div>

          <div style={{ marginTop: 14, fontSize: 12, lineHeight: 1.9, color: p.ink, opacity: 0.85 }}>
            <div><strong style={{ color: p.accent }}>⚡ {fmtNum(data.xpEarned)} XP</strong> earned this month</div>
            <div><strong style={{ color: p.accent }}>✓ {data.tasksCompleted} tasks</strong> · {data.reportsSubmitted} reports</div>
            <div><strong style={{ color: p.accent }}>🔥 {data.streak}-day streak</strong> · {data.coursesCompleted} courses</div>
            <div><strong style={{ color: p.accent }}>🏆 Rank #{data.rank ?? "—"}</strong> · top {data.percentileTop}%</div>
          </div>

          {/* Invite CTA */}
          <div style={{ marginTop: 14, padding: "10px 14px", background: `${p.accent}15`, border: `1px dashed ${p.accent}`, borderRadius: 10 }}>
            <div style={{ fontSize: 12, color: p.ink, fontWeight: 700, lineHeight: 1.4 }}>
              Build your career like this — apply to CIOS 👇
            </div>
          </div>
        </div>

        {/* Portrait */}
        <div className="wr-sc-portrait" style={{ position: "relative", width: "100%", aspectRatio: "1/1" }}>
          <div style={{ position: "absolute", right: "-8%", top: "40%", width: "18%", height: "18%", background: p.accent, borderRadius: 6 }} />
          <div style={{ position: "absolute", left: "4%", bottom: "8%", width: "14%", height: "14%", background: p.accent, borderRadius: 4 }} />
          <svg style={{ position: "absolute", inset: 0 }} viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="46" fill="none" stroke={p.accent} strokeWidth="5" strokeDasharray="220 60" strokeLinecap="round" transform="rotate(-45 50 50)" />
          </svg>
          <div style={{
            position: "absolute", inset: "8%", borderRadius: "50%", overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `inset 0 -20px 40px rgba(0,0,0,0.08)`,
          }}>
            {data.avatarUrl ? (
              <img src={data.avatarUrl} alt={firstName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                crossOrigin="anonymous"
              />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                background: `linear-gradient(135deg, ${p.soft}, ${p.accent})`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span className="wr-serif" style={{ fontSize: 68, fontWeight: 900, color: "#fff", letterSpacing: -2, textShadow: "0 2px 10px rgba(0,0,0,0.15)" }}>
                  {initial}
                </span>
              </div>
            )}
          </div>
          <div style={{
            position: "absolute", top: "4%", right: "6%",
            background: "#fff", padding: "6px 12px", borderRadius: 999,
            boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
            fontSize: 11, fontWeight: 800, color: p.ink, letterSpacing: 0.5,
          }}>
            🔥 {data.streak}-day
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 22, paddingLeft: 16,
        borderLeft: `3px solid ${p.accent}`,
        fontSize: 14, fontStyle: "italic", color: p.ink, opacity: 0.85, lineHeight: 1.5,
      }}>
        “{data.monthlyHighlight}”
      </div>

      <div className="wr-bottom-row" style={{
        marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
        paddingTop: 16, borderTop: `1px dashed ${p.accent}55`,
        fontSize: 11, color: p.ink,
      }}>
        <div>
          <div style={{ color: p.accent, fontWeight: 800 }}>cios-intern.vercel.app</div>
          <div style={{ fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", fontSize: 9, marginTop: 2, opacity: 0.75 }}>
            Visit the platform
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", fontSize: 9, opacity: 0.75 }}>
            Month vs last
          </div>
          <div style={{ fontWeight: 800, color: data.vsLastMonth >= 0 ? p.accent : "#DC2626", marginTop: 2 }}>
            {data.vsLastMonth > 0 ? `↑ +${fmtNum(data.vsLastMonth)} XP` :
             data.vsLastMonth < 0 ? `↓ ${fmtNum(data.vsLastMonth)} XP` :
             "Same as last"}
          </div>
        </div>
      </div>

      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        padding: "8px 0", textAlign: "center",
        background: p.accent, color: "#fff",
        fontSize: 10, letterSpacing: 2.5, fontWeight: 800, textTransform: "uppercase",
      }}>
        Certified · CIOS Monthly Performance · @{firstName.toLowerCase()}
      </div>
    </div>
  );
}
