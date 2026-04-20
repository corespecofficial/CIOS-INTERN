/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { listMyWatchlist } from "@/app/actions/investor";
import { STARTUP_STAGES } from "@/app/actions/startup-types";
import { WatchlistRemoveButton } from "./remove-button";

export const dynamic = "force-dynamic";

const ACCENT = "#10B981";
const INK = "#F8FAFC";
const DIM = "#94A3B8";
const MUTED = "#64748B";

export default async function WatchlistPage() {
  const res = await listMyWatchlist();
  const pitches = res.ok ? res.data! : [];

  if (pitches.length === 0) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 20px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16 }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>⭐</div>
        <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: INK }}>Your watchlist is empty</h3>
        <p style={{ margin: 0, fontSize: 13, color: DIM, lineHeight: 1.6 }}>
          Browse the <Link href="/investor/dealflow" style={{ color: ACCENT, textDecoration: "none", fontWeight: 700 }}>deal flow</Link> and add pitches to track them here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        {pitches.map((p) => {
          const stageLabel = STARTUP_STAGES.find((s) => s.value === p.stage)?.label ?? p.stage;
          return (
            <div
              key={p.id}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr auto",
                gap: 16,
                padding: 14,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 120,
                  aspectRatio: "16 / 9",
                  borderRadius: 10,
                  background: p.cover_image_url
                    ? `url(${p.cover_image_url}) center/cover no-repeat, #0F172A`
                    : `linear-gradient(135deg, rgba(16,185,129,0.32), rgba(96,165,250,0.22)), #0F172A`,
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <Link href={`/startups/${p.id}`} style={{ fontSize: 16, fontWeight: 800, color: INK, letterSpacing: -0.3, textDecoration: "none", display: "block" }}>
                  {p.startup_name}
                </Link>
                <p style={{ margin: "4px 0 6px", fontSize: 12, color: DIM, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {p.tagline}
                </p>
                <div style={{ display: "flex", gap: 8, fontSize: 11, color: MUTED, fontWeight: 700, flexWrap: "wrap" }}>
                  <span>{p.category}</span>
                  <span>· {stageLabel}</span>
                  {p.country && <span>· 📍 {p.country}</span>}
                  {p.raising_amount_usd && <span style={{ color: ACCENT }}>· Raising ${(Number(p.raising_amount_usd) / 1000).toFixed(0)}K</span>}
                </div>
              </div>
              <WatchlistRemoveButton pitchId={p.id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
