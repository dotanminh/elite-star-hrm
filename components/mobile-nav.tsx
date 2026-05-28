'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Clock, 
  CalendarRange, 
  ClipboardCheck,
  Calculator
} from 'lucide-react';

interface MobileNavProps {
  role: 'admin' | 'hr' | 'manager' | 'employee';
}

export function MobileNav({ role }: MobileNavProps) {
  const pathname = usePathname();
  const isAdminOrHr = role === 'admin' || role === 'hr';

  // Mobile navigation items (Limit to max 5 items for optimal touch targets)
  const items = [
    { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { href: '/attendance', label: 'Chấm công', icon: Clock },
    { href: '/leave', label: 'Nghỉ phép', icon: CalendarRange },
  ];

  if (isAdminOrHr) {
    items.push(
      { href: '/attendance/manage', label: 'QL Công', icon: ClipboardCheck },
      { href: '/payroll', label: 'Chốt công', icon: Calculator }
    );
  }

  return (
    <nav className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/75 dark:bg-slate-950/75 backdrop-blur-lg border-t border-slate-200/50 dark:border-slate-850/50 z-50 items-center justify-around px-2 shadow-2xl">
      {items.map((item) => {
        const IconComponent = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link 
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300 relative ${
              isActive 
                ? 'text-teal-700 dark:text-teal-400 font-extrabold scale-110' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
          >
            {/* Soft Glowing Active Dot Indicator at the top */}
            {isActive && (
              <span className="absolute top-0.5 w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.6)] animate-pulse" />
            )}

            <IconComponent 
              className={`h-5 w-5 transition-transform duration-300 ${
                isActive 
                  ? 'stroke-[2.5px] text-teal-600 dark:text-teal-400 scale-110 drop-shadow-[0_0_6px_rgba(20,184,166,0.3)]' 
                  : 'stroke-[2px]'
              }`} 
            />
            <span className={`text-[10px] font-bold mt-1 transition-all duration-300 ${isActive ? 'text-teal-700 dark:text-teal-400' : 'text-slate-500'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
