# Deploying CIOS to Netlify

## 1. Connect the GitHub repo
1. Log in to Netlify → **Add new site → Import from Git → GitHub**
2. Pick `corespecofficial/CIOS-INTERN`
3. Branch: `main`
4. Build settings auto-detect from `netlify.toml` — no manual changes needed

## 2. Required environment variables
Set these in **Site settings → Environment variables**:

### Required (app won't boot without)
| Key | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://your-site.netlify.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase (server-side only) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | from Clerk |
| `CLERK_SECRET_KEY` | from Clerk |

### Required for features
| Key | Used by |
|---|---|
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | image / file uploads |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | image / file uploads |
| `CLOUDINARY_API_SECRET` | server-side signed uploads |
| `NEXT_PUBLIC_ABLY_KEY` (or `ABLY_API_KEY`) | realtime messaging + presence |
| `CRON_SECRET` | protects daily/weekly digest cron endpoints |

### Optional
| Key | Used by |
|---|---|
| `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | error tracking + sourcemaps |
| `RESEND_API_KEY` (or other email keys) | digest emails, transactional |
| `OPENAI_API_KEY` (or other LLM keys) | AI Hub features (gates configured per super admin) |

## 3. Database setup
Run all SQL files in `src/db/migrations/` against your Supabase Postgres.
The newer ones added during build:
```sql
-- daily login bonus
CREATE TABLE IF NOT EXISTS daily_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  xp_granted int NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- referrals
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES users(id);

-- notes (TipTap-backed, optional)
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

-- security history
CREATE TABLE IF NOT EXISTS login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip text, user_agent text, device text,
  success boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_history_user_idx ON login_history (user_id, created_at DESC);

-- webhooks
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

-- per-user notification preferences
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT '{}'::jsonb;
```

## 4. Cron jobs
Defined in `netlify.toml` as **Scheduled Functions**:
- `weekly-digest-cron` — Mondays 09:00 UTC
- `daily-digest-cron` — every day 08:00 UTC

Both ping `/api/cron/*` with the `x-cron-secret` header (set `CRON_SECRET` env var to enable auth).

## 5. After first deploy
1. Update `NEXT_PUBLIC_APP_URL` to the actual Netlify URL
2. Add the URL to your Clerk allowlist (Clerk dashboard → API keys → Authorized URLs)
3. Add the URL to your Supabase auth allowlist if you use Supabase auth
4. Trigger a redeploy so the env changes take effect
