import type { Config } from "@netlify/functions";

/** Scheduled function — every day at 08:00 UTC. */
export default async (req: Request) => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!base) return new Response(JSON.stringify({ error: "No base URL" }), { status: 500 });
  try {
    const r = await fetch(`${base}/api/cron/daily-digest`, {
      headers: { "x-cron-secret": process.env.CRON_SECRET || "" },
    });
    const body = await r.text();
    return new Response(body, { status: r.status, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500 });
  }
};

export const config: Config = {};
