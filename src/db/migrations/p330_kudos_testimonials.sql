-- p330_kudos_testimonials.sql — peer kudos + testimonials on profiles.

CREATE TABLE IF NOT EXISTS peer_kudos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  giver_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (giver_id, receiver_id),
  CHECK (giver_id <> receiver_id)
);
CREATE INDEX IF NOT EXISTS idx_peer_kudos_receiver ON peer_kudos(receiver_id);

CREATE TABLE IF NOT EXISTS peer_testimonials (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       text NOT NULL,
  status     text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (author_id, subject_id),
  CHECK (author_id <> subject_id)
);
CREATE INDEX IF NOT EXISTS idx_testimonials_subject ON peer_testimonials(subject_id, status, created_at DESC);
