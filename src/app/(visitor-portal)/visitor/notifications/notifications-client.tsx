"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { markAllNotificationsRead } from "@/app/actions/notifications";

function MarkAllReadButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => start(async () => {
        const r = await markAllNotificationsRead();
        if (!r.ok) { toast.error(r.error || "Failed"); return; }
        router.refresh();
      })}
      disabled={pending}
      style={{ padding: "7px 14px", background: "transparent", color: "#1E88E5", border: "1px solid rgba(30,136,229,0.40)", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: pending ? "not-allowed" : "pointer", fontFamily: "inherit" }}
    >
      {pending ? "Marking…" : "Mark all read"}
    </button>
  );
}

export const NotificationsClient = { MarkAllReadButton };
