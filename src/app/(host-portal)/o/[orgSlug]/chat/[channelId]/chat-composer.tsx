"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postMessage } from "@/app/actions/org-portal";

export function ChatComposer({ orgId, channelId }: { orgId: string; channelId: string }) {
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function send() {
    if (body.trim().length === 0) return;
    setErr(null);
    start(async () => {
      const r = await postMessage(orgId, channelId, body);
      if (!r.ok) { setErr(r.error); return; }
      setBody("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); send(); }}
      style={{ borderTop: "1px solid #1F2937", padding: 12, display: "flex", gap: 8, flexDirection: "column" }}
    >
      {err && <div style={{ padding: "6px 10px", background: "#3D1F1F", color: "#FF8A80", fontSize: 12, borderRadius: 6 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Message  (Enter to send · Shift+Enter for new line)"
          rows={1}
          style={{ flex: 1, padding: "10px 12px", background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 6, color: "#E8EDF5", fontSize: 13, resize: "none", fontFamily: "inherit", maxHeight: 120 }}
        />
        <button type="submit" disabled={pending || body.trim().length === 0} style={{ padding: "10px 18px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {pending ? "…" : "Send"}
        </button>
      </div>
    </form>
  );
}
