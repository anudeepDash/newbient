import { useState, useEffect, useCallback } from 'react';
import { safeLocalStorage } from '../lib/storage';

const THEME_KEY = 'nb_theme';

/**
 * useTheme — manages light/dark theme with system preference detection.
 *
 * Priority: Manual override (localStorage) > System preference > Default dark
 *
 * Returns:
 *   theme        — 'light' | 'dark' (resolved active theme)
 *   systemTheme  — 'light' | 'dark' (what the OS reports)
 *   toggleTheme  — function to flip theme (or set explicitly)
 *   isManual     — whether the user has manually overridden
 *   clearOverride — revert to system preference
 */
export function useTheme() {
  const getSystemTheme = () => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  };

  const getSavedTheme = () => {
    const saved = safeLocalStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return null;
  };

  const resolveTheme = () => {
    return getSavedTheme() || getSystemTheme();
  };

  const [theme, setThemeState] = useState(resolveTheme);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  // Apply the class on <html>
  const applyTheme = useCallback((t) => {
    const root = document.documentElement;
    if (t === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  // On mount: apply initial theme + listen for OS changes
  useEffect(() => {
    applyTheme(theme);

    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e) => {
      const newSystemTheme = e.matches ? 'light' : 'dark';
      setSystemTheme(newSystemTheme);

      // Only follow system if user hasn't manually overridden
      if (!getSavedTheme()) {
        setThemeState(newSystemTheme);
        applyTheme(newSystemTheme);
      }
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep <html> class in sync whenever theme state changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  const toggleTheme = useCallback((explicit) => {
    const next = explicit || (theme === 'dark' ? 'light' : 'dark');
    safeLocalStorage.setItem(THEME_KEY, next);
    setThemeState(next);
  }, [theme]);

  const clearOverride = useCallback(() => {
    safeLocalStorage.removeItem(THEME_KEY);
    const sys = getSystemTheme();
    setThemeState(sys);
  }, []);

  return {
    theme,
    systemTheme,
    isDark: theme === 'dark',
    isManual: !!getSavedTheme(),
    toggleTheme,
    clearOverride,
  };
}
