"use client";

import { useEffect, useRef, useState } from "react";
import { getReferralStats, type ReferralStats } from "@/app/actions/referrals";
import toast from "react-hot-toast";

export function ReferralCard() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getReferralStats().then((r) => { if (r.ok) setStats(r.data!); });
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const copy = () => {
    if (!stats) return;
    const url = `${window.location.origin}${stats.referralUrl}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("Referral link copied!");
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast.error("Couldn't copy"));
  };

  return (
    <div style={{
      background: "#111827",
      border: "1px solid rgba(255,193,7,0.2)",
      borderRadius: 14,
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 24 }}>🎁</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>Refer & Earn</div>
          <div style={{ fontSize: 11, color: "#8892A4" }}>+500 XP per active referral</div>
        </div>
      </div>

      {stats ? (
        <>
          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {[
              { val: stats.total, label: "Invited" },
              { val: stats.joined, label: "Joined" },
              { val: stats.rewarded, label: "Rewarded" },
            ].map(({ val, label }) => (
              <div key={label} style={{ textAlign: "center", background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "8px 4px" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#FFC107", fontFamily: "'Space Grotesk',sans-serif" }}>{val}</div>
                <div style={{ fontSize: 10, color: "#8892A4" }}>{label}</div>
              </div>
            ))}
          </div>

          {stats.xpEarned > 0 && (
            <div style={{ fontSize: 12, color: "#66BB6A", fontWeight: 700, textAlign: "center" }}>
              🎉 {stats.xpEarned.toLocaleString()} XP earned from referrals
            </div>
          )}

          {/* Copy link */}
          <button onClick={copy} style={{
            padding: "9px 12px",
            background: copied ? "rgba(102,187,106,0.15)" : "rgba(255,193,7,0.12)",
            border: `1px solid ${copied ? "rgba(102,187,106,0.35)" : "rgba(255,193,7,0.35)"}`,
            borderRadius: 10,
            color: copied ? "#66BB6A" : "#FFC107",
            fontSize: 12, fontWeight: 800, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "all 0.2s",
          }}>
            {copied ? "✓ Copied!" : "🔗 Copy referral link"}
          </button>

          <div style={{ fontSize: 10, color: "#5A6478", textAlign: "center", lineHeight: 1.4 }}>
            Share with friends. You earn 500 XP when they complete their first week.
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2].map((i) => (
            <div key={i} style={{ height: 32, borderRadius: 8, background: "rgba(255,255,255,0.04)", animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      )}
    </div>
  );
}
