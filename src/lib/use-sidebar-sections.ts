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
 * Active-section behavior:
 *   - If the user has NEVER explicitly toggled the section containing
 *     the current page, we keep it open by default. (The default state
 *     for any unknown section is "open", so this falls out naturally.)
 *   - If the user HAS explicitly closed it, we respect that — even if
 *     the active page lives inside. Earlier versions force-opened the
 *     active section, which made the toggle look broken: clicking
 *     "ADMIN" while sitting on /super-admin/users did nothing because
 *     the force-open re-opened it on every render. The user's click
 *     now always wins; they can re-open by clicking the header again.
 *
 * `activeSection` is still accepted for API symmetry / future use
 * (e.g. if we want to highlight the header bar or auto-expand on
 * first navigation), but it no longer overrides explicit user state.
 */

import { useCallback, useEffect, useState } from "react";

type CollapsedMap = Record<string, true>;

export function useSidebarSections(storageKey: string, _activeSection: string | null) {
  void _activeSection; // see header comment — kept for API symmetry
  const [collapsed, setCollapsed] = useState<CollapsedMap>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
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

  const isOpen = useCallback((section: string) => !collapsed[section], [collapsed]);

  return { isOpen, toggle, hydrated };
}
