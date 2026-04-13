-- ============================================
-- CIOS Platform - Complete PostgreSQL Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM (
  'intern', 'team_lead', 'admin', 'super_admin',
  'instructor', 'moderator', 'finance', 'support', 'premium'
);

CREATE TYPE user_status AS ENUM (
  'active', 'suspended', 'graduated', 'withdrawn', 'on_leave'
);

CREATE TYPE task_status AS ENUM (
  'pending', 'in_progress', 'submitted', 'under_review',
  'approved', 'rejected', 'overdue'
);

CREATE TYPE task_priority AS ENUM (
  'low', 'medium', 'high', 'urgent'
);

CREATE TYPE course_status AS ENUM (
  'draft', 'published', 'archived'
);

CREATE TYPE transaction_type AS ENUM (
  'credit', 'debit', 'fine', 'reward', 'payment', 'refund'
);

CREATE TYPE notification_type AS ENUM (
  'info', 'success', 'warning', 'error', 'task',
  'message', 'achievement', 'fine', 'system'
);

CREATE TYPE fine_status AS ENUM (
  'pending', 'paid', 'waived', 'overdue'
);

CREATE TYPE post_type AS ENUM (
  'discussion', 'question', 'announcement', 'resource', 'poll'
);

CREATE TYPE session_status AS ENUM (
  'scheduled', 'live', 'completed', 'cancelled'
);

CREATE TYPE message_type AS ENUM (
  'text', 'image', 'file', 'system', 'reply'
);

CREATE TYPE chat_room_type AS ENUM (
  'direct', 'group', 'channel', 'announcement'
);

CREATE TYPE attendance_status AS ENUM (
  'present', 'late', 'absent', 'excused'
);

CREATE TYPE badge_category AS ENUM (
  'achievement', 'milestone', 'skill', 'special'
);

-- ============================================
-- TABLES
-- ============================================

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'intern',
  avatar_url TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  performance DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  wallet_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status user_status NOT NULL DEFAULT 'active',
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Courses
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thumbnail_url TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration_hours INTEGER NOT NULL DEFAULT 0,
  total_modules INTEGER NOT NULL DEFAULT 0,
  total_enrolled INTEGER NOT NULL DEFAULT 0,
  status course_status NOT NULL DEFAULT 'draft',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Course Modules
CREATE TABLE course_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  content_url TEXT,
  content_type TEXT NOT NULL DEFAULT 'article' CHECK (content_type IN ('video', 'article', 'quiz', 'assignment')),
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Course Enrollments
CREATE TABLE course_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  completed_modules TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  status task_status NOT NULL DEFAULT 'pending',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date TIMESTAMPTZ NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  submission_url TEXT,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Submissions
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  attachment_urls TEXT[] NOT NULL DEFAULT '{}',
  grade DECIMAL(5,2),
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Chat Rooms
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type chat_room_type NOT NULL DEFAULT 'group',
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chat Room Members
CREATE TABLE chat_room_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
  is_muted BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(chat_room_id, user_id)
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  message_type message_type NOT NULL DEFAULT 'text',
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  attachment_url TEXT,
  is_edited BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  reactions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  type notification_type NOT NULL DEFAULT 'info',
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  reference TEXT,
  balance_after DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Communities
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  cover_url TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_count INTEGER NOT NULL DEFAULT 0,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  tags TEXT[] NOT NULL DEFAULT '{}',
  rules TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Community Members
CREATE TABLE community_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- Posts
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  type post_type NOT NULL DEFAULT 'discussion',
  attachment_urls TEXT[] NOT NULL DEFAULT '{}',
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Post Votes
CREATE TABLE post_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Class Sessions
CREATE TABLE class_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  meeting_url TEXT,
  recording_url TEXT,
  status session_status NOT NULL DEFAULT 'scheduled',
  max_attendees INTEGER,
  attendee_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attendance
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  status attendance_status NOT NULL DEFAULT 'present',
  UNIQUE(session_id, user_id)
);

-- Badges
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon_url TEXT NOT NULL DEFAULT '',
  category badge_category NOT NULL DEFAULT 'achievement',
  xp_value INTEGER NOT NULL DEFAULT 0,
  criteria JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Badges
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Fines
CREATE TABLE fines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issued_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  reason TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('lateness', 'absence', 'misconduct', 'missed_deadline', 'insubordination', 'other')),
  status fine_status NOT NULL DEFAULT 'pending',
  due_date TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  waived_by UUID REFERENCES users(id) ON DELETE SET NULL,
  waive_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notes
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#1E88E5',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Calendar Events
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL DEFAULT 'event' CHECK (type IN ('class', 'deadline', 'meeting', 'event', 'reminder')),
  color TEXT NOT NULL DEFAULT '#1E88E5',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attendees UUID[] NOT NULL DEFAULT '{}',
  location TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_rule TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Users
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Courses
CREATE INDEX idx_courses_instructor_id ON courses(instructor_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_category ON courses(category);

-- Course Modules
CREATE INDEX idx_course_modules_course_id ON course_modules(course_id);

-- Course Enrollments
CREATE INDEX idx_course_enrollments_user_id ON course_enrollments(user_id);
CREATE INDEX idx_course_enrollments_course_id ON course_enrollments(course_id);

-- Tasks
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX idx_tasks_course_id ON tasks(course_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Submissions
CREATE INDEX idx_submissions_task_id ON submissions(task_id);
CREATE INDEX idx_submissions_user_id ON submissions(user_id);

-- Messages
CREATE INDEX idx_messages_chat_room_id ON messages(chat_room_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Chat Room Members
CREATE INDEX idx_chat_room_members_chat_room_id ON chat_room_members(chat_room_id);
CREATE INDEX idx_chat_room_members_user_id ON chat_room_members(user_id);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Transactions
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- Communities
CREATE INDEX idx_communities_created_by ON communities(created_by);

-- Community Members
CREATE INDEX idx_community_members_community_id ON community_members(community_id);
CREATE INDEX idx_community_members_user_id ON community_members(user_id);

-- Posts
CREATE INDEX idx_posts_community_id ON posts(community_id);
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- Post Votes
CREATE INDEX idx_post_votes_post_id ON post_votes(post_id);
CREATE INDEX idx_post_votes_user_id ON post_votes(user_id);

-- Class Sessions
CREATE INDEX idx_class_sessions_instructor_id ON class_sessions(instructor_id);
CREATE INDEX idx_class_sessions_course_id ON class_sessions(course_id);
CREATE INDEX idx_class_sessions_scheduled_at ON class_sessions(scheduled_at);
CREATE INDEX idx_class_sessions_status ON class_sessions(status);

-- Attendance
CREATE INDEX idx_attendance_session_id ON attendance(session_id);
CREATE INDEX idx_attendance_user_id ON attendance(user_id);

-- User Badges
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);

-- Fines
CREATE INDEX idx_fines_user_id ON fines(user_id);
CREATE INDEX idx_fines_issued_by ON fines(issued_by);
CREATE INDEX idx_fines_status ON fines(status);

-- Notes
CREATE INDEX idx_notes_user_id ON notes(user_id);

-- Calendar Events
CREATE INDEX idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);

-- Audit Logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_communities_updated_at BEFORE UPDATE ON communities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_class_sessions_updated_at BEFORE UPDATE ON class_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_fines_updated_at BEFORE UPDATE ON fines FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_calendar_events_updated_at BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Helper: Check if user is admin or super_admin
CREATE OR REPLACE FUNCTION is_admin(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = uid AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: Get current user's UUID from Clerk JWT
CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub' LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Users: Everyone can read, only self or admin can update
CREATE POLICY users_select ON users FOR SELECT USING (true);
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (true);
CREATE POLICY users_update ON users FOR UPDATE USING (
  id = auth_user_id() OR is_admin(auth_user_id())
);
CREATE POLICY users_delete ON users FOR DELETE USING (
  is_admin(auth_user_id())
);

-- Courses: Everyone can read published, instructors/admins can manage
CREATE POLICY courses_select ON courses FOR SELECT USING (
  status = 'published' OR instructor_id = auth_user_id() OR is_admin(auth_user_id())
);
CREATE POLICY courses_insert ON courses FOR INSERT WITH CHECK (
  instructor_id = auth_user_id() OR is_admin(auth_user_id())
);
CREATE POLICY courses_update ON courses FOR UPDATE USING (
  instructor_id = auth_user_id() OR is_admin(auth_user_id())
);
CREATE POLICY courses_delete ON courses FOR DELETE USING (
  is_admin(auth_user_id())
);

-- Course Modules: Follows course access
CREATE POLICY course_modules_select ON course_modules FOR SELECT USING (true);
CREATE POLICY course_modules_insert ON course_modules FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM courses WHERE id = course_id AND (instructor_id = auth_user_id() OR is_admin(auth_user_id())))
);
CREATE POLICY course_modules_update ON course_modules FOR UPDATE USING (
  EXISTS (SELECT 1 FROM courses WHERE id = course_id AND (instructor_id = auth_user_id() OR is_admin(auth_user_id())))
);
CREATE POLICY course_modules_delete ON course_modules FOR DELETE USING (
  EXISTS (SELECT 1 FROM courses WHERE id = course_id AND (instructor_id = auth_user_id() OR is_admin(auth_user_id())))
);

-- Course Enrollments: Users see own, admins see all
CREATE POLICY enrollments_select ON course_enrollments FOR SELECT USING (
  user_id = auth_user_id() OR is_admin(auth_user_id())
);
CREATE POLICY enrollments_insert ON course_enrollments FOR INSERT WITH CHECK (
  user_id = auth_user_id()
);
CREATE POLICY enrollments_update ON course_enrollments FOR UPDATE USING (
  user_id = auth_user_id() OR is_admin(auth_user_id())
);

-- Tasks: Assigned user or assigner or admin can see
CREATE POLICY tasks_select ON tasks FOR SELECT USING (
  assigned_to = auth_user_id() OR assigned_by = auth_user_id() OR is_admin(auth_user_id())
);
CREATE POLICY tasks_insert ON tasks FOR INSERT WITH CHECK (
  assigned_by = auth_user_id() OR is_admin(auth_user_id())
);
CREATE POLICY tasks_update ON tasks FOR UPDATE USING (
  assigned_to = auth_user_id() OR assigned_by = auth_user_id() OR is_admin(auth_user_id())
);
CREATE POLICY tasks_delete ON tasks FOR DELETE USING (
  assigned_by = auth_user_id() OR is_admin(auth_user_id())
);

-- Submissions: User sees own, graders/admins see all
CREATE POLICY submissions_select ON submissions FOR SELECT USING (
  user_id = auth_user_id() OR is_admin(auth_user_id()) OR
  EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND assigned_by = auth_user_id())
);
CREATE POLICY submissions_insert ON submissions FOR INSERT WITH CHECK (
  user_id = auth_user_id()
);
CREATE POLICY submissions_update ON submissions FOR UPDATE USING (
  user_id = auth_user_id() OR is_admin(auth_user_id()) OR
  EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND assigned_by = auth_user_id())
);

-- Chat Rooms: Members only
CREATE POLICY chat_rooms_select ON chat_rooms FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_room_members WHERE chat_room_id = id AND user_id = auth_user_id())
  OR is_admin(auth_user_id())
);
CREATE POLICY chat_rooms_insert ON chat_rooms FOR INSERT WITH CHECK (
  created_by = auth_user_id() OR is_admin(auth_user_id())
);
CREATE POLICY chat_rooms_update ON chat_rooms FOR UPDATE USING (
  created_by = auth_user_id() OR is_admin(auth_user_id())
);

-- Chat Room Members
CREATE POLICY chat_room_members_select ON chat_room_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_room_members crm WHERE crm.chat_room_id = chat_room_members.chat_room_id AND crm.user_id = auth_user_id())
  OR is_admin(auth_user_id())
);
CREATE POLICY chat_room_members_insert ON chat_room_members FOR INSERT WITH CHECK (
  is_admin(auth_user_id()) OR
  EXISTS (SELECT 1 FROM chat_room_members crm WHERE crm.chat_room_id = chat_room_members.chat_room_id AND crm.user_id = auth_user_id() AND crm.role IN ('admin', 'owner'))
);

-- Messages: Room members only
CREATE POLICY messages_select ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_room_members WHERE chat_room_id = messages.chat_room_id AND user_id = auth_user_id())
  OR is_admin(auth_user_id())
);
CREATE POLICY messages_insert ON messages FOR INSERT WITH CHECK (
  sender_id = auth_user_id() AND
  EXISTS (SELECT 1 FROM chat_room_members WHERE chat_room_id = messages.chat_room_id AND user_id = auth_user_id())
);
CREATE POLICY messages_update ON messages FOR UPDATE USING (
  sender_id = auth_user_id() OR is_admin(auth_user_id())
);

-- Notifications: Own only
CREATE POLICY notifications_select ON notifications FOR SELECT USING (
  user_id = auth_user_id()
);
CREATE POLICY notifications_insert ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY notifications_update ON notifications FOR UPDATE USING (
  user_id = auth_user_id()
);
CREATE POLICY notifications_delete ON notifications FOR DELETE USING (
  user_id = auth_user_id()
);

-- Transactions: Own or admin
CREATE POLICY transactions_select ON transactions FOR SELECT USING (
  user_id = auth_user_id() OR is_admin(auth_user_id())
);
CREATE POLICY transactions_insert ON transactions FOR INSERT WITH CHECK (
  is_admin(auth_user_id()) OR user_id = auth_user_id()
);

-- Communities: Public visible, private for members
CREATE POLICY communities_select ON communities FOR SELECT USING (
  NOT is_private OR
  EXISTS (SELECT 1 FROM community_members WHERE community_id = id AND user_id = auth_user_id()) OR
  is_admin(auth_user_id())
);
CREATE POLICY communities_insert ON communities FOR INSERT WITH CHECK (
  created_by = auth_user_id() OR is_admin(auth_user_id())
);
CREATE POLICY communities_update ON communities FOR UPDATE USING (
  created_by = auth_user_id() OR is_admin(auth_user_id())
);

-- Community Members
CREATE POLICY community_members_select ON community_members FOR SELECT USING (true);
CREATE POLICY community_members_insert ON community_members FOR INSERT WITH CHECK (
  user_id = auth_user_id() OR is_admin(auth_user_id())
);
CREATE POLICY community_members_delete ON community_members FOR DELETE USING (
  user_id = auth_user_id() OR is_admin(auth_user_id())
);

-- Posts: Community members or public communities
CREATE POLICY posts_select ON posts FOR SELECT USING (
  EXISTS (SELECT 1 FROM communities WHERE id = community_id AND NOT is_private) OR
  EXISTS (SELECT 1 FROM community_members WHERE community_id = posts.community_id AND user_id = auth_user_id()) OR
  is_admin(auth_user_id())
);
CREATE POLICY posts_insert ON posts FOR INSERT WITH CHECK (
  author_id = auth_user_id() AND
  EXISTS (SELECT 1 FROM community_members WHERE community_id = posts.community_id AND user_id = auth_user_id())
);
CREATE POLICY posts_update ON posts FOR UPDATE USING (
  author_id = auth_user_id() OR is_admin(auth_user_id())
);
CREATE POLICY posts_delete ON posts FOR DELETE USING (
  author_id = auth_user_id() OR is_admin(auth_user_id())
);

-- Post Votes
CREATE POLICY post_votes_select ON post_votes FOR SELECT USING (true);
CREATE POLICY post_votes_insert ON post_votes FOR INSERT WITH CHECK (
  user_id = auth_user_id()
);
CREATE POLICY post_votes_delete ON post_votes FOR DELETE USING (
  user_id = auth_user_id()
);

-- Class Sessions: Everyone can see scheduled, admins manage
CREATE POLICY class_sessions_select ON class_sessions FOR SELECT USING (true);
CREATE POLICY class_sessions_insert ON class_sessions FOR INSERT WITH CHECK (
  instructor_id = auth_user_id() OR is_admin(auth_user_id())
);
CREATE POLICY class_sessions_update ON class_sessions FOR UPDATE USING (
  instructor_id = auth_user_id() OR is_admin(auth_user_id())
);

-- Attendance: Own or admin
CREATE POLICY attendance_select ON attendance FOR SELECT USING (
  user_id = auth_user_id() OR is_admin(auth_user_id()) OR
  EXISTS (SELECT 1 FROM class_sessions WHERE id = session_id AND instructor_id = auth_user_id())
);
CREATE POLICY attendance_insert ON attendance FOR INSERT WITH CHECK (
  user_id = auth_user_id() OR is_admin(auth_user_id())
);
CREATE POLICY attendance_update ON attendance FOR UPDATE USING (
  is_admin(auth_user_id()) OR
  EXISTS (SELECT 1 FROM class_sessions WHERE id = session_id AND instructor_id = auth_user_id())
);

-- Badges: Everyone can see
CREATE POLICY badges_select ON badges FOR SELECT USING (true);
CREATE POLICY badges_insert ON badges FOR INSERT WITH CHECK (is_admin(auth_user_id()));
CREATE POLICY badges_update ON badges FOR UPDATE USING (is_admin(auth_user_id()));

-- User Badges: Everyone can see
CREATE POLICY user_badges_select ON user_badges FOR SELECT USING (true);
CREATE POLICY user_badges_insert ON user_badges FOR INSERT WITH CHECK (is_admin(auth_user_id()));

-- Fines: Own or admin
CREATE POLICY fines_select ON fines FOR SELECT USING (
  user_id = auth_user_id() OR issued_by = auth_user_id() OR is_admin(auth_user_id())
);
CREATE POLICY fines_insert ON fines FOR INSERT WITH CHECK (
  is_admin(auth_user_id()) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth_user_id() AND role IN ('admin', 'super_admin', 'moderator', 'finance'))
);
CREATE POLICY fines_update ON fines FOR UPDATE USING (
  is_admin(auth_user_id()) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth_user_id() AND role IN ('finance'))
);

-- Notes: Own only
CREATE POLICY notes_select ON notes FOR SELECT USING (user_id = auth_user_id());
CREATE POLICY notes_insert ON notes FOR INSERT WITH CHECK (user_id = auth_user_id());
CREATE POLICY notes_update ON notes FOR UPDATE USING (user_id = auth_user_id());
CREATE POLICY notes_delete ON notes FOR DELETE USING (user_id = auth_user_id());

-- Calendar Events: Attendees or admin
CREATE POLICY calendar_events_select ON calendar_events FOR SELECT USING (
  created_by = auth_user_id() OR
  auth_user_id() = ANY(attendees) OR
  is_admin(auth_user_id())
);
CREATE POLICY calendar_events_insert ON calendar_events FOR INSERT WITH CHECK (
  created_by = auth_user_id() OR is_admin(auth_user_id())
);
CREATE POLICY calendar_events_update ON calendar_events FOR UPDATE USING (
  created_by = auth_user_id() OR is_admin(auth_user_id())
);
CREATE POLICY calendar_events_delete ON calendar_events FOR DELETE USING (
  created_by = auth_user_id() OR is_admin(auth_user_id())
);

-- Audit Logs: Admin only
CREATE POLICY audit_logs_select ON audit_logs FOR SELECT USING (is_admin(auth_user_id()));
CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT WITH CHECK (true);
