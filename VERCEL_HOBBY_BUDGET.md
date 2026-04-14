# Making Vercel Hobby (free) last 6+ months

Hobby tier is generous but has real limits. Here's how this repo is tuned to stay well inside them, and what to watch.

## Current limits (Vercel Hobby, April 2026)

| Resource | Limit | Our estimated use per month at 50 students |
|---|---|---|
| Serverless function invocations | 100,000 / month | ~8,000 (well under) |
| Edge function requests | 500,000 / month | ~1,000 |
| Bandwidth | 100 GB / month | ~2 GB |
| Cron jobs | 2 max, daily only | 2 used ✓ |
| Build minutes | 6,000 / month | ~200 |
| Image optimization transformations | 1,000 source images | ~100 |
| Fluid compute GB-hours | 1,000 / month | ~150 |

## What we did to fit in

### 1. Merged 3 crons → 2

- `daily-digest` runs daily at 08:00 UTC. **On Mondays it also sends the weekly digest** to weekly-frequency users. So you keep both cadences on 2 scheduled runs.
- `scan-promotions` runs daily at 02:00 UTC.
- Any third cron would need Pro ($20/mo).

### 2. Reduced polling intervals

| Hook | Before | After | Savings |
|---|---|---|---|
| Messages tick-status poll | 6s | **30s** | 5× fewer server actions per open chat |
| Sidebar unread badges | 60s | **180s** | 3× fewer calls |
| Behavior insights card | 60s | **300s** | 5× fewer calls |

Ably realtime events still update tick/presence instantly — the polls are just reconciliation fallbacks.

### 3. What's still burning quota (but safely)

- **ActivityTracker** fires once per route change (throttled). At ~20 nav events per session that's fine.
- **Sidebar badges** on every page load + every focus event. Cache helps.
- **listMyRooms** on every messages-page load.

## Early-warning signs

Vercel shows usage at **Project → Usage**. Check monthly:

- If **Function Invocations** > 70% → reduce polls further or move to Ably-only where possible.
- If **Fluid Compute GB-hours** > 70% → biggest offenders are probably `getRoomMessages` or `computePersonalMetrics`. Add a cached layer (Redis / Upstash free tier).
- If **Bandwidth** > 70% → Cloudinary is delivering most of your images already (offloaded). Check for leaked JSON API payloads.

## Things to DO NOT do on Hobby

- Don't add more crons (2 max)
- Don't enable ISR revalidation shorter than 60s
- Don't add background jobs (Vercel Queues, etc.)
- Don't import large server-side libraries into client bundles (check `next build` output sizes)

## External free dependencies that extend runway

- **Upstash Redis** (free 10k commands/day) — wired in `src/lib/cache.ts`.
  Caches engagement settings, sidebar badges, course leaderboards, and
  per-course context for the AI study buddy. Without it, a single page
  view can fan out into 5–10 Supabase round-trips. Set
  `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to enable; runs
  silently uncached without them.

- **Cloudflare R2** (free 10 GB storage + UNLIMITED egress) — wired in
  `src/lib/r2.ts`. Stores rendered certificate PDFs so repeat downloads
  redirect straight to R2 instead of re-running `@react-pdf/renderer`
  on a Vercel function. R2 egress is free, so cert downloads stop
  counting against Vercel's 100 GB bandwidth budget. Set
  `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_BUCKET` to enable.

- **Cloudinary** (already used) — handles all image uploads + CDN.
  Don't pipe Cloudinary URLs through Next `<Image>` (it consumes Vercel's
  1k transformation cap); keep using `<img>` with the Cloudinary URL
  directly.

## When to upgrade

Move to Pro ($20/month) when:

- You exceed 1,000 daily active users
- Function invocations consistently > 90,000/month
- You need more crons (mailing schedules, scheduled cleanups, etc.)
- You need custom domains with multiple environments

Until then — **6+ months at current budget is very realistic** for a CIOS deployment of 50-100 interns.
