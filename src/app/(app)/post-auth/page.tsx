"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser, getRoleHomePath } from "@/lib/use-current-user";
import { ensureCurrentDbUser } from "@/app/actions/ensure-db-user";
import { processReferralJoin } from "@/app/actions/referrals";

export default function PostAuthPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const [status, setStatus] = useState("Syncing your profile...");

  useEffect(() => {
    if (!user.isLoaded) return;
    if (!user.isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    (async () => {
      setStatus("Syncing your profile...");
      const result = await ensureCurrentDbUser();
      if (!result.ok) {
        console.error("[post-auth] ensureCurrentDbUser failed:", result.error);
      } else if (result.created) {
        console.log("[post-auth] Supabase user row created");
      }

      // Process referral if user arrived via /join?ref=CODE
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get("ref");
      if (refCode) {
        try {
          await processReferralJoin(refCode);
          console.log("[post-auth] referral processed:", refCode);
        } catch (e) {
          console.warn("[post-auth] referral processing failed (non-fatal):", e);
        }
      }

      let onboardingDone = false;
      try {
        const saved = localStorage.getItem("cios-onboarding");
        if (saved) {
          const parsed = JSON.parse(saved);
          onboardingDone = !!parsed.completed;
        }
      } catch {}

      const role = result.role || user.role;
      setStatus("Routing to your portal...");
      // Intern onboarding gate (legacy) still applies. Public-portal roles
      // do their onboarding inside their own portal, so they skip this gate
      // and land in their branded home via getRoleHomePath.
      if (!onboardingDone && role === "intern") {
        router.replace("/onboarding");
      } else {
        router.replace(getRoleHomePath(role as never));
      }
    })();
  }, [user.isLoaded, user.isSignedIn, user.role, router]);

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0E1A",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 16,
    }}>
      <img
        src="https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png"
        alt="CIOS"
        style={{ width: 80, height: 80, borderRadius: "50%", animation: "pulse 1.5s ease-in-out infinite" }}
      />
      <p style={{ color: "#8892A4", fontSize: 14, fontFamily: "'Nunito', sans-serif" }}>
        {status}
      </p>
      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }`}</style>
    </div>
  );
}
