-- Migration: p343_payments
-- Payment system: Monnify gateway, wallet top-up, withdrawals, transaction enrichment
-- Created: 2026-04-16

-- ============================================================
-- PATCH: transactions table — add gateway tracking columns
-- ============================================================
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS status       TEXT NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS currency     TEXT NOT NULL DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS gateway_ref  TEXT,
  ADD COLUMN IF NOT EXISTS gateway      TEXT NOT NULL DEFAULT 'internal';

-- Unique constraint on idempotency_key (nullable — only enforced when set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_idempotency
  ON transactions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============================================================
-- TABLE: payment_intents
-- Tracks every top-up attempt from creation → Monnify → resolution
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_intents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_ngn      NUMERIC(12,2) NOT NULL CHECK (amount_ngn > 0),
  purpose         TEXT NOT NULL DEFAULT 'wallet_topup',
  -- purpose values: 'wallet_topup' | 'fine_payment' | 'marketplace' | 'subscription'
  reference       TEXT UNIQUE NOT NULL,     -- CIOS-generated: CIOS-{userId8}-{timestamp}
  monnify_ref     TEXT,                     -- Monnify's own transaction reference
  checkout_url    TEXT,                     -- Monnify redirect URL
  status          TEXT NOT NULL DEFAULT 'pending',
  -- status values: 'pending' | 'success' | 'failed' | 'expired' | 'cancelled'
  metadata        JSONB,                    -- e.g. { fine_id, product_id }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id  ON payment_intents (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_reference ON payment_intents (reference);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status   ON payment_intents (status);

-- ============================================================
-- TABLE: withdrawal_requests
-- User-submitted withdrawal requests; admin approves then disbursed via Monnify
-- ============================================================
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_ngn      NUMERIC(12,2) NOT NULL CHECK (amount_ngn >= 500),
  bank_code       TEXT NOT NULL,            -- e.g. "058" for GTBank
  account_number  TEXT NOT NULL,
  account_name    TEXT NOT NULL,            -- pre-verified name from Monnify lookup
  status          TEXT NOT NULL DEFAULT 'pending',
  -- status values: 'pending' | 'approved' | 'processing' | 'paid' | 'rejected'
  monnify_ref     TEXT,                     -- filled when Monnify disburses
  admin_note      TEXT,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status  ON withdrawal_requests (status);

-- ============================================================
-- TABLE: bank_codes  (Nigerian banks reference list)
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_codes (
  code  TEXT PRIMARY KEY,
  name  TEXT NOT NULL
);

INSERT INTO bank_codes (code, name) VALUES
  ('044', 'Access Bank'),
  ('023', 'Citibank Nigeria'),
  ('050', 'Ecobank Nigeria'),
  ('070', 'Fidelity Bank'),
  ('011', 'First Bank of Nigeria'),
  ('214', 'First City Monument Bank'),
  ('058', 'Guaranty Trust Bank'),
  ('030', 'Heritage Bank'),
  ('301', 'Jaiz Bank'),
  ('082', 'Keystone Bank'),
  ('526', 'Moniepoint MFB'),
  ('526', 'OPay'),
  ('076', 'Polaris Bank'),
  ('221', 'Stanbic IBTC Bank'),
  ('068', 'Standard Chartered Bank'),
  ('232', 'Sterling Bank'),
  ('100', 'SunTrust Bank'),
  ('032', 'Union Bank of Nigeria'),
  ('033', 'United Bank for Africa'),
  ('215', 'Unity Bank'),
  ('035', 'Wema Bank'),
  ('057', 'Zenith Bank')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own payment intents
CREATE POLICY payment_intents_select ON payment_intents
  FOR SELECT USING (auth.uid() = user_id);

-- Users can see their own withdrawals
CREATE POLICY withdrawal_requests_select ON withdrawal_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Service role (supabaseAdmin) bypasses RLS for inserts/updates
