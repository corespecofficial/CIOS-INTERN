-- Migration: p344_alumni_mentor
-- Alumni Portal and Mentor Portal database schema
-- Created: 2026-04-16

-- ============================================================
-- PATCH: users table — add alumni graduation fields
-- ============================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS graduated_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cohort_number  INTEGER;

CREATE INDEX IF NOT EXISTS idx_users_graduated_at ON users (graduated_at) WHERE graduated_at IS NOT NULL;

-- ============================================================
-- TABLE: alumni_stories
-- Success stories submitted by alumni (pending admin approval)
-- ============================================================
CREATE TABLE IF NOT EXISTS alumni_stories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL CHECK (char_length(title) >= 5),
  body         TEXT NOT NULL CHECK (char_length(body) >= 100),
  company      TEXT,
  role         TEXT,
  cover_image  TEXT,
  status       TEXT NOT NULL DEFAULT 'pending',
  -- status: 'pending' | 'approved' | 'rejected'
  approved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alumni_stories_user_id  ON alumni_stories (user_id);
CREATE INDEX IF NOT EXISTS idx_alumni_stories_status   ON alumni_stories (status);

ALTER TABLE alumni_stories ENABLE ROW LEVEL SECURITY;

-- Users can read approved stories
CREATE POLICY "alumni_stories_read" ON alumni_stories
  FOR SELECT USING (status = 'approved' OR auth.uid() = user_id);

-- Users can insert their own stories
CREATE POLICY "alumni_stories_insert" ON alumni_stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending stories
CREATE POLICY "alumni_stories_update_own" ON alumni_stories
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- ============================================================
-- TABLE: mentors
-- Mentor profile (one per user who has been assigned the mentor role)
-- ============================================================
CREATE TABLE IF NOT EXISTS mentors (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio             TEXT,
  expertise_tags  TEXT[] NOT NULL DEFAULT '{}',
  max_mentees     INTEGER NOT NULL DEFAULT 3 CHECK (max_mentees >= 1 AND max_mentees <= 20),
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,
  session_rate    NUMERIC(10,2),   -- optional per-session charge (NGN), NULL = free
  rating          NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  sessions_done   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read mentor profiles
CREATE POLICY "mentors_read" ON mentors FOR SELECT USING (auth.uid() IS NOT NULL);

-- Mentors manage their own profile
CREATE POLICY "mentors_manage_own" ON mentors
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TABLE: mentorships
-- Tracks relationships between mentors and mentees
-- ============================================================
CREATE TABLE IF NOT EXISTS mentorships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentee_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending',
  -- status: 'pending' | 'active' | 'rejected' | 'ended'
  note        TEXT,              -- optional request note from mentee
  started_at  TIMESTAMPTZ,
  ended_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mentor_id, mentee_id)
);

CREATE INDEX IF NOT EXISTS idx_mentorships_mentor_id ON mentorships (mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentorships_mentee_id ON mentorships (mentee_id);
CREATE INDEX IF NOT EXISTS idx_mentorships_status    ON mentorships (status);

ALTER TABLE mentorships ENABLE ROW LEVEL SECURITY;

-- Participants can read their own mentorships
CREATE POLICY "mentorships_read_own" ON mentorships
  FOR SELECT USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

-- Mentees insert requests
CREATE POLICY "mentorships_insert" ON mentorships
  FOR INSERT WITH CHECK (auth.uid() = mentee_id);

-- Mentors respond (update status)
CREATE POLICY "mentorships_update" ON mentorships
  FOR UPDATE USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

-- ============================================================
-- TABLE: mentor_sessions
-- Individual scheduled sessions within an active mentorship
-- ============================================================
CREATE TABLE IF NOT EXISTS mentor_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorship_id   UUID NOT NULL REFERENCES mentorships(id) ON DELETE CASCADE,
  mentor_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentee_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_min    INTEGER NOT NULL DEFAULT 30 CHECK (duration_min >= 10 AND duration_min <= 240),
  topic           TEXT,
  notes           TEXT,
  meeting_link    TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled',
  -- status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_body   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentor_sessions_mentor_id  ON mentor_sessions (mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_mentee_id  ON mentor_sessions (mentee_id);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_scheduled  ON mentor_sessions (scheduled_at);

ALTER TABLE mentor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mentor_sessions_read_own" ON mentor_sessions
  FOR SELECT USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

CREATE POLICY "mentor_sessions_insert" ON mentor_sessions
  FOR INSERT WITH CHECK (auth.uid() = mentor_id OR auth.uid() = mentee_id);

CREATE POLICY "mentor_sessions_update" ON mentor_sessions
  FOR UPDATE USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);
