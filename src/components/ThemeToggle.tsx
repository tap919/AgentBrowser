'use client';

import { useState, useCallback } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('agentbrowser-theme');
      if (saved === 'light') {
        document.documentElement.classList.remove('dark');
        return false;
      }
      document.documentElement.classList.add('dark');
      return true;
    }
    return true;
  });

  const toggle = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('agentbrowser-theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  return (
    <button
      onClick={toggle}
      className="relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 hover:scale-105 active:scale-95"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, oklch(0.25 0.04 280), oklch(0.2 0.03 260))'
          : 'linear-gradient(135deg, oklch(0.85 0.08 80), oklch(0.9 0.06 60))',
      }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span
        className={`absolute top-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 text-xs ${
          isDark
            ? 'left-[calc(100%-1.625rem)] text-yellow-300'
            : 'left-0.5 text-amber-500'
        }`}
        style={{ background: isDark ? 'oklch(0.25 0.04 280)' : 'white' }}
      >
        <i className={`fa-solid ${isDark ? 'fa-moon' : 'fa-sun'}`} />
      </span>
    </button>
  );
}
