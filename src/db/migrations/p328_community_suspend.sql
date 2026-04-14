-- p328_community_suspend.sql — admin moderation on groups.
ALTER TABLE communities ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS suspend_reason text;
CREATE INDEX IF NOT EXISTS idx_communities_suspended ON communities(suspended_at) WHERE suspended_at IS NOT NULL;
