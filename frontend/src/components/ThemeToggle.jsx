import { useMemo } from 'react';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle({ className = '' }) {
  const { theme, setTheme } = useTheme();

  const next = useMemo(() => {
    if (theme === 'light') return 'dark';
    if (theme === 'dark') return 'system';
    return 'light';
  }, [theme]);

  const label = useMemo(() => {
    if (theme === 'light') return 'Light';
    if (theme === 'dark') return 'Dark';
    return 'System';
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={`Theme: ${label} (click to switch)`}
      className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700 transition-colors ${className}`}
    >
      <span className="mr-2 h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-300" />
      {label}
    </button>
  );
}


