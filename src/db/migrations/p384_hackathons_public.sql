-- p384: Hackathons → public portal migration (Phase 4).
-- Adds the fields needed for a polished public detail page (cover, slug,
-- view counter) and the marketing-landing hero card (is_featured, hero_blurb).
-- Keeps the existing prize_pool TEXT field intact so existing data survives.

ALTER TABLE hackathons
  ADD COLUMN IF NOT EXISTS cover_image_url   TEXT,
  ADD COLUMN IF NOT EXISTS slug              TEXT,
  ADD COLUMN IF NOT EXISTS hero_blurb        TEXT,        -- one-liner for landing hero
  ADD COLUMN IF NOT EXISTS is_featured       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS view_count        INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sponsor_logos     JSONB NOT NULL DEFAULT '[]'::jsonb;
  -- sponsor_logos is an array of { name, logo_url, url } objects.

CREATE UNIQUE INDEX IF NOT EXISTS hackathons_slug_unique
  ON hackathons (slug) WHERE slug IS NOT NULL;

-- Featured hackathons surface first on the marketing landing hero.
CREATE INDEX IF NOT EXISTS hackathons_featured_idx
  ON hackathons (is_featured, starts_at DESC)
  WHERE status IN ('upcoming', 'active');

-- Hackathon submissions: opt-in public visibility for the gallery.
-- Default to FALSE so unscored projects don't leak before judging.
ALTER TABLE hackathon_submissions
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;
