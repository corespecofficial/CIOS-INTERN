-- p326_community_phase_c.sql
-- Phase C: video posts + bio for hovercards.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_url text;

-- bio is used in the user hovercard + profile page
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text;
