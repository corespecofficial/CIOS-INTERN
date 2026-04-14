"use client";

import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { getReactions, toggleReaction, type ReactionSummary } from "@/app/actions/engagement-v2";
import { REACTION_META, type ReactionKind } from "@/lib/engagement-shared";

export function LessonReactions({ moduleId }: { moduleId: string }) {
  const [rows, setRows] = useState<ReactionSummary[] | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    getReactions(moduleId).then((r) => { if (r.ok) setRows(r.data!); });
  }, [moduleId]);

  const onReact = (kind: ReactionKind) => start(async () => {
    const optimistic = rows?.map((r) => {
      if (r.kind !== kind) return r;
      return { ...r, reacted: !r.reacted, count: r.reacted ? Math.max(0, r.count - 1) : r.count + 1 };
    }) || null;
    setRows(optimistic);
    const res = await toggleReaction(moduleId, kind);
    if (!res.ok) { toast.error(res.error); const r = await getReactions(moduleId); if (r.ok) setRows(r.data!); }
  });

  if (!rows) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0 18px" }}>
      {rows.map((r) => {
        const meta = REACTION_META[r.kind];
        return (
          <button
            key={r.kind}
            onClick={() => onReact(r.kind)}
            disabled={pending}
            title={meta.label}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 999,
              background: r.reacted ? `${meta.color}22` : "#0A0E1A",
              border: `1px solid ${r.reacted ? meta.color : "rgba(255,255,255,0.08)"}`,
              color: r.reacted ? meta.color : "#B0BEC5",
              cursor: "pointer", fontSize: 13, fontWeight: 700,
              transition: "transform 0.1s",
            }}
          >
            <span style={{ fontSize: 16 }}>{meta.emoji}</span>
            <span>{r.count}</span>
          </button>
        );
      })}
    </div>
  );
}
