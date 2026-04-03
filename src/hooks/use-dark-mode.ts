import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'garden-plotter-dark-mode';

function getInitialMode(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === 'true';
  } catch {}
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(getInitialMode);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY, String(isDark));
    } catch {}
  }, [isDark]);

  const toggle = useCallback(() => setIsDark((d) => !d), []);

  return { isDark, toggle };
}
