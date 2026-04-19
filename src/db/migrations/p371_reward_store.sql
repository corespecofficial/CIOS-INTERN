-- p371: Reward Store
-- Admins list reward items priced in points; interns redeem with their XP.

CREATE TABLE IF NOT EXISTS reward_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  description    TEXT,
  category       TEXT NOT NULL DEFAULT 'merch' CHECK (category IN ('cash','merch','course','mentor','perk')),
  image_url      TEXT,
  price_points   INT NOT NULL,
  cash_value_ngn INT,
  stock          INT,
  unlimited      BOOLEAN NOT NULL DEFAULT FALSE,
  min_level      INT NOT NULL DEFAULT 1,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft','sold_out','archived')),
  redemption_count INT NOT NULL DEFAULT 0,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reward_items_status ON reward_items(status);
CREATE INDEX IF NOT EXISTS idx_reward_items_category ON reward_items(category);

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id          UUID NOT NULL REFERENCES reward_items(id) ON DELETE RESTRICT,
  points_spent     INT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','shipped','delivered','rejected','cancelled')),
  admin_note       TEXT,
  redeemed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fulfilled_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user ON reward_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_item ON reward_redemptions(item_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON reward_redemptions(status);
