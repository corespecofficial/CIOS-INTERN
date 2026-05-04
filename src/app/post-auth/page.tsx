"use client";

/* eslint-disable @next/next/no-img-element */

/**
 * /post-auth — transient redirect page that runs after Clerk signin.
 *
 * It MUST live OUTSIDE the (app) route group, otherwise it inherits the
 * intern shell (sidebar + header + nav + bottom-nav + dashboard chrome)
 * and a brand-new user briefly sees an internal portal they haven't been
 * onboarded into. That was a real bug — visitors saw an "INTERN" badge
 * and the full classroom/courses/tasks sidebar before being routed away.
 *
 * Now this route only inherits the root layout (bare html/body), so the
 * sync screen below is a clean loading state with no chrome leak.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser, getRoleHomePath } from "@/lib/use-current-user";
import { ensureCurrentDbUser } from "@/app/actions/ensure-db-user";
import { processReferralJoin } from "@/app/actions/referrals";
import { getOnboardingStatus } from "@/app/actions/onboarding-status";

export default function PostAuthPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const [status, setStatus] = useState("Syncing your profile…");

  useEffect(() => {
    if (!user.isLoaded) return;
    if (!user.isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    (async () => {
      setStatus("Syncing your profile…");
      const result = await ensureCurrentDbUser();
      if (!result.ok) {
        console.warn("[post-auth] ensureCurrentDbUser degraded:", result.error);
      } else if (result.created) {
        console.log("[post-auth] Supabase user row created");
      }

      // Legacy /join?ref=CODE referral flow. The new /join/<token>
      // path is handled by its own page.
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get("ref");
      if (refCode) {
        try { await processReferralJoin(refCode); }
        catch (e) { console.warn("[post-auth] referral processing failed (non-fatal):", e); }
      }

      // Onboarding gate: if onboarding_completed_at is NULL the user has
      // never picked an intent — must go through /onboarding/intent.
      const onboarding = await getOnboardingStatus();
      // Source of truth for the routing decision is Clerk publicMetadata
      // — that's what middleware enforces. Using Supabase-first creates
      // a Supabase↔Clerk drift loop (see ensureCurrentDbUser reconcile).
      const role = user.role || result.role;
      setStatus("Routing to your portal…");

      if (onboarding.ok && !onboarding.completed) {
        router.replace("/onboarding/intent");
        return;
      }

      // Legacy intern profile-builder fallback — only relevant for users
      // who finished the new intent gate as `intern` but haven't filled
      // out the profile builder yet. Stored in localStorage by that page.
      let internProfileDone = false;
      try {
        const saved = localStorage.getItem("cios-onboarding");
        if (saved) internProfileDone = !!JSON.parse(saved).completed;
      } catch {}

      if (role === "intern" && !internProfileDone) {
        router.replace("/onboarding");
      } else {
        const home = getRoleHomePath(role as never);
        // Loop guard: if a portal's "My portal →" button sent us back to
        // /post-auth and the resolved home equals the page we came from,
        // fall through to /visitor instead of cycling.
        const referrer = (typeof document !== "undefined" ? document.referrer : "") || "";
        const fromHome = referrer && new URL(referrer, window.location.origin).pathname.startsWith(home);
        if (fromHome && home === window.location.pathname) {
          router.replace("/visitor");
        } else {
          router.replace(home);
        }
      }
    })();
  }, [user.isLoaded, user.isSignedIn, user.role, router]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0A0E1A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 18,
        fontFamily: "'Nunito', system-ui, sans-serif",
        // Belt-and-braces: hide whatever might bleed in (rogue toasts,
        // global banners) so this is a true blank loading state.
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      }}
    >
      <img
        src="https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png"
        alt="CIOS"
        style={{ width: 88, height: 88, borderRadius: "50%", animation: "pa-pulse 1.6s ease-in-out infinite" }}
      />
      <p style={{ color: "#8892A4", fontSize: 14, margin: 0, letterSpacing: 0.2 }}>{status}</p>
      <style>{`
        @keyframes pa-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(0.96); } }
      `}</style>
    </div>
  );
}
