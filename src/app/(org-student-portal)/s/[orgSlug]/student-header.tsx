"use client";

import { Bell, Moon, Search, Sun } from "lucide-react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useAppStore } from "@/store/use-app-store";
import { useCurrentUser } from "@/lib/use-current-user";
import { useServerNotifications } from "@/lib/use-server-notifications";

export function StudentHeader({ orgName }: { orgName: string }) {
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const user = useCurrentUser();
  const { unread } = useServerNotifications(user.id || null);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        height: 76,
        minHeight: 76,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "var(--bg-secondary, #111827)",
        borderBottom: "1px solid var(--border-default, #1F2937)",
        gap: 18,
      }}
    >
      <div style={{ position: "relative", flex: "1 1 520px", maxWidth: 660 }}>
        <Search
          size={18}
          aria-hidden
          style={{
            position: "absolute",
            left: 18,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted, #5A6478)",
            pointerEvents: "none",
          }}
        />
        <input
          type="text"
          readOnly
          onFocus={(e) => {
            e.currentTarget.blur();
            window.dispatchEvent(new CustomEvent("cios:open-palette"));
          }}
          onClick={() => window.dispatchEvent(new CustomEvent("cios:open-palette"))}
          placeholder={`Search ${orgName}...`}
          style={{
            width: "100%",
            height: 52,
            padding: "0 86px 0 52px",
            borderRadius: 10,
            border: "1px solid var(--border-default, #1F2937)",
            background: "var(--bg-tertiary, #182132)",
            color: "var(--text-primary, #E8EDF5)",
            fontSize: 16,
            outline: "none",
            cursor: "pointer",
            boxSizing: "border-box",
          }}
        />
        <span
          style={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 12,
            color: "var(--text-muted, #5A6478)",
            border: "1px solid var(--border-default, #1F2937)",
            borderRadius: 6,
            padding: "4px 9px",
            background: "rgba(255,255,255,0.04)",
            pointerEvents: "none",
          }}
        >
          Cmd+K
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 18, flexShrink: 0 }}>
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          style={{
            width: 42,
            height: 42,
            display: "grid",
            placeItems: "center",
            borderRadius: 10,
            border: "none",
            background: "transparent",
            color: theme === "dark" ? "#FFC107" : "#1E88E5",
            cursor: "pointer",
          }}
        >
          {theme === "dark" ? <Moon size={24} fill="currentColor" /> : <Sun size={24} />}
        </button>

        <Link
          href="/notifications"
          aria-label="Notifications"
          style={{
            position: "relative",
            width: 42,
            height: 42,
            display: "grid",
            placeItems: "center",
            borderRadius: 10,
            color: "#FFC107",
            textDecoration: "none",
          }}
        >
          <Bell size={24} fill="currentColor" />
          {unread > 0 && (
            <span
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                minWidth: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                background: "#E53935",
                color: "#fff",
                fontSize: 11,
                fontWeight: 800,
                padding: "0 5px",
                lineHeight: 1,
              }}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>

        <span
          style={{
            padding: "10px 18px",
            borderRadius: 999,
            background: "rgba(30,136,229,0.18)",
            color: "#1E88E5",
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: "0.08em",
          }}
        >
          INTERN
        </span>
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
