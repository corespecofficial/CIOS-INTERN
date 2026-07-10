"use client";

/**
 * Host portal top header — visual parity with the main app header.
 * Mirrors the chrome: Cmd+K search trigger on the left, then the theme
 * toggle / notification bell / role pill / profile avatar on the right.
 *
 * The bell is intentionally lightweight — it just opens the
 * /notifications page. The full bell+dropdown lives only in the main
 * app header to keep the host shell snappy and avoid hauling in the
 * realtime listener twice.
 */

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { listMyNotifications } from "@/app/actions/notifications";

interface Props {
  orgSlug: string;
  orgName: string;
  memberRole: "owner" | "org_admin" | "instructor" | "student" | "moderator" | "finance" | "support" | "mentor" | null;
  isSuperAdmin: boolean;
}

const ROLE_TINT: Record<string, { fg: string; bg: string }> = {
  owner:       { fg: "#FFC107", bg: "rgba(255,193,7,0.12)" },
  org_admin:   { fg: "#AB47BC", bg: "rgba(171,71,188,0.12)" },
  instructor:  { fg: "#26A69A", bg: "rgba(38,166,154,0.12)" },
  student:     { fg: "#1E88E5", bg: "rgba(30,136,229,0.12)" },
  moderator:   { fg: "#26C6DA", bg: "rgba(38,198,218,0.12)" },
  finance:     { fg: "#FFC107", bg: "rgba(255,193,7,0.12)" },
  support:     { fg: "#5C6BC0", bg: "rgba(92,107,192,0.12)" },
  mentor:      { fg: "#66BB6A", bg: "rgba(102,187,106,0.12)" },
  super_admin: { fg: "#EF5350", bg: "rgba(239,83,80,0.12)" },
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  org_admin: "Org Admin",
  instructor: "Instructor",
  student: "Intern",
  moderator: "Moderator",
  finance: "Finance",
  support: "Support",
  mentor: "Mentor",
};

export function HostHeader({ orgSlug, orgName, memberRole, isSuperAdmin }: Props) {
  const { user } = useUser();
  const [unread, setUnread] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await listMyNotifications(1);
        if (!cancelled && r.ok) setUnread(r.data!.unread);
      } catch { /* */ }
    };
    tick();
    const i = setInterval(tick, 90_000);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; clearInterval(i); window.removeEventListener("focus", onFocus); };
  }, []);

  const roleKey = isSuperAdmin ? "super_admin" : (memberRole || "student");
  const tint = ROLE_TINT[roleKey] || ROLE_TINT.student;
  const roleLabel = isSuperAdmin ? "Super Admin" : ROLE_LABELS[memberRole || ""] || "Guest";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        height: 72,
        minHeight: 72,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "0 32px",
        background: "var(--bg-secondary, #111827)",
        borderBottom: "1px solid var(--border-default, rgba(255,255,255,0.08))",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      {/* Org name shown on small screens where the sidebar may be off-canvas */}
      <div className="cios-show-mobile" style={{ display: "none", fontSize: 14, fontWeight: 800, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
        {orgName}
      </div>

      {/* Cmd+K search trigger — wires into the existing CommandPalette
          (mounted globally) via the cios:open-palette custom event. */}
      <div
        className="cios-host-search"
        style={{
          position: "relative",
          flex: "0 1 660px",
          maxWidth: 660,
          minWidth: 280,
        }}
      >
        <input
          type="text"
          readOnly
          onFocus={(e) => { e.target.blur(); window.dispatchEvent(new CustomEvent("cios:open-palette")); }}
          onClick={() => window.dispatchEvent(new CustomEvent("cios:open-palette"))}
          placeholder={`🔍  Search ${orgName}…`}
          style={{
            width: "100%",
            height: 52,
            padding: "0 72px 0 18px",
            borderRadius: 10,
            border: "1px solid var(--border-default, rgba(255,255,255,0.10))",
            background: "var(--bg-tertiary, rgba(255,255,255,0.04))",
            color: "var(--text-primary, #E8EDF5)",
            fontSize: 16,
            outline: "none",
            cursor: "pointer",
          }}
        />
        <span
          style={{
            position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 10,
              color: "var(--text-muted, #5A6478)",
              border: "1px solid var(--border-default, rgba(255,255,255,0.10))",
              borderRadius: 6,
              padding: "5px 8px",
              background: "rgba(255,255,255,0.03)",
              pointerEvents: "none",
            }}
        >
          Cmd+K
        </span>
      </div>

      {/* Right cluster */}
      <div
        className="cios-host-right"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 14,
          flexShrink: 0,
          marginLeft: "auto",
        }}
      >
        <ThemeToggle compact />

        {/* Bell — links to /notifications with unread badge */}
        <Link
          href="/notifications"
          aria-label="Notifications"
          title={`${unread} unread`}
          style={{
            position: "relative",
            width: 36,
            height: 36,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            color: "var(--text-secondary, #8892A4)",
            fontSize: 18,
            textDecoration: "none",
          }}
        >
          🔔
          {unread > 0 && (
            <span
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                minWidth: 16,
                height: 16,
                padding: "0 4px",
                borderRadius: 999,
                background: "linear-gradient(135deg,#EF5350,#E53935)",
                color: "#fff",
                fontSize: 9,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(239,83,80,0.4)",
              }}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>

        {/* Role pill */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: 38,
            padding: "0 18px",
            borderRadius: 999,
            background: tint.bg,
            color: tint.fg,
            border: `1px solid ${tint.fg}33`,
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {roleLabel}
        </span>

        {/* Avatar → profile */}
        <Link
          href="/profile"
          aria-label="My profile"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: "50%",
            overflow: "hidden",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.10)",
            flexShrink: 0,
          }}
        >
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt=""
              width={44}
              height={44}
              style={{ width: 44, height: 44, objectFit: "cover", aspectRatio: "1 / 1" }}
            />
          ) : (
            <span style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>
              {(user?.firstName || user?.username || "?")[0]?.toUpperCase()}
            </span>
          )}
        </Link>
      </div>

      {/* Hide org-name pill on desktop where the sidebar already shows it */}
      <style>{`
        @media (max-width: 768px) {
          .cios-show-mobile { display: block !important; }
          .cios-host-search { display: none !important; }
          .cios-host-right { gap: 8px !important; }
        }
        @media (max-width: 1100px) {
          .cios-host-search {
            flex-basis: 520px !important;
            min-width: 220px !important;
          }
        }
      `}</style>

      {/* Slug context — hidden but used for any future links per-org */}
      <span style={{ display: "none" }} data-org-slug={orgSlug} />
    </header>
  );
}
