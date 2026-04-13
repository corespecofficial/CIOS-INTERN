ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS registered_business_name TEXT;
ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS official_email TEXT;
ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS office_address TEXT;
ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS year_founded INT;
ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS role_title TEXT;
ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS id_document_url TEXT;
ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS registration_doc_url TEXT;
ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS why_hiring TEXT;
ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS expected_hiring_volume TEXT;
ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS payment_model TEXT;
ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS referral_source TEXT;
ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS recruiter_type TEXT DEFAULT 'company_hr';
ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE recruiter_profiles ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS recruiter_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  work_email TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  website TEXT,
  hiring_for TEXT,
  expected_hires TEXT,
  budget_range TEXT,
  why_join TEXT,
  contact_method TEXT DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  invitation_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recruiter_requests_status ON recruiter_requests(status, created_at DESC);
CREATE TABLE IF NOT EXISTS recruiter_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  recruiter_type TEXT NOT NULL DEFAULT 'company_hr',
  company_name TEXT,
  note TEXT,
  clerk_invitation_id TEXT,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recruiter_invitations_status ON recruiter_invitations(status, created_at DESC);
