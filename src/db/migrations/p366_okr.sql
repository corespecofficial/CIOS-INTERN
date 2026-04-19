-- p366: OKR Goal Engine
-- Weekly & monthly Objectives + Key Results. Progress auto-tracked from tasks.

CREATE TABLE IF NOT EXISTS okrs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  objective    TEXT NOT NULL,
  period       TEXT NOT NULL DEFAULT 'weekly' CHECK (period IN ('weekly','monthly','quarterly')),
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
  progress_pct INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_okrs_user ON okrs(user_id);
CREATE INDEX IF NOT EXISTS idx_okrs_status ON okrs(status);

CREATE TABLE IF NOT EXISTS okr_key_results (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id       UUID NOT NULL REFERENCES okrs(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  target       NUMERIC NOT NULL DEFAULT 1,
  current      NUMERIC NOT NULL DEFAULT 0,
  unit         TEXT NOT NULL DEFAULT 'count',
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  order_index  INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_okr_krs_okr ON okr_key_results(okr_id);
