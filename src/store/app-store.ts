'use client';

import { create } from 'zustand';
import type { UserRole } from '@/types';

interface AppState {
  // Theme
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Role
  currentRole: UserRole;
  setRole: (role: UserRole) => void;

  // Global loading
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

function getStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function setStoredValue(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable
  }
}

export const useAppStore = create<AppState>((set) => ({
  // Theme
  theme: getStoredValue<'dark' | 'light'>('cios-theme', 'dark'),
  setTheme: (theme) => {
    setStoredValue('cios-theme', theme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    set({ theme });
  },
  toggleTheme: () => {
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      setStoredValue('cios-theme', next);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', next);
      }
      return { theme: next };
    });
  },

  // Sidebar
  sidebarCollapsed: getStoredValue<boolean>('cios-sidebar-collapsed', false),
  toggleSidebar: () => {
    set((state) => {
      const next = !state.sidebarCollapsed;
      setStoredValue('cios-sidebar-collapsed', next);
      return { sidebarCollapsed: next };
    });
  },
  setSidebarCollapsed: (collapsed) => {
    setStoredValue('cios-sidebar-collapsed', collapsed);
    set({ sidebarCollapsed: collapsed });
  },

  // Role
  currentRole: getStoredValue<UserRole>('cios-role', 'intern'),
  setRole: (role) => {
    setStoredValue('cios-role', role);
    set({ currentRole: role });
  },

  // Loading
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
}));
