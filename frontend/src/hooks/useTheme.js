import { useEffect, useState, useCallback } from 'react';

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem('theme') || 'system';
    } catch (_) {
      return 'system';
    }
  });

  const applyTheme = useCallback((nextTheme) => {
    const root = document.documentElement;
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldDark = nextTheme === 'dark' || (nextTheme === 'system' && systemDark);
    root.classList.toggle('dark', shouldDark);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    try {
      if (theme === 'system') {
        localStorage.removeItem('theme');
      } else {
        localStorage.setItem('theme', theme);
      }
    } catch (_) {}
  }, [theme, applyTheme]);

  // Keep in sync with system changes if on system mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (theme === 'system') applyTheme('system');
    };
    media.addEventListener?.('change', listener);
    return () => media.removeEventListener?.('change', listener);
  }, [theme, applyTheme]);

  const setTheme = useCallback((next) => setThemeState(next), []);

  return { theme, setTheme };
}


