"use client";
/* eslint-disable @next/next/no-img-element */

/**
 * /onboarding/enrollment — the second screen for "I'm starting as an
 * intern". Asks for the enrollment / class code their admin gave them.
 *
 * If they have one → redeemEnrollmentCode → enrolled as student in that
 * org → routed to /s/<slug>. If they don't, two safe fallbacks:
 *   1. "Browse classes" → public marketplace at /creative-space
 *   2. "Skip — continue as visitor" → drops them in /visitor
 *
 * Auto-prefills from `?code=` so deep-links from the admin's social
 * post can land here with the code pre-filled.
 */

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { redeemEnrollmentCode, chooseVisitor } from "@/app/actions/onboarding-intent";
import { useCurrentUser } from "@/lib/use-current-user";

const LOGO = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

export default function EnrollmentCodePage() {
  const router = useRouter();
  const params = useSearchParams();
  const me = useCurrentUser();
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [autoTried, setAutoTried] = useState(false);

  // If the admin shared a deep link with `?code=...`, prefill + auto-submit
  // so the user doesn't have to retype it. Only run once.
  useEffect(() => {
    const c = params?.get("code");
    if (c && !autoTried) {
      setAutoTried(true);
      setCode(c);
      start(async () => {
        const r = await redeemEnrollmentCode(c);
        if (r.ok) router.replace(r.data!.redirectTo);
        else setErr(r.error);
      });
    } else if (!autoTried) {
      setAutoTried(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit() {
    setErr(null);
    if (!code.trim()) { setErr("Paste the code your admin sent you."); return; }
    start(async () => {
      const r = await redeemEnrollmentCode(code);
      if (!r.ok) { setErr(r.error); return; }
      router.replace(r.data!.redirectTo);
    });
  }

  function continueAsVisitor() {
    setErr(null);
    start(async () => {
      const r = await chooseVisitor();
      if (!r.ok) { setErr(r.error); return; }
      router.replace(r.data!.redirectTo);
    });
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#0A0E1A", color: "#E8EDF5", fontFamily: "'Nunito', system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        {/* Pager dots — single step, but we keep the visual to match the
            welcome carousel so it feels like one continuous flow. */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 32 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.10)" }} />
          <div style={{ width: 28, height: 8, borderRadius: 4, background: "#1E88E5" }} />
        </div>

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <img src={LOGO} alt="CIOS" width={80} height={80} style={{ borderRadius: "50%", display: "inline-block", animation: "ec-float 3s ease-in-out infinite" }} />
        </div>

        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, textAlign: "center", margin: "0 0 8px" }}>
          Enter your class code
        </h1>
        <p style={{ textAlign: "center", color: "#8892A4", margin: "0 0 28px", fontSize: 14, lineHeight: 1.5 }}>
          Hey {me.firstName || "there"} — paste the code your admin shared.
          We&apos;ll enroll you in their class right away.
        </p>

        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 28 }}>
          <label htmlFor="ec-input" style={{ fontSize: 11, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 8, fontWeight: 700 }}>
            Class / enrollment code
          </label>
          <input
            id="ec-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="e.g. ACME-7K2X-9Q"
            autoFocus
            disabled={pending}
            style={{
              width: "100%", padding: "14px 16px",
              background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 10, color: "#E8EDF5", fontSize: 18,
              fontFamily: "ui-monospace, monospace", letterSpacing: 1,
            }}
          />

          {err && <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(239,83,80,0.10)", color: "#FF8A80", border: "1px solid rgba(239,83,80,0.30)", borderRadius: 8, fontSize: 12 }}>{err}</div>}

          <button
            type="button"
            onClick={submit}
            disabled={pending || !code.trim()}
            style={{
              marginTop: 14, width: "100%", padding: "14px 24px",
              background: pending || !code.trim() ? "rgba(30,136,229,0.30)" : "linear-gradient(135deg, #1E88E5, #1565C0)",
              color: "#fff", border: "none", borderRadius: 10,
              fontSize: 14, fontWeight: 800, cursor: pending || !code.trim() ? "not-allowed" : "pointer",
              fontFamily: "inherit", boxShadow: pending ? "none" : "0 8px 22px -8px rgba(30,136,229,0.6)",
            }}
          >
            {pending ? "Joining…" : "Join class →"}
          </button>

          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, fontWeight: 700 }}>
              Don&apos;t have a code?
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                href="/creative-space"
                style={{ padding: "8px 14px", background: "transparent", color: "#26C6DA", border: "1px solid rgba(38,198,218,0.40)", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}
              >
                Browse classes →
              </Link>
              <button
                type="button"
                onClick={continueAsVisitor}
                disabled={pending}
                style={{ padding: "8px 14px", background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: pending ? "not-allowed" : "pointer", fontFamily: "inherit" }}
              >
                Skip — continue as visitor
              </button>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 18 }}>
          <Link href="/onboarding/intent" style={{ color: "#5A6478", fontSize: 11, textDecoration: "none" }}>
            ← Pick a different role
          </Link>
        </div>

        <style>{`@keyframes ec-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }`}</style>
      </div>
    </div>
  );
}
