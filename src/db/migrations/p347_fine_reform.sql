-- p347_fine_reform.sql
-- Fine Structure Reform: escalating offense tiers + non-monetary consequences

-- Add offense_number so the system knows which escalation tier this fine is (1st, 2nd, 3rd+)
ALTER TABLE compliance_fines
  ADD COLUMN IF NOT EXISTS offense_number INT NOT NULL DEFAULT 1;

-- Add non-monetary consequence that can be assigned alongside the fine
-- Examples: "warning_letter", "extra_assignment", "written_apology", "public_task", "mentorship_session"
ALTER TABLE compliance_fines
  ADD COLUMN IF NOT EXISTS non_monetary_consequence TEXT DEFAULT NULL;

-- Add consequence status: pending / fulfilled / waived
ALTER TABLE compliance_fines
  ADD COLUMN IF NOT EXISTS consequence_status TEXT DEFAULT NULL
  CHECK (consequence_status IN ('pending', 'fulfilled', 'waived'));

-- Add consequence note: admin describes what needs to be done
ALTER TABLE compliance_fines
  ADD COLUMN IF NOT EXISTS consequence_note TEXT DEFAULT NULL;

-- Index for fast offense-count lookups per user
CREATE INDEX IF NOT EXISTS idx_compliance_fines_user_offense
  ON compliance_fines(user_id, offense_number);

-- Add a view that makes the escalation tier easy to query
CREATE OR REPLACE VIEW user_fine_offense_counts AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE status != 'waived') AS total_offenses,
  COUNT(*) FILTER (WHERE status = 'unpaid') AS unpaid_count,
  SUM(amount) FILTER (WHERE status = 'unpaid') AS unpaid_total
FROM compliance_fines
GROUP BY user_id;
