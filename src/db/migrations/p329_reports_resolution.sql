-- p329_reports_resolution.sql — track moderator resolution on reports.
ALTER TABLE post_reports ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','dismissed','actioned'));
ALTER TABLE post_reports ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE post_reports ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
ALTER TABLE post_reports ADD COLUMN IF NOT EXISTS resolution_note text;
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON post_reports(status, created_at DESC);
