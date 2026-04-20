-- p382: Creative Spaces → public portal migration (Phase 2).
-- Adds the fields needed for a rich, Teachable/Podia-quality detail page —
-- cover/intro video, outcomes list, syllabus JSON, rating + review count —
-- plus a reviews table so learners can leave feedback and other learners
-- can see it before they enrol.

ALTER TABLE creative_spaces
  ADD COLUMN IF NOT EXISTS cover_image_url   TEXT,
  ADD COLUMN IF NOT EXISTS intro_video_url   TEXT,
  ADD COLUMN IF NOT EXISTS outcomes          TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS syllabus          JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rating            NUMERIC(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count      INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS slug              TEXT;

-- Reviews — one per (space, reviewer). Only enrolled learners can write one;
-- the UNIQUE prevents re-review, the server action enforces enrolment.
CREATE TABLE IF NOT EXISTS creative_space_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id    UUID NOT NULL REFERENCES creative_spaces(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (space_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS creative_space_reviews_space_idx
  ON creative_space_reviews (space_id, created_at DESC);

-- Sort "Top rated" + "Featured" fast; matches the browse sort options.
CREATE INDEX IF NOT EXISTS creative_spaces_rating_idx
  ON creative_spaces (rating DESC)
  WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS creative_spaces_featured_idx
  ON creative_spaces (is_featured, created_at DESC)
  WHERE status = 'approved';

CREATE UNIQUE INDEX IF NOT EXISTS creative_spaces_slug_unique
  ON creative_spaces (slug)
  WHERE slug IS NOT NULL;

-- Enrollments: track payment details so paid spaces can reconcile and so
-- a free/paid mix can coexist on the same learner's dashboard.
ALTER TABLE creative_enrollments
  ADD COLUMN IF NOT EXISTS amount_paid_ngn NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status  TEXT NOT NULL DEFAULT 'free'
    CHECK (payment_status IN ('free','paid','refunded','failed')),
  ADD COLUMN IF NOT EXISTS completed_at    TIMESTAMPTZ;
