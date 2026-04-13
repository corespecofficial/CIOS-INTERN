/* ============================================
   CIOS Platform - TypeScript Type Definitions
   ============================================ */

export type UserRole =
  | 'intern'
  | 'team_lead'
  | 'admin'
  | 'super_admin'
  | 'instructor'
  | 'moderator'
  | 'finance'
  | 'support'
  | 'premium';

export type UserStatus = 'active' | 'suspended' | 'graduated' | 'withdrawn' | 'on_leave';

export type TaskStatus = 'pending' | 'in_progress' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'overdue';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type CourseStatus = 'draft' | 'published' | 'archived';

export type TransactionType = 'credit' | 'debit' | 'fine' | 'reward' | 'payment' | 'refund';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'task' | 'message' | 'achievement' | 'fine' | 'system';

export type FineStatus = 'pending' | 'paid' | 'waived' | 'overdue';

export type PostType = 'discussion' | 'question' | 'announcement' | 'resource' | 'poll';

export type SessionStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

// ----- Core Entities -----

export interface User {
  id: string;
  clerk_id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url: string | null;
  level: number;
  xp: number;
  streak: number;
  rank: number | null;
  performance: number;
  wallet_balance: number;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  last_seen: string | null;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  instructor?: User;
  thumbnail_url: string | null;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration_hours: number;
  total_modules: number;
  total_enrolled: number;
  status: CourseStatus;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
  content_url: string | null;
  content_type: 'video' | 'article' | 'quiz' | 'assignment';
  duration_minutes: number;
  created_at: string;
}

export interface CourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  progress: number;
  completed_modules: string[];
  status: 'active' | 'completed' | 'dropped';
  enrolled_at: string;
  completed_at: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  assigned_by: string;
  assignee?: User;
  assigner?: User;
  course_id: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
  xp_reward: number;
  submission_url: string | null;
  feedback: string | null;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  task_id: string;
  user_id: string;
  task?: Task;
  user?: User;
  content: string;
  attachment_urls: string[];
  grade: number | null;
  feedback: string | null;
  status: 'submitted' | 'graded' | 'returned';
  submitted_at: string;
  graded_at: string | null;
  graded_by: string | null;
}

export interface Message {
  id: string;
  chat_room_id: string;
  sender_id: string;
  sender?: User;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system' | 'reply';
  reply_to_id: string | null;
  attachment_url: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  reactions: Record<string, string[]>;
  created_at: string;
  updated_at: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string | null;
  type: 'direct' | 'group' | 'channel' | 'announcement';
  avatar_url: string | null;
  created_by: string;
  is_archived: boolean;
  last_message?: Message;
  unread_count?: number;
  members?: ChatRoomMember[];
  created_at: string;
  updated_at: string;
}

export interface ChatRoomMember {
  id: string;
  chat_room_id: string;
  user_id: string;
  user?: User;
  role: 'member' | 'admin' | 'owner';
  is_muted: boolean;
  joined_at: string;
  last_read_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  user?: User;
  type: TransactionType;
  amount: number;
  description: string;
  reference: string | null;
  balance_after: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  avatar_url: string | null;
  cover_url: string | null;
  created_by: string;
  creator?: User;
  member_count: number;
  is_private: boolean;
  tags: string[];
  rules: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  user?: User;
  role: 'member' | 'moderator' | 'admin';
  joined_at: string;
}

export interface Post {
  id: string;
  community_id: string;
  author_id: string;
  author?: User;
  community?: Community;
  title: string;
  content: string;
  type: PostType;
  attachment_urls: string[];
  upvotes: number;
  downvotes: number;
  comment_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface PostVote {
  id: string;
  post_id: string;
  user_id: string;
  vote_type: 'up' | 'down';
  created_at: string;
}

export interface ClassSession {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  instructor?: User;
  course_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  recording_url: string | null;
  status: SessionStatus;
  max_attendees: number | null;
  attendee_count: number;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  session_id: string;
  user_id: string;
  user?: User;
  joined_at: string;
  left_at: string | null;
  duration_minutes: number;
  status: 'present' | 'late' | 'absent' | 'excused';
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  category: 'achievement' | 'milestone' | 'skill' | 'special';
  xp_value: number;
  criteria: Record<string, unknown>;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  badge?: Badge;
  earned_at: string;
}

export interface Fine {
  id: string;
  user_id: string;
  user?: User;
  issued_by: string;
  issuer?: User;
  amount: number;
  reason: string;
  category: 'lateness' | 'absence' | 'misconduct' | 'missed_deadline' | 'insubordination' | 'other';
  status: FineStatus;
  due_date: string;
  paid_at: string | null;
  waived_by: string | null;
  waive_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PerformanceMetrics {
  user_id: string;
  tasks_completed: number;
  tasks_total: number;
  completion_rate: number;
  average_grade: number;
  xp_earned: number;
  streak_best: number;
  streak_current: number;
  attendance_rate: number;
  fines_total: number;
  fines_paid: number;
  courses_completed: number;
  courses_enrolled: number;
  badges_earned: number;
  rank: number;
  level: number;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  total_interns: number;
  total_courses: number;
  total_tasks: number;
  tasks_completed: number;
  tasks_pending: number;
  total_revenue: number;
  total_fines_issued: number;
  total_fines_collected: number;
  active_sessions: number;
  communities_count: number;
  messages_today: number;
  new_users_this_week: number;
  average_performance: number;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  color: string;
  is_pinned: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  type: 'class' | 'deadline' | 'meeting' | 'event' | 'reminder';
  color: string;
  created_by: string;
  attendees: string[];
  location: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user?: User;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// ----- Portal Configuration -----

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

export interface PortalConfig {
  role: UserRole;
  label: string;
  color: string;
  icon: string;
  navItems: NavItem[];
  dashboardRoute: string;
}

// ----- API / Response Types -----

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface SearchFilters {
  query?: string;
  role?: UserRole;
  status?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
}

// ----- Realtime Types -----

export interface RealtimePresence {
  user_id: string;
  name: string;
  avatar_url: string | null;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_active: string;
}

export interface TypingIndicator {
  user_id: string;
  chat_room_id: string;
  is_typing: boolean;
}

// ----- Form Types -----

export interface CreateTaskForm {
  title: string;
  description: string;
  assigned_to: string;
  course_id?: string;
  priority: TaskPriority;
  due_date: string;
  xp_reward: number;
}

export interface CreateCourseForm {
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration_hours: number;
  tags: string[];
}

export interface IssueFineForm {
  user_id: string;
  amount: number;
  reason: string;
  category: Fine['category'];
  due_date: string;
}
