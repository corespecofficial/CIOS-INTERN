-- p340: Landing page content management
-- Allows SuperAdmin to control homepage video, testimonials, and stats

-- 1. Key-value store for platform settings
CREATE TABLE IF NOT EXISTS platform_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default settings
INSERT INTO platform_settings (key, value) VALUES
  ('homepage_video_url',       ''),
  ('homepage_stats_interns',   '500+'),
  ('homepage_stats_courses',   '48'),
  ('homepage_stats_mentors',   '15'),
  ('homepage_stats_countries', '12'),
  ('homepage_stats_partners',  '80+')
ON CONFLICT (key) DO NOTHING;

-- 2. Landing page testimonials
CREATE TABLE IF NOT EXISTS landing_testimonials (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  role       TEXT NOT NULL,
  quote      TEXT NOT NULL,
  avatar_url TEXT,
  initials   TEXT NOT NULL DEFAULT 'IN',
  gradient   TEXT NOT NULL DEFAULT 'linear-gradient(135deg, #1E88E5, #AB47BC)',
  stars      INT  NOT NULL DEFAULT 5 CHECK (stars BETWEEN 1 AND 5),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default testimonials
INSERT INTO landing_testimonials (name, role, quote, initials, gradient, stars, sort_order) VALUES
  ('Adaeze Okonkwo',    'Senior Intern · Lagos',                 'CIOS transformed my internship experience. The gamification kept me motivated, and I built a real portfolio that got me freelance clients!', 'AO', 'linear-gradient(135deg, #1E88E5, #AB47BC)',  5, 1),
  ('Chukwuemeka Obi',   'Team Lead · Abuja',                     'The platform''s structure and accountability system helped me develop leadership skills I never knew I had. Now I lead a team of 8!',         'CO', 'linear-gradient(135deg, #FFC107, #FF7043)',  5, 2),
  ('Folake Nwosu',      'Top Performer · Ibadan',                'From zero experience to building websites in 3 months. The AI Copilot and community support made all the difference.',                         'FN', 'linear-gradient(135deg, #66BB6A, #1E88E5)',  5, 3),
  ('Tunde Bakare',      'AI Engineer Track · Port Harcourt',     'The fines kept me honest, the rewards kept me moving. I shipped 4 production AI projects before I even graduated.',                           'TB', 'linear-gradient(135deg, #26C6DA, #1E88E5)',  5, 4),
  ('Ngozi Eze',         'Department Lead · Enugu',               'Mentorship + real money rewards = no other internship comes close. Already hired 3 of my juniors at my agency.',                              'NE', 'linear-gradient(135deg, #AB47BC, #EF5350)',  5, 5),
  ('Samuel Adeyemi',    'Marketing Intern · Accra',              'I used the wallet payouts to fund my own micro-business while still in the program. CIOS doesn''t just train — it pays.',                     'SA', 'linear-gradient(135deg, #FF7043, #FFC107)',  5, 6)
ON CONFLICT DO NOTHING;
