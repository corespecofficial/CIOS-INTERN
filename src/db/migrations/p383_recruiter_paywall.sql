-- p383: Recruiter paywall (Phase 3).
-- Introduces plan tiers so recruiters can post 1 opportunity free and pay for
-- unlimited + premium features (featured listings, promoted talent search,
-- advanced analytics). Platform keeps its 5%/flat placement fee on hires.
--
-- Also adds a stable public slug on opportunities so SEO detail URLs can be
-- human-readable later (/opportunities/senior-react-lead-xxxx) while existing
-- UUID URLs keep working.

ALTER TABLE recruiter_profiles
  ADD COLUMN IF NOT EXISTS plan_tier            TEXT NOT NULL DEFAULT 'free'
    CHECK (plan_tier IN ('free','growth','pro','enterprise')),
  ADD COLUMN IF NOT EXISTS plan_started_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_renews_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_stripe_sub_id   TEXT,
  -- Rolling counter of active (status=open) listings. Cheap to maintain on
  -- create/close; saves a COUNT on every post-attempt.
  ADD COLUMN IF NOT EXISTS active_listing_count INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS recruiter_profiles_plan_idx
  ON recruiter_profiles (plan_tier, approval_status);

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS slug         TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_promoted  BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS opportunities_slug_unique
  ON opportunities (slug) WHERE slug IS NOT NULL;

-- Promoted listings float to top (Pro / Enterprise feature).
CREATE INDEX IF NOT EXISTS opportunities_promoted_idx
  ON opportunities (is_promoted, created_at DESC)
  WHERE status = 'open';
