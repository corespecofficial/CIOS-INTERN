"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeSuperAdminCode } from "@/app/actions/super-admin-codes";

interface Code {
  id: string;
  code: string;
  role: string;
  notes: string | null;
  expires_at: string;
  max_uses: number;
  use_count: number;
  redeemed_at: string | null;
  redeemed_user: { id: string; name: string; email: string } | null;
  created_at: string;
}

export function CodeRow({ code }: { code: Code }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const expired = new Date(code.expires_at) <= new Date();
  const used = code.use_count >= code.max_uses;

  function revoke() {
    if (!confirm(`Revoke ${code.code}? It will no longer be redeemable.`)) return;
    start(async () => {
      await revokeSuperAdminCode(code.id);
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#111827", border: "1px solid #1F2937", borderRadius: 10 }}>
      <code style={{ fontSize: 13, fontFamily: "ui-monospace, monospace", color: used ? "#5A6478" : "#26A69A", letterSpacing: 0.5, opacity: expired ? 0.5 : 1 }}>
        {code.code}
      </code>
      <span style={{ fontSize: 11, color: "#8892A4", padding: "2px 8px", background: "#1E2937", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.5 }}>{code.role}</span>
      <div style={{ flex: 1, fontSize: 12, color: "#8892A4" }}>
        {code.notes && <span>{code.notes} · </span>}
        {used ? (
          <span>Redeemed by {code.redeemed_user?.email ?? "—"} on {code.redeemed_at ? new Date(code.redeemed_at).toLocaleDateString() : "—"}</span>
        ) : expired ? (
          <span>Expired {new Date(code.expires_at).toLocaleDateString()}</span>
        ) : (
          <span>Expires {new Date(code.expires_at).toLocaleDateString()}</span>
        )}
      </div>
      {!used && !expired && (
        <button onClick={revoke} disabled={pending} style={{ padding: "4px 10px", background: "transparent", color: "#FF8A80", border: "1px solid #5C2424", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
          {pending ? "…" : "Revoke"}
        </button>
      )}
    </div>
  );
}
