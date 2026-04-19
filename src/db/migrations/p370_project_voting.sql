-- p370: Peer Voting / Project of the Week
-- Interns submit projects to weekly rounds; peers vote; winner featured.

CREATE TABLE IF NOT EXISTS voting_rounds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start    DATE NOT NULL UNIQUE,
  week_end      DATE NOT NULL,
  theme         TEXT,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','voting','closed')),
  winner_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  winning_submission_id UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voting_rounds_status ON voting_rounds(status);

CREATE TABLE IF NOT EXISTS voting_submissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id    UUID NOT NULL REFERENCES voting_rounds(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  media_url   TEXT,
  thumbnail_url TEXT,
  category    TEXT,
  artifact_url TEXT,
  vote_count  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(round_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_voting_subs_round ON voting_submissions(round_id);
CREATE INDEX IF NOT EXISTS idx_voting_subs_votes ON voting_submissions(vote_count DESC);

CREATE TABLE IF NOT EXISTS votes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES voting_submissions(id) ON DELETE CASCADE,
  voter_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(submission_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_submission ON votes(submission_id);
