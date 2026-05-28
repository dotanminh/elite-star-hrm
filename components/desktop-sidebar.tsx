'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useProfile } from './profile-provider';
import { SidebarNav } from './sidebar-nav';
import { ThemeToggle } from './theme-toggle';
import { LogoutButton } from './logout-button';
import { roleLabels } from '@/lib/i18n/vi';
import { UserCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export function DesktopSidebar() {
  const { profile } = useProfile();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // Sync state with localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') {
      setIsCollapsed(true);
    }
    setMounted(true);
  }, []);

  const handleToggle = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sidebar-collapsed', String(nextState));
  };

  if (!profile) return null;

  const displayRole = roleLabels[profile.role] || profile.role;

  return (
    <aside 
      className={`relative hidden md:flex flex-col justify-between border-r border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900/60 transition-all duration-300 ease-in-out z-30 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Dynamic Toggle Button - Sports Style round floating badge */}
      {mounted && (
        <button
          onClick={handleToggle}
          className="absolute top-1/2 -right-3 -translate-y-1/2 h-6 w-6 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-center cursor-pointer hover:bg-teal-50 dark:hover:bg-slate-800 hover:scale-110 active:scale-95 transition-all duration-300 z-50 text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 group"
          title={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-[0.5px] transition-transform" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 group-hover:translate-x-[-0.5px] transition-transform" />
          )}
        </button>
      )}

      {/* Main Sidebar Top Area */}
      <div className="flex-1 py-6 px-4 overflow-y-auto overflow-x-hidden no-scrollbar">
        {/* Brand/Logo Area */}
        <div className={`flex flex-col items-center justify-center transition-all duration-300 ${isCollapsed ? 'mb-8 mt-1' : 'mb-6 mt-2 px-2'}`}>
          {isCollapsed ? (
            <Link 
              href="/dashboard" 
              className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-teal-600 to-teal-500 dark:from-teal-600 dark:to-emerald-500 text-white font-black text-lg shadow-md shadow-teal-500/30 animate-pulse-teal border border-lime-400/20 hover:scale-105 transition-transform duration-300"
            >
              ES
            </Link>
          ) : (
            <>
              <img 
                src="/logo.png" 
                alt="Elite Star" 
                className="w-[160px] h-auto object-contain drop-shadow-sm hover:scale-105 transition-transform duration-300 dark:invert-[0.1]" 
              />
              <span className="text-[11px] text-teal-700 dark:text-teal-400 font-black tracking-widest uppercase mt-3 whitespace-nowrap">
                HỆ THỐNG ELITE STAR HRM
              </span>
            </>
          )}
        </div>
        
        {/* Nav list */}
        <div className="mt-4">
          <SidebarNav role={profile.role} isCollapsed={isCollapsed} />
        </div>
      </div>

      {/* Desktop Sidebar Footer & Profile Card */}
      <div 
        className={`p-4 border-t border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 space-y-4 backdrop-blur-sm transition-all duration-300 ${
          isCollapsed ? 'px-2 py-4' : 'p-4'
        }`}
      >
        <div className={`flex items-center justify-between ${isCollapsed ? 'flex-col space-y-3' : 'space-x-3'} min-w-0`}>
          <div className={`flex items-center ${isCollapsed ? 'flex-col space-y-1.5' : 'space-x-3'} min-w-0`}>
            {profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Avatar" 
                className="h-9 w-9 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
              />
            ) : (
              <UserCircle className="h-9 w-9 text-slate-400 dark:text-slate-500" />
            )}
            
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {profile.first_name} {profile.last_name}
                </p>
                <p className="text-[10px] text-teal-700 dark:text-teal-400 font-bold uppercase tracking-wider">
                  {displayRole}
                </p>
              </div>
            )}
          </div>
          
          <ThemeToggle className={isCollapsed ? "!p-1.5 !rounded-lg" : "!p-1.5"} />
        </div>
        
        <LogoutButton 
          showText={!isCollapsed} 
          className={isCollapsed ? "!px-0 !justify-center hover:!bg-red-50/10" : "hover:!bg-red-50/80 dark:hover:!bg-red-950/20"} 
        />
      </div>
    </aside>
  );
}
