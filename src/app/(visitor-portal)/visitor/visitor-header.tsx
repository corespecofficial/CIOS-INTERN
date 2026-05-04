"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";

/**
 * Top header for the visitor portal. Mirrors the (app) header look —
 * Cmd+K palette opener, theme toggle, notifications bell, role badge,
 * and the Clerk UserButton avatar — so the visitor experience feels
 * like part of the same product as the rest of CIOS.
 */
export function VisitorHeader() {
  const { user, isLoaded } = useUser();
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Theme toggle reads the existing cios-theme-choice key shared with
  // the rest of the app so the user's preference travels.
  useEffect(() => {
    setMounted(true);
    try {
      const choice = localStorage.getItem("cios-theme-choice") || "dark";
      const dark = choice !== "light";
      setIsDark(dark);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    } catch {}
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    try {
      localStorage.setItem("cios-theme-choice", next ? "dark" : "light");
      document.documentElement.dataset.theme = next ? "dark" : "light";
    } catch {}
  }

  function openPalette() {
    try { window.dispatchEvent(new CustomEvent("cios:open-palette")); } catch {}
  }

  return (
    <header
      style={{
        height: 64,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "0 20px",
        borderBottom: "1px solid var(--border-default, #1F2937)",
        background: "var(--bg-secondary, rgba(15, 22, 38, 0.85))",
        backdropFilter: "saturate(140%) blur(8px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        fontFamily: "'Nunito', system-ui, sans-serif",
      }}
    >
      {/* Cmd+K palette opener — looks like a search bar but triggers the
          existing global command palette (registered in app layout). */}
      <button
        onClick={openPalette}
        type="button"
        aria-label="Search"
        style={{
          flex: 1,
          maxWidth: 720,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 14px",
          background: "var(--bg-elevated, rgba(255,255,255,0.04))",
          border: "1px solid var(--border-default, #1F2937)",
          borderRadius: 10,
          color: "var(--text-muted, #5A6478)",
          fontSize: 13,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <span style={{ fontSize: 14, opacity: 0.7 }}>🔍</span>
        <span style={{ flex: 1, textAlign: "left" }}>Search pages, actions, people…</span>
        <span style={{ padding: "2px 8px", border: "1px solid var(--border-default, #1F2937)", borderRadius: 6, fontSize: 11, color: "var(--text-muted, #5A6478)", fontFamily: "ui-monospace, monospace" }}>
          Cmd+K
        </span>
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        type="button"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        style={{
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "1px solid var(--border-default, #1F2937)",
          borderRadius: 10,
          cursor: "pointer",
          color: "#FFC107",
          fontSize: 16,
          fontFamily: "inherit",
        }}
      >
        {mounted ? (isDark ? "🌙" : "☀️") : "🌙"}
      </button>

      {/* Notifications bell */}
      <Link
        href="/notifications"
        aria-label="Notifications"
        style={{
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "1px solid var(--border-default, #1F2937)",
          borderRadius: 10,
          textDecoration: "none",
          color: "#FFC107",
          fontSize: 16,
        }}
      >
        🔔
      </Link>

      {/* Role badge — mirrors image 1 styling */}
      <div
        style={{
          padding: "8px 14px",
          background: "rgba(30,136,229,0.12)",
          border: "1px solid rgba(30,136,229,0.40)",
          borderRadius: 10,
          color: "#1E88E5",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        Public User
      </div>

      {/* Clerk avatar — opens the standard sign-out / manage menu */}
      <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {isLoaded && user ? (
          <UserButton
            appearance={{
              elements: { avatarBox: { width: 36, height: 36 } },
            }}
          />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1E2937" }} />
        )}
      </div>
    </header>
  );
}
