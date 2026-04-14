"use client";

import { useEffect } from "react";

/**
 * Listens to the VisualViewport API so we can react to the software keyboard
 * appearing on mobile. Adds `kb-open` on <body> while the keyboard is up,
 * and scrolls the focused input into view a beat after focus. Pair with CSS
 * rules that hide the bottom nav / FAB while `body.kb-open` is set.
 */
export function MobileKeyboardGuard() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    const body = document.body;
    const setFlag = () => {
      if (!vv) return;
      const gap = window.innerHeight - vv.height;
      // Heuristic: >150px shrink means keyboard is open on a phone.
      if (gap > 150) body.classList.add("kb-open");
      else body.classList.remove("kb-open");
    };
    vv?.addEventListener("resize", setFlag);
    vv?.addEventListener("scroll", setFlag);
    setFlag();

    const onFocus = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.tagName !== "INPUT" && t.tagName !== "TEXTAREA" && !(t as HTMLElement).isContentEditable) return;
      // Wait for keyboard slide-in, then nudge into view.
      setTimeout(() => {
        try { t.scrollIntoView({ block: "center", behavior: "smooth" }); } catch { /* ignore */ }
      }, 300);
    };
    document.addEventListener("focusin", onFocus);

    return () => {
      vv?.removeEventListener("resize", setFlag);
      vv?.removeEventListener("scroll", setFlag);
      document.removeEventListener("focusin", onFocus);
      body.classList.remove("kb-open");
    };
  }, []);
  return null;
}
