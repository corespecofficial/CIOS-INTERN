"use client";

/**
 * Live activity-feed for the host dashboard. Renders the server-fetched
 * initial list, then subscribes to `org-activity:<orgId>` over Ably and
 * prepends new events as they arrive. Falls back gracefully to the
 * initial list when Ably isn't configured (the hook is a no-op).
 *
 * Auto-revalidates the page on mount + on focus so the relative
 * timestamps ("3m ago") don't go stale on long-open tabs without
 * re-fetching the full list.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useOrgActivityRealtime, type OrgActivityEvent } from "@/lib/use-org-activity-realtime";

export interface ActivityRow {
  id: string;
  action: string;
  target: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  actor_name: string | null;
}

function describeActivity(row: ActivityRow): { emoji: string; text: string } {
  const who = row.actor_name || "Someone";
  const m = row.meta as Record<string, string | number | boolean | undefined>;
  switch (row.action) {
    case "org.created":         return { emoji: "🎉", text: `Org created` };
    case "org.suspended":       return { emoji: "⏸",  text: `Org suspended by admin` };
    case "org.archived":        return { emoji: "🗄",  text: `Org archived` };
    case "org.unsuspended":     return { emoji: "▶",  text: `Org reinstated` };
    case "member.joined":       return { emoji: "👋", text: `${who} joined as ${m.role || "member"}` };
    case "member.invited":      return { emoji: "✉️",  text: `${who} invited ${m.email || "someone"}` };
    case "member.role_updated": return { emoji: "🔧", text: `${who} changed a member's role to ${m.new_role || "?"}` };
    case "member.removed":      return { emoji: "👋", text: `${who} removed a member` };
    case "code.created":        return { emoji: "🔑", text: `${who} created an enrollment code` };
    case "code.revoked":        return { emoji: "🔒", text: `${who} revoked an enrollment code` };
    case "channel.created":     return { emoji: "💬", text: `${who} created channel #${m.name || ""}` };
    case "announcement.posted": return { emoji: "📣", text: `${who} posted "${m.title || "an announcement"}"${m.fanout_count ? ` · ${m.fanout_count} notified` : ""}` };
    case "lesson.created":      return { emoji: "📚", text: `${who} added lesson "${m.title || ""}"` };
    case "assignment.created":  return { emoji: "📝", text: `${who} created assignment "${m.title || ""}"` };
    case "submission.graded":   return { emoji: "✅", text: `${who} graded a submission${m.score !== undefined ? ` (${m.score})` : ""}` };
    case "file.uploaded":       return { emoji: "📎", text: `${who} uploaded ${m.name || "a file"}` };
    case "file.deleted":        return { emoji: "🗑", text: `${who} deleted ${m.name || "a file"}` };
    default:                    return { emoji: "•", text: `${who} · ${row.action}` };
  }
}

function linkFor(row: ActivityRow, slug: string): string | null {
  switch (row.action) {
    case "member.joined":
    case "member.invited":
    case "member.role_updated":
    case "member.removed":
    case "code.created":
    case "code.revoked":
      return `/o/${slug}/members`;
    case "announcement.posted":
      return `/o/${slug}/announcements`;
    case "lesson.created":
      return `/o/${slug}/lessons`;
    case "assignment.created":
    case "submission.graded":
      return `/o/${slug}/assignments`;
    case "channel.created":
      return `/o/${slug}/chat`;
    case "file.uploaded":
    case "file.deleted":
      return `/o/${slug}/files`;
    case "org.suspended":
    case "org.archived":
    case "org.unsuspended":
      return `/o/${slug}/settings`;
    default:
      return null;
  }
}

function timeAgo(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60_000);
  if (m < 1)    return "just now";
  if (m < 60)   return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)    return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface Props {
  orgId: string;
  orgSlug: string;
  initial: ActivityRow[];
}

export function ActivityFeed({ orgId, orgSlug, initial }: Props) {
  const [rows, setRows] = useState<ActivityRow[]>(initial);
  // Refresh relative timestamps every 30s without re-fetching.
  const [now, setNow] = useState<number>(() => Date.now());
  // Highlights newly-arrived rows for ~3s so the host can see the change.
  const [flashIds, setFlashIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useOrgActivityRealtime(orgId, (e: OrgActivityEvent) => {
    setRows((prev) => {
      // Guard against duplicate publishes (Ably retries, double-mounts).
      if (prev.some((r) => r.id === e.id)) return prev;
      const next: ActivityRow = {
        id: e.id,
        action: e.action,
        target: e.target,
        meta: e.meta || {},
        created_at: e.created_at,
        actor_name: e.actor_name,
      };
      // Cap at 30 to keep DOM small on long-running sessions.
      return [next, ...prev].slice(0, 30);
    });
    setFlashIds((prev) => {
      const next = new Set(prev);
      next.add(e.id);
      return next;
    });
    setTimeout(() => {
      setFlashIds((prev) => {
        if (!prev.has(e.id)) return prev;
        const next = new Set(prev);
        next.delete(e.id);
        return next;
      });
    }, 3000);
  });

  if (rows.length === 0) {
    return (
      <div style={{ padding: 16, color: "#5A6478", fontSize: 13, textAlign: "center" }}>
        No activity yet. Post an announcement or invite a member to get started.
      </div>
    );
  }

  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column" }}>
      {rows.map((row, i) => {
        const d = describeActivity(row);
        const href = linkFor(row, orgSlug);
        const isLast = i === rows.length - 1;
        const isFlashing = flashIds.has(row.id);
        const baseStyle: React.CSSProperties = {
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "10px 6px",
          margin: "0 -6px",
          borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)",
          borderRadius: 6,
          color: "#E8EDF5",
          textDecoration: "none",
          background: isFlashing ? "rgba(38,166,154,0.18)" : "transparent",
          transition: "background 0.6s ease",
        };
        const inner = (
          <>
            <span style={{ fontSize: 16, lineHeight: "20px", flexShrink: 0 }}>{d.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "#E8EDF5", lineHeight: 1.5 }}>{d.text}</div>
              <div style={{ fontSize: 11, color: "#5A6478", marginTop: 2 }}>{timeAgo(row.created_at, now)}</div>
            </div>
            {href && <span style={{ fontSize: 11, color: "#5A6478", flexShrink: 0 }}>→</span>}
          </>
        );
        return (
          <li key={row.id} style={{ listStyle: "none" }}>
            {href ? (
              <Link href={href} style={baseStyle} className="dashboard-activity-row">
                {inner}
              </Link>
            ) : (
              <div style={baseStyle}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
