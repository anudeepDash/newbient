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
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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

  // On mount: apply initial theme + listen for OS changes and cross-instance theme changes
  useEffect(() => {
    applyTheme(theme);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const osHandler = (e) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      setSystemTheme(newSystemTheme);

      // Only follow system if user hasn't manually overridden
      if (!getSavedTheme()) {
        setThemeState(newSystemTheme);
        applyTheme(newSystemTheme);
      }
    };

    const handleCustomThemeChange = (e) => {
      const newTheme = e.detail?.theme || resolveTheme();
      setThemeState(newTheme);
      applyTheme(newTheme);
    };

    const handleStorage = (e) => {
      if (e.key === THEME_KEY) {
        const newTheme = resolveTheme();
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
    };

    mq.addEventListener('change', osHandler);
    window.addEventListener('nb_theme_change', handleCustomThemeChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      mq.removeEventListener('change', osHandler);
      window.removeEventListener('nb_theme_change', handleCustomThemeChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep <html> class in sync whenever theme state changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  const toggleTheme = useCallback((explicit) => {
    let next;
    if (typeof explicit === 'string') {
        next = explicit;
    } else {
        next = theme === 'dark' ? 'light' : 'dark';
    }
    safeLocalStorage.setItem(THEME_KEY, next);
    setThemeState(next);
    applyTheme(next);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nb_theme_change', { detail: { theme: next } }));
    }
  }, [theme, applyTheme]);

  const clearOverride = useCallback(() => {
    safeLocalStorage.removeItem(THEME_KEY);
    const sys = getSystemTheme();
    setThemeState(sys);
    applyTheme(sys);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nb_theme_change', { detail: { theme: sys } }));
    }
  }, [applyTheme]);

  return {
    theme,
    systemTheme,
    isDark: theme === 'dark',
    isManual: !!getSavedTheme(),
    toggleTheme,
    clearOverride,
  };
}
