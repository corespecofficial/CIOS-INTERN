/**
 * /visitor/notifications — in-shell notifications view for visitors.
 *
 * Replaces the previous sidebar link to /notifications which lived in
 * the (app) shell and caused a chrome jump (visitor → intern shell).
 * This version stays inside the visitor portal so the experience is
 * cohesive.
 *
 * Powered by the existing notifications table + listMyNotifications
 * action; we just render it inside our own shell with our visual
 * language (cards, action chips, mark-all-read).
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { listMyNotifications } from "@/app/actions/notifications";
import { NotificationsClient } from "./notifications-client";

export const dynamic = "force-dynamic";

export default async function VisitorNotificationsPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in?redirect_url=/visitor/notifications");

  const res = await listMyNotifications(60);
  const notifications = res.ok ? res.data!.notifications : [];
  const unread = res.ok ? res.data!.unread : 0;

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Notifications</h1>
          <p style={{ color: "#8892A4", fontSize: 13, margin: 0 }}>
            {unread > 0 ? <><strong style={{ color: "#FFA726" }}>{unread} unread</strong> · {notifications.length} total</> : `${notifications.length} total · all caught up`}
          </p>
        </div>
        {unread > 0 && <NotificationsClient.MarkAllReadButton />}
      </div>

      {notifications.length === 0 ? (
        <div style={{ background: "#111827", border: "1px dashed #1F2937", borderRadius: 12, padding: 60, textAlign: "center", color: "#5A6478", fontSize: 13 }}>
          🔕 No notifications yet. We&apos;ll let you know when there&apos;s something worth seeing.
        </div>
      ) : (
        <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, overflow: "hidden" }}>
          {notifications.map((n, i) => {
            const tint = n.type === "success" ? "#26A69A"
                       : n.type === "warning" ? "#FFA726"
                       : n.type === "error"   ? "#FF8A80"
                       : "#1E88E5";
            const Wrapper = ({ children }: { children: React.ReactNode }) => (
              n.action_url
                ? <Link href={n.action_url} style={{ display: "block", textDecoration: "none", color: "inherit" }}>{children}</Link>
                : <div>{children}</div>
            );
            return (
              <Wrapper key={n.id}>
                <div style={{
                  display: "flex", gap: 12, padding: "14px 18px",
                  borderTop: i === 0 ? "none" : "1px solid #1F2937",
                  background: n.is_read ? "transparent" : "rgba(255,167,38,0.04)",
                  cursor: n.action_url ? "pointer" : "default",
                }}>
                  <div style={{ width: 4, alignSelf: "stretch", borderRadius: 2, background: n.is_read ? "transparent" : tint, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: n.is_read ? 500 : 700, color: n.is_read ? "#C7CFD8" : "#E8EDF5" }}>{n.title}</span>
                      {!n.is_read && <span style={{ width: 6, height: 6, borderRadius: "50%", background: tint }} />}
                    </div>
                    {n.message && <div style={{ fontSize: 12, color: "#8892A4", lineHeight: 1.5 }}>{n.message}</div>}
                  </div>
                  <div style={{ fontSize: 10, color: "#5A6478", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>
              </Wrapper>
            );
          })}
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((now - then) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}
