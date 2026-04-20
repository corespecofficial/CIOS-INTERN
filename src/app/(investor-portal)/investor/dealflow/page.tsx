/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { listInvestorDealflow } from "@/app/actions/investor";
import { STARTUP_STAGES } from "@/app/actions/startup-types";

export const dynamic = "force-dynamic";

const ACCENT = "#10B981";
const INK = "#F8FAFC";
const DIM = "#94A3B8";
const MUTED = "#64748B";

export default async function DealflowPage() {
  const res = await listInvestorDealflow({ limit: 80 });
  const pitches = res.ok ? res.data! : [];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 13, color: DIM, margin: 0 }}>
          {pitches.length} pitch{pitches.length === 1 ? "" : "es"} matched to your thesis. Edit your filters in{" "}
          <Link href="/investor/settings" style={{ color: ACCENT, textDecoration: "none", fontWeight: 700 }}>settings</Link>.
        </p>
      </div>

      {pitches.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🎯</div>
          <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: INK }}>No matches yet</h3>
          <p style={{ margin: 0, fontSize: 13, color: DIM, lineHeight: 1.6 }}>
            Broaden your category / stage / geo preferences in{" "}
            <Link href="/investor/settings" style={{ color: ACCENT, textDecoration: "none", fontWeight: 700 }}>settings</Link>,
            or browse the public board.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
          {pitches.map((p) => {
            const stageLabel = STARTUP_STAGES.find((s) => s.value === p.stage)?.label ?? p.stage;
            return (
              <Link
                key={p.id}
                href={`/startups/${p.id}`}
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    aspectRatio: "16 / 9",
                    background: p.cover_image_url
                      ? `url(${p.cover_image_url}) center/cover no-repeat, #0F172A`
                      : `linear-gradient(135deg, rgba(16,185,129,0.32), rgba(96,165,250,0.22)), #0F172A`,
                    position: "relative",
                  }}
                >
                  {p.is_featured && (
                    <span style={{ position: "absolute", top: 10, left: 10, padding: "3px 10px", background: "linear-gradient(135deg, #FBBF24, #F59E0B)", color: "#1A1205", fontSize: 10, fontWeight: 800, borderRadius: 999 }}>
                      ★ Featured
                    </span>
                  )}
                  {p.raising_amount_usd && (
                    <span style={{ position: "absolute", bottom: 10, right: 10, padding: "5px 12px", background: "rgba(10,14,26,0.85)", border: `1px solid ${ACCENT}55`, borderRadius: 10, fontSize: 12, fontWeight: 800, color: ACCENT, fontFamily: "'Space Grotesk', sans-serif" }}>
                      Raising ${(Number(p.raising_amount_usd) / 1000).toFixed(0)}K
                    </span>
                  )}
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: INK, letterSpacing: -0.3 }}>{p.startup_name}</div>
                    <span style={{ fontSize: 10, color: MUTED, fontWeight: 700, whiteSpace: "nowrap", marginTop: 4 }}>{stageLabel}</span>
                  </div>
                  <div style={{ fontSize: 12, color: DIM, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: 8 }}>
                    {p.tagline}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: MUTED, fontWeight: 700 }}>
                    <span>{p.category}</span>
                    {p.country && <span>📍 {p.country}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
