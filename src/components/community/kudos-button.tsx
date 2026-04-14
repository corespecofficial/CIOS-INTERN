"use client";

import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { toggleKudos, getKudosState } from "@/app/actions/peer-recognition";

export function KudosButton({ userId, meId }: { userId: string; meId: string | null }) {
  const [given, setGiven] = useState(false);
  const [total, setTotal] = useState(0);
  const [busy, start] = useTransition();

  useEffect(() => { getKudosState(userId).then((r) => { if (r.ok) { setGiven(r.data!.given); setTotal(r.data!.total); } }); }, [userId]);

  if (!meId || meId === userId) {
    if (total === 0) return null;
    return (
      <div style={chipStyle(false)}>
        <span>👏</span>
        <span style={{ fontWeight: 800 }}>{total}</span>
        <span style={{ fontSize: 10, color: "#8892A4" }}>kudos</span>
      </div>
    );
  }

  return (
    <button onClick={() => start(async () => {
      const r = await toggleKudos(userId);
      if (!r.ok) { toast.error(r.error); return; }
      setGiven(r.data!.given);
      setTotal(r.data!.total);
      if (r.data!.given) toast.success("👏 Kudos sent");
    })} disabled={busy} style={chipStyle(given)}>
      <span>👏</span>
      <span style={{ fontWeight: 800 }}>{total}</span>
      <span style={{ fontSize: 10 }}>{given ? "kudos given" : "Give kudos"}</span>
    </button>
  );
}

function chipStyle(given: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 12px", borderRadius: 999,
    background: given ? "rgba(255,193,7,0.14)" : "#111827",
    border: `1px solid ${given ? "rgba(255,193,7,0.35)" : "rgba(255,255,255,0.08)"}`,
    color: given ? "#FFC107" : "#E8EDF5",
    fontSize: 12, cursor: "pointer",
  };
}
