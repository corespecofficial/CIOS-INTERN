"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { inviteByEmail, revokeEmailInvite, type PendingInvite } from "@/app/actions/org-invites";

type InviteRole = "org_admin" | "instructor" | "student";

interface Props {
  orgId: string;
  orgSlug: string;
  initialPending: PendingInvite[];
}

const ROLE_TINTS: Record<InviteRole, string> = {
  org_admin:  "#A855F7",
  instructor: "#26C6DA",
  student:    "#1E88E5",
};

const ROLE_LABELS: Record<InviteRole, string> = {
  org_admin:  "Org admin",
  instructor: "Instructor",
  student:    "Student",
};

/**
 * Direct-invite-by-email panel for owners + org_admins.
 *
 * Pairs with the public-code panel on /o/<slug>/settings: this is for
 * naming a SPECIFIC person (a co-instructor you know personally), the
 * codes panel is for broadcast (sharing on social).
 */
export function InvitePanel({ orgId, orgSlug, initialPending }: Props) {
  const [pending, setPending] = useState(initialPending);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("student");
  const [open, setOpen] = useState(false);
  const [busy, start] = useTransition();
  const [lastInvite, setLastInvite] = useState<{ email: string; token: string; existingUser: boolean } | null>(null);
  const router = useRouter();

  function send() {
    if (!email.trim()) { toast.error("Enter an email"); return; }
    start(async () => {
      const r = await inviteByEmail(orgId, email, role);
      if (!r.ok) { toast.error(r.error); return; }
      const link = `/onboarding/enrollment?code=${encodeURIComponent(r.data!.token)}`;
      setLastInvite({ email: email.trim().toLowerCase(), token: r.data!.token, existingUser: r.data!.existingUser });
      setEmail("");
      toast.success(r.data!.existingUser
        ? `Invite sent + in-app notification delivered`
        : `Invite created — share the link with them`);
      // Optimistic add to the pending list (server will catch up via
      // router.refresh, but we want the new row visible immediately).
      setPending((prev) => [{
        id: `tmp-${r.data!.token}`,
        email: email.trim().toLowerCase(),
        role,
        token: r.data!.token,
        expires_at: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        invited_by_name: "you",
      }, ...prev.filter((p) => p.email !== email.trim().toLowerCase())]);
      // Suppress unused link warning while keeping the var documenting the format.
      void link;
      router.refresh();
    });
  }

  function revoke(id: string, inviteEmail: string) {
    if (!confirm(`Revoke the invite to ${inviteEmail}? They can't redeem it after this.`)) return;
    start(async () => {
      const r = await revokeEmailInvite(orgId, id);
      if (!r.ok) { toast.error(r.error); return; }
      setPending((prev) => prev.filter((p) => p.id !== id));
      toast.success("Invite revoked");
    });
  }

  function shareLink(token: string) {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/onboarding/enrollment?code=${encodeURIComponent(token)}`;
  }

  function copy(text: string, label: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    }
  }

  return (
    <section style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 16, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>📨 Invite by email</div>
          <div style={{ fontSize: 12, color: "#8892A4", marginTop: 2 }}>
            Direct invitation to a specific person. For broadcast codes, see Settings → Class enrollment codes.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          style={{ padding: "8px 14px", background: open ? "transparent" : "linear-gradient(135deg, #1E88E5, #1565C0)", color: open ? "#8892A4" : "#fff", border: open ? "1px solid #1F2937" : "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
        >
          {open ? "Close" : "+ New invite"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 140px auto", gap: 8, alignItems: "center" }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="recipient@example.com"
            disabled={busy}
            aria-label="Email address"
            style={{ padding: "10px 12px", background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 6, color: "#E8EDF5", fontSize: 13 }}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as InviteRole)}
            disabled={busy}
            aria-label="Role"
            style={{ padding: "10px 12px", background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 6, color: "#E8EDF5", fontSize: 13 }}
          >
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="org_admin">Org admin</option>
          </select>
          <button type="button" onClick={send} disabled={busy || !email.trim()} style={{ padding: "10px 18px", background: busy || !email.trim() ? "rgba(30,136,229,0.30)" : "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: busy || !email.trim() ? "not-allowed" : "pointer" }}>
            {busy ? "Sending…" : "Send invite"}
          </button>
        </div>
      )}

      {lastInvite && (
        <div style={{ marginTop: 12, padding: 12, background: "rgba(38,166,154,0.10)", border: "1px solid rgba(38,166,154,0.30)", borderRadius: 8, fontSize: 12, color: "#26A69A" }}>
          <strong>{lastInvite.existingUser ? "✓ Sent." : "✓ Created."}</strong>
          {lastInvite.existingUser
            ? <> The recipient already has a CIOS account; they got an in-app notification.</>
            : <> They don&apos;t have a CIOS account yet — share this link with them out-of-band:</>
          }
          <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <code style={{ fontSize: 11, padding: "3px 8px", background: "rgba(255,255,255,0.06)", color: "#E8EDF5", borderRadius: 4, fontFamily: "ui-monospace, monospace" }}>{shareLink(lastInvite.token)}</code>
            <button type="button" onClick={() => copy(shareLink(lastInvite.token), "Link")} style={{ padding: "3px 10px", background: "transparent", color: "#26A69A", border: "1px solid rgba(38,166,154,0.30)", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>Copy link</button>
            <button type="button" onClick={() => copy(lastInvite.token, "Code")} style={{ padding: "3px 10px", background: "transparent", color: "#26A69A", border: "1px solid rgba(38,166,154,0.30)", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>Copy code only</button>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 }}>
            Pending invites ({pending.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {pending.map((p) => {
              const r = p.role as InviteRole;
              const expiresIn = Math.max(0, Math.ceil((new Date(p.expires_at).getTime() - Date.now()) / 86400000));
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#0A0E1A", borderRadius: 6, fontSize: 12 }}>
                  <span style={{ flex: 1, color: "#E8EDF5" }}>{p.email}</span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: `${ROLE_TINTS[r]}22`, color: ROLE_TINTS[r], textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>
                    {ROLE_LABELS[r]}
                  </span>
                  <span style={{ color: "#5A6478" }}>{expiresIn}d left</span>
                  <button type="button" onClick={() => copy(shareLink(p.token), "Link")} style={{ padding: "3px 10px", background: "transparent", color: "#1E88E5", border: "1px solid rgba(30,136,229,0.30)", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>Copy</button>
                  <button type="button" onClick={() => revoke(p.id, p.email)} disabled={busy} style={{ padding: "3px 10px", background: "transparent", color: "#FF8A80", border: "1px solid rgba(239,83,80,0.30)", borderRadius: 5, fontSize: 11, cursor: busy ? "not-allowed" : "pointer" }}>Revoke</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
