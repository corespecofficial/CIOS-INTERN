"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { transferOrgOwnership } from "@/app/actions/org-portal";

interface Props {
  orgId: string;
  orgSlug: string;
  orgName: string;
  targetUserId: string;
  targetName: string;
}

/**
 * Owner-only "Make owner" control with a typed-confirmation guard.
 *
 * Why typed confirmation: ownership transfer is irreversible from the
 * portal — once you click, you're no longer the owner and can't
 * transfer it back unless the new owner agrees to flip it back. The
 * user must type the org slug to enable the Confirm button. Same
 * pattern GitHub / Vercel use for "delete repository" and similar
 * one-way doors.
 */
export function TransferOwnerButton({ orgId, orgSlug, orgName, targetUserId, targetName }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const slugLower = orgSlug.toLowerCase();
  const armed = confirmText.trim().toLowerCase() === slugLower;

  function fire() {
    if (!armed) return;
    start(async () => {
      const r = await transferOrgOwnership(orgId, targetUserId, confirmText);
      if (!r.ok) { toast.error(r.error); return; }
      toast.success(`${targetName} is now the owner`);
      setOpen(false);
      setConfirmText("");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ padding: "5px 10px", background: "transparent", color: "#FFC107", border: "1px solid rgba(255,193,7,0.40)", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
      >
        Make owner
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => { if (!pending) { setOpen(false); setConfirmText(""); } }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200 }}
      />
      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed", left: "50%", top: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(92vw, 460px)",
          background: "#111827",
          border: "1px solid rgba(255,193,7,0.40)",
          borderRadius: 14,
          padding: 24,
          zIndex: 201,
          fontFamily: "'Nunito', system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px", color: "#FFC107" }}>
          Transfer ownership of {orgName}?
        </h2>
        <p style={{ fontSize: 13, color: "#C7CFD8", margin: "0 0 14px", lineHeight: 1.6 }}>
          <strong style={{ color: "#E8EDF5" }}>{targetName}</strong> will become the new owner of this org.
          You&apos;ll be demoted to <strong>org_admin</strong>, keeping member-management access but losing
          billing, deletion, and ownership-transfer rights.
        </p>
        <p style={{ fontSize: 12, color: "#FFA726", margin: "0 0 16px", padding: "8px 12px", background: "rgba(255,167,38,0.08)", borderRadius: 6, lineHeight: 1.5 }}>
          This is reversible only if {targetName} agrees to transfer it back. Type the org slug
          <strong> {orgSlug} </strong> below to confirm.
        </p>

        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={orgSlug}
          autoFocus
          autoComplete="off"
          aria-label={`Type ${orgSlug} to confirm`}
          style={{ width: "100%", padding: "12px 14px", background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 8, color: "#E8EDF5", fontSize: 14, fontFamily: "ui-monospace, monospace", letterSpacing: 0.5 }}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => { setOpen(false); setConfirmText(""); }}
            disabled={pending}
            style={{ padding: "10px 18px", background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: pending ? "not-allowed" : "pointer" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={fire}
            disabled={!armed || pending}
            style={{ padding: "10px 20px", background: armed && !pending ? "linear-gradient(135deg, #FFC107, #FF9800)" : "rgba(255,193,7,0.20)", color: armed && !pending ? "#0A0E1A" : "#5A6478", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: armed && !pending ? "pointer" : "not-allowed" }}
          >
            {pending ? "Transferring…" : "Transfer ownership"}
          </button>
        </div>
      </div>
    </>
  );
}
