"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppStore, type ThemeChoice } from "@/store/use-app-store";

// Keeps the zustand state, localStorage, and <html data-theme> in sync on mount.
// The root layout already sets data-theme from the cookie SSR-side; this is the
// client-side hydrator that reapplies the user's "system" preference if that's
// what they chose, and rebinds to OS changes.
export function ThemeHydrator() {
  const setThemeChoice = useAppStore((s) => s.setThemeChoice);
  useEffect(() => {
    try {
      const saved = (localStorage.getItem("cios-theme-choice") as ThemeChoice | null);
      if (saved === "light" || saved === "dark" || saved === "system") {
        setThemeChoice(saved);
        return;
      }
      // No saved choice? Fall back to the legacy key or the current data-theme.
      const legacy = localStorage.getItem("cios-theme");
      if (legacy === "light" || legacy === "dark") {
        setThemeChoice(legacy);
        return;
      }
      const current = document.documentElement.getAttribute("data-theme");
      if (current === "light" || current === "dark") setThemeChoice(current);
    } catch {
      /* ignore */
    }
  }, [setThemeChoice]);
  return null;
}

const OPTIONS: { id: ThemeChoice; label: string; icon: string }[] = [
  { id: "light",  label: "Light",  icon: "☀" },
  { id: "dark",   label: "Dark",   icon: "🌙" },
  { id: "system", label: "System", icon: "🖥" },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const themeChoice = useAppStore((s) => s.themeChoice);
  const setThemeChoice = useAppStore((s) => s.setThemeChoice);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      // Clicks inside the portaled menu (tagged data-theme-menu) also count as "inside"
      if ((t as Element)?.closest?.("[data-theme-menu]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Compute menu position when it opens so the portaled dropdown lines up
  // under the button, no matter how deeply nested the button is.
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MENU_W = 200;    // matches minWidth on the menu
    const MENU_H = 180;    // approx full menu height (3 rows + tip)
    const MARGIN = 8;

    // Horizontal anchor — if the button is on the LEFT half of the viewport,
    // anchor the menu's LEFT edge to the button's LEFT. If on the RIGHT half,
    // anchor the menu's RIGHT edge to the button's RIGHT. Keeps menus on-screen
    // for toggles in the left sidebar AND the top-right header in one pass.
    const buttonOnLeft = rect.left + rect.width / 2 < vw / 2;
    const horiz: { left?: number; right?: number } = buttonOnLeft
      ? { left: Math.max(MARGIN, Math.min(rect.left, vw - MENU_W - MARGIN)) }
      : { right: Math.max(MARGIN, Math.min(vw - rect.right, vw - MENU_W - MARGIN)) };

    // Vertical — flip upward when there's more room above than below.
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < MENU_H + MARGIN && spaceAbove > spaceBelow;
    const top = openUpward
      ? Math.max(MARGIN, rect.top - MENU_H - MARGIN)
      : Math.min(rect.bottom + MARGIN, vh - MENU_H - MARGIN);

    setMenuPos({ top, ...horiz });
  }, [open]);

  const current = OPTIONS.find((o) => o.id === themeChoice) || OPTIONS[1];

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Theme: ${current.label}. Click to change.`}
        title={`Theme: ${current.label}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: compact ? "6px 10px" : "8px 14px",
          borderRadius: 999,
          border: "1px solid var(--border-default, rgba(255,255,255,0.14))",
          background: "var(--bg-secondary, rgba(255,255,255,0.04))",
          color: "var(--text-primary, #F8FAFC)",
          fontSize: compact ? 12 : 13,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
          lineHeight: 1,
        }}
      >
        <span style={{ fontSize: compact ? 13 : 14 }}>{current.icon}</span>
        {!compact && <span>{current.label}</span>}
        <span style={{ opacity: 0.6, fontSize: 9 }}>▾</span>
      </button>

      {mounted && open && menuPos && createPortal(
        <div
          role="menu"
          data-theme-menu
          style={{
            position: "fixed",
            top: menuPos.top,
            ...(menuPos.left != null ? { left: menuPos.left } : {}),
            ...(menuPos.right != null ? { right: menuPos.right } : {}),
            minWidth: 200,
            padding: 6,
            borderRadius: 12,
            background: "var(--bg-elevated, #1F2937)",
            border: "1px solid var(--border-default, rgba(255,255,255,0.12))",
            boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
            zIndex: 10000,
            display: "grid",
            gap: 2,
            fontFamily: "inherit",
          }}
        >
          {OPTIONS.map((o) => {
            const active = o.id === themeChoice;
            return (
              <button
                key={o.id}
                onClick={() => { setThemeChoice(o.id); setOpen(false); }}
                role="menuitemradio"
                aria-checked={active}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: active ? "var(--bg-hover, rgba(255,255,255,0.07))" : "transparent",
                  color: "var(--text-primary, #F8FAFC)",
                  fontSize: 13,
                  fontWeight: active ? 800 : 600,
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  fontFamily: "inherit",
                }}
              >
                <span style={{ fontSize: 15, width: 18, textAlign: "center" }}>{o.icon}</span>
                <span style={{ flex: 1 }}>{o.label}</span>
                {active && <span style={{ fontSize: 12 }}>✓</span>}
              </button>
            );
          })}
          <div style={{ padding: "6px 12px 2px", fontSize: 10, color: "var(--text-muted, #94A3B8)", letterSpacing: 0.3 }}>
            Tip: &ldquo;System&rdquo; follows your OS setting.
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
