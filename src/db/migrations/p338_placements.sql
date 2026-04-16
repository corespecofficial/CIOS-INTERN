-- p338: Placement Fee Engine
-- Extend interviews with placement outcome columns
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS hire_confirmed_at TIMESTAMPTZ;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS starting_salary NUMERIC(14,2);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS placement_note TEXT;

-- Placements tracking table
CREATE TABLE IF NOT EXISTS placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  recruiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  starting_salary NUMERIC(14,2),
  hire_confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  placement_fee NUMERIC(14,2),
  fee_type TEXT NOT NULL DEFAULT 'percentage' CHECK (fee_type IN ('percentage','flat')),
  fee_status TEXT NOT NULL DEFAULT 'pending' CHECK (fee_status IN ('pending','invoiced','paid','waived')),
  invoice_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS placements_recruiter ON placements(recruiter_id);
CREATE INDEX IF NOT EXISTS placements_candidate ON placements(candidate_id);
CREATE INDEX IF NOT EXISTS placements_fee_status ON placements(fee_status);
