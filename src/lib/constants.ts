import type { PortalConfig, NavItem, UserRole, User, Course, Task } from '@/types';

// ============================================
// Role Portal Configurations
// ============================================

export const ROLES: PortalConfig[] = [
  {
    role: 'intern',
    label: 'Intern',
    color: '#1E88E5',
    icon: 'GraduationCap',
    dashboardRoute: '/app/intern',
    navItems: [
      { label: 'Dashboard', href: '/app/intern', icon: 'LayoutDashboard' },
      { label: 'My Courses', href: '/app/intern/courses', icon: 'BookOpen' },
      { label: 'Tasks', href: '/app/intern/tasks', icon: 'CheckSquare' },
      { label: 'Chat', href: '/app/intern/chat', icon: 'MessageCircle' },
      { label: 'Community', href: '/app/intern/community', icon: 'Users' },
      { label: 'Wallet', href: '/app/intern/wallet', icon: 'Wallet' },
      { label: 'Leaderboard', href: '/app/intern/leaderboard', icon: 'Trophy' },
      { label: 'Calendar', href: '/app/intern/calendar', icon: 'Calendar' },
      { label: 'Notes', href: '/app/intern/notes', icon: 'StickyNote' },
      { label: 'Profile', href: '/app/intern/profile', icon: 'User' },
    ],
  },
  {
    role: 'team_lead',
    label: 'Team Lead',
    color: '#AB47BC',
    icon: 'Shield',
    dashboardRoute: '/app/team-lead',
    navItems: [
      { label: 'Dashboard', href: '/app/team-lead', icon: 'LayoutDashboard' },
      { label: 'My Team', href: '/app/team-lead/team', icon: 'Users' },
      { label: 'Tasks', href: '/app/team-lead/tasks', icon: 'CheckSquare' },
      { label: 'Reviews', href: '/app/team-lead/reviews', icon: 'ClipboardCheck' },
      { label: 'Chat', href: '/app/team-lead/chat', icon: 'MessageCircle' },
      { label: 'Community', href: '/app/team-lead/community', icon: 'Users' },
      { label: 'Calendar', href: '/app/team-lead/calendar', icon: 'Calendar' },
      { label: 'Reports', href: '/app/team-lead/reports', icon: 'BarChart3' },
      { label: 'Profile', href: '/app/team-lead/profile', icon: 'User' },
    ],
  },
  {
    role: 'admin',
    label: 'Admin',
    color: '#EF5350',
    icon: 'ShieldAlert',
    dashboardRoute: '/app/admin',
    navItems: [
      { label: 'Dashboard', href: '/app/admin', icon: 'LayoutDashboard' },
      { label: 'Users', href: '/app/admin/users', icon: 'Users' },
      { label: 'Courses', href: '/app/admin/courses', icon: 'BookOpen' },
      { label: 'Tasks', href: '/app/admin/tasks', icon: 'CheckSquare' },
      { label: 'Fines', href: '/app/admin/fines', icon: 'AlertTriangle' },
      { label: 'Chat', href: '/app/admin/chat', icon: 'MessageCircle' },
      { label: 'Community', href: '/app/admin/community', icon: 'Users' },
      { label: 'Analytics', href: '/app/admin/analytics', icon: 'BarChart3' },
      { label: 'Calendar', href: '/app/admin/calendar', icon: 'Calendar' },
      { label: 'Settings', href: '/app/admin/settings', icon: 'Settings' },
    ],
  },
  {
    role: 'super_admin',
    label: 'Super Admin',
    color: '#FF7043',
    icon: 'Crown',
    dashboardRoute: '/app/super-admin',
    navItems: [
      { label: 'Dashboard', href: '/app/super-admin', icon: 'LayoutDashboard' },
      { label: 'Users', href: '/app/super-admin/users', icon: 'Users' },
      { label: 'Courses', href: '/app/super-admin/courses', icon: 'BookOpen' },
      { label: 'Tasks', href: '/app/super-admin/tasks', icon: 'CheckSquare' },
      { label: 'Finance', href: '/app/super-admin/finance', icon: 'DollarSign' },
      { label: 'Fines', href: '/app/super-admin/fines', icon: 'AlertTriangle' },
      { label: 'Chat', href: '/app/super-admin/chat', icon: 'MessageCircle' },
      { label: 'Community', href: '/app/super-admin/community', icon: 'Users' },
      { label: 'Analytics', href: '/app/super-admin/analytics', icon: 'BarChart3' },
      { label: 'Audit Log', href: '/app/super-admin/audit', icon: 'FileText' },
      { label: 'Settings', href: '/app/super-admin/settings', icon: 'Settings' },
    ],
  },
  {
    role: 'instructor',
    label: 'Instructor',
    color: '#66BB6A',
    icon: 'Presentation',
    dashboardRoute: '/app/instructor',
    navItems: [
      { label: 'Dashboard', href: '/app/instructor', icon: 'LayoutDashboard' },
      { label: 'My Courses', href: '/app/instructor/courses', icon: 'BookOpen' },
      { label: 'Sessions', href: '/app/instructor/sessions', icon: 'Video' },
      { label: 'Tasks', href: '/app/instructor/tasks', icon: 'CheckSquare' },
      { label: 'Submissions', href: '/app/instructor/submissions', icon: 'ClipboardCheck' },
      { label: 'Students', href: '/app/instructor/students', icon: 'Users' },
      { label: 'Chat', href: '/app/instructor/chat', icon: 'MessageCircle' },
      { label: 'Calendar', href: '/app/instructor/calendar', icon: 'Calendar' },
      { label: 'Profile', href: '/app/instructor/profile', icon: 'User' },
    ],
  },
  {
    role: 'moderator',
    label: 'Moderator',
    color: '#26C6DA',
    icon: 'ShieldCheck',
    dashboardRoute: '/app/moderator',
    navItems: [
      { label: 'Dashboard', href: '/app/moderator', icon: 'LayoutDashboard' },
      { label: 'Chat Rooms', href: '/app/moderator/chat', icon: 'MessageCircle' },
      { label: 'Community', href: '/app/moderator/community', icon: 'Users' },
      { label: 'Reports', href: '/app/moderator/reports', icon: 'Flag' },
      { label: 'Users', href: '/app/moderator/users', icon: 'Users' },
      { label: 'Fines', href: '/app/moderator/fines', icon: 'AlertTriangle' },
      { label: 'Calendar', href: '/app/moderator/calendar', icon: 'Calendar' },
      { label: 'Profile', href: '/app/moderator/profile', icon: 'User' },
    ],
  },
  {
    role: 'finance',
    label: 'Finance',
    color: '#FFC107',
    icon: 'Banknote',
    dashboardRoute: '/app/finance',
    navItems: [
      { label: 'Dashboard', href: '/app/finance', icon: 'LayoutDashboard' },
      { label: 'Transactions', href: '/app/finance/transactions', icon: 'ArrowLeftRight' },
      { label: 'Fines', href: '/app/finance/fines', icon: 'AlertTriangle' },
      { label: 'Wallets', href: '/app/finance/wallets', icon: 'Wallet' },
      { label: 'Reports', href: '/app/finance/reports', icon: 'BarChart3' },
      { label: 'Payouts', href: '/app/finance/payouts', icon: 'Send' },
      { label: 'Chat', href: '/app/finance/chat', icon: 'MessageCircle' },
      { label: 'Profile', href: '/app/finance/profile', icon: 'User' },
    ],
  },
  {
    role: 'support',
    label: 'Support',
    color: '#5C6BC0',
    icon: 'HeadphonesIcon',
    dashboardRoute: '/app/support',
    navItems: [
      { label: 'Dashboard', href: '/app/support', icon: 'LayoutDashboard' },
      { label: 'Tickets', href: '/app/support/tickets', icon: 'Ticket' },
      { label: 'Chat', href: '/app/support/chat', icon: 'MessageCircle' },
      { label: 'Knowledge Base', href: '/app/support/kb', icon: 'BookOpen' },
      { label: 'Users', href: '/app/support/users', icon: 'Users' },
      { label: 'Calendar', href: '/app/support/calendar', icon: 'Calendar' },
      { label: 'Profile', href: '/app/support/profile', icon: 'User' },
    ],
  },
  {
    role: 'premium',
    label: 'Premium',
    color: '#FFD700',
    icon: 'Gem',
    dashboardRoute: '/app/premium',
    navItems: [
      { label: 'Dashboard', href: '/app/premium', icon: 'LayoutDashboard' },
      { label: 'Courses', href: '/app/premium/courses', icon: 'BookOpen' },
      { label: 'Tasks', href: '/app/premium/tasks', icon: 'CheckSquare' },
      { label: 'Mentorship', href: '/app/premium/mentorship', icon: 'Lightbulb' },
      { label: 'Chat', href: '/app/premium/chat', icon: 'MessageCircle' },
      { label: 'Community', href: '/app/premium/community', icon: 'Users' },
      { label: 'Wallet', href: '/app/premium/wallet', icon: 'Wallet' },
      { label: 'Leaderboard', href: '/app/premium/leaderboard', icon: 'Trophy' },
      { label: 'Calendar', href: '/app/premium/calendar', icon: 'Calendar' },
      { label: 'Profile', href: '/app/premium/profile', icon: 'User' },
    ],
  },
];

/**
 * Get portal config by role
 */
export function getPortalConfig(role: UserRole): PortalConfig {
  return ROLES.find((r) => r.role === role) || ROLES[0];
}

/**
 * Get nav items for a specific role
 */
export function getNavItems(role: UserRole): NavItem[] {
  const config = getPortalConfig(role);
  return config.navItems;
}

// ============================================
// Wise Quotes (Consistency, Integrity, Discipline)
// ============================================

export const WISE_QUOTES: string[] = [
  'Consistency is what transforms average into excellence.',
  'Integrity is doing the right thing, even when no one is watching. -- C.S. Lewis',
  'Hard work beats talent when talent does not work hard. -- Tim Notke',
  'Accountability breeds response-ability. -- Stephen Covey',
  'Transparency is the currency of trust.',
  'Honesty is the first chapter in the book of wisdom. -- Thomas Jefferson',
  'Discipline is the bridge between goals and accomplishment. -- Jim Rohn',
  'The price of greatness is responsibility. -- Winston Churchill',
  'Success is the sum of small efforts repeated day in and day out. -- Robert Collier',
  'We are what we repeatedly do. Excellence is not an act, but a habit. -- Aristotle',
  'A person who is fundamentally honest does not need a code of ethics.',
  'The secret of your future is hidden in your daily routine. -- Mike Murdock',
  'Trust takes years to build, seconds to break, and forever to repair.',
  'Do not pray for easy lives; pray to be stronger. -- John F. Kennedy',
  'Real integrity is doing the right thing, knowing that nobody is going to know. -- Oprah Winfrey',
  'Without commitment, you will never start. Without consistency, you will never finish.',
  'The only way to do great work is to love what you do. -- Steve Jobs',
  'It is not the strongest that survive, but those most responsive to change. -- Charles Darwin',
  'Success usually comes to those who are too busy to be looking for it. -- Henry David Thoreau',
  'Discipline is choosing between what you want now and what you want most. -- Abraham Lincoln',
  'Accountability is the glue that ties commitment to results. -- Bob Proctor',
  'With integrity you have nothing to fear, since you have nothing to hide. -- Zig Ziglar',
  'Perseverance is not a long race; it is many short races one after the other. -- Walter Elliot',
  'The harder you work for something, the greater you will feel when you achieve it.',
  'Honesty and transparency make you vulnerable. Be honest and transparent anyway. -- Mother Teresa',
  'Small daily improvements are the key to staggering long-term results. -- Robin Sharma',
  'Character is what you do when no one is looking.',
  'He who is not courageous enough to take risks will accomplish nothing. -- Muhammad Ali',
  'Motivation gets you going, but discipline keeps you growing. -- John C. Maxwell',
  'The best time to plant a tree was 20 years ago. The second best time is now. -- Chinese Proverb',
  'Your word is your bond. Let your actions speak louder than your promises.',
  'What you do today can improve all your tomorrows. -- Ralph Marston',
  'Winners embrace hard work. They love the discipline of it.',
  'An investment in knowledge pays the best interest. -- Benjamin Franklin',
  'Hold yourself responsible for a higher standard than anybody else expects of you.',
];

// ============================================
// Sample Data (Demo / Development Mode)
// ============================================

export const SAMPLE_USER: User = {
  id: 'usr_demo_001',
  clerk_id: 'clerk_demo_001',
  email: 'grace.adebayo@example.com',
  name: 'Grace Adebayo',
  role: 'intern',
  avatar_url: null,
  level: 5,
  xp: 2450,
  streak: 12,
  rank: 3,
  performance: 87.5,
  wallet_balance: 15000,
  status: 'active',
  created_at: '2026-01-15T09:00:00Z',
  updated_at: '2026-04-10T14:30:00Z',
  last_seen: '2026-04-10T14:30:00Z',
};

export const SAMPLE_COURSES: Course[] = [
  {
    id: 'crs_001',
    title: 'AI Fundamentals & Prompt Engineering',
    description: 'Master the foundations of artificial intelligence and learn advanced prompt engineering techniques for modern AI tools.',
    instructor_id: 'usr_instructor_001',
    thumbnail_url: null,
    category: 'AI & Machine Learning',
    difficulty: 'beginner',
    duration_hours: 24,
    total_modules: 12,
    total_enrolled: 45,
    status: 'published',
    tags: ['AI', 'Prompt Engineering', 'ChatGPT', 'Claude'],
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-03-15T10:00:00Z',
  },
  {
    id: 'crs_002',
    title: 'Web Development with Next.js & React',
    description: 'Build production-grade web applications using Next.js, React, and modern frontend technologies.',
    instructor_id: 'usr_instructor_002',
    thumbnail_url: null,
    category: 'Web Development',
    difficulty: 'intermediate',
    duration_hours: 40,
    total_modules: 20,
    total_enrolled: 38,
    status: 'published',
    tags: ['Next.js', 'React', 'TypeScript', 'Tailwind'],
    created_at: '2026-01-20T08:00:00Z',
    updated_at: '2026-03-20T10:00:00Z',
  },
  {
    id: 'crs_003',
    title: 'Digital Marketing & Brand Strategy',
    description: 'Learn to create compelling marketing strategies, manage social media campaigns, and build brand presence.',
    instructor_id: 'usr_instructor_003',
    thumbnail_url: null,
    category: 'Marketing',
    difficulty: 'beginner',
    duration_hours: 18,
    total_modules: 9,
    total_enrolled: 52,
    status: 'published',
    tags: ['Marketing', 'Branding', 'Social Media', 'Content'],
    created_at: '2026-02-01T08:00:00Z',
    updated_at: '2026-03-25T10:00:00Z',
  },
  {
    id: 'crs_004',
    title: 'UI/UX Design with Figma',
    description: 'Design beautiful, user-centered interfaces using Figma. From wireframes to high-fidelity prototypes.',
    instructor_id: 'usr_instructor_001',
    thumbnail_url: null,
    category: 'Design',
    difficulty: 'intermediate',
    duration_hours: 30,
    total_modules: 15,
    total_enrolled: 29,
    status: 'published',
    tags: ['UI/UX', 'Figma', 'Design Systems', 'Prototyping'],
    created_at: '2026-02-10T08:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
  },
];

export const SAMPLE_TASKS: Task[] = [
  {
    id: 'tsk_001',
    title: 'Complete AI Prompt Engineering Module 3 Quiz',
    description: 'Take the quiz for Module 3: Advanced Prompt Techniques. You need at least 70% to pass.',
    assigned_to: 'usr_demo_001',
    assigned_by: 'usr_instructor_001',
    course_id: 'crs_001',
    status: 'in_progress',
    priority: 'high',
    due_date: '2026-04-12T23:59:00Z',
    xp_reward: 150,
    submission_url: null,
    feedback: null,
    created_at: '2026-04-08T09:00:00Z',
    updated_at: '2026-04-10T11:00:00Z',
  },
  {
    id: 'tsk_002',
    title: 'Build a Landing Page with Next.js',
    description: 'Create a responsive landing page using Next.js and Tailwind CSS. Include hero section, features, and CTA.',
    assigned_to: 'usr_demo_001',
    assigned_by: 'usr_instructor_002',
    course_id: 'crs_002',
    status: 'pending',
    priority: 'medium',
    due_date: '2026-04-15T23:59:00Z',
    xp_reward: 300,
    submission_url: null,
    feedback: null,
    created_at: '2026-04-09T09:00:00Z',
    updated_at: '2026-04-09T09:00:00Z',
  },
  {
    id: 'tsk_003',
    title: 'Write a Brand Analysis Report',
    description: 'Analyze the brand strategy of a Nigerian tech startup of your choice. Cover positioning, messaging, and recommendations.',
    assigned_to: 'usr_demo_001',
    assigned_by: 'usr_instructor_003',
    course_id: 'crs_003',
    status: 'submitted',
    priority: 'medium',
    due_date: '2026-04-10T23:59:00Z',
    xp_reward: 200,
    submission_url: 'https://docs.google.com/document/d/example',
    feedback: null,
    created_at: '2026-04-05T09:00:00Z',
    updated_at: '2026-04-09T16:00:00Z',
  },
  {
    id: 'tsk_004',
    title: 'Daily Standup Report',
    description: 'Submit your daily standup report: What did you do yesterday? What are you working on today? Any blockers?',
    assigned_to: 'usr_demo_001',
    assigned_by: 'usr_admin_001',
    course_id: null,
    status: 'overdue',
    priority: 'urgent',
    due_date: '2026-04-09T10:00:00Z',
    xp_reward: 50,
    submission_url: null,
    feedback: null,
    created_at: '2026-04-09T07:00:00Z',
    updated_at: '2026-04-09T07:00:00Z',
  },
];

// ============================================
// App Constants
// ============================================

export const APP_NAME = 'CIOS';
export const APP_FULL_NAME = 'COSPRONOS Media AI Internship Operating System';
export const APP_VERSION = '2.0.0';
export const APP_COMPANY = 'Cospronos Media';

export const XP_PER_LEVEL = 500;
export const MAX_LEVEL = 50;
export const STREAK_BONUS_MULTIPLIER = 1.5;

export const FINE_CATEGORIES = [
  { value: 'lateness', label: 'Lateness', icon: 'Clock' },
  { value: 'absence', label: 'Absence', icon: 'UserX' },
  { value: 'misconduct', label: 'Misconduct', icon: 'AlertTriangle' },
  { value: 'missed_deadline', label: 'Missed Deadline', icon: 'CalendarX' },
  { value: 'insubordination', label: 'Insubordination', icon: 'ShieldOff' },
  { value: 'other', label: 'Other', icon: 'MoreHorizontal' },
] as const;

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Low', color: '#66BB6A' },
  { value: 'medium', label: 'Medium', color: '#FFC107' },
  { value: 'high', label: 'High', color: '#FF7043' },
  { value: 'urgent', label: 'Urgent', color: '#EF5350' },
] as const;

export const COURSE_CATEGORIES = [
  'AI & Machine Learning',
  'Web Development',
  'Mobile Development',
  'Design',
  'Marketing',
  'Data Science',
  'Cloud Computing',
  'Cybersecurity',
  'Business',
  'Soft Skills',
] as const;
