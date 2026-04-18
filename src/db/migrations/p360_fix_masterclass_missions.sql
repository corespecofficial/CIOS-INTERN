-- p360: Fix masterclass mission event_types so they don't falsely complete
-- on any generic task_completed event. Each section now has its own event.
-- Run in Supabase SQL editor after p359.

UPDATE missions SET event_type = 'masterclass_day1'   WHERE key = 'social_media_pioneer';
UPDATE missions SET event_type = 'masterclass_day2'   WHERE key = 'digital_products_builder';
UPDATE missions SET event_type = 'masterclass_day3'   WHERE key = 'meta_business_setup';
UPDATE missions SET event_type = 'masterclass_day4a'  WHERE key = 'content_calendar_built';
UPDATE missions SET event_type = 'masterclass_day4b'  WHERE key = 'first_posts_live';
UPDATE missions SET event_type = 'masterclass_submitted' WHERE key = 'masterclass_complete';
