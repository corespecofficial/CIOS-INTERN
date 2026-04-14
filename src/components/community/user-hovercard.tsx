"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getUserMiniProfile, type MiniProfile } from "@/app/actions/community";

/**
 * Wraps a trigger element (avatar, name) and shows a mini profile card on
 * hover (desktop) or tap (mobile). Uses a small cache to avoid refetching
 * the same user repeatedly inside one session.
 */

const cache = new Map<string, MiniProfile>();

export function UserHovercard({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<MiniProfile | null>(() => cache.get(userId) || null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const show = () => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 280) });
    }
    setOpen(true);
  };
  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setOpen(false), 180);
  };

  useEffect(() => {
    if (!open || profile) return;
    let cancelled = false;
    (async () => {
      const r = await getUserMiniProfile(userId);
      if (!cancelled && r.ok) {
        cache.set(userId, r.data!);
        setProfile(r.data!);
      }
    })();
    return () => { cancelled = true; };
  }, [open, userId, profile]);

  return (
    <>
      <span ref={triggerRef}
        onMouseEnter={show} onMouseLeave={scheduleHide}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); if (!open) show(); }}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
      >
        {children}
      </span>
      {open && pos && (
        <div
          onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current); }}
          onMouseLeave={scheduleHide}
          style={{
            position: "fixed", top: pos.top, left: pos.left, zIndex: 300,
            width: 260, background: "#111827", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12, padding: 14, boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
          }}>
          {!profile ? (
            <div style={{ fontSize: 12, color: "#8892A4" }}>Loading…</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#1E88E5", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16 }}>
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.name}</div>
                  <div style={{ fontSize: 11, color: "#8892A4", textTransform: "capitalize" }}>{profile.role.replace(/_/g, " ")}</div>
                </div>
              </div>
              {profile.bio && <div style={{ fontSize: 12, color: "#E8EDF5", marginTop: 8, lineHeight: 1.5 }}>{profile.bio}</div>}
              <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 11 }}>
                <Stat label="Rep" value={profile.reputation} color="#FFC107" />
                <Stat label="Posts" value={profile.postCount} color="#1E88E5" />
                <Stat label="Replies" value={profile.commentCount} color="#66BB6A" />
              </div>
              <Link href={`/community/profile/${profile.id}`} style={{ display: "block", marginTop: 10, padding: "7px 10px", background: "linear-gradient(135deg,#1E88E5,#1565C0)", color: "#fff", textAlign: "center", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                View full profile
              </Link>
            </>
          )}
        </div>
      )}
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: 13, fontWeight: 800, color }}>{value}</span>
      <span style={{ fontSize: 9, color: "#8892A4", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
    </div>
  );
}
