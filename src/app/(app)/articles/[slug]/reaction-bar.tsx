"use client";

import { useState, useTransition } from "react";
import { toggleArticleReaction } from "@/app/actions/articles";

export default function ArticleReactionBar({ articleId, initialReacted, initialCount }: { articleId: string; initialReacted: boolean; initialCount: number }) {
  const [reacted, setReacted] = useState(initialReacted);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await toggleArticleReaction(articleId);
      if (res.ok && res.data) {
        setReacted(res.data.reacted);
        setCount((c) => c + (res.data!.reacted ? 1 : -1));
      }
    });
  }

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <button
        onClick={toggle}
        disabled={pending}
        style={{
          padding: "10px 18px",
          background: reacted ? "rgba(255,107,43,0.15)" : "transparent",
          color: reacted ? "#FF7043" : "#E8EDF5",
          border: `1px solid ${reacted ? "rgba(255,107,43,0.4)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: 9,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        🔥 {reacted ? "Reacted" : "Clap"} · {count}
      </button>
      <span style={{ fontSize: 12, color: "#8892A4" }}>
        {count === 0 ? "Be the first to react" : count === 1 ? "1 reaction" : `${count} reactions`}
      </span>
    </div>
  );
}
