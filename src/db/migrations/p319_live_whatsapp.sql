-- Allow WhatsApp voice/video call links as live-session providers.
-- The original CHECK constraint excluded them; this swaps it out.

ALTER TABLE live_sessions
  DROP CONSTRAINT IF EXISTS live_sessions_provider_check;

ALTER TABLE live_sessions
  ADD CONSTRAINT live_sessions_provider_check
  CHECK (provider IN (
    'youtube-live','twitch','tiktok-live',
    'google-meet','google-classroom','zoom',
    'whatsapp-video','whatsapp-voice',
    'generic'
  ));

NOTIFY pgrst, 'reload schema';
