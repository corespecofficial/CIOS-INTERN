"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { redeemItem, type RewardItem, type Redemption } from "@/app/actions/reward-store";

const C = {
  bg: "#0A0E1A",
  card: "#111827",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.08)",
  gold: "#FFC107",
};

const CAT_EMOJI: Record<string, string> = {
  cash: "💵",
  merch: "👕",
  course: "📚",
  mentor: "🧑‍🏫",
  perk: "✨",
};

interface Props {
  items: RewardItem[];
  redemptions: Redemption[];
  myPoints: number;
}

export default function RewardStoreClient({ items, redemptions, myPoints: initialPoints }: Props) {
  const router = useRouter();
  const [myPoints, setMyPoints] = useState(initialPoints);
  const [tab, setTab] = useState<"store" | "redemptions">("store");
  const [filter, setFilter] = useState<string>("all");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const filtered = filter === "all" ? items : items.filter((i) => i.category === filter);

  function handleRedeem(item: RewardItem) {
    setErr(null);
    if (myPoints < item.price_points) {
      setErr(`You need ${item.price_points - myPoints} more points.`);
      return;
    }
    if (!confirm(`Redeem ${item.title} for ${item.price_points} pts?`)) return;
    startTransition(async () => {
      const res = await redeemItem(item.id);
      if (!res.ok) { setErr(res.error); return; }
      if (res.data) setMyPoints(res.data.newBalance);
      router.refresh();
    });
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "20px 16px 60px", maxWidth: 1000, margin: "0 auto" }}>
      <style>{`
        .rs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        @media (max-width: 800px) { .rs-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 500px) { .rs-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "inline-block", background: "rgba(255,193,7,0.12)", border: "1px solid rgba(255,193,7,0.3)", padding: "4px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.gold, marginBottom: 10, textTransform: "uppercase" }}>
            🏪 Reward Store
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>Spend your points.</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>Your Balance</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: C.gold, letterSpacing: -0.5, fontFamily: "monospace" }}>⭐ {myPoints.toLocaleString()}</div>
        </div>
      </div>

      {err && <div style={{ color: "#EF5350", fontSize: 13, marginBottom: 14, padding: "8px 12px", background: "rgba(239,83,80,0.12)", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 8 }}>{err}</div>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4, marginBottom: 16 }}>
        {[
          { k: "store" as const, label: `Store (${items.length})` },
          { k: "redemptions" as const, label: `My Redemptions (${redemptions.length})` },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            style={{
              flex: 1,
              padding: "9px 14px",
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: tab === t.k ? C.gold : "transparent",
              color: tab === t.k ? "#000" : C.dim,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "store" && (
        <>
          {/* Category filter */}
          <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
            {["all", "cash", "merch", "course", "mentor", "perk"].map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                style={{
                  padding: "7px 14px",
                  background: filter === c ? C.gold : "transparent",
                  color: filter === c ? "#000" : C.dim,
                  border: `1px solid ${filter === c ? C.gold : C.border}`,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {c === "all" ? "🏪 All" : `${CAT_EMOJI[c]} ${c}`}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: C.dim, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎁</div>
              No items in this category yet.
            </div>
          ) : (
            <div className="rs-grid">
              {filtered.map((item) => {
                const affordable = myPoints >= item.price_points;
                return (
                  <div key={item.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <div style={{ aspectRatio: "4/3", background: item.image_url ? `url(${item.image_url}) center/cover` : `linear-gradient(135deg, ${C.gold}22, ${C.card})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {!item.image_url && <div style={{ fontSize: 48 }}>{CAT_EMOJI[item.category]}</div>}
                    </div>
                    <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
                      <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
                        {CAT_EMOJI[item.category]} {item.category}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, letterSpacing: -0.2, lineHeight: 1.3 }}>{item.title}</div>
                      {item.description && <p style={{ fontSize: 12, color: C.dim, margin: "6px 0 0", lineHeight: 1.5, flex: 1 }}>{item.description}</p>}
                      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 17, fontWeight: 800, color: C.gold }}>⭐ {item.price_points.toLocaleString()}</div>
                        {item.cash_value_ngn && <div style={{ fontSize: 11, color: C.dim }}>≈ ₦{item.cash_value_ngn.toLocaleString()}</div>}
                      </div>
                      {!item.unlimited && item.stock !== null && (
                        <div style={{ fontSize: 10, color: item.stock <= 5 ? "#EF5350" : C.dim, marginTop: 4 }}>
                          {item.stock === 0 ? "Sold out" : item.stock <= 5 ? `Only ${item.stock} left!` : `${item.stock} available`}
                        </div>
                      )}
                      <button
                        onClick={() => handleRedeem(item)}
                        disabled={pending || !affordable || (!item.unlimited && (item.stock ?? 0) <= 0)}
                        style={{
                          marginTop: 10,
                          padding: "9px 14px",
                          background: affordable ? C.gold : "transparent",
                          color: affordable ? "#000" : C.dim,
                          border: `1px solid ${affordable ? C.gold : C.border}`,
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: affordable ? "pointer" : "not-allowed",
                        }}
                      >
                        {affordable ? "Redeem →" : `Need ${item.price_points - myPoints} more pts`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "redemptions" && (
        <>
          {redemptions.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: C.dim, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14 }}>
              No redemptions yet. Spend your points in the store.
            </div>
          ) : (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
              {redemptions.map((r, i) => {
                const statusColor = r.status === "delivered" ? "#66BB6A" : r.status === "rejected" || r.status === "cancelled" ? "#EF5350" : r.status === "approved" || r.status === "shipped" ? "#4DA8FF" : "#FFC107";
                return (
                  <div key={r.id} style={{ padding: "14px 18px", borderBottom: i < redemptions.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{r.item_title}</div>
                      <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
                        {new Date(r.redeemed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                      {r.admin_note && <div style={{ fontSize: 11, color: C.dim, marginTop: 4, fontStyle: "italic" }}>&ldquo;{r.admin_note}&rdquo;</div>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.gold }}>⭐ {r.points_spent}</div>
                    <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 999, background: `${statusColor}22`, color: statusColor, fontWeight: 700, textTransform: "uppercase" }}>
                      {r.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
