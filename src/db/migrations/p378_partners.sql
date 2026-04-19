-- p378: Partner / Reseller Portal
-- L&D agencies and HR consultancies can white-label CIOS.
-- 30% revenue share on every paying sub-tenant they bring.

CREATE TABLE IF NOT EXISTS partners (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  agency_name       TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  logo_url          TEXT,
  subdomain         TEXT UNIQUE,
  brand_color       TEXT DEFAULT '#1E88E5',
  contact_email     TEXT,
  website           TEXT,
  revenue_share_pct INT NOT NULL DEFAULT 30,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  approved_at       TIMESTAMPTZ,
  approved_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);

CREATE TABLE IF NOT EXISTS partner_clients (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id     UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  client_org_name TEXT NOT NULL,
  client_contact TEXT,
  tier           TEXT NOT NULL DEFAULT 'starter' CHECK (tier IN ('starter','pro','growth','enterprise')),
  monthly_mrr_ngn INT NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','churned','paused')),
  signed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  churned_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_partner_clients_partner ON partner_clients(partner_id);

CREATE TABLE IF NOT EXISTS partner_payouts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  total_gross_ngn INT NOT NULL DEFAULT 0,
  share_ngn     INT NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_payouts_partner ON partner_payouts(partner_id);
