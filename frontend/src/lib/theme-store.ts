"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeStore {
  theme: Theme;
  initialized: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      initialized: false,
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light',
        initialized: true 
      })),
      setTheme: (theme) => set({ theme, initialized: true }),
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Mark as initialized after rehydration
        if (state) {
          state.initialized = true;
        }
      },
    }
  )
);

export function useTheme() {
  const { theme, initialized, toggleTheme, setTheme } = useThemeStore();
  return { theme: initialized ? theme : 'light', toggleTheme, setTheme, initialized };
}
