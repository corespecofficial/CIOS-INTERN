"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { setOrgStatus } from "@/app/actions/super-admin-orgs";

type OrgStatus = "active" | "suspended" | "archived";

interface Props {
  orgId: string;
  status: OrgStatus;
}

/**
 * Inline suspend / archive / reactivate controls for super-admin.
 *
 * Suspend & archive prompt for a reason (sent to the owner as the
 * notification body). Reactivate is one-click — owners are happy to
 * be unblocked, no need to gate it. Each action confirms before firing
 * because all three are observable to the org owner.
 */
export function OrgStatusControls({ orgId, status }: Props) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function flip(next: OrgStatus, defaultPrompt: string) {
    if (status === next) return;
    let reason: string | null = null;
    if (next !== "active") {
      reason = window.prompt(defaultPrompt, "");
      if (reason === null) return; // cancelled
    } else {
      if (!confirm("Reactivate this org? Members will regain access immediately.")) return;
    }
    start(async () => {
      const r = await setOrgStatus(orgId, next, reason || undefined);
      if (!r.ok) { toast.error(r.error); return; }
      toast.success(`Org → ${next}`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={pending}
        aria-label="More actions"
        style={{ width: 28, height: 28, padding: 0, background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: pending ? "not-allowed" : "pointer" }}
      >
        ⋯
      </button>
      {open && (
        <>
          {/* click-outside catcher */}
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 100, minWidth: 200, background: "#0F1626", border: "1px solid #1F2937", borderRadius: 10, padding: 6, boxShadow: "0 16px 32px -16px rgba(0,0,0,0.6)" }}>
            {status !== "active" && (
              <MenuItem
                label="✅ Reactivate"
                tint="#26A69A"
                onClick={() => flip("active", "")}
                disabled={pending}
              />
            )}
            {status !== "suspended" && (
              <MenuItem
                label="⏸ Suspend (reversible)"
                tint="#FFA726"
                hint="Members lose access. Owner gets notified."
                onClick={() => flip("suspended", "Why are you suspending this org? (sent to the owner)")}
                disabled={pending}
              />
            )}
            {status !== "archived" && (
              <MenuItem
                label="🗄 Archive (read-only)"
                tint="#5A6478"
                hint="Past content preserved; no new activity."
                onClick={() => flip("archived", "Why are you archiving this org? (sent to the owner)")}
                disabled={pending}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ label, hint, tint, onClick, disabled }: {
  label: string;
  hint?: string;
  tint: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", background: "transparent", border: "none", borderRadius: 6, color: "#E8EDF5", fontSize: 12, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit" }}
    >
      <span style={{ color: tint }}>{label}</span>
      {hint && <div style={{ fontSize: 10, color: "#5A6478", marginTop: 2, fontWeight: 400 }}>{hint}</div>}
    </button>
  );
}
