"use client";

import { useState, useTransition, useEffect } from "react";
import toast from "react-hot-toast";
import type { GuardianInvite } from "@/app/actions/guardian-types";
import { revokeGuardianInvite, getOrCreateGuardianInvite } from "@/app/actions/guardian";

const AMBER = "#FB8C00";
const BG = "#0A0E1A";
const CARD_BG = "#111827";
const TEXT = "#E8EDF5";
const MUTED = "#8892A4";
const BORDER = "rgba(255,255,255,0.07)";

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never viewed";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) {
    const hours = Math.floor(diff / 3600000);
    if (hours === 0) return "Just now";
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}

interface Props {
  invite: GuardianInvite | null;
}

export function GuardianManageClient({ invite: initialInvite }: Props) {
  const [invite, setInvite] = useState<GuardianInvite | null>(initialInvite);
  const [copied, setCopied] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [isPending, start] = useTransition();

  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const guardianLink = invite ? `${origin}/guardian/${invite.token}` : `/guardian/${invite?.token ?? ""}`;

  const handleCopy = () => {
    if (!guardianLink) return;
    navigator.clipboard.writeText(guardianLink).then(() => {
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRevoke = () => {
    start(async () => {
      const res = await revokeGuardianInvite();
      if (!res.ok) { toast.error(res.error); setRevokeConfirm(false); return; }
      // Get new invite token
      const newRes = await getOrCreateGuardianInvite();
      if (newRes.ok && newRes.data) {
        setInvite(newRes.data);
        toast.success("Link revoked and a new one has been generated.");
      } else {
        setInvite(null);
        toast.success("Link revoked.");
      }
      setRevokeConfirm(false);
    });
  };

  return (
    <div style={{ background: BG, minHeight: "100vh", padding: "28px 24px", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 28 }}>👨‍👩‍👧</span>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: TEXT, margin: 0 }}>
              Parent/<span style={{ color: AMBER }}>Guardian</span> Access
            </h1>
          </div>
          <p style={{ color: MUTED, fontSize: 14, margin: 0, lineHeight: 1.6 }}>
            Share this link with a parent or guardian so they can monitor your progress — XP, level, performance, and tasks.
          </p>
        </div>

        {/* Link Card */}
        <div style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: "24px",
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 10 }}>Your Guardian Link</div>

          {invite ? (
            <>
              <div style={{
                display: "flex", gap: 8, alignItems: "stretch",
                background: BG, border: `1px solid ${BORDER}`, borderRadius: 8,
                padding: "10px 14px", marginBottom: 12,
                flexWrap: "wrap",
              }}>
                <span style={{
                  flex: 1, fontSize: 12, color: MUTED, wordBreak: "break-all",
                  fontFamily: "monospace", lineHeight: 1.5,
                }}>
                  {guardianLink}
                </span>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <button
                  onClick={handleCopy}
                  style={{
                    padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: copied ? "#43A047" : AMBER,
                    color: "#fff", fontSize: 13, fontWeight: 700, transition: "background 0.2s",
                  }}
                >
                  {copied ? "✅ Copied!" : "📋 Copy Link"}
                </button>

                {!revokeConfirm ? (
                  <button
                    onClick={() => setRevokeConfirm(true)}
                    style={{
                      padding: "10px 20px", borderRadius: 8, cursor: "pointer",
                      background: "transparent", color: "#EF5350", fontSize: 13, fontWeight: 700,
                      border: "1px solid rgba(239,83,80,0.3)",
                    }}
                  >
                    🔄 Revoke & Regenerate
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#EF5350" }}>This will invalidate the current link. Continue?</span>
                    <button
                      onClick={handleRevoke}
                      disabled={isPending}
                      style={{
                        padding: "8px 14px", borderRadius: 6, border: "none", cursor: isPending ? "not-allowed" : "pointer",
                        background: "#EF5350", color: "#fff", fontSize: 12, fontWeight: 700,
                        opacity: isPending ? 0.7 : 1,
                      }}
                    >
                      {isPending ? "Revoking…" : "Yes, Revoke"}
                    </button>
                    <button
                      onClick={() => setRevokeConfirm(false)}
                      style={{
                        padding: "8px 14px", borderRadius: 6, border: `1px solid ${BORDER}`,
                        background: "transparent", color: MUTED, fontSize: 12, cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Last viewed */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)",
                border: `1px solid ${BORDER}`,
              }}>
                <span style={{ fontSize: 16 }}>👁️</span>
                <span style={{ fontSize: 13, color: MUTED }}>
                  Last viewed:{" "}
                  <strong style={{ color: invite.last_viewed_at ? TEXT : MUTED }}>
                    {relativeTime(invite.last_viewed_at)}
                  </strong>
                </span>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
              <div style={{ fontSize: 14, color: MUTED }}>Failed to load guardian invite. Please refresh the page.</div>
            </div>
          )}
        </div>

        {/* Privacy Note */}
        <div style={{
          padding: "16px 18px",
          borderRadius: 10,
          background: `${AMBER}08`,
          border: `1px solid ${AMBER}25`,
          fontSize: 13,
          color: MUTED,
          lineHeight: 1.7,
        }}>
          <div style={{ fontWeight: 700, color: AMBER, marginBottom: 6 }}>🔒 Privacy & Security</div>
          Your guardian can <strong style={{ color: TEXT }}>ONLY</strong> see your XP, level, performance score, and task completion rate. They <strong style={{ color: TEXT }}>cannot</strong> see messages, community posts, or any personal content. You can revoke access at any time to generate a new link.
        </div>
      </div>
    </div>
  );
}
