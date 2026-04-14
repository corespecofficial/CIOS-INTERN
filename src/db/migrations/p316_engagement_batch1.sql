-- Batch-1 engagement features: daily quests, streak freezes, lesson reactions,
-- course leaderboards (materialised view), mini-badges, and an admin-controlled
-- feature-flag row stored in system_settings.
--
-- Safe to re-run. No destructive operations.

---------------------------------------------------------------
-- 1. ENGAGEMENT FEATURE FLAGS (single JSON row in system_settings)
---------------------------------------------------------------
-- Seed a default value if not present. Admin UI writes to this row.
INSERT INTO system_settings (key, value)
VALUES (
  'engagement.features',
  '{
    "dailyQuests": true,
    "streakFreeze": true,
    "reactions": true,
    "leaderboards": true,
    "badges": true,
    "xpBurst": true,
    "questXpBonus": 50,
    "freezeCostXp": 200,
    "leaderboardResetDay": 1
  }'
) ON CONFLICT (key) DO NOTHING;

---------------------------------------------------------------
-- 2. DAILY QUESTS
---------------------------------------------------------------
-- A lightweight per-user daily quest log. The quest catalogue is currently
-- static (defined in code), and this table records which quests a user has
-- completed on which UTC date.
CREATE TABLE IF NOT EXISTS daily_quest_progress (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id    text NOT NULL,
  quest_date  date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  progress    integer NOT NULL DEFAULT 0,
  target      integer NOT NULL DEFAULT 1,
  claimed_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quest_id, quest_date)
);
CREATE INDEX IF NOT EXISTS idx_dqp_user_date ON daily_quest_progress (user_id, quest_date DESC);

---------------------------------------------------------------
-- 3. STREAK FREEZES
---------------------------------------------------------------
-- Each row is a freeze an intern has purchased. `used_on` is set when the
-- freeze is auto-consumed to protect a missed day. Freezes expire 30 days
-- after purchase if never used.
CREATE TABLE IF NOT EXISTS streak_freezes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purchased_at  timestamptz NOT NULL DEFAULT now(),
  xp_spent      integer NOT NULL,
  used_on       date,
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);
CREATE INDEX IF NOT EXISTS idx_streak_freezes_user ON streak_freezes (user_id, used_on);

---------------------------------------------------------------
-- 4. LESSON REACTIONS
---------------------------------------------------------------
-- Interns react to course modules with emojis. Unique (user, module, kind).
CREATE TABLE IF NOT EXISTS lesson_reactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   uuid NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('fire','idea','clap','heart','mind-blown')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, user_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_lesson_reactions_module ON lesson_reactions (module_id);

---------------------------------------------------------------
-- 5. MINI-BADGES
---------------------------------------------------------------
-- Catalogue of small, per-course or per-milestone badges. Distinct from the
-- main `badges` table (which is rank-wide); these are collectable tiles.
CREATE TABLE IF NOT EXISTS mini_badges (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  emoji       text NOT NULL,
  description text NOT NULL,
  color       text NOT NULL DEFAULT '#1E88E5',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_mini_badges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id     text NOT NULL REFERENCES mini_badges(id) ON DELETE CASCADE,
  awarded_at   timestamptz NOT NULL DEFAULT now(),
  ref_course   uuid REFERENCES courses(id) ON DELETE SET NULL,
  UNIQUE (user_id, badge_id, ref_course)
);
CREATE INDEX IF NOT EXISTS idx_umb_user ON user_mini_badges (user_id);

-- Seed the starter catalogue. Idempotent.
INSERT INTO mini_badges (id, name, emoji, description, color) VALUES
  ('first-lesson',     'First Step',        '👣', 'Completed your first lesson',          '#66BB6A'),
  ('first-quiz',       'Quiz Rookie',       '🧠', 'Passed your first quiz',               '#1E88E5'),
  ('perfect-quiz',     'Sharp Shooter',     '🎯', 'Scored 100% on a quiz',                '#FFC107'),
  ('course-complete',  'Finisher',          '🏁', 'Completed an entire course',           '#AB47BC'),
  ('streak-7',         'Week Warrior',      '🔥', 'Maintained a 7-day streak',            '#FF7043'),
  ('streak-30',        'Unstoppable',       '⚡', 'Maintained a 30-day streak',           '#EF5350'),
  ('helpful-peer',     'Helpful Peer',      '🤝', 'Got 5 upvotes in discussions',         '#26C6DA'),
  ('night-owl',        'Night Owl',         '🌙', 'Learned past midnight 3 times',        '#5A6478'),
  ('early-bird',       'Early Bird',        '🐦', 'Learned before 7am 3 times',           '#FFD54F'),
  ('reaction-giver',   'Supporter',         '💖', 'Gave 20 reactions',                    '#E91E63')
ON CONFLICT (id) DO NOTHING;

---------------------------------------------------------------
-- 6. COURSE WEEKLY LEADERBOARD (materialised)
---------------------------------------------------------------
-- We don't materialise a view — we query xp_events directly at read time
-- with a WHERE created_at >= (date_trunc('week',now())) filter. Add a
-- helpful index IF the xp_events table exists (it's created by
-- p37_gamification.sql; this block makes p316 safe to run first).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'xp_events') THEN
    CREATE INDEX IF NOT EXISTS idx_xp_events_course_week
      ON xp_events (ref_type, ref_id, created_at DESC)
      WHERE ref_type = 'course';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
