-- p365: Guest Speaker Series
-- Paid speaker slots ($299 each) where industry professionals give live or recorded talks.
-- Reuses calendar_events but adds speaker profile + session-specific metadata.

CREATE TABLE IF NOT EXISTS speakers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name      TEXT NOT NULL,
  title          TEXT,
  company        TEXT,
  bio            TEXT,
  photo_url      TEXT,
  linkedin_url   TEXT,
  twitter_url    TEXT,
  expertise_tags TEXT[] NOT NULL DEFAULT '{}',
  sponsored      BOOLEAN NOT NULL DEFAULT FALSE,
  fee_ngn        INT NOT NULL DEFAULT 120000,  -- ~$299
  status         TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_speakers_status ON speakers(status);

CREATE TABLE IF NOT EXISTS speaker_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id     UUID NOT NULL REFERENCES speakers(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  topic_tags     TEXT[] NOT NULL DEFAULT '{}',
  scheduled_at   TIMESTAMPTZ NOT NULL,
  duration_min   INT NOT NULL DEFAULT 60,
  mode           TEXT NOT NULL DEFAULT 'live' CHECK (mode IN ('live','recorded','hybrid')),
  meeting_url    TEXT,
  recording_url  TEXT,
  capacity       INT,
  rsvp_count     INT NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended','cancelled')),
  featured       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_speaker_sessions_speaker ON speaker_sessions(speaker_id);
CREATE INDEX IF NOT EXISTS idx_speaker_sessions_date ON speaker_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_speaker_sessions_status ON speaker_sessions(status);

CREATE TABLE IF NOT EXISTS speaker_rsvps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES speaker_sessions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rsvp_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attended    BOOLEAN NOT NULL DEFAULT FALSE,
  rating      INT CHECK (rating BETWEEN 1 AND 5),
  feedback    TEXT,
  UNIQUE(session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_speaker_rsvps_session ON speaker_rsvps(session_id);
CREATE INDEX IF NOT EXISTS idx_speaker_rsvps_user ON speaker_rsvps(user_id);
