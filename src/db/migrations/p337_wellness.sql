-- p337: Mental Health / Wellness Check-in
CREATE TABLE IF NOT EXISTS wellness_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_of DATE NOT NULL,
  mood INT NOT NULL CHECK (mood BETWEEN 1 AND 5),
  stress INT NOT NULL CHECK (stress BETWEEN 1 AND 5),
  energy INT NOT NULL CHECK (energy BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_of)
);

CREATE INDEX IF NOT EXISTS wellness_checkins_user ON wellness_checkins(user_id);
CREATE INDEX IF NOT EXISTS wellness_checkins_week ON wellness_checkins(week_of);
