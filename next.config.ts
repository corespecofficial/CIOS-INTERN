import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Quiet build output
  silent: !process.env.CI,
  widenClientFileUpload: true,

  // Route browser requests through /monitoring to bypass ad-blockers
  tunnelRoute: "/monitoring",

  // Skip source-map upload entirely when no auth token is set (Netlify env without Sentry)
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
