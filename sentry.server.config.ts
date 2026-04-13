import * as Sentry from "@sentry/nextjs";

const DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.NODE_ENV || "development",
    release: process.env.NEXT_PUBLIC_APP_VERSION || process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    sendDefaultPii: false,
    ignoreErrors: [
      "NEXT_REDIRECT",
      "NEXT_NOT_FOUND",
    ],
    beforeSend(event) {
      // Drop events from localhost/dev unless explicitly enabled
      if (process.env.NODE_ENV !== "production" && !process.env.SENTRY_DEV_CAPTURE) return null;
      // Scrub known secret-bearing keys from request body/cookies/headers
      if (event.request) {
        if (event.request.cookies) event.request.cookies = { "[FILTERED]": "true" } as never;
        if (event.request.headers) {
          const h = event.request.headers as Record<string, string>;
          for (const k of Object.keys(h)) {
            if (/authorization|cookie|token|secret|api.?key/i.test(k)) h[k] = "[FILTERED]";
          }
        }
      }
      return event;
    },
  });
}
