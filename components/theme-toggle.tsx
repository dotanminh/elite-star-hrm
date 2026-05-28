'use client';

import React from 'react';
import { useTheme } from './theme-provider';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center justify-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-teal-400 transition-all duration-300 shadow-sm hover:scale-105 active:scale-95 ${className}`}
      title={theme === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}
      aria-label="Toggle Theme"
    >
      {theme === 'light' ? (
        <Moon className="h-4.5 w-4.5 transition-transform duration-300 rotate-0 hover:rotate-12" />
      ) : (
        <Sun className="h-4.5 w-4.5 text-teal-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
      )}
    </button>
  );
}
