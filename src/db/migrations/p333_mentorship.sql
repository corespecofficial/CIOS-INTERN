-- p333: Mentorship system — mentor profiles, mentorships, and sessions

-- 1. Mentor profiles
CREATE TABLE IF NOT EXISTS mentors (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio             TEXT,
  expertise_tags  TEXT[] NOT NULL DEFAULT '{}',
  max_mentees     INT NOT NULL DEFAULT 5,
  is_available    BOOLEAN NOT NULL DEFAULT true,
  session_rate    NUMERIC(10,2),                       -- optional charge per session (NULL = free)
  rating          NUMERIC(3,2) NOT NULL DEFAULT 0,     -- 0.00–5.00
  sessions_done   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mentors_available_idx ON mentors(is_available) WHERE is_available = true;

-- 2. Active mentorship relationships
CREATE TABLE IF NOT EXISTS mentorships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentee_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending'   -- pending | active | ended | rejected
              CHECK (status IN ('pending','active','ended','rejected')),
  note        TEXT,                              -- mentee's request message
  started_at  TIMESTAMPTZ,
  ended_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mentor_id, mentee_id)
);

CREATE INDEX IF NOT EXISTS mentorships_mentor_idx ON mentorships(mentor_id);
CREATE INDEX IF NOT EXISTS mentorships_mentee_idx ON mentorships(mentee_id);

-- 3. Individual mentor sessions
CREATE TABLE IF NOT EXISTS mentor_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorship_id   UUID NOT NULL REFERENCES mentorships(id) ON DELETE CASCADE,
  mentor_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentee_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_min    INT NOT NULL DEFAULT 30,
  topic           TEXT,
  notes           TEXT,                           -- mentor's post-session notes
  meeting_link    TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  feedback_rating INT CHECK (feedback_rating BETWEEN 1 AND 5),
  feedback_body   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mentor_sessions_mentor_idx   ON mentor_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS mentor_sessions_mentee_idx   ON mentor_sessions(mentee_id);
CREATE INDEX IF NOT EXISTS mentor_sessions_upcoming_idx ON mentor_sessions(scheduled_at) WHERE status = 'scheduled';
