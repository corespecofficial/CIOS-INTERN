-- Productivity Hub extensions: alarms, reminders, timer sessions
-- Run once in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS alarms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  time_of_day TIME NOT NULL,
  days_of_week INT[] NOT NULL DEFAULT '{}', -- 0=Sun..6=Sat; empty = one-time
  fire_on DATE, -- optional one-off date
  sound TEXT NOT NULL DEFAULT 'chime',
  volume INT NOT NULL DEFAULT 80,
  snooze_minutes INT NOT NULL DEFAULT 5,
  vibrate BOOLEAN NOT NULL DEFAULT true,
  gradual_wake BOOLEAN NOT NULL DEFAULT false,
  voice_note TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'manual', -- manual | class | deadline
  source_ref TEXT,
  last_fired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alarms_user ON alarms(user_id);
CREATE INDEX IF NOT EXISTS idx_alarms_active ON alarms(active, time_of_day);

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal', -- low | normal | high | urgent
  recurrence TEXT NOT NULL DEFAULT 'none', -- none | daily | weekly | monthly
  source TEXT NOT NULL DEFAULT 'manual',   -- manual | task | calendar
  source_ref TEXT,
  done_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reminders_user_due ON reminders(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_reminders_open ON reminders(user_id, done_at) WHERE done_at IS NULL;

CREATE TABLE IF NOT EXISTS timer_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'pomodoro', -- pomodoro | break | custom
  planned_seconds INT NOT NULL,
  actual_seconds INT NOT NULL DEFAULT 0,
  label TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_timer_user_date ON timer_sessions(user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS productivity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  tasks_completed INT NOT NULL DEFAULT 0,
  events_attended INT NOT NULL DEFAULT 0,
  pomodoros INT NOT NULL DEFAULT 0,
  focus_minutes INT NOT NULL DEFAULT 0,
  score INT NOT NULL DEFAULT 0,
  UNIQUE(user_id, day)
);
