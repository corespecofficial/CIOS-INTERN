"use client";

import { useEffect, useState } from "react";

const SHORTCUTS: Array<{ key: string; label: string }> = [
  { key: "?",          label: "Open this shortcuts list" },
  { key: "Ctrl / ⌘ K", label: "Open command palette" },
  { key: "g d",        label: "Go to dashboard" },
  { key: "g t",        label: "Go to tasks" },
  { key: "g c",        label: "Go to community" },
  { key: "g n",        label: "Go to notes" },
  { key: "g w",        label: "Go to wallet" },
  { key: "g a",        label: "Go to AI hub" },
  { key: "n",          label: "New post / note (context-aware)" },
  { key: "/",          label: "Focus search" },
  { key: "Esc",        label: "Close modal / overlay" },
];

/**
 * Press `?` anywhere to open a cheat-sheet of every keyboard shortcut.
 * Ignored when typing in an input / textarea / contentEditable.
 */
export function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);
  const [nav, setNav] = useState<string | null>(null);

  useEffect(() => {
    function inEditable(el: EventTarget | null): boolean {
      const n = el as HTMLElement | null;
      if (!n) return false;
      if (n.tagName === "INPUT" || n.tagName === "TEXTAREA" || n.tagName === "SELECT") return true;
      return !!n.isContentEditable;
    }

    function onKey(e: KeyboardEvent) {
      if (inEditable(e.target)) return;

      if (e.key === "Escape") { setOpen(false); setNav(null); return; }
      if (e.key === "?") { e.preventDefault(); setOpen(true); return; }

      // Two-key "g X" nav shortcuts
      if (nav === "g") {
        const map: Record<string, string> = {
          d: "/dashboard", t: "/tasks", c: "/community",
          n: "/notes", w: "/wallet", a: "/ai-hub",
        };
        const path = map[e.key.toLowerCase()];
        if (path) {
          e.preventDefault();
          window.location.href = path;
        }
        setNav(null);
        return;
      }
      if (e.key === "g") { setNav("g"); setTimeout(() => setNav(null), 1500); return; }

      if (e.key === "/") { e.preventDefault(); const s = document.querySelector('input[type="search"], input[placeholder*="Search" i]') as HTMLInputElement | null; s?.focus(); }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [nav]);

  if (!open) return null;
  return (
    <div onClick={() => setOpen(false)} style={{
      position: "fixed", inset: 0, zIndex: 9700,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 480, background: "#0F1524",
        border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 22,
        color: "#E8EDF5", fontFamily: "'Nunito', sans-serif",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>⌨ Keyboard shortcuts</h3>
          <button onClick={() => setOpen(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#E8EDF5", width: 28, height: 28, borderRadius: 8, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {SHORTCUTS.map((s) => (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <kbd style={{ fontFamily: "monospace", background: "#1A2332", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: "#FFC107", minWidth: 96, textAlign: "center" }}>{s.key}</kbd>
              <span style={{ fontSize: 12, color: "#B0BEC5" }}>{s.label}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: "#5A6478", marginTop: 10, textAlign: "center" }}>
          Press <b>Esc</b> to close
        </div>
      </div>
    </div>
  );
}
