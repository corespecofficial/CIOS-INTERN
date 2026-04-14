-- Batch-3 engagement: live class sessions, boss quizzes, AI study buddy,
-- cohort presence (presence is Ably-only, no DB table).
--
-- Safe to re-run.

---------------------------------------------------------------
-- Flags merged into engagement.features
---------------------------------------------------------------
UPDATE system_settings
SET value = (
  COALESCE(value::jsonb, '{}'::jsonb)
  || '{"liveSessions": true, "bossQuiz": true, "studyBuddy": true, "cohortPresence": true, "bossQuizCooldownMin": 60}'::jsonb
)::text
WHERE key = 'engagement.features';

INSERT INTO system_settings (key, value)
SELECT 'engagement.features', '{
  "dailyQuests": true, "streakFreeze": true, "reactions": true, "leaderboards": true,
  "badges": true, "xpBurst": true, "peerReview": true, "teams": true, "shareCert": true,
  "liveSessions": true, "bossQuiz": true, "studyBuddy": true, "cohortPresence": true,
  "questXpBonus": 50, "freezeCostXp": 200, "leaderboardResetDay": 1,
  "teamSize": 4, "reviewXpReward": 40, "bossQuizCooldownMin": 60
}'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'engagement.features');

---------------------------------------------------------------
-- 1. LIVE CLASS SESSIONS
---------------------------------------------------------------
-- Instructors schedule a live session with an embed URL (YouTube Live,
-- Twitch, TikTok Live, Google Meet, Classroom, Zoom, or anything else).
-- Open to: "course" (only enrolled students), "public" (anyone logged-in).
CREATE TABLE IF NOT EXISTS live_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       uuid REFERENCES courses(id) ON DELETE CASCADE,
  host_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  embed_url       text NOT NULL,
  provider        text NOT NULL DEFAULT 'generic'
                  CHECK (provider IN ('youtube-live','twitch','tiktok-live','google-meet','google-classroom','zoom','generic')),
  scheduled_at    timestamptz NOT NULL,
  duration_min    integer NOT NULL DEFAULT 60,
  visibility      text NOT NULL DEFAULT 'course' CHECK (visibility IN ('course','public')),
  status          text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended','cancelled')),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_live_sessions_course ON live_sessions (course_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_sessions_sched  ON live_sessions (scheduled_at DESC) WHERE status IN ('scheduled','live');

-- Attendance log (for XP + "class attended" tracking)
CREATE TABLE IF NOT EXISTS live_session_attendance (
  session_id   uuid NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);

---------------------------------------------------------------
-- 2. BOSS QUIZZES
---------------------------------------------------------------
-- A "boss quiz" is a harder, timed variant of an existing quiz module.
-- We add columns to course_modules rather than a new table, so the quiz
-- runner reuses existing infra.
ALTER TABLE course_modules
  ADD COLUMN IF NOT EXISTS is_boss_quiz boolean NOT NULL DEFAULT false;
ALTER TABLE course_modules
  ADD COLUMN IF NOT EXISTS time_limit_sec integer NOT NULL DEFAULT 0; -- 0 = untimed
ALTER TABLE course_modules
  ADD COLUMN IF NOT EXISTS bonus_xp integer NOT NULL DEFAULT 0;

-- Per-user attempt log so we can enforce cooldown + build a weekly leaderboard.
CREATE TABLE IF NOT EXISTS boss_quiz_attempts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id    uuid NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  course_id    uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  score        integer NOT NULL,
  passed       boolean NOT NULL DEFAULT false,
  duration_sec integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bq_attempts_user ON boss_quiz_attempts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bq_attempts_module_week ON boss_quiz_attempts (module_id, created_at DESC);

---------------------------------------------------------------
-- 3. AI STUDY BUDDY THREADS
---------------------------------------------------------------
-- One thread per (user, course) — keeps conversation scoped and cheap to
-- stuff into context.
CREATE TABLE IF NOT EXISTS study_buddy_threads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS study_buddy_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   uuid NOT NULL REFERENCES study_buddy_threads(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('user','assistant')),
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sb_messages_thread ON study_buddy_messages (thread_id, created_at);

NOTIFY pgrst, 'reload schema';
