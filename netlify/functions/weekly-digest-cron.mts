import type { Config } from "@netlify/functions";

/**
 * Scheduled function — Mondays 09:00 UTC.
 * Pings the Next.js API route which does the actual work.
 * The schedule itself is set in netlify.toml.
 */
export default async (req: Request) => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!base) {
    return new Response(JSON.stringify({ error: "No base URL configured" }), { status: 500 });
  }
  try {
    const r = await fetch(`${base}/api/cron/weekly-digest`, {
      headers: { "x-cron-secret": process.env.CRON_SECRET || "" },
    });
    const body = await r.text();
    return new Response(body, { status: r.status, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500 });
  }
};

export const config: Config = {
  // Schedule defined in netlify.toml under [functions."weekly-digest-cron"]
};
