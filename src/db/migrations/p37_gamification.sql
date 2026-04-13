-- P3.7 Gamification schema extensions
-- Run this in Supabase SQL editor once.

-- Extra user gamification columns (safe if already applied)
ALTER TABLE users ADD COLUMN IF NOT EXISTS best_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_xp_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0;

-- XP event ledger
CREATE TABLE IF NOT EXISTS xp_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_xp_events_user ON xp_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_events_type ON xp_events(event_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_events_dedupe ON xp_events(user_id, event_type, ref_type, ref_id)
  WHERE ref_id IS NOT NULL;

-- Streak tracking
CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  current INTEGER NOT NULL DEFAULT 0,
  best INTEGER NOT NULL DEFAULT 0,
  last_day DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, kind)
);

-- Missions (daily/weekly quests)
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cadence TEXT NOT NULL DEFAULT 'daily',
  target INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  coin_reward INTEGER NOT NULL DEFAULT 0,
  event_type TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-user mission progress (resets each cycle)
CREATE TABLE IF NOT EXISTS user_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  cycle_start DATE NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ,
  UNIQUE(user_id, mission_id, cycle_start)
);
CREATE INDEX IF NOT EXISTS idx_user_missions_user ON user_missions(user_id, cycle_start DESC);

-- Challenges (competitive events)
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  event_types TEXT[] NOT NULL DEFAULT '{}',
  prize_xp INTEGER NOT NULL DEFAULT 0,
  prize_coins INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

-- Seed core missions
INSERT INTO missions (key, title, description, cadence, target, xp_reward, coin_reward, event_type) VALUES
  ('daily_task',     'Complete 1 task',         'Finish any task today.',              'daily',  1,  15,  5,  'task_completed'),
  ('daily_comment',  'Helpful comment',         'Post one helpful comment.',           'daily',  1,  20,  5,  'helpful_comment'),
  ('daily_attend',   'Attend class',            'Show up for today''s class.',         'daily',  1,  15,  5,  'class_attended'),
  ('weekly_module',  'Finish a module',         'Complete one course module.',         'weekly', 1,  80,  20, 'module_completed'),
  ('weekly_help3',   'Help 3 peers',            'Leave 3 helpful comments this week.', 'weekly', 3,  100, 25, 'helpful_comment'),
  ('weekly_tasks5',  'Knock out 5 tasks',       'Complete 5 tasks this week.',         'weekly', 5,  120, 30, 'task_completed')
ON CONFLICT (key) DO NOTHING;

-- Ensure badges.name is unique so we can upsert by name
CREATE UNIQUE INDEX IF NOT EXISTS idx_badges_name_unique ON badges(name);

-- Seed core badges if missing (idempotent by name)
INSERT INTO badges (name, description, icon_url, category, xp_value, criteria) VALUES
  ('First Steps',       'Earned your first XP',                    '', 'milestone',   0,   '{"type":"xp_total","value":1}'),
  ('Century Club',      'Reached 100 XP',                          '', 'milestone',   0,   '{"type":"xp_total","value":100}'),
  ('Thousand Club',     'Reached 1,000 XP',                        '', 'milestone',   0,   '{"type":"xp_total","value":1000}'),
  ('Level 5',           'Hit level 5',                             '', 'milestone',   0,   '{"type":"level","value":5}'),
  ('Level 10',          'Hit level 10',                            '', 'milestone',   0,   '{"type":"level","value":10}'),
  ('Course Finisher',   'Completed your first course',             '', 'achievement', 0,   '{"type":"courses_completed","value":1}'),
  ('Quiz Master',       'Scored 100% on a quiz',                   '', 'skill',       0,   '{"type":"perfect_quiz","value":1}'),
  ('Task Crusher',      'Completed 25 tasks',                      '', 'achievement', 0,   '{"type":"tasks_completed","value":25}'),
  ('Deadline Hero',     'Submitted 10 tasks before deadline',      '', 'achievement', 0,   '{"type":"tasks_on_time","value":10}'),
  ('Helpful Voice',     'Earned 10 brilliant labels',              '', 'achievement', 0,   '{"type":"brilliant_comments","value":10}'),
  ('7-Day Streak',      'Maintained a 7-day login streak',         '', 'achievement', 0,   '{"type":"streak","value":7}'),
  ('30-Day Streak',     'Maintained a 30-day login streak',        '', 'milestone',   0,   '{"type":"streak","value":30}'),
  ('Perfect Attendance','Attended every class in a week',          '', 'achievement', 0,   '{"type":"attendance_week","value":1}'),
  ('Mentor',            'Helped 25 peers with brilliant answers',  '', 'special',     0,   '{"type":"brilliant_comments","value":25}')
ON CONFLICT (name) DO NOTHING;
