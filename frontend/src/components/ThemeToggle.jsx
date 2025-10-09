import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle({ className = '' }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
      className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700 transition-colors ${className}`}
    >
      <span className={`mr-2 h-2 w-2 rounded-full ${isDark ? 'bg-slate-300' : 'bg-slate-500'}`} />
      {isDark ? 'Dark' : 'Light'}
    </button>
  );
}


