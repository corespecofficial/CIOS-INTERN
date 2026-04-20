"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { removeFromWatchlist } from "@/app/actions/investor";

export function WatchlistRemoveButton({ pitchId }: { pitchId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const onClick = () => start(async () => {
    const r = await removeFromWatchlist(pitchId);
    if (r.ok) { toast.success("Removed"); router.refresh(); }
    else toast.error(r.error);
  });
  return (
    <button
      onClick={onClick}
      disabled={pending}
      style={{
        padding: "7px 14px",
        background: "rgba(239,83,80,0.1)",
        color: "#F87171",
        border: "1px solid rgba(239,83,80,0.3)",
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 800,
        cursor: pending ? "wait" : "pointer",
      }}
    >
      {pending ? "…" : "Remove"}
    </button>
  );
}
