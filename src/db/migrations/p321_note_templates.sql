-- Custom note templates + premium gating.
-- Admins upload HTML templates here; they appear in the notes Template
-- Picker alongside the bundled ones. Safe to re-run.

CREATE TABLE IF NOT EXISTS note_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  category      text NOT NULL DEFAULT 'Letters',
  html          text NOT NULL DEFAULT '',
  accent        text NOT NULL DEFAULT '#1E88E5',
  preview_url   text,
  is_premium    boolean NOT NULL DEFAULT false,
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_note_templates_active_cat ON note_templates (is_active, category);

-- Lightweight premium flag on users — sub system can evolve later, admins
-- can toggle this from /admin/users or wherever else.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS premium_until timestamptz;

NOTIFY pgrst, 'reload schema';
