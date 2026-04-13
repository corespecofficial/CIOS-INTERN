-- Premium Planner: plans + items + comments + activity
-- Run once in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal',     -- low | normal | high | urgent
  status TEXT NOT NULL DEFAULT 'not_started',   -- not_started | in_progress | waiting | completed | cancelled
  due_at TIMESTAMPTZ,
  estimate_minutes INT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  visibility TEXT NOT NULL DEFAULT 'private',   -- private | team | public
  color TEXT NOT NULL DEFAULT '#1E88E5',
  icon TEXT NOT NULL DEFAULT '📋',
  sort_order INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plans_owner ON plans(owner_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_plans_visibility ON plans(visibility) WHERE visibility != 'private';

CREATE TABLE IF NOT EXISTS plan_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  parent_id UUID REFERENCES plan_items(id) ON DELETE CASCADE,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plan_items_plan ON plan_items(plan_id, sort_order);

CREATE TABLE IF NOT EXISTS plan_assignments (
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'collaborator',
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (plan_id, user_id)
);

CREATE TABLE IF NOT EXISTS plan_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plan_comments_plan ON plan_comments(plan_id, created_at);

CREATE TABLE IF NOT EXISTS plan_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plan_activity_plan ON plan_activity(plan_id, created_at DESC);
