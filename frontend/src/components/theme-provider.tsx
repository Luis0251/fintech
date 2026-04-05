"use client";

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useThemeStore } from '@/lib/theme-store';

// Hook to safely access theme during SSR and hydration
function useThemeStoreSnapshot() {
  const getSnap = () => useThemeStore.getState();
  return useSyncExternalStore(
    (cb) => {
      useThemeStore.subscribe(cb);
      return () => useThemeStore.subscribe(cb);
    },
    getSnap,
    getSnap
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const state = useThemeStoreSnapshot();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Apply theme immediately on mount - use stored value or default to light
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(state.theme || 'light');
    setMounted(true);
  }, [state.theme]);

  // Prevent flash by hiding content until we can apply the correct theme
  if (!mounted) {
    return (
      <div style={{ visibility: 'hidden', opacity: 0 }}>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
