"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  icon: string;
  color: string;
  read: boolean;
}

interface NotificationsState {
  notifications: Notification[];
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  addNotification: (n: Omit<Notification, "id" | "read">) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const INITIAL: Notification[] = [
  { id: "n1", title: "Fine Issued — ₦500", message: "Missed morning standup. Due by Friday.", time: "2 min ago", icon: "⚠️", color: "#EF5350", read: false },
  { id: "n2", title: "+150 XP Earned", message: "Completed UI/UX assignment with excellent feedback.", time: "1 hour ago", icon: "⚡", color: "#FFC107", read: false },
  { id: "n3", title: "Live Class Starting", message: "AI Fundamentals class begins in 15 minutes.", time: "30 min ago", icon: "🎓", color: "#1E88E5", read: false },
  { id: "n4", title: "Badge Unlocked: Consistency", message: "You maintained a 14-day streak. Keep it up!", time: "3 hours ago", icon: "🏆", color: "#AB47BC", read: false },
  { id: "n5", title: "New Message from Joshua", message: "Great work on the brand identity project!", time: "5 hours ago", icon: "💬", color: "#1E88E5", read: true },
  { id: "n6", title: "Task Assigned", message: "Review brand identity drafts from Chukwuemeka.", time: "Yesterday", icon: "📋", color: "#66BB6A", read: true },
  { id: "n7", title: "Promotion Milestone", message: "You are 72% ready for Team Lead promotion.", time: "2 days ago", icon: "📈", color: "#FF7043", read: true },
];

export const useNotifications = create<NotificationsState>()(
  persist(
    (set) => ({
      notifications: INITIAL,
      markAsRead: (id) =>
        set((s) => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) })),
      markAllRead: () =>
        set((s) => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) })),
      addNotification: (n) =>
        set((s) => ({
          notifications: [
            { ...n, id: `n${Date.now()}`, read: false },
            ...s.notifications,
          ],
        })),
      removeNotification: (id) =>
        set((s) => ({ notifications: s.notifications.filter(n => n.id !== id) })),
      clearAll: () => set({ notifications: [] }),
    }),
    { name: "cios-notifications" }
  )
);

export const useUnreadCount = () =>
  useNotifications((s) => s.notifications.filter(n => !n.read).length);
