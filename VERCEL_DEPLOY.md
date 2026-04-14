# Deploying CIOS to Vercel

Much simpler than Netlify — Vercel is purpose-built for Next.js. No plugins, no adapter config needed.

## 1. Connect the GitHub repo

1. Log in to [vercel.com](https://vercel.com) → **Add New → Project**
2. Pick `corespecofficial/CIOS-INTERN`
3. Branch: `main`
4. **Framework Preset**: Vercel auto-detects Next.js — leave all build settings default
5. **Root Directory**: leave blank (project root)
6. **Install Command**: `npm install --legacy-peer-deps` (TipTap v3 + collab-cursor peer-dep mismatch)

## 2. Required environment variables

Paste these into **Project Settings → Environment Variables**. Same values you were using on Netlify — copy from `cios-netlify-env.txt` on your Desktop.

| Key | Required | Source |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://cios-intern.vercel.app` (or your custom domain) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk dashboard → API keys |
| `CLERK_SECRET_KEY` | ✅ | Clerk dashboard → API keys |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | ✅ | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | ✅ | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | ✅ | `/post-auth` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | ✅ | `/post-auth` |
| `CLERK_WEBHOOK_SECRET` | ✅ | Clerk → Webhooks |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase → API (service_role, keep secret) |
| `NEXT_PUBLIC_ABLY_API_KEY` | ✅ | Ably → Apps → API keys |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary → Dashboard |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | ✅ | Cloudinary → Settings → Upload |
| `CRON_SECRET` | ✅ | Any long random string |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | optional | `npx web-push generate-vapid-keys` |
| `NEXT_PUBLIC_APP_VERSION` | optional | `1.0.0` |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | optional | Paystack (deferred) |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | optional | Error monitoring |

**Bulk import**: Vercel supports `.env` paste on the env vars page. Copy the contents of `cios-netlify-env.txt` verbatim (change the first line to `NEXT_PUBLIC_APP_URL=https://cios-intern.vercel.app`).

## 3. Cron jobs — already configured

`vercel.json` at the repo root already declares all three:

```json
{
  "crons": [
    { "path": "/api/cron/weekly-digest",     "schedule": "0 9 * * 1" },
    { "path": "/api/cron/daily-digest",      "schedule": "0 8 * * *" },
    { "path": "/api/cron/scan-promotions",   "schedule": "0 2 * * *" }
  ]
}
```

Vercel picks these up automatically after the first deploy. Each route is protected by `CRON_SECRET` via the `x-cron-secret` header; Vercel's cron runner forwards that automatically when you add the env var.

**Note about free plan limits**: Vercel Hobby (free) only allows **up to 2 cron jobs**, and each can only run **once per day**. If you need all three crons on the free tier, the weekly digest (runs Mondays only) can be dropped or merged into the daily one. If you're upgrading to Pro, all three run as-specified.

## 4. After first deploy

1. Wait for the build to finish — first one may take 3–5 min (TipTap/Yjs compile)
2. Grab the Vercel URL (typically `https://cios-intern.vercel.app`)
3. Update these:
   - **Clerk dashboard** → API keys → Authorized URLs → add the Vercel URL
   - **Supabase** → Auth → URL Configuration → add to Site URL + Redirect URLs
   - Your env var `NEXT_PUBLIC_APP_URL` → set to the actual live URL → redeploy
4. **Custom domain** (optional): Vercel dashboard → Domains → Add. Free on any plan, includes automatic SSL.

## 5. Database

If you haven't run it yet, these migrations must exist in Supabase. Full list in `src/db/migrations/`.

```sql
-- Daily login bonus
CREATE TABLE IF NOT EXISTS daily_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  xp_granted int NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Referrals
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES users(id);

-- Notes persistence
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled',
  html text NOT NULL DEFAULT '',
  icon text DEFAULT '📝',
  cover_url text, folder text,
  tags text[] DEFAULT '{}',
  status text DEFAULT 'draft',
  starred boolean DEFAULT false, pinned boolean DEFAULT false,
  trashed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Security / Login history
CREATE TABLE IF NOT EXISTS login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip text, user_agent text, device text,
  success boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_history_user_idx ON login_history(user_id, created_at DESC);

-- Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  secret text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- API tokens
CREATE TABLE IF NOT EXISTS api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  prefix text NOT NULL,
  hash text NOT NULL UNIQUE,
  scopes text[] DEFAULT '{}',
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Notification prefs
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT '{}'::jsonb;

-- Promotion recommendations
CREATE TABLE IF NOT EXISTS promotion_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_role text NOT NULL, from_rank text,
  to_role text NOT NULL, to_rank text,
  readiness_score int NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS promo_user_idx ON promotion_recommendations(user_id);
CREATE INDEX IF NOT EXISTS promo_status_idx ON promotion_recommendations(status);

-- Activity / behavior tracking
CREATE TABLE IF NOT EXISTS user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event text NOT NULL,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_events_idx ON user_events(user_id, created_at DESC);

-- Messaging WhatsApp ticks
CREATE TABLE IF NOT EXISTS message_reads (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivered_at timestamptz,
  read_at timestamptz,
  PRIMARY KEY (message_id, viewer_id)
);
CREATE INDEX IF NOT EXISTS message_reads_viewer_idx ON message_reads(viewer_id);
```

## 6. Why Vercel is better here

- **Zero Next.js config**. Netlify needs `@netlify/plugin-nextjs`; Vercel is native.
- **Faster cold starts** for server components + server actions.
- **Edge network tuned for Next.js ISR** and streaming responses.
- **Cron is built-in**, no scheduled-function indirection.
- **Generous free tier** for personal/early-stage: 100 GB bandwidth, unlimited Hobby projects.
