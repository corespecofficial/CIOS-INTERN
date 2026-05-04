"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createChannel } from "@/app/actions/org-portal";

export function ChannelComposer({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    setErr(null);
    start(async () => {
      const r = await createChannel(orgId, name);
      if (!r.ok) { setErr(r.error); return; }
      setName(""); setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ padding: "8px 14px", background: "transparent", color: "#1E88E5", border: "1px solid #1E88E5", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
        + New channel
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="channel-name"
        style={{ flex: 1, padding: "8px 12px", background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 6, color: "#E8EDF5", fontSize: 13 }}
        autoFocus
      />
      <button onClick={submit} disabled={pending || name.trim().length < 2} style={{ padding: "8px 14px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
        {pending ? "…" : "Create"}
      </button>
      <button onClick={() => { setOpen(false); setErr(null); }} disabled={pending} style={{ padding: "8px 12px", background: "transparent", color: "#8892A4", border: "1px solid #1F2937", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
        Cancel
      </button>
      {err && <span style={{ color: "#FF8A80", fontSize: 12 }}>{err}</span>}
    </div>
  );
}
