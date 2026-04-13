import * as Sentry from "@sentry/nextjs";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.NODE_ENV || "development",
    release: process.env.NEXT_PUBLIC_APP_VERSION,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: false,
    ignoreErrors: [
      "NEXT_REDIRECT",
      "NEXT_NOT_FOUND",
      "ChunkLoadError",
      "ResizeObserver loop completed with undelivered notifications.",
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
    ],
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
      Sentry.browserTracingIntegration(),
    ],
    beforeSend(event) {
      if (process.env.NODE_ENV !== "production" && !process.env.NEXT_PUBLIC_SENTRY_DEV_CAPTURE) return null;
      return event;
    },
  });
}

// Required in Next 15+ for router transition instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
