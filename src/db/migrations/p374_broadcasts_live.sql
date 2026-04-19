-- p374: Live Broadcast mode (LiveKit integration)
-- Extends broadcasts with live-room support. When mode='live', video_url may
-- be the recording URL generated after the live session ends.

ALTER TABLE broadcasts
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'recorded' CHECK (mode IN ('recorded','live','scheduled')),
  ADD COLUMN IF NOT EXISTS room_name TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_live BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS live_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS live_ended_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_broadcasts_room_name ON broadcasts(room_name) WHERE room_name IS NOT NULL;

-- video_url is required for recorded mode but optional for live/scheduled
ALTER TABLE broadcasts
  ALTER COLUMN video_url DROP NOT NULL;
