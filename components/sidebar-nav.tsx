'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  LayoutDashboard, 
  Users, 
  CalendarRange, 
  Clock, 
  History, 
  ClipboardCheck,
  Calculator
} from 'lucide-react';

interface SidebarNavProps {
  role: 'admin' | 'hr' | 'manager' | 'employee';
  isCollapsed?: boolean;
}

export function SidebarNav({ role, isCollapsed = false }: SidebarNavProps) {
  const pathname = usePathname();
  const isAdminOrHr = role === 'admin' || role === 'hr';

  // Dynamic statistics state
  const [pendingLeaves, setPendingLeaves] = useState<number>(0);
  const [activeStaff, setActiveStaff] = useState<number>(0);
  const [onlinePulse, setOnlinePulse] = useState<boolean>(true);

  // Fetch dynamic statistics from database
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const supabase = createClient();

        // 1. Pending leave requests count (RLS limits this to own for employee, all for Admin/HR)
        const { count: leaveCount, error: leaveErr } = await supabase
          .from('leave_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        
        if (!leaveErr && leaveCount !== null) {
          setPendingLeaves(leaveCount);
        }

        // 2. Active employees count (for Admin, HR, Manager)
        if (role === 'admin' || role === 'hr' || role === 'manager') {
          const { count: activeCount, error: activeErr } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
          
          if (!activeErr && activeCount !== null) {
            setActiveStaff(activeCount);
          }
        }
      } catch (err) {
        console.error('Error fetching sidebar badges:', err);
      }
    };

    fetchStats();
    // Poll stats every 30 seconds for live updates
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [role]);

  // Group 1: Cá Nhân (Visible to all)
  const personalItems = [
    { 
      href: '/dashboard', 
      label: 'Tổng quan', 
      icon: LayoutDashboard,
      badge: null
    },
    { 
      href: '/attendance', 
      label: 'Chấm công', 
      icon: Clock,
      badge: onlinePulse ? (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      ) : null
    },
    { 
      href: '/leave', 
      label: 'Nghỉ phép', 
      icon: CalendarRange,
      badge: pendingLeaves > 0 && role === 'employee' ? (
        <span className="px-2 py-0.5 text-[10px] font-black bg-amber-500 text-white rounded-full leading-none animate-pulse-amber">
          {pendingLeaves}
        </span>
      ) : null
    },
  ];

  // Group 2: Quản Trị (Visible to Admin, HR)
  const adminItems = [
    { 
      href: '/employees', 
      label: 'Nhân viên', 
      icon: Users,
      badge: activeStaff > 0 ? (
        <span className="px-2 py-0.5 text-[10px] font-black bg-teal-500 dark:bg-teal-650 text-white rounded-full leading-none">
          {activeStaff}
        </span>
      ) : null
    },
    { 
      href: '/attendance/manage', 
      label: 'Quản lý Chấm công', 
      icon: ClipboardCheck,
      badge: pendingLeaves > 0 && isAdminOrHr ? (
        <span className="px-2 py-0.5 text-[10px] font-black bg-amber-500 text-white rounded-full leading-none animate-pulse-amber">
          {pendingLeaves}
        </span>
      ) : null
    },
    { 
      href: '/payroll', 
      label: 'Chốt công & Lương', 
      icon: Calculator,
      badge: null
    },
    { 
      href: '/audit-logs', 
      label: 'Nhật ký hệ thống', 
      icon: History,
      badge: null
    },
  ];

  const renderNavList = (items: typeof personalItems) => {
    return items.map((item) => {
      const IconComponent = item.icon;
      const isActive = pathname === item.href;
      
      return (
        <Link 
          key={item.href}
          href={item.href}
          className={`group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-300 text-sm font-semibold relative overflow-visible ${
            isActive 
              ? 'bg-gradient-to-r from-teal-600 to-teal-500 dark:from-teal-600 dark:to-emerald-500 text-white shadow-md shadow-teal-500/20 font-bold border-l-[3px] border-lime-400 dark:border-lime-400 pl-[9px]' 
              : 'text-slate-600 dark:text-slate-400 glass-menu-item-light dark:glass-menu-item-dark hover:translate-x-1'
          } ${isCollapsed ? 'justify-center px-0 w-11 h-11 mx-auto' : 'w-full'}`}
        >
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <IconComponent className={`h-5 w-5 transition-transform duration-300 ${
              isActive 
                ? 'text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' 
                : 'text-slate-400 dark:text-slate-500 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:scale-110'
            }`} />
            
            {!isCollapsed && (
              <span className="transition-opacity duration-300 opacity-100 whitespace-nowrap">{item.label}</span>
            )}
          </div>

          {/* Dynamic Badge */}
          {!isCollapsed && item.badge && (
            <div className="flex items-center ml-2 transition-all duration-300">
              {item.badge}
            </div>
          )}

          {/* Hover Tooltip when Collapsed */}
          {isCollapsed && (
            <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900/90 text-white dark:bg-white/95 dark:text-slate-950 text-xs font-bold rounded-lg shadow-xl opacity-0 translate-x-[-10px] pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-350 z-50 whitespace-nowrap border border-slate-800 dark:border-slate-200/50 backdrop-blur-md">
              <div className="flex items-center space-x-2">
                <span>{item.label}</span>
                {item.badge && <span className="inline-block scale-90">{item.badge}</span>}
              </div>
            </div>
          )}
        </Link>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Category 1: Cá Nhân */}
      <div className="space-y-2">
        {!isCollapsed ? (
          <div className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 transition-opacity duration-300">
            Cá nhân
          </div>
        ) : (
          <div className="w-8 h-[1px] bg-slate-200 dark:bg-slate-800 mx-auto mb-3" />
        )}
        <div className="space-y-1.5 flex flex-col">
          {renderNavList(personalItems)}
        </div>
      </div>

      {/* Category 2: Quản Trị */}
      {isAdminOrHr && (
        <div className={`space-y-2 pt-4 border-t border-slate-100 dark:border-slate-850/50`}>
          {!isCollapsed ? (
            <div className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 transition-opacity duration-300">
              Quản trị
            </div>
          ) : (
            <div className="w-8 h-[1px] bg-slate-200 dark:bg-slate-800 mx-auto my-3" />
          )}
          <div className="space-y-1.5 flex flex-col">
            {renderNavList(adminItems)}
          </div>
        </div>
      )}
    </div>
  );
}
