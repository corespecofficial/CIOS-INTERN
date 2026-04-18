-- p359: Social Media & Digital Products Setup Masterclass
-- Assigned: 2026-04-10 (Friday) | Original deadline: 2026-04-14 23:59 WAT
-- Run once in Supabase SQL editor.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SEED THE PROJECT
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO projects (
  id, title, description, emoji, instructions,
  deadline, late_fine_amount, xp_on_submit, xp_bonus_threshold, xp_bonus_amount,
  status, sections, cover_image_url, created_by
)
VALUES (
  'c7f8e9d0-1a2b-3c4d-5e6f-7a8b9c0d1e2f',
  'Social Media & Digital Products Setup Masterclass',
  'A 4-day intensive setup challenge. Build your entire digital presence from scratch — 13 social platforms, 10 digital product platforms, Meta Business Suite, scheduling tools, a content calendar, and your first live posts.',
  '📱',
  E'Welcome to the Social Media & Digital Products Setup Masterclass!\n\nThis is a 4-day challenge given on Friday, April 10. Your mission is to build a complete digital presence from scratch.\n\n🗓️ SCHEDULE:\n• Day 1 (Saturday, Apr 12): Create all 13 social media accounts\n• Day 2 (Sunday, Apr 13): Create 10 digital product platform accounts + Canva\n• Day 3 (Monday, Apr 14 by 6 PM): Set up Meta Business Suite + scheduling tools\n• Day 4 (Tuesday, Apr 14 by 11:59 PM): Content calendar + first live posts\n\n📸 PROOF REQUIRED: Screenshots for each day sent to your WhatsApp group.\n\n⚠️ LATE PENALTY: ₦1,000 fine for submissions after the deadline.\n\n🏆 SCORING: 100 points total. Score 85+ to earn a 600 XP bonus!\n\nFill in each section completely. Real links only — no placeholders.',
  '2026-04-14 22:59:00+00',
  1000,
  300,
  85,
  600,
  'published',
  '[
    {
      "id": "day1_social",
      "label": "📱 Day 1 — 13 Social Media Accounts",
      "type": "text_fields",
      "points": 26,
      "instructions": "Create a professional account on each platform below. Use your real name or brand name. Paste the profile URL or username. Due: Saturday, April 12 (send screenshots to WhatsApp group same day).",
      "config": {
        "fields": [
          {"id": "instagram",  "label": "1. Instagram — Profile URL",               "placeholder": "https://instagram.com/yourname"},
          {"id": "facebook",   "label": "2. Facebook — Profile or Page URL",        "placeholder": "https://facebook.com/yourname"},
          {"id": "twitter",    "label": "3. Twitter/X — Profile URL",               "placeholder": "https://x.com/yourname"},
          {"id": "whatsapp",   "label": "4. WhatsApp Business — Phone Number",      "placeholder": "+234 800 000 0000"},
          {"id": "linkedin",   "label": "5. LinkedIn — Profile URL",                "placeholder": "https://linkedin.com/in/yourname"},
          {"id": "tiktok",     "label": "6. TikTok — Profile URL",                  "placeholder": "https://tiktok.com/@yourname"},
          {"id": "youtube",    "label": "7. YouTube — Channel URL",                 "placeholder": "https://youtube.com/@yourname"},
          {"id": "behance",    "label": "8. Behance — Profile URL",                 "placeholder": "https://behance.net/yourname"},
          {"id": "pinterest",  "label": "9. Pinterest — Profile URL",               "placeholder": "https://pinterest.com/yourname"},
          {"id": "threads",    "label": "10. Threads — Profile URL",                "placeholder": "https://threads.net/@yourname"},
          {"id": "snapchat",   "label": "11. Snapchat — Username",                  "placeholder": "yourusername"},
          {"id": "reddit",     "label": "12. Reddit — Profile URL",                 "placeholder": "https://reddit.com/u/yourname"},
          {"id": "telegram",   "label": "13. Telegram — Username or Channel Link",  "placeholder": "@yourusername or https://t.me/yourname"}
        ]
      }
    },
    {
      "id": "day2_digital",
      "label": "💰 Day 2 — 10 Digital Product Platforms + Canva",
      "type": "text_fields",
      "points": 22,
      "instructions": "Create a seller/creator account on each platform. These are where you will sell digital products (eBooks, courses, templates, etc.). Due: Sunday, April 13 (send screenshots to WhatsApp group same day).",
      "config": {
        "fields": [
          {"id": "selar",          "label": "1. Selar — Store URL",                          "placeholder": "https://selar.co/yourname"},
          {"id": "amazon_kdp",     "label": "2. Amazon KDP — Author/Account Email",          "placeholder": "your@email.com"},
          {"id": "google_books",   "label": "3. Google Books — Partner Email or Profile",    "placeholder": "your@email.com or profile link"},
          {"id": "gumroad",        "label": "4. Gumroad — Profile URL",                      "placeholder": "https://yourname.gumroad.com"},
          {"id": "payhip",         "label": "5. Payhip — Store URL",                         "placeholder": "https://payhip.com/yourname"},
          {"id": "kofi",           "label": "6. Ko-fi — Profile URL",                        "placeholder": "https://ko-fi.com/yourname"},
          {"id": "etsy",           "label": "7. Etsy — Shop URL",                            "placeholder": "https://etsy.com/shop/yourshop"},
          {"id": "thinkific",      "label": "8. Thinkific — School URL",                     "placeholder": "https://yourname.thinkific.com"},
          {"id": "udemy",          "label": "9. Udemy — Instructor Profile URL",             "placeholder": "https://udemy.com/user/yourname"},
          {"id": "creative_market","label": "10. Creative Market — Shop URL",                "placeholder": "https://creativemarket.com/yourname"},
          {"id": "canva",          "label": "Bonus: Canva — Profile or Portfolio Link",      "placeholder": "https://www.canva.com/design/... or profile link"}
        ]
      }
    },
    {
      "id": "day3_business",
      "label": "📊 Day 3 — Meta Business Suite & Scheduling Tools",
      "type": "text_fields",
      "points": 22,
      "instructions": "Set up Meta Business Suite by connecting your Facebook Page and Instagram account. Then choose ONE scheduling tool (Buffer, Metricool, Later, Canva Scheduler, TweetDeck/X Pro, or Publer) and connect your accounts. Due: Monday, April 14 by 6:00 PM WAT.",
      "config": {
        "fields": [
          {"id": "meta_page",         "label": "Facebook Page Name & URL",                                  "placeholder": "https://facebook.com/yourpage"},
          {"id": "meta_instagram",    "label": "Instagram Account Connected to Meta Business Suite",        "placeholder": "@youraccount"},
          {"id": "meta_suite_desc",   "label": "Describe what you see in your Meta Business Suite dashboard", "multiline": true, "placeholder": "e.g. I can see my Page, connected Instagram, the Planner tab, Inbox, and Insights..."},
          {"id": "scheduler_choice",  "label": "Scheduling Tool You Chose (pick one)",                      "placeholder": "Buffer / Metricool / Later / Canva Scheduler / TweetDeck / Publer"},
          {"id": "scheduler_link",    "label": "Your Scheduling Tool Profile / Dashboard Link",             "placeholder": "https://..."},
          {"id": "first_scheduled",   "label": "Describe your first scheduled post (platform, caption preview, scheduled date/time)", "multiline": true, "placeholder": "Platform: Instagram\nCaption: ...\nScheduled for: Monday April 14 at 8:00 PM"}
        ]
      }
    },
    {
      "id": "day4_calendar",
      "label": "📅 Day 4A — Content Calendar (Due Tue 6 PM)",
      "type": "text_fields",
      "points": 15,
      "instructions": "Build a content calendar covering at least 2 weeks of planned posts. Include: platform, content type, caption outline, and posting time for each entry. Use Google Sheets, Notion, or Canva. Due: Tuesday, April 14 by 6:00 PM WAT.",
      "config": {
        "fields": [
          {"id": "calendar_link",       "label": "Content Calendar Link (Google Sheets / Notion / Canva)", "placeholder": "https://docs.google.com/... or notion.so/..."},
          {"id": "primary_platforms",   "label": "Top 3 Platforms You Will Post On Most",                  "placeholder": "e.g. Instagram, LinkedIn, TikTok"},
          {"id": "content_pillars",     "label": "Your 3–5 Content Pillars / Themes",                      "multiline": true, "placeholder": "1. Personal brand tips\n2. Behind-the-scenes\n3. Design inspiration\n4. Industry news\n5. Motivational"},
          {"id": "posts_per_week",      "label": "Number of Posts Planned Per Week",                       "placeholder": "e.g. 7 posts/week (1 per platform per day)"},
          {"id": "week1_highlight",     "label": "Describe Your Best Week 1 Post Idea",                    "multiline": true, "placeholder": "Platform: Instagram\nTopic: ...\nCaption outline: ...\nCTA: ..."}
        ]
      }
    },
    {
      "id": "day4_posts",
      "label": "🚀 Day 4B — First Posts Published (Due Tue 11:59 PM)",
      "type": "text_fields",
      "points": 10,
      "instructions": "Publish your first post on at least 3 platforms and paste the live post links. This proves your accounts are active and your content strategy is in motion. Due: Tuesday, April 14 by 11:59 PM WAT.",
      "config": {
        "fields": [
          {"id": "post_instagram",  "label": "First Instagram Post — Live Link",                             "placeholder": "https://instagram.com/p/..."},
          {"id": "post_facebook",   "label": "First Facebook Post — Live Link",                             "placeholder": "https://facebook.com/..."},
          {"id": "post_linkedin",   "label": "First LinkedIn Post — Live Link",                             "placeholder": "https://linkedin.com/feed/update/..."},
          {"id": "post_twitter",    "label": "First Twitter/X Post — Live Link",                            "placeholder": "https://x.com/.../status/..."},
          {"id": "post_tiktok",     "label": "First TikTok Video — Live Link (optional)",                   "placeholder": "https://tiktok.com/@.../video/..."},
          {"id": "whatsapp_msg",    "label": "WhatsApp Business — Describe your first broadcast message",   "multiline": true, "placeholder": "Sent intro message to X contacts. Message: ''Welcome to [Your Name]''s digital hub...''"}
        ]
      }
    },
    {
      "id": "reflection",
      "label": "🪞 Reflection — Your Digital Creator Journey",
      "type": "essay",
      "points": 5,
      "instructions": "Answer all 3 reflection questions honestly. Aim for at least 100 words per answer. This section shows your growth mindset and future plan.",
      "config": {
        "questions": [
          {
            "id": "q1",
            "text": "Which platform was the most challenging to set up, and why? What did you do to solve it?",
            "wordTarget": 100
          },
          {
            "id": "q2",
            "text": "What is your digital product strategy? Which platform will you sell your first digital product on, and what will that product be?",
            "wordTarget": 100
          },
          {
            "id": "q3",
            "text": "How will you stay consistent on social media for the next 30 days? Be specific about your posting frequency, best posting times, and how you will use scheduling tools.",
            "wordTarget": 100
          }
        ]
      }
    }
  ]'::jsonb,
  NULL,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  sections = EXCLUDED.sections,
  instructions = EXCLUDED.instructions,
  updated_at = NOW();


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SEED MISSIONS (create table if it was not applied from p37_gamification)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cadence TEXT NOT NULL DEFAULT 'daily',
  target INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  coin_reward INTEGER NOT NULL DEFAULT 0,
  event_type TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO missions (key, title, description, cadence, target, xp_reward, coin_reward, event_type, active)
VALUES
  (
    'social_media_pioneer',
    '📱 Social Media Pioneer',
    'Set up all 13 social media accounts for the Masterclass assignment.',
    'weekly', 1, 250, 60, 'task_completed', true
  ),
  (
    'digital_products_builder',
    '💰 Digital Products Builder',
    'Create accounts on all 10 digital product platforms.',
    'weekly', 1, 200, 50, 'task_completed', true
  ),
  (
    'meta_business_setup',
    '📊 Meta Business Ready',
    'Set up Meta Business Suite and connect Facebook + Instagram.',
    'weekly', 1, 150, 40, 'task_completed', true
  ),
  (
    'content_calendar_built',
    '📅 Content Strategist',
    'Build and submit a 2-week content calendar.',
    'weekly', 1, 150, 40, 'task_completed', true
  ),
  (
    'first_posts_live',
    '🚀 Going Live',
    'Publish your first posts on at least 3 social media platforms.',
    'weekly', 1, 100, 30, 'task_completed', true
  ),
  (
    'masterclass_complete',
    '🎓 Masterclass Graduate',
    'Complete and submit the full Social Media & Digital Products Masterclass project.',
    'weekly', 1, 500, 100, 'task_completed', true
  )
ON CONFLICT (key) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  xp_reward = EXCLUDED.xp_reward,
  coin_reward = EXCLUDED.coin_reward,
  active = EXCLUDED.active;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SEED TASKS FOR ALL ACTIVE INTERNS
-- Each day's work becomes a tracked task with XP rewards.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Find any admin/super_admin to use as task assigner
  SELECT id INTO v_admin_id
  FROM users
  WHERE role IN ('super_admin', 'admin')
  ORDER BY created_at
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'No admin found — skipping task seeding.';
    RETURN;
  END IF;

  -- DAY 1 TASK: 13 Social Media Accounts
  INSERT INTO tasks (title, description, assigned_to, assigned_by, due_date, xp_reward, priority, status)
  SELECT
    '📱 [Masterclass Day 1] Create 13 Social Media Accounts',
    E'SOCIAL MEDIA & DIGITAL PRODUCTS MASTERCLASS — DAY 1\n\nCreate professional accounts on all 13 platforms:\n1. Instagram\n2. Facebook\n3. Twitter/X\n4. WhatsApp Business\n5. LinkedIn\n6. TikTok\n7. YouTube\n8. Behance\n9. Pinterest\n10. Threads\n11. Snapchat\n12. Reddit\n13. Telegram\n\n✅ Use your real name or brand name consistently across all platforms.\n📸 Take screenshots and send to the WhatsApp group today.\n🔗 Submit all profile links in your Projects page under the Masterclass project.',
    u.id,
    v_admin_id,
    '2026-04-12 22:59:00+00',
    80,
    'high',
    'pending'
  FROM users u
  WHERE u.role IN ('intern', 'team_lead')
    AND NOT EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.assigned_to = u.id
        AND t.title = '📱 [Masterclass Day 1] Create 13 Social Media Accounts'
    );

  -- DAY 2 TASK: Digital Product Platforms
  INSERT INTO tasks (title, description, assigned_to, assigned_by, due_date, xp_reward, priority, status)
  SELECT
    '💰 [Masterclass Day 2] Create 10 Digital Product Platform Accounts',
    E'SOCIAL MEDIA & DIGITAL PRODUCTS MASTERCLASS — DAY 2\n\nCreate seller/creator accounts on all 10 platforms:\n1. Selar\n2. Amazon KDP\n3. Google Books\n4. Gumroad\n5. Payhip\n6. Ko-fi\n7. Etsy\n8. Thinkific\n9. Udemy\n10. Creative Market\nBONUS: Canva\n\n✅ These are your future digital product storefronts.\n📸 Screenshot each account signup confirmation and send to WhatsApp group.\n🔗 Submit all profile/store links in your Projects page.',
    u.id,
    v_admin_id,
    '2026-04-13 22:59:00+00',
    80,
    'high',
    'pending'
  FROM users u
  WHERE u.role IN ('intern', 'team_lead')
    AND NOT EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.assigned_to = u.id
        AND t.title = '💰 [Masterclass Day 2] Create 10 Digital Product Platform Accounts'
    );

  -- DAY 3 TASK: Meta Business Suite
  INSERT INTO tasks (title, description, assigned_to, assigned_by, due_date, xp_reward, priority, status)
  SELECT
    '📊 [Masterclass Day 3A] Set Up Meta Business Suite',
    E'SOCIAL MEDIA & DIGITAL PRODUCTS MASTERCLASS — DAY 3A\n\nSet up Meta Business Suite:\n• Create a Facebook Page (if you don''t have one)\n• Connect your Instagram account to Meta Business Suite\n• Explore: Planner, Inbox, Insights, and Ad Center tabs\n\n🎯 Goal: Your Facebook Page and Instagram are now managed from one dashboard.\n📸 Screenshot your Meta Business Suite dashboard.\n⏰ Due: Monday, April 14 by 6:00 PM WAT.',
    u.id,
    v_admin_id,
    '2026-04-14 17:00:00+00',
    60,
    'high',
    'pending'
  FROM users u
  WHERE u.role IN ('intern', 'team_lead')
    AND NOT EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.assigned_to = u.id
        AND t.title = '📊 [Masterclass Day 3A] Set Up Meta Business Suite'
    );

  -- DAY 3 TASK: Scheduling Tool
  INSERT INTO tasks (title, description, assigned_to, assigned_by, due_date, xp_reward, priority, status)
  SELECT
    '⏰ [Masterclass Day 3B] Set Up a Scheduling Tool & Schedule First Post',
    E'SOCIAL MEDIA & DIGITAL PRODUCTS MASTERCLASS — DAY 3B\n\nChoose ONE scheduling tool and set it up:\n• Buffer\n• Metricool\n• Later\n• Canva Scheduler\n• TweetDeck / X Pro\n• Publer\n\nSteps:\n1. Create account on your chosen tool\n2. Connect your social media accounts\n3. Schedule your first post (even a test post counts!)\n\n📸 Screenshot your scheduling dashboard with the post queued.\n⏰ Due: Monday, April 14 by 6:00 PM WAT.',
    u.id,
    v_admin_id,
    '2026-04-14 17:00:00+00',
    60,
    'high',
    'pending'
  FROM users u
  WHERE u.role IN ('intern', 'team_lead')
    AND NOT EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.assigned_to = u.id
        AND t.title = '⏰ [Masterclass Day 3B] Set Up a Scheduling Tool & Schedule First Post'
    );

  -- DAY 4 TASK: Content Calendar
  INSERT INTO tasks (title, description, assigned_to, assigned_by, due_date, xp_reward, priority, status)
  SELECT
    '📅 [Masterclass Day 4A] Build Your 2-Week Content Calendar',
    E'SOCIAL MEDIA & DIGITAL PRODUCTS MASTERCLASS — DAY 4A\n\nBuild a content calendar covering the next 2 weeks:\n\nInclude for each planned post:\n• Platform (Instagram, LinkedIn, TikTok, etc.)\n• Content type (Reel, Story, Post, Article, etc.)\n• Caption outline (first line at minimum)\n• Posting time\n\nTools you can use:\n• Google Sheets (recommended)\n• Notion\n• Canva (has a content calendar template)\n• Trello\n\n🔗 Make your calendar shareable and submit the link.\n⏰ Due: Tuesday, April 14 by 6:00 PM WAT.',
    u.id,
    v_admin_id,
    '2026-04-14 17:00:00+00',
    50,
    'high',
    'pending'
  FROM users u
  WHERE u.role IN ('intern', 'team_lead')
    AND NOT EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.assigned_to = u.id
        AND t.title = '📅 [Masterclass Day 4A] Build Your 2-Week Content Calendar'
    );

  -- DAY 4 TASK: First Live Posts
  INSERT INTO tasks (title, description, assigned_to, assigned_by, due_date, xp_reward, priority, status)
  SELECT
    '🚀 [Masterclass Day 4B] Publish Your First Posts on 3+ Platforms',
    E'SOCIAL MEDIA & DIGITAL PRODUCTS MASTERCLASS — DAY 4B\n\nGo live! Publish your first post on at least 3 platforms.\n\nPost ideas:\n• An introduction post ("Hi, I am [Name], I am a [track] intern at CIOS...")\n• A digital skills tip from what you have learned\n• A behind-the-scenes look at your setup\n• Your first digital product announcement (even if it is just a concept)\n\nMinimum 3 platforms. Aim for all major ones.\n\n🔗 Copy the live post URLs and submit them in your Projects page.\n⏰ Due: Tuesday, April 14 by 11:59 PM WAT.',
    u.id,
    v_admin_id,
    '2026-04-14 22:59:00+00',
    80,
    'high',
    'pending'
  FROM users u
  WHERE u.role IN ('intern', 'team_lead')
    AND NOT EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.assigned_to = u.id
        AND t.title = '🚀 [Masterclass Day 4B] Publish Your First Posts on 3+ Platforms'
    );

  RAISE NOTICE 'Task seeding complete for Social Media Masterclass.';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SEED REMINDERS FOR ALL ACTIVE INTERNS
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Day 1 reminder
  INSERT INTO reminders (user_id, title, notes, due_at, priority, source, source_ref)
  SELECT
    u.id,
    '📱 Masterclass: Create 13 Social Media Accounts (Day 1)',
    'Set up all 13 social media platforms. Send screenshots to the WhatsApp group. Submit links in your Projects page.',
    '2026-04-12 22:59:00+00',
    'urgent',
    'task',
    'p359_masterclass_day1'
  FROM users u
  WHERE u.role IN ('intern', 'team_lead')
    AND NOT EXISTS (
      SELECT 1 FROM reminders r
      WHERE r.user_id = u.id AND r.source_ref = 'p359_masterclass_day1'
    );

  -- Day 2 reminder
  INSERT INTO reminders (user_id, title, notes, due_at, priority, source, source_ref)
  SELECT
    u.id,
    '💰 Masterclass: 10 Digital Product Platforms (Day 2)',
    'Create seller accounts on all 10 digital platforms + Canva. Send screenshots to WhatsApp group.',
    '2026-04-13 22:59:00+00',
    'urgent',
    'task',
    'p359_masterclass_day2'
  FROM users u
  WHERE u.role IN ('intern', 'team_lead')
    AND NOT EXISTS (
      SELECT 1 FROM reminders r
      WHERE r.user_id = u.id AND r.source_ref = 'p359_masterclass_day2'
    );

  -- Day 3 reminder
  INSERT INTO reminders (user_id, title, notes, due_at, priority, source, source_ref)
  SELECT
    u.id,
    '📊 Masterclass: Meta Business Suite + Scheduling Tool (Day 3)',
    'Connect Facebook Page + Instagram to Meta Business Suite. Set up one scheduling tool and schedule your first post. Due 6 PM.',
    '2026-04-14 17:00:00+00',
    'urgent',
    'task',
    'p359_masterclass_day3'
  FROM users u
  WHERE u.role IN ('intern', 'team_lead')
    AND NOT EXISTS (
      SELECT 1 FROM reminders r
      WHERE r.user_id = u.id AND r.source_ref = 'p359_masterclass_day3'
    );

  -- Day 4 morning reminder (content calendar)
  INSERT INTO reminders (user_id, title, notes, due_at, priority, source, source_ref)
  SELECT
    u.id,
    '📅 Masterclass: Content Calendar due by 6 PM TODAY',
    'Build a 2-week content calendar in Google Sheets, Notion, or Canva. Submit the shareable link before 6 PM WAT.',
    '2026-04-14 17:00:00+00',
    'urgent',
    'task',
    'p359_masterclass_day4a'
  FROM users u
  WHERE u.role IN ('intern', 'team_lead')
    AND NOT EXISTS (
      SELECT 1 FROM reminders r
      WHERE r.user_id = u.id AND r.source_ref = 'p359_masterclass_day4a'
    );

  -- Day 4 evening reminder (first posts)
  INSERT INTO reminders (user_id, title, notes, due_at, priority, source, source_ref)
  SELECT
    u.id,
    '🚀 Masterclass: Publish First Posts on 3+ Platforms (by 11:59 PM)',
    'Go live! Publish your intro/first post on at least 3 platforms. Copy the post links and submit them in your Projects page before midnight.',
    '2026-04-14 22:59:00+00',
    'urgent',
    'task',
    'p359_masterclass_day4b'
  FROM users u
  WHERE u.role IN ('intern', 'team_lead')
    AND NOT EXISTS (
      SELECT 1 FROM reminders r
      WHERE r.user_id = u.id AND r.source_ref = 'p359_masterclass_day4b'
    );

  -- Final submission reminder
  INSERT INTO reminders (user_id, title, notes, due_at, priority, source, source_ref)
  SELECT
    u.id,
    '🎓 Masterclass: Submit Full Project on CIOS Platform',
    'Go to Projects > Social Media Masterclass. Fill in ALL sections with your real links and submit before the deadline.',
    '2026-04-14 22:00:00+00',
    'urgent',
    'task',
    'p359_masterclass_submit'
  FROM users u
  WHERE u.role IN ('intern', 'team_lead')
    AND NOT EXISTS (
      SELECT 1 FROM reminders r
      WHERE r.user_id = u.id AND r.source_ref = 'p359_masterclass_submit'
    );

  RAISE NOTICE 'Reminder seeding complete for Social Media Masterclass.';
END $$;
