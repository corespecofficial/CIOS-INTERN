-- p341: Investor & Startup Portal
CREATE TABLE IF NOT EXISTS startup_pitches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  startup_name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  stage TEXT NOT NULL DEFAULT 'idea' CHECK (stage IN ('idea','prototype','mvp','revenue','scaling')),
  looking_for TEXT[] DEFAULT '{}',
  website_url TEXT,
  pitch_deck_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  views INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','funded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS startup_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID NOT NULL REFERENCES startup_pitches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pitch_id, user_id)
);

CREATE INDEX IF NOT EXISTS startup_pitches_founder ON startup_pitches(founder_id);
CREATE INDEX IF NOT EXISTS startup_pitches_status ON startup_pitches(status);
CREATE INDEX IF NOT EXISTS startup_interests_pitch ON startup_interests(pitch_id);
