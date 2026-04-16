"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { detectRegion, getFxRates, formatLocalPrice, getPPPMultiplier, clearRegionCache, type RegionInfo } from "@/lib/regional-pricing";
import { Icon3D } from "@/components/marketing/icon3d";

interface Props { heading?: string; subheading?: string; condensed?: boolean }

const SLIDER_LIMITS = { listings: { min: 1, max: 50 }, seats: { min: 1, max: 25 }, applications: { min: 100, max: 5000 } };

function computeUsdPrice(listings: number, seats: number, applications: number) {
  const listingCost = listings * 15;
  const seatCost = (seats - 1) * 10;
  const appsCost = Math.max(0, applications - 500) / 500 * 20;
  const base = 29;
  return Math.round(base + listingCost + seatCost + appsCost);
}

const FREE_FEATURES = ["1 active opportunity", "Up to 30 applications / month", "Basic candidate profiles", "Community support", "Platform access"];
const PAID_FEATURES = ["Unlimited candidate profiles", "AI match scoring", "Talent pool access", "Priority chat + video", "Analytics dashboard", "Direct messaging"];

// Pricing icon uses Icon3D component — zero network dependency.

export function PricingSection({ heading, subheading, condensed }: Props) {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [region, setRegion] = useState<RegionInfo | null>(null);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState(5);
  const [seats, setSeats] = useState(2);
  const [applications, setApplications] = useState(500);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const [r, fx] = await Promise.all([detectRegion({ askPermission: false }), getFxRates()]);
      if (mounted) { setRegion(r); setRates(fx); setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const requestExactLocation = async () => {
    setLoading(true);
    clearRegionCache();
    const r = await detectRegion({ askPermission: true });
    setRegion(r); setLoading(false);
  };

  const monthlyUsd = useMemo(() => computeUsdPrice(listings, seats, applications), [listings, seats, applications]);
  const usdPrice = cycle === "monthly" ? monthlyUsd : Math.round(monthlyUsd * 0.8);
  const localStr = (usd: number) => region ? formatLocalPrice(usd, region, rates) : `$${usd}`;
  const pppPct = region ? Math.round((1 - getPPPMultiplier(region.country)) * 100) : 0;
  const yearlyTotal = cycle === "yearly" && region
    ? formatLocalPrice(Math.round(monthlyUsd * 0.8 * 12), region, rates)
    : `$${Math.round(monthlyUsd * 0.8 * 12)}`;

  return (
    <section id="pricing" style={{ padding: "70px 24px 40px", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          {!condensed && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 6 }}>
              <Icon3D name="money" size={72} style={{ marginBottom: 12 }} />
              <span style={{ padding: "4px 12px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 1, marginBottom: 14 }}>PRICING</span>
            </div>
          )}
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: condensed ? 36 : 44, fontWeight: 800, color: "#E8EDF5", margin: "0 0 12px 0", lineHeight: 1.1 }}>
            {heading || "Pay only for what you need."}
          </h2>
          <p style={{ fontSize: 16, color: "#8892A4", maxWidth: 640, margin: "0 auto 20px", lineHeight: 1.6 }}>
            {subheading || "Start free. Scale with a slider. Regional pricing for 30+ countries."}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "inline-flex", background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 4 }}>
              <button onClick={() => setCycle("monthly")} style={{ ...toggle, ...(cycle === "monthly" ? toggleActive : {}) }}>Monthly</button>
              <button onClick={() => setCycle("yearly")} style={{ ...toggle, ...(cycle === "yearly" ? toggleActive : {}) }}>Yearly <span style={{ fontSize: 9, color: "#66BB6A", marginLeft: 4 }}>−20%</span></button>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
              <span style={{ fontSize: 11, color: "#8892A4", letterSpacing: 0.5 }}>REGION</span>
              <span style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 700 }}>{loading ? "Detecting…" : `${region?.region || "—"} · ${region?.currency || "USD"}`}</span>
              {pppPct > 0 && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "rgba(102,187,106,0.15)", color: "#66BB6A", fontWeight: 700 }}>−{pppPct}%</span>}
              <button onClick={requestExactLocation} title="Use my exact location" style={{ fontSize: 10, color: "#1E88E5", background: "transparent", border: "1px solid rgba(30,136,229,0.3)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontWeight: 700 }}>📍 Precise</button>
            </div>
          </div>
          <p style={{ fontSize: 10, color: "#5A6478", marginTop: 8 }}>
            Prices auto-adjust via real-time FX (updated hourly).
            {pppPct > 0 && ` Regional discount of ${pppPct}% applied for ${region?.region}.`}
          </p>
        </div>

        <div className="cios-pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr", gap: 16, alignItems: "stretch" }}>
          <div style={cardBase}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, letterSpacing: 2, color: "#66BB6A", fontWeight: 800, marginBottom: 4 }}>FREE FOREVER</div>
            <h3 style={planH}>Starter</h3>
            <p style={{ fontSize: 12, color: "#8892A4", margin: "0 0 18px 0" }}>For founders testing the waters</p>
            <div style={{ marginBottom: 20 }}>
              <span style={bigPrice}>{region?.symbol || "$"}0</span>
              <span style={{ fontSize: 13, color: "#8892A4", marginLeft: 4 }}>forever</span>
            </div>
            <ul style={featUl}>{FREE_FEATURES.map((f) => <li key={f} style={featLi}><span style={{ color: "#66BB6A", fontWeight: 800 }}>✓</span> {f}</li>)}</ul>
            <Link href="/contact?category=recruiter" style={ctaGhost}>Start free</Link>
          </div>

          <div style={{ ...cardBase, background: "linear-gradient(135deg, rgba(30,136,229,0.12), rgba(171,71,188,0.04))", border: "1px solid rgba(30,136,229,0.35)", position: "relative" }}>
            <span style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", padding: "4px 12px", background: "linear-gradient(135deg, #1E88E5, #AB47BC)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 99, letterSpacing: 1 }}>BUILD YOUR PLAN</span>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, letterSpacing: 2, color: "#1E88E5", fontWeight: 800, marginBottom: 4 }}>ADJUST WITH SLIDER</div>
            <h3 style={planH}>Custom</h3>
            <p style={{ fontSize: 12, color: "#8892A4", margin: "0 0 16px 0" }}>Pay precisely for what you use</p>
            <Slider label="Active opportunities" value={listings} min={SLIDER_LIMITS.listings.min} max={SLIDER_LIMITS.listings.max} onChange={setListings} unit={listings === 1 ? "listing" : "listings"} />
            <Slider label="Team seats" value={seats} min={SLIDER_LIMITS.seats.min} max={SLIDER_LIMITS.seats.max} onChange={setSeats} unit={seats === 1 ? "seat" : "seats"} />
            <Slider label="Applications / month" value={applications} min={SLIDER_LIMITS.applications.min} max={SLIDER_LIMITS.applications.max} step={100} onChange={setApplications} unit="apps" />
            <div style={{ marginTop: 16, padding: 14, background: "rgba(0,0,0,0.25)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                <span style={bigPrice}>{localStr(usdPrice)}</span>
                <span style={{ fontSize: 13, color: "#8892A4" }}>/ month{cycle === "yearly" && " · billed yearly"}</span>
              </div>
              {cycle === "yearly" && <div style={{ fontSize: 11, color: "#66BB6A" }}>= {yearlyTotal} / year</div>}
              {region && region.currency !== "USD" && <div style={{ fontSize: 10, color: "#5A6478", marginTop: 2 }}>≈ ${usdPrice} USD baseline</div>}
            </div>
            <ul style={{ ...featUl, marginTop: 18 }}>{PAID_FEATURES.map((f) => <li key={f} style={featLi}><span style={{ color: "#1E88E5", fontWeight: 800 }}>✓</span> {f}</li>)}</ul>
            <Link href="/contact?category=recruiter" style={ctaPrimary}>Get started →</Link>
          </div>

          <div style={cardBase}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, letterSpacing: 2, color: "#FFC107", fontWeight: 800, marginBottom: 4 }}>ENTERPRISE</div>
            <h3 style={planH}>Unlimited</h3>
            <p style={{ fontSize: 12, color: "#8892A4", margin: "0 0 18px 0" }}>For agencies & large orgs</p>
            <div style={{ marginBottom: 20 }}><span style={{ ...bigPrice, fontSize: 30 }}>Custom</span></div>
            <ul style={featUl}>{["Unlimited everything", "Unlimited team seats", "Dedicated account manager", "Custom SLAs", "API access", "White-label option"].map((f) => <li key={f} style={featLi}><span style={{ color: "#FFC107", fontWeight: 800 }}>✓</span> {f}</li>)}</ul>
            <Link href="/contact?category=partnership" style={{ ...ctaGhost, borderColor: "rgba(255,193,7,0.3)", color: "#FFC107" }}>Contact sales</Link>
          </div>
        </div>

        {!condensed && (
          <div style={{ marginTop: 40, maxWidth: 720, marginInline: "auto" }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", textAlign: "center", marginBottom: 16 }}>Common questions</h3>
            <FAQ q="How does the slider work?" a="Choose how many opportunities, seats, and applications you need. Price updates instantly. No hidden tiers." />
            <FAQ q="Is the Free plan really free?" a="Yes. 1 opportunity + 30 applications/month + community support. Forever. No credit card." />
            <FAQ q="Can I switch regions?" a="Click 📍 Precise for exact geolocation, or just travel — we auto-detect each visit." />
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 900px) { .cios-pricing-grid { grid-template-columns: 1fr !important; } }
        @keyframes cios-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        input[type=range].cios-slider { -webkit-appearance: none; appearance: none; background: transparent; width: 100%; height: 22px; }
        input[type=range].cios-slider::-webkit-slider-runnable-track { height: 4px; background: rgba(255,255,255,0.08); border-radius: 99px; }
        input[type=range].cios-slider::-moz-range-track { height: 4px; background: rgba(255,255,255,0.08); border-radius: 99px; }
        input[type=range].cios-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; background: linear-gradient(135deg, #1E88E5, #1565C0); border: 2px solid #fff; border-radius: 50%; cursor: pointer; margin-top: -8px; box-shadow: 0 4px 14px rgba(30,136,229,0.4); }
        input[type=range].cios-slider::-moz-range-thumb { width: 18px; height: 18px; background: linear-gradient(135deg, #1E88E5, #1565C0); border: 2px solid #fff; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 14px rgba(30,136,229,0.4); }
      `}</style>
    </section>
  );
}

function Slider({ label, value, min, max, step, onChange, unit }: { label: string; value: number; min: number; max: number; step?: number; onChange: (n: number) => void; unit: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#8892A4", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 14, color: "#E8EDF5", fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>{value.toLocaleString()} <span style={{ fontSize: 11, color: "#8892A4", fontWeight: 500 }}>{unit}</span></span>
      </div>
      <input type="range" className="cios-slider" min={min} max={max} step={step || 1} value={value} onChange={(e) => onChange(parseInt(e.target.value))} />
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 18px", marginBottom: 8 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", marginBottom: 6 }}>{q}</div>
      <div style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.6 }}>{a}</div>
    </div>
  );
}

const toggle: React.CSSProperties = { padding: "8px 20px", fontSize: 12, fontWeight: 700, color: "#8892A4", background: "transparent", border: "none", borderRadius: 8, cursor: "pointer" };
const toggleActive: React.CSSProperties = { background: "rgba(30,136,229,0.18)", color: "#1E88E5" };
const cardBase: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: 26, display: "flex", flexDirection: "column" };
const planH: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "0 0 4px 0" };
const bigPrice: React.CSSProperties = { fontSize: 38, fontWeight: 800, color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif" };
const featUl: React.CSSProperties = { listStyle: "none", padding: 0, margin: "0 0 20px 0", display: "flex", flexDirection: "column", gap: 7, flex: 1 };
const featLi: React.CSSProperties = { display: "flex", gap: 8, fontSize: 13, color: "#E8EDF5" };
const ctaGhost: React.CSSProperties = { display: "block", textAlign: "center", padding: "11px 18px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none", marginTop: "auto" };
const ctaPrimary: React.CSSProperties = { display: "block", textAlign: "center", padding: "11px 18px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none", marginTop: "auto" };
