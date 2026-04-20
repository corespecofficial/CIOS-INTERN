"use client";

import { useEffect, useRef, useState } from "react";
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
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const current = OPTIONS.find((o) => o.id === themeChoice) || OPTIONS[1];

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-block" }}>
      <button
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

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            minWidth: 170,
            padding: 6,
            borderRadius: 12,
            background: "var(--bg-elevated, #1F2937)",
            border: "1px solid var(--border-default, rgba(255,255,255,0.12))",
            boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
            zIndex: 10000,
            display: "grid",
            gap: 2,
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
        </div>
      )}
    </div>
  );
}
