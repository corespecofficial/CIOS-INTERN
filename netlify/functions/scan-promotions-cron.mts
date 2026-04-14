import type { Config } from "@netlify/functions";

/**
 * Nightly — scans every eligible user and creates promotion recommendations
 * for anyone whose readiness score crosses the threshold.
 * Schedule configured in netlify.toml.
 */
export default async () => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!base) return new Response(JSON.stringify({ error: "No base URL" }), { status: 500 });
  try {
    const r = await fetch(`${base}/api/cron/scan-promotions`, {
      headers: { "x-cron-secret": process.env.CRON_SECRET || "" },
    });
    const body = await r.text();
    return new Response(body, { status: r.status, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500 });
  }
};

export const config: Config = {};
