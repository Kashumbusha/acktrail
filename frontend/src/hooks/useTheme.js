import { useEffect, useState, useCallback } from 'react';

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem('theme') || 'light';
    } catch (_) {
      return 'light';
    }
  });

  const applyTheme = useCallback((nextTheme) => {
    const root = document.documentElement;
    const shouldDark = nextTheme === 'dark';
    root.classList.toggle('dark', shouldDark);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem('theme', theme);
    } catch (_) {}
  }, [theme, applyTheme]);

  const setTheme = useCallback((next) => setThemeState(next), []);

  return { theme, setTheme };
}


