-- p332: Talent alerts for recruiters
-- Recruiters set saved search criteria; platform notifies them when matching interns become available

CREATE TABLE IF NOT EXISTS talent_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label           TEXT NOT NULL DEFAULT 'My Alert',     -- recruiter-friendly name
  filters         JSONB NOT NULL DEFAULT '{}',           -- { track, min_score, min_level, skills[], remote_only }
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_notified_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS talent_alerts_recruiter_idx ON talent_alerts(recruiter_id);
CREATE INDEX IF NOT EXISTS talent_alerts_active_idx    ON talent_alerts(is_active) WHERE is_active = true;
