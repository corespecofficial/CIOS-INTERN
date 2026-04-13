"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";

export interface WalletTx { id: string; type: string; amount: number; description: string; created_at: string; }

const CREDIT_TYPES = new Set(["credit", "reward", "payment", "refund", "stipend", "bonus"]);
function isCredit(type: string) { return CREDIT_TYPES.has(type); }

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (sameDay) return `Today, ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  if (d.toDateString() === yest.toDateString()) return `Yesterday, ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + ", " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function WalletClient({ balance, txs, monthDelta }: { balance: number; txs: WalletTx[]; monthDelta: number }) {
  const [filter, setFilter] = useState<"all" | "credit" | "debit">("all");

  const { earnings, fines, rewards } = useMemo(() => {
    let earnings = 0, fines = 0, rewards = 0;
    for (const t of txs) {
      if (t.type === "fine") fines += t.amount;
      else if (t.type === "reward" || t.type === "bonus") rewards += t.amount;
      else if (isCredit(t.type)) earnings += t.amount;
    }
    return { earnings, fines, rewards };
  }, [txs]);

  const filtered = useMemo(() => {
    if (filter === "all") return txs;
    if (filter === "credit") return txs.filter((t) => isCredit(t.type));
    return txs.filter((t) => !isCredit(t.type));
  }, [filter, txs]);

  const doAction = (label: string) => {
    const msgs: Record<string, string> = {
      "Top Up": "Top-up is coming soon — payment integration in progress 💰",
      "Withdraw": "Withdrawals open once payment gateway launches",
      "Transfer": "Peer transfers launching with payments release",
      "Pay Fine": "Fine payment unlocks after payment integration",
    };
    toast(msgs[label] || "Coming soon", { icon: "🔒" });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0A0E1A", color: "#E8EDF5", padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>💰 Wallet</h1>
        <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, background: "rgba(255,193,7,0.15)", color: "#FFC107", fontWeight: 700 }}>Payments integration · pending</span>
      </div>

      <div style={{ background: "linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)", borderRadius: 16, padding: 28, position: "relative", overflow: "hidden", marginBottom: 20 }}>
        <div style={{ position: "absolute", top: -40, right: -20, width: 160, height: 160, background: "rgba(255,255,255,0.06)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: -30, left: -20, width: 120, height: 120, background: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>💳</span>
            <span style={{ color: "rgba(200,220,255,0.8)", fontSize: 14 }}>Total Balance</span>
          </div>
          <p style={{ fontSize: 40, fontWeight: 800, color: "#fff", margin: "0 0 6px 0" }}>₦{balance.toLocaleString()}</p>
          <p style={{ color: "rgba(200,220,255,0.85)", fontSize: 14, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            {monthDelta >= 0 ? "📈" : "📉"} {monthDelta >= 0 ? "+" : ""}₦{Math.abs(monthDelta).toLocaleString()} in the last 30 days
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Earnings (30d)", amount: earnings, color: "#66BB6A", bg: "rgba(102,187,106,0.1)" },
          { label: "Fines (30d)", amount: fines, color: "#EF5350", bg: "rgba(239,83,80,0.1)" },
          { label: "Rewards (30d)", amount: rewards, color: "#FFC107", bg: "rgba(255,193,7,0.1)" },
        ].map((bal) => (
          <div key={bal.label} style={{ background: "#111827", borderRadius: 14, padding: 18, border: "1px solid rgba(255,255,255,0.07)", textAlign: "center" }}>
            <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: bal.color, background: bal.bg, marginBottom: 8 }}>{bal.label}</span>
            <p style={{ fontSize: 20, fontWeight: 800, color: bal.color, margin: 0 }}>₦{bal.amount.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Top Up", emoji: "➕", bg: "#66BB6A" },
          { label: "Withdraw", emoji: "📤", bg: "#1E88E5" },
          { label: "Transfer", emoji: "📨", bg: "#AB47BC" },
          { label: "Pay Fine", emoji: "💳", bg: "#EF5350" },
        ].map((action) => (
          <button key={action.label} onClick={() => doAction(action.label)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 8 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: action.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{action.emoji}</div>
            <span style={{ fontSize: 12, color: "#8892A4" }}>{action.label}</span>
          </button>
        ))}
      </div>

      <div style={{ background: "#111827", borderRadius: 16, padding: 22, border: "1px solid rgba(255,255,255,0.07)", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Recent Transactions</h2>
          <div style={{ display: "flex", gap: 4, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 3 }}>
            {(["all", "credit", "debit"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", background: filter === f ? "rgba(30,136,229,0.18)" : "transparent", color: filter === f ? "#1E88E5" : "#8892A4", border: "none", textTransform: "capitalize" }}>{f}</button>
            ))}
          </div>
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: "32px 10px", textAlign: "center", color: "#5A6478", fontSize: 13 }}>
            {txs.length === 0 ? "No transactions yet. Your activity will appear here." : "No transactions match this filter."}
          </div>
        )}

        {filtered.map((tx, i) => {
          const credit = isCredit(tx.type);
          return (
            <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: credit ? "rgba(102,187,106,0.12)" : "rgba(239,83,80,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                {credit ? "↙" : "↗"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#E8EDF5", margin: 0, textTransform: "capitalize", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.description}</p>
                <p style={{ fontSize: 11, color: "#8892A4", margin: "2px 0 0 0", textTransform: "capitalize" }}>{tx.type}</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: credit ? "#66BB6A" : "#EF5350" }}>
                  {credit ? "+" : "-"}₦{tx.amount.toLocaleString()}
                </p>
                <p style={{ fontSize: 11, color: "#5A6478", margin: "2px 0 0 0" }}>{formatTime(tx.created_at)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
