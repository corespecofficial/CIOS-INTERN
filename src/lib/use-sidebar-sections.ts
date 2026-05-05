"use client";

/**
 * Collapsible sidebar section state.
 *
 * Sidebar sections (MAIN / PROGRESS / TOOLS / etc.) are collapsible
 * via clickable headers. State persists in localStorage so toggling
 * survives page navigation and tab restart.
 *
 * Each portal passes a unique `storageKey` so visitor / host / student /
 * main-app sidebars don't trample each other's preferences.
 *
 * Defaults are "open" — we only persist sections the user has
 * explicitly closed. That way new sections that ship later show up
 * open by default rather than getting silently hidden behind a stale
 * map of pre-existing keys.
 *
 * The currently-active section (one whose item matches pathname) is
 * always force-rendered open regardless of state, so navigating into
 * a closed section doesn't leave the user staring at an empty sidebar.
 */

import { useCallback, useEffect, useState } from "react";

type CollapsedMap = Record<string, true>;

export function useSidebarSections(storageKey: string, activeSection: string | null) {
  const [collapsed, setCollapsed] = useState<CollapsedMap>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          // Sanitize: keep only `true` values to match CollapsedMap shape.
          const next: CollapsedMap = {};
          for (const k of Object.keys(parsed)) if (parsed[k] === true) next[k] = true;
          setCollapsed(next);
        }
      }
    } catch { /* private mode / quota — ignore */ }
    setHydrated(true);
  }, [storageKey]);

  const toggle = useCallback((section: string) => {
    setCollapsed((prev) => {
      const next: CollapsedMap = { ...prev };
      if (next[section]) delete next[section];
      else next[section] = true;
      try {
        if (Object.keys(next).length === 0) window.localStorage.removeItem(storageKey);
        else window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch { /* */ }
      return next;
    });
  }, [storageKey]);

  // Active section is always rendered open.
  const isOpen = useCallback((section: string) => {
    if (section === activeSection) return true;
    return !collapsed[section];
  }, [collapsed, activeSection]);

  return { isOpen, toggle, hydrated };
}
