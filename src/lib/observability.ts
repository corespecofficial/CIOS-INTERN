import * as Sentry from "@sentry/nextjs";

const DSN_SET = !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

/** Capture an exception with contextual tags. No-op if Sentry isn't configured. */
export function captureError(err: unknown, ctx: { tags?: Record<string, string>; extra?: Record<string, unknown>; user?: { id?: string; role?: string } } = {}) {
  if (!DSN_SET) return;
  try {
    Sentry.withScope((scope) => {
      if (ctx.tags) for (const [k, v] of Object.entries(ctx.tags)) scope.setTag(k, v);
      if (ctx.extra) scope.setExtras(ctx.extra);
      if (ctx.user?.id) scope.setUser({ id: ctx.user.id, segment: ctx.user.role });
      Sentry.captureException(err);
    });
  } catch {/* swallow */}
}

/** Emit a named message (useful for business events like "payment_failed"). */
export function captureEvent(name: string, level: Sentry.SeverityLevel = "info", ctx: { tags?: Record<string, string>; extra?: Record<string, unknown> } = {}) {
  if (!DSN_SET) return;
  try {
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      if (ctx.tags) for (const [k, v] of Object.entries(ctx.tags)) scope.setTag(k, v);
      if (ctx.extra) scope.setExtras(ctx.extra);
      Sentry.captureMessage(name, level);
    });
  } catch {/* swallow */}
}

/** Wrap an async task (cron, webhook, queue worker) in a Sentry span for timing + error capture. */
export async function withMonitor<T>(name: string, op: string, fn: () => Promise<T>): Promise<T> {
  if (!DSN_SET) return fn();
  return Sentry.startSpan({ name, op }, async () => {
    try { return await fn(); }
    catch (e) { Sentry.captureException(e); throw e; }
  });
}

export function setRequestUser(user: { id: string; role?: string; email?: string } | null) {
  if (!DSN_SET) return;
  try { Sentry.setUser(user ? { id: user.id, segment: user.role, email: user.email } : null); } catch {/* ignore */}
}

export function isSentryEnabled() { return DSN_SET; }
