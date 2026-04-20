-- p385: Investors + Startups public portal (Phase 5).
-- Adds the investor profile (onboarding output), watchlist + view tracking,
-- and SEO/cover fields on startup pitches. Keeps the existing
-- startup_pitches + startup_interests tables untouched.

CREATE TABLE IF NOT EXISTS investor_profiles (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- Step 1: profile
  full_name            TEXT NOT NULL,
  headline             TEXT,
  country              TEXT,
  linkedin_url         TEXT,
  -- Step 2: accreditation
  accreditation        TEXT NOT NULL DEFAULT 'individual'
    CHECK (accreditation IN ('individual', 'family_office', 'angel_syndicate', 'fund', 'corporate_vc')),
  org_name             TEXT,
  -- Step 3: cheque size
  cheque_min_usd       NUMERIC(12,2),
  cheque_max_usd       NUMERIC(12,2),
  -- Step 4: thesis
  thesis               TEXT,
  preferred_categories TEXT[] NOT NULL DEFAULT '{}',
  preferred_stages     TEXT[] NOT NULL DEFAULT '{}',
  preferred_geos       TEXT[] NOT NULL DEFAULT '{}',
  -- Step 5: portfolio
  portfolio_count      INT NOT NULL DEFAULT 0,
  notable_investments  TEXT,
  -- Step 6: prefs / agreement
  intro_email_optin    BOOLEAN NOT NULL DEFAULT TRUE,
  agreed_to_terms      BOOLEAN NOT NULL DEFAULT FALSE,
  -- Lifecycle
  approval_status      TEXT NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'suspended', 'rejected')),
  onboarded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS investor_profiles_status_idx
  ON investor_profiles (approval_status);

-- Watchlist — investors save startups they want to revisit.
CREATE TABLE IF NOT EXISTS investor_watchlist (
  investor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pitch_id    UUID NOT NULL REFERENCES startup_pitches(id) ON DELETE CASCADE,
  note        TEXT,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (investor_id, pitch_id)
);

CREATE INDEX IF NOT EXISTS investor_watchlist_investor_idx
  ON investor_watchlist (investor_id, added_at DESC);

-- Per-investor view log — surfaces "viewed by X investors" on the founder's
-- side without leaking who. Uniqueness lets us count distinct viewers.
CREATE TABLE IF NOT EXISTS pitch_views (
  pitch_id    UUID NOT NULL REFERENCES startup_pitches(id) ON DELETE CASCADE,
  viewer_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_viewed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pitch_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS pitch_views_pitch_idx
  ON pitch_views (pitch_id, last_viewed DESC);

-- Pitch additions for the public detail page.
ALTER TABLE startup_pitches
  ADD COLUMN IF NOT EXISTS cover_image_url   TEXT,
  ADD COLUMN IF NOT EXISTS slug              TEXT,
  ADD COLUMN IF NOT EXISTS country           TEXT,
  ADD COLUMN IF NOT EXISTS team_size         INT,
  ADD COLUMN IF NOT EXISTS founded_year      INT,
  ADD COLUMN IF NOT EXISTS monthly_revenue_usd NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS raising_amount_usd  NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS is_featured       BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS startup_pitches_slug_unique
  ON startup_pitches (slug) WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS startup_pitches_featured_idx
  ON startup_pitches (is_featured, created_at DESC)
  WHERE status = 'active' AND is_public = true;
