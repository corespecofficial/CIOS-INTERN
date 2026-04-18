-- p350: Platform settings store for feature flags & system controls
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Seed defaults (won't overwrite existing values)
INSERT INTO platform_settings (key, value) VALUES
  ('feature_flags', '{"ai_copilot": true, "spin_wheel": true, "fine_system": true, "community": true, "payouts": false}'),
  ('system_lock',   '{"locked": false, "locked_at": null}')
ON CONFLICT (key) DO NOTHING;
