"use client";

import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { getMyDailyQuests, claimQuest, type QuestState } from "@/app/actions/engagement-v2";

export function DailyQuestCard() {
  const [quests, setQuests] = useState<QuestState[] | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    getMyDailyQuests().then((r) => { if (r.ok) setQuests(r.data!); });
  }, []);

  const onClaim = (q: QuestState) => start(async () => {
    const r = await claimQuest(q.id);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`+${r.data!.xp} XP — ${q.title}`);
    setQuests((prev) => prev?.map((x) => x.id === q.id ? { ...x, claimed: true } : x) || null);
    window.dispatchEvent(new CustomEvent("xp-burst", { detail: { amount: r.data!.xp, label: q.title } }));
  });

  if (!quests) return null;
  if (quests.length === 0) return null;

  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>🎯 Today&apos;s quests</div>
          <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>Resets at midnight UTC</div>
        </div>
        <div style={{ fontSize: 11, color: "#8892A4" }}>
          {quests.filter((q) => q.claimed).length}/{quests.length} done
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {quests.map((q) => {
          const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
          const ready = q.progress >= q.target && !q.claimed;
          return (
            <div key={q.id} style={{ background: q.claimed ? "rgba(102,187,106,0.08)" : "#0A0E1A", border: `1px solid ${q.claimed ? "rgba(102,187,106,0.2)" : "rgba(255,255,255,0.05)"}`, borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{q.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{q.title}</div>
                  <div style={{ fontSize: 10, color: "#8892A4", marginTop: 1 }}>{q.description}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: q.claimed ? "#66BB6A" : "#FFC107" }}>
                  +{q.bonusXp} XP
                </div>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: q.claimed ? "#66BB6A" : "linear-gradient(90deg,#1E88E5,#AB47BC)", transition: "width 0.3s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <div style={{ fontSize: 10, color: "#8892A4" }}>{q.progress}/{q.target}</div>
                {q.claimed ? (
                  <span style={{ fontSize: 10, color: "#66BB6A", fontWeight: 700 }}>✓ CLAIMED</span>
                ) : ready ? (
                  <button onClick={() => onClaim(q)} disabled={pending} style={{ padding: "4px 12px", background: "linear-gradient(135deg,#66BB6A,#43A047)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    Claim
                  </button>
                ) : (
                  <span style={{ fontSize: 10, color: "#5A6478" }}>In progress</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
