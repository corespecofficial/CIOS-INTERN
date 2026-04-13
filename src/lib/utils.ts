import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { UserRole } from '@/types';

/**
 * Merge Tailwind classes with clsx for conditional class names
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format amount as Nigerian Naira currency
 * formatCurrency(45000) => "₦45,000"
 * formatCurrency(1500.5) => "₦1,501"
 */
export function formatCurrency(amount: number): string {
  return `\u20A6${Math.round(amount).toLocaleString('en-NG')}`;
}

/**
 * Format a date as relative time string
 * "2m ago", "1h ago", "3d ago", "2w ago", "Just now"
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 30) return 'Just now';
  if (diffMin < 1) return `${diffSec}s ago`;
  if (diffHour < 1) return `${diffMin}m ago`;
  if (diffDay < 1) return `${diffHour}h ago`;
  if (diffWeek < 1) return `${diffDay}d ago`;
  if (diffMonth < 1) return `${diffWeek}w ago`;
  if (diffYear < 1) return `${diffMonth}mo ago`;
  return `${diffYear}y ago`;
}

/**
 * Get initials from a full name
 * getInitials("Grace Adebayo") => "GA"
 * getInitials("John") => "JO"
 */
export function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Get a gradient string by index (cycles through predefined gradients)
 */
export function getGradient(index: number): string {
  const gradients = [
    'linear-gradient(135deg, #1E88E5, #1565C0)',
    'linear-gradient(135deg, #AB47BC, #7B1FA2)',
    'linear-gradient(135deg, #66BB6A, #388E3C)',
    'linear-gradient(135deg, #FFC107, #F57F17)',
    'linear-gradient(135deg, #FF7043, #D84315)',
    'linear-gradient(135deg, #EF5350, #C62828)',
    'linear-gradient(135deg, #26C6DA, #00838F)',
    'linear-gradient(135deg, #5C6BC0, #283593)',
    'linear-gradient(135deg, #EC407A, #AD1457)',
    'linear-gradient(135deg, #8D6E63, #4E342E)',
  ];
  return gradients[index % gradients.length];
}

/**
 * Get the theme color for a given role
 */
export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    intern: '#1E88E5',
    team_lead: '#AB47BC',
    admin: '#EF5350',
    super_admin: '#FF7043',
    instructor: '#66BB6A',
    moderator: '#26C6DA',
    finance: '#FFC107',
    support: '#5C6BC0',
    premium: '#FFD700',
  };
  return colors[role] || '#1E88E5';
}

/**
 * Get the display label for a role
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    intern: 'Intern',
    team_lead: 'Team Lead',
    admin: 'Admin',
    super_admin: 'Super Admin',
    instructor: 'Instructor',
    moderator: 'Moderator',
    finance: 'Finance',
    support: 'Support',
    premium: 'Premium',
  };
  return labels[role] || 'Unknown';
}

/**
 * Truncate a string to the specified length with ellipsis
 */
export function truncate(str: string, len: number): string {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.substring(0, len).trimEnd() + '...';
}

/**
 * Format a date as a readable string
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

/**
 * Calculate percentage, clamped between 0 and 100
 */
export function calcPercent(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

/**
 * Delay utility for async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
