/**
 * Server-side signup-risk scoring.
 *
 * Why server-side: client signals (FingerprintJS, canvas) are easy to spoof
 * and require shipping JS that hurts privacy. We compute a risk score from
 * the request headers we already have, plus a quick lookup in the users
 * table for collisions in the past 24h.
 *
 * The score (0–100) is purely advisory. Per the spam-policy decision:
 *   < 50  → log and ignore (normal signup)
 *   50–89 → flag for super-admin review, account works
 *   ≥ 90  → auto-suspend, super-admin notified (clearly scripted)
 *
 * Keep this file fast — it runs on every signup. No N+1, single query.
 */

import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/db";

export interface SignupSignals {
  ip_hash: string;
  ua_hash: string;
  ua_short: string;
  accept_language: string | null;
  accept_encoding: string | null;
  email_domain: string;
  /** quick checks the scorer ran */
  flags: string[];
  /** matching users in the last 24h */
  collisions: { ip: number; ua: number };
}

export interface RiskAssessment {
  score: number;
  signals: SignupSignals;
  verdict: "ok" | "review" | "block";
}

const COLLISION_WINDOW_HOURS = 24;
const HARD_BLOCK_THRESHOLD = 90;
const REVIEW_THRESHOLD = 50;

function hash(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 24);
}

/** Best-effort client IP from request headers. Vercel sets x-forwarded-for. */
export function ipFromHeaders(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") || h.get("cf-connecting-ip") || "0.0.0.0";
}

/**
 * Compute risk for a new signup. Pure: doesn't write to the DB. Caller
 * persists `signals` + `score` + acts on `verdict`.
 */
export async function assessSignupRisk(
  email: string,
  reqHeaders: Headers,
): Promise<RiskAssessment> {
  const ip = ipFromHeaders(reqHeaders);
  const ua = reqHeaders.get("user-agent") || "";
  const ipHash = hash(ip);
  const uaHash = hash(ua);
  const acceptLanguage = reqHeaders.get("accept-language");
  const acceptEncoding = reqHeaders.get("accept-encoding");

  const flags: string[] = [];
  let score = 0;

  // ── Header sanity ──────────────────────────────────────────────
  if (!ua) { flags.push("no_user_agent"); score += 30; }
  if (ua && ua.length < 20) { flags.push("short_ua"); score += 15; }
  if (!acceptLanguage) { flags.push("no_accept_language"); score += 10; }
  // Headless browser signatures.
  if (/HeadlessChrome|PhantomJS|Selenium|puppeteer|playwright/i.test(ua)) {
    flags.push("headless_signature"); score += 50;
  }

  // ── Email-shape sanity ────────────────────────────────────────
  const emailDomain = (email.split("@")[1] || "").toLowerCase();
  // Disposable email domains. Tiny list — production should pull from
  // a maintained source (e.g. github.com/disposable-email-domains).
  const disposable = new Set([
    "mailinator.com", "tempmail.com", "10minutemail.com", "guerrillamail.com",
    "yopmail.com", "trashmail.com", "throwawaymail.com", "fakeinbox.com",
    "maildrop.cc", "getnada.com", "sharklasers.com",
  ]);
  if (disposable.has(emailDomain)) { flags.push("disposable_email"); score += 35; }
  if (/^\d{6,}@/.test(email)) { flags.push("numeric_local_part"); score += 15; }

  // ── Collision check: same IP / UA hashed signups in the window ─
  const since = new Date(Date.now() - COLLISION_WINDOW_HOURS * 3600 * 1000).toISOString();
  let ipCount = 0;
  let uaCount = 0;
  try {
    const sb = supabaseAdmin();
    const [ipRes, uaRes] = await Promise.all([
      sb.from("users").select("id", { count: "exact", head: true }).eq("signup_ip_hash", ipHash).gte("created_at", since),
      sb.from("users").select("id", { count: "exact", head: true }).eq("signup_ua_hash", uaHash).gte("created_at", since),
    ]);
    ipCount = ipRes.count ?? 0;
    uaCount = uaRes.count ?? 0;
  } catch {
    // DB miss is non-fatal — treat as zero.
  }

  // Same IP: 3+ in 24h is suspicious; 5+ likely scripted.
  if (ipCount >= 5) { flags.push("ip_burst"); score += 50; }
  else if (ipCount >= 3) { flags.push("ip_repeat"); score += 25; }
  else if (ipCount >= 1) { flags.push("ip_seen"); score += 5; }

  if (uaCount >= 10) { flags.push("ua_burst"); score += 30; }

  // Cap.
  score = Math.min(100, score);

  const verdict: RiskAssessment["verdict"] =
    score >= HARD_BLOCK_THRESHOLD ? "block"
    : score >= REVIEW_THRESHOLD ? "review"
    : "ok";

  return {
    score,
    verdict,
    signals: {
      ip_hash: ipHash,
      ua_hash: uaHash,
      ua_short: ua.slice(0, 120),
      accept_language: acceptLanguage,
      accept_encoding: acceptEncoding,
      email_domain: emailDomain,
      flags,
      collisions: { ip: ipCount, ua: uaCount },
    },
  };
}
