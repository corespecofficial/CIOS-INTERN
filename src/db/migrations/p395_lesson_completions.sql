-- ───────────────────────────────────────────────────────────────────
-- p395 — per-student lesson completion tracking
-- ───────────────────────────────────────────────────────────────────
-- One row per (lesson, user) when the student marks the lesson as
-- complete. Unmark = DELETE the row. Idempotent inserts via UNIQUE
-- so toggling rapidly is safe.
--
-- Used by:
--   - src/app/actions/org-portal.ts (markLessonComplete /
--     unmarkLessonComplete)
--   - student class home: progress bar (X / Y lessons done)
--   - host analytics: per-lesson completion rate
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS org_lesson_completions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES creative_orgs(id) ON DELETE CASCADE,
  lesson_id    UUID NOT NULL REFERENCES org_lessons(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lesson_id, user_id)
);

-- Hot paths:
--   - "is this lesson complete for me?" → (lesson_id, user_id) UNIQUE
--      already covers it.
--   - "what have I completed in this org?" → (user_id, org_id)
CREATE INDEX IF NOT EXISTS org_lesson_completions_user_org_idx
  ON org_lesson_completions(user_id, org_id);

-- "Per-lesson completion rate" for host analytics:
CREATE INDEX IF NOT EXISTS org_lesson_completions_lesson_idx
  ON org_lesson_completions(lesson_id);

-- RLS — same shape as org_audit_log: any active org member can read,
-- writes happen only via service-role server actions which gate by
-- assertOrgMember(role=student-or-host). No INSERT/UPDATE/DELETE
-- policy on purpose; the table is service-role-only at the SQL level.
ALTER TABLE org_lesson_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_lesson_completions_select ON org_lesson_completions
  FOR SELECT
  USING (
    is_super_admin()
    OR is_org_member(org_id, ARRAY['owner','org_admin','instructor','student'])
  );
