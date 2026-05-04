"use client";

/**
 * Mobile drawer controller for portal sidebars.
 *
 * Renders a fixed-position hamburger button on mobile only. Tapping it sets
 * `data-portal-drawer="open"` on <html>, which the CSS in globals.css picks up
 * to slide the sidebar in. Also renders a backdrop that closes the drawer on
 * tap. The hamburger and backdrop hide themselves on >=768px viewports via
 * the same CSS.
 *
 * Mount once per portal shell, anywhere in the tree — it uses portal-style
 * fixed positioning so it doesn't matter where it lives in the DOM.
 */

import { useEffect, useState } from "react";

export function MobileDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) document.documentElement.setAttribute("data-portal-drawer", "open");
    else document.documentElement.removeAttribute("data-portal-drawer");
    return () => document.documentElement.removeAttribute("data-portal-drawer");
  }, [open]);

  // Close drawer on route change-ish: hashchange + popstate cover most of it.
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("popstate", close);
    window.addEventListener("hashchange", close);
    return () => {
      window.removeEventListener("popstate", close);
      window.removeEventListener("hashchange", close);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        data-portal-drawer-toggle
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "none",
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 250,
          width: 40,
          height: 40,
          alignItems: "center",
          justifyContent: "center",
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          color: "#E8EDF5",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>{open ? "✕" : "☰"}</span>
      </button>
      <div
        data-portal-drawer-backdrop
        onClick={() => setOpen(false)}
        style={{
          display: "none",
          position: "fixed",
          inset: 0,
          background: open ? "rgba(0,0,0,0.55)" : "transparent",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.2s ease",
          zIndex: 150,
        }}
      />
    </>
  );
}
