"use client";

import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { getMyFreezes, buyStreakFreeze } from "@/app/actions/engagement-v2";

export function StreakFreezeCard() {
  const [state, setState] = useState<{ active: number; costXp: number } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    getMyFreezes().then((r) => { if (r.ok) setState(r.data!); });
  }, []);

  const onBuy = () => start(async () => {
    const r = await buyStreakFreeze();
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`🧊 Freeze banked · ${r.data!.remaining} active`);
    setState((s) => s ? { ...s, active: r.data!.remaining } : s);
    window.dispatchEvent(new CustomEvent("xp-burst", { detail: { amount: -(state?.costXp || 0), label: "Streak freeze" } }));
  });

  if (!state) return null;

  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ fontSize: 32 }}>🧊</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>Streak freeze</div>
        <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>
          {state.active > 0
            ? `${state.active} active — protects one missed day`
            : `Miss a day? Buy a freeze for ${state.costXp} XP.`}
        </div>
      </div>
      <button onClick={onBuy} disabled={pending} style={{ padding: "8px 14px", background: "transparent", color: "#26C6DA", border: "1px solid rgba(38,198,218,0.3)", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
        Buy · {state.costXp} XP
      </button>
    </div>
  );
}
