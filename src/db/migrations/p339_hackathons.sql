-- p339: Hackathon Portal
CREATE TABLE IF NOT EXISTS hackathons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  theme TEXT,
  banner_url TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  registration_deadline TIMESTAMPTZ,
  prize_pool TEXT,
  max_team_size INT NOT NULL DEFAULT 4,
  min_team_size INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','active','judging','completed','cancelled')),
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hackathon_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(hackathon_id, name)
);

CREATE TABLE IF NOT EXISTS hackathon_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader','member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS hackathon_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  demo_url TEXT,
  repo_url TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score NUMERIC(5,2),
  rank INT,
  judge_notes TEXT,
  UNIQUE(hackathon_id, team_id)
);

CREATE INDEX IF NOT EXISTS hackathons_status ON hackathons(status);
CREATE INDEX IF NOT EXISTS hackathon_teams_hackathon ON hackathon_teams(hackathon_id);
CREATE INDEX IF NOT EXISTS hackathon_members_user ON hackathon_team_members(user_id);
CREATE INDEX IF NOT EXISTS hackathon_submissions_hackathon ON hackathon_submissions(hackathon_id);
