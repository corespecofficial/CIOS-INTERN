-- p336: Creative Spaces ("Rent a Classroom")
CREATE TABLE IF NOT EXISTS creative_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  format TEXT NOT NULL DEFAULT 'live' CHECK (format IN ('live','recorded','hybrid')),
  price_per_student NUMERIC(12,2) NOT NULL DEFAULT 0,
  capacity INT NOT NULL DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','suspended','rejected')),
  tags TEXT[] DEFAULT '{}',
  schedule TEXT,
  duration_weeks INT DEFAULT 4,
  enrollment_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creative_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES creative_spaces(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(space_id, student_id)
);

CREATE INDEX IF NOT EXISTS creative_spaces_owner ON creative_spaces(owner_id);
CREATE INDEX IF NOT EXISTS creative_spaces_status ON creative_spaces(status);
CREATE INDEX IF NOT EXISTS creative_enrollments_student ON creative_enrollments(student_id);
