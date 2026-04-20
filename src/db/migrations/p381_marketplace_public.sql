-- p381: Marketplace → public portal migration (Phase 1).
-- Adds the fields the public-first redesign needs without touching the existing
-- buy/sell flow: pay-what-you-want minimum, cover image for polished cards,
-- CIOS-curated badges (verified/featured), and a tip-amount override for
-- purchase records (so PWYW totals stay auditable).

ALTER TABLE marketplace_products
  ADD COLUMN IF NOT EXISTS cover_image_url  TEXT,
  ADD COLUMN IF NOT EXISTS pay_min_ngn      NUMERIC(12,2),       -- NULL = fixed price; set = pay-what-you-want min
  ADD COLUMN IF NOT EXISTS is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_featured      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS built_at_cios    BOOLEAN NOT NULL DEFAULT TRUE,  -- "Built during the CIOS internship" provenance flag
  ADD COLUMN IF NOT EXISTS slug             TEXT;

-- Unique slug per product — optional, populated by the server action when a
-- product is created. Used for shareable URLs (/marketplace/<slug>) later;
-- for now /marketplace/[id] still works.
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_products_slug_unique
  ON marketplace_products (slug)
  WHERE slug IS NOT NULL;

-- Featured products float to top of the browse page.
CREATE INDEX IF NOT EXISTS marketplace_products_featured_idx
  ON marketplace_products (is_featured, created_at DESC)
  WHERE status = 'active';

-- Record pay-what-you-want / tip overrides on purchases so analytics can
-- distinguish fixed-price sales from PWYW-tipped sales.
ALTER TABLE marketplace_purchases
  ADD COLUMN IF NOT EXISTS tip_ngn   NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_pwyw   BOOLEAN NOT NULL DEFAULT FALSE;
