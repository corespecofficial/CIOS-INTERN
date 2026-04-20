"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import { updateMyPlan } from "@/app/actions/opportunities";
import { RECRUITER_PLANS, type RecruiterPlan } from "@/lib/recruiter-plans";

const ACCENT = "#FB923C";
const ACCENT_2 = "#F97316";
const INK = "#F8FAFC";
const DIM = "#94A3B8";
const MUTED = "#64748B";

interface Props {
  currentPlan: string;
  activeListings: number;
  renewsAt: string | null;
  isAdmin: boolean;
}

export function RecruiterBillingClient({ currentPlan, activeListings, renewsAt, isAdmin }: Props) {
  const [pending, start] = useTransition();

  const choose = (tier: RecruiterPlan) => {
    start(async () => {
      const r = await updateMyPlan(tier);
      if (r.ok) toast.success(`Plan switched to ${tier}`);
      else toast.error(r.error);
    });
  };

  const current = RECRUITER_PLANS.find((p) => p.id === currentPlan) ?? RECRUITER_PLANS[0];

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "8px 20px 60px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: ACCENT, fontWeight: 800, textTransform: "uppercase" }}>
          Plans & billing
        </div>
        <h1 style={{ margin: "4px 0 0", fontSize: 30, fontWeight: 900, letterSpacing: -0.8, color: INK, fontFamily: "'Space Grotesk', 'Nunito', sans-serif" }}>
          Hire at your pace
        </h1>
        <p style={{ margin: "6px 0 0", color: DIM, fontSize: 14, lineHeight: 1.55, maxWidth: 640 }}>
          Post your first role free. Upgrade when you need more listings, promoted placements, or unlimited hiring.
          CIOS keeps a 5% placement fee on every hire — the same across every plan.
        </p>
      </div>

      {/* Current status strip */}
      <div
        style={{
          padding: 18,
          background: "linear-gradient(135deg, rgba(251,146,60,0.12), rgba(255,255,255,0.02))",
          border: "1px solid rgba(251,146,60,0.3)",
          borderRadius: 16,
          marginBottom: 26,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <Stat label="Current plan" value={current.label} color={ACCENT} />
        <Stat
          label="Active listings"
          value={`${activeListings}${current.activeListings != null ? ` / ${current.activeListings}` : " / ∞"}`}
          color={current.activeListings != null && activeListings >= current.activeListings ? "#F87171" : INK}
        />
        <Stat label="Renews" value={renewsAt ? new Date(renewsAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" }) : "—"} color={DIM} />
        <Stat label="Placement fee" value="5% of monthly" color={INK} />
      </div>

      {/* Plan cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        {RECRUITER_PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const highlight = plan.badge === "Most popular";
          return (
            <div
              key={plan.id}
              style={{
                position: "relative",
                padding: 22,
                background: highlight
                  ? "linear-gradient(180deg, rgba(251,146,60,0.12), rgba(255,255,255,0.02))"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${highlight ? "rgba(251,146,60,0.4)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: 18,
                boxShadow: highlight ? "0 28px 60px -20px rgba(251,146,60,0.35)" : "none",
              }}
            >
              {plan.badge && (
                <span style={{ position: "absolute", top: -10, right: 16, padding: "3px 10px", background: "linear-gradient(135deg, #FB923C, #F97316)", color: "#fff", fontSize: 10, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", borderRadius: 999 }}>
                  {plan.badge}
                </span>
              )}
              <div style={{ fontSize: 18, fontWeight: 900, color: INK, letterSpacing: -0.3, marginBottom: 4, fontFamily: "'Space Grotesk', sans-serif" }}>
                {plan.label}
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 14 }}>{plan.tagline}</div>

              <div style={{ marginBottom: 16 }}>
                {plan.id === "enterprise" ? (
                  <div style={{ fontSize: 22, fontWeight: 900, color: INK, fontFamily: "'Space Grotesk', sans-serif" }}>Custom</div>
                ) : plan.priceNgn === 0 ? (
                  <div style={{ fontSize: 28, fontWeight: 900, color: INK, fontFamily: "'Space Grotesk', sans-serif" }}>Free</div>
                ) : (
                  <div>
                    <span style={{ fontSize: 28, fontWeight: 900, color: INK, fontFamily: "'Space Grotesk', sans-serif" }}>₦{plan.priceNgn.toLocaleString()}</span>
                    <span style={{ fontSize: 12, color: MUTED, marginLeft: 4 }}>/ month</span>
                  </div>
                )}
              </div>

              <ul style={{ margin: "0 0 18px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: INK }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", lineHeight: 1.55 }}>
                    <span style={{ color: "#34D399", fontWeight: 900, flexShrink: 0 }}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div style={{ padding: "11px 0", textAlign: "center", background: "rgba(52,211,153,0.1)", color: "#34D399", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 12, fontSize: 13, fontWeight: 800 }}>
                  Current plan
                </div>
              ) : (
                <button
                  onClick={() => choose(plan.id)}
                  disabled={pending}
                  style={{
                    width: "100%",
                    padding: "11px 0",
                    background: highlight ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})` : "rgba(255,255,255,0.04)",
                    color: highlight ? "#fff" : INK,
                    border: highlight ? "none" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: pending ? "wait" : "pointer",
                    boxShadow: highlight ? "0 12px 26px -10px rgba(251,146,60,0.55)" : "none",
                  }}
                >
                  {pending ? "…" : plan.priceNgn === 0 || plan.id === "enterprise" ? "Talk to us" : "Upgrade"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Admin note */}
      {isAdmin && (
        <div style={{ marginTop: 22, padding: "12px 16px", background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.3)", borderRadius: 12, fontSize: 12, color: "#93C5FD" }}>
          ⚡ As {isAdmin ? "admin" : ""} you can force-switch tiers without payment for testing. The "Talk to us" / paid flows will hit Paystack in a follow-up phase.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: 1.5, color: MUTED, fontWeight: 800, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color, marginTop: 2, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
    </div>
  );
}
