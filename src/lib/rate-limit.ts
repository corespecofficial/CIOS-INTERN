/**
 * In-process rate limiter — lightweight, server-side, per user+bucket.
 *
 * Good enough for a single-region deployment; if you scale to multiple
 * Vercel regions swap the underlying Map for Upstash Redis. API is the
 * same either way.
 */

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

export function rateLimit(key: string, max: number, windowMs: number): { ok: true } | { ok: false; retryMs: number } {
  const now = Date.now();
  const b = store.get(key);
  if (!b || b.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (b.count >= max) {
    return { ok: false, retryMs: b.resetAt - now };
  }
  b.count += 1;
  return { ok: true };
}

/** Common presets. Tune per action. */
export const LIMITS = {
  comment:   { max: 8,  windowMs: 60_000  },   // 8 / minute
  reaction:  { max: 40, windowMs: 60_000  },   // 40 / minute
  award:     { max: 10, windowMs: 60_000  },   // 10 / minute
  kudos:     { max: 30, windowMs: 3600_000},   // 30 / hour
  report:    { max: 10, windowMs: 3600_000},   // 10 / hour
  post_new:  { max: 3,  windowMs: 3600_000},   // matches the existing new-account cap
};

export type LimitName = keyof typeof LIMITS;

export function checkLimit(userId: string, name: LimitName): { ok: true } | { ok: false; error: string } {
  const cfg = LIMITS[name];
  const r = rateLimit(`${name}:${userId}`, cfg.max, cfg.windowMs);
  if (r.ok) return { ok: true };
  const secs = Math.ceil(r.retryMs / 1000);
  const human = secs < 60 ? `${secs}s` : `${Math.ceil(secs / 60)}m`;
  return { ok: false, error: `Slow down — try again in ${human}.` };
}
