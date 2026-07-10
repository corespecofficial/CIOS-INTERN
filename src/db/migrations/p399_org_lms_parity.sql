-- p399: Org-scoped LMS parity
-- Additive bridge so /o/<slug>/instructor can reuse the mature LMS.

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES creative_orgs(id) ON DELETE CASCADE;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS price_naira INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_naira INTEGER,
  ADD COLUMN IF NOT EXISTS promo_video_url TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

ALTER TABLE course_enrollments
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES creative_orgs(id) ON DELETE CASCADE;

ALTER TABLE course_modules
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES creative_orgs(id) ON DELETE CASCADE;

ALTER TABLE course_modules
  ADD COLUMN IF NOT EXISTS youtube_id TEXT,
  ADD COLUMN IF NOT EXISTS summary TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_free_preview BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS quiz_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pass_score INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS assignment_prompt TEXT,
  ADD COLUMN IF NOT EXISTS assignment_max_score INTEGER NOT NULL DEFAULT 100;

ALTER TABLE module_submissions
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES creative_orgs(id) ON DELETE CASCADE;

ALTER TABLE quiz_attempts
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES creative_orgs(id) ON DELETE CASCADE;

ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES creative_orgs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS courses_org_idx ON courses(org_id, status, created_at DESC) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS course_modules_org_idx ON course_modules(org_id, course_id, order_index) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS course_enrollments_org_idx ON course_enrollments(org_id, user_id, status) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS module_submissions_org_idx ON module_submissions(org_id, user_id, submitted_at DESC) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS quiz_attempts_org_idx ON quiz_attempts(org_id, user_id, attempted_at DESC) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS certificates_org_idx ON certificates(org_id, user_id, issued_at DESC) WHERE org_id IS NOT NULL;

-- Backfill child org_id from parent courses. Existing global rows remain NULL.
UPDATE course_enrollments ce
SET org_id = c.org_id
FROM courses c
WHERE ce.course_id = c.id
  AND ce.org_id IS NULL
  AND c.org_id IS NOT NULL;

UPDATE course_modules cm
SET org_id = c.org_id
FROM courses c
WHERE cm.course_id = c.id
  AND cm.org_id IS NULL
  AND c.org_id IS NOT NULL;

UPDATE module_submissions ms
SET org_id = c.org_id
FROM course_modules cm
JOIN courses c ON c.id = cm.course_id
WHERE ms.module_id = cm.id
  AND ms.org_id IS NULL
  AND c.org_id IS NOT NULL;

UPDATE quiz_attempts qa
SET org_id = c.org_id
FROM course_modules cm
JOIN courses c ON c.id = cm.course_id
WHERE qa.module_id = cm.id
  AND qa.org_id IS NULL
  AND c.org_id IS NOT NULL;

UPDATE certificates cert
SET org_id = c.org_id
FROM courses c
WHERE cert.course_id = c.id
  AND cert.org_id IS NULL
  AND c.org_id IS NOT NULL;

-- Preserve legacy org_lessons by creating one draft LMS course per org that
-- still has legacy lessons and no org-scoped LMS course yet.
WITH orgs_with_lessons AS (
  SELECT DISTINCT co.id AS org_id, co.name, co.owner_user_id
  FROM creative_orgs co
  JOIN org_lessons ol ON ol.org_id = co.id
  WHERE NOT EXISTS (
    SELECT 1 FROM courses c WHERE c.org_id = co.id
  )
),
inserted_courses AS (
  INSERT INTO courses (
    org_id,
    title,
    subtitle,
    description,
    instructor_id,
    category,
    difficulty,
    language,
    duration_hours,
    price_naira,
    discount_naira,
    tags,
    status
  )
  SELECT
    org_id,
    name || ' Lessons',
    'Imported from the original org lesson board',
    'Legacy org lessons imported into the CIOS course builder.',
    owner_user_id,
    'General',
    'beginner',
    'English',
    0,
    0,
    NULL,
    ARRAY['org-import'],
    'draft'
  FROM orgs_with_lessons
  RETURNING id, org_id
)
INSERT INTO course_modules (
  course_id,
  org_id,
  title,
  description,
  content_type,
  youtube_id,
  content_url,
  summary,
  duration_minutes,
  order_index,
  is_free_preview
)
SELECT
  ic.id,
  ic.org_id,
  ol.title,
  COALESCE(ol.body, ''),
  CASE WHEN NULLIF(ol.video_url, '') IS NULL THEN 'article' ELSE 'video' END,
  NULLIF(ol.video_url, ''),
  NULL,
  COALESCE(ol.body, ''),
  0,
  ROW_NUMBER() OVER (PARTITION BY ol.org_id ORDER BY ol.position ASC, ol.created_at ASC) - 1,
  FALSE
FROM inserted_courses ic
JOIN org_lessons ol ON ol.org_id = ic.org_id;

UPDATE courses c
SET total_modules = counts.total
FROM (
  SELECT course_id, COUNT(*)::INTEGER AS total
  FROM course_modules
  GROUP BY course_id
) counts
WHERE c.id = counts.course_id
  AND c.org_id IS NOT NULL;
