-- p355: Daily Spin Wheel — tracks each user's spins
CREATE TABLE IF NOT EXISTS spin_wheel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prize_label TEXT NOT NULL,
  prize_type TEXT NOT NULL CHECK (prize_type IN ('xp', 'wallet', 'bonus_spin', 'miss')),
  prize_amount INT NOT NULL DEFAULT 0,
  spun_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spin_wheel_logs_user_spun ON spin_wheel_logs(user_id, spun_at DESC);
