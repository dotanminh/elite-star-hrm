import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ProfileProvider, UserProfile } from '@/components/profile-provider';
import { LogoutButton } from '@/components/logout-button';
import { Toaster } from 'sonner';
import { nav as navText, roleLabels } from '@/lib/i18n/vi';
import { 
  LayoutDashboard, 
  Users, 
  CalendarRange, 
  Clock, 
  History, 
  UserCircle,
  ClipboardCheck,
  Calculator
} from 'lucide-react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  
  // Get active session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Retrieve matching profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role, department_id, title_id, phone, status, hire_date')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    // Session is invalid or profile missing, sign out and redirect
    await supabase.auth.signOut();
    redirect('/login');
  }

  const typedProfile: UserProfile = {
    id: profile.id,
    email: profile.email,
    first_name: profile.first_name,
    last_name: profile.last_name,
    role: profile.role as 'admin' | 'hr' | 'manager' | 'employee',
    department_id: profile.department_id,
    title_id: profile.title_id,
    phone: profile.phone,
    status: profile.status as 'active' | 'suspended' | 'terminated',
    hire_date: profile.hire_date,
  };

  const navItems = [
    { href: '/dashboard', label: navText.overview, icon: LayoutDashboard },
    { href: '/employees', label: navText.employees, icon: Users },
    { href: '/leave', label: navText.leaveRequests, icon: CalendarRange },
    { href: '/attendance', label: navText.attendance, icon: Clock },
  ];

  const hasAuditAccess = typedProfile.role === 'admin' || typedProfile.role === 'hr';
  const displayRole = roleLabels[typedProfile.role] || typedProfile.role;

  return (
    <ProfileProvider initialProfile={typedProfile}>
      <Toaster richColors position="top-right" />
      <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden">
        
        {/* Desktop Left Sidebar (>= 800px) */}
        <aside className="hidden md:flex md:w-64 border-r border-slate-200 bg-white flex-col justify-between">
          <div className="flex-1 py-6 px-4">
            <div className="flex flex-col items-center justify-center mb-6 mt-2 px-2">
              <img src="/logo.png" alt="Elite Star" className="w-[160px] h-auto object-contain drop-shadow-sm hover:scale-105 transition-transform duration-300" />
              <span className="text-[11px] text-teal-700 font-bold tracking-widest uppercase mt-3">{navText.brandSubtitle}</span>
            </div>
            
            <nav className="space-y-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link 
                    key={item.href}
                    href={item.href}
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors font-medium text-sm"
                  >
                    <IconComponent className="h-4 w-4 text-slate-500" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {hasAuditAccess && (
                <>
                  <Link 
                    href="/attendance/manage"
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors font-medium text-sm"
                  >
                    <ClipboardCheck className="h-4 w-4 text-slate-500" />
                    <span>Quản lý Chấm công</span>
                  </Link>
                  <Link 
                    href="/payroll"
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors font-medium text-sm"
                  >
                    <Calculator className="h-4 w-4 text-slate-500" />
                    <span>Chốt công</span>
                  </Link>
                  <Link 
                    href="/audit-logs"
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors font-medium text-sm"
                  >
                    <History className="h-4 w-4 text-slate-500" />
                    <span>{navText.auditLogs}</span>
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Desktop Sidebar Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-4">
            <div className="flex items-center space-x-3 px-2 py-1">
              <UserCircle className="h-9 w-9 text-slate-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {typedProfile.first_name} {typedProfile.last_name}
                </p>
                <p className="text-[10px] text-teal-700 font-bold uppercase tracking-wider">
                  {displayRole}
                </p>
              </div>
            </div>
            
            <LogoutButton />
          </div>
        </aside>

        {/* Desktop & Mobile Main Content Shell */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          
          {/* Mobile Header (< 800px / md screen layout) */}
          <header className="flex md:hidden items-center justify-between px-4 py-3 bg-white border-b border-slate-200 w-full z-40">
            <div className="flex items-center">
              <img src="/logo.png" alt="Elite Star" className="h-10 w-auto object-contain" />
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs font-semibold px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full border border-teal-200 uppercase text-[10px]">
                {displayRole}
              </span>
              <LogoutButton className="p-1 px-2 text-xs !bg-transparent !w-auto" showText={false} />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pb-20 md:pb-8 bg-slate-50">
            <div className="p-4 md:p-8 max-w-7xl w-full mx-auto">
              {children}
            </div>
          </main>

          {/* Mobile Bottom Navigation (< 800px / md screen layout) */}
          <nav className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-50 items-center justify-around px-2">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link 
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center flex-1 py-1 text-slate-600 hover:text-teal-700 transition-colors"
                >
                  <IconComponent className="h-5 w-5" />
                  <span className="text-[10px] font-medium mt-1">{item.label}</span>
                </Link>
              );
            })}
            {hasAuditAccess && (
              <>
                <Link 
                  href="/attendance/manage"
                  className="flex flex-col items-center justify-center flex-1 py-1 text-slate-600 hover:text-teal-700 transition-colors"
                >
                  <ClipboardCheck className="h-5 w-5" />
                  <span className="text-[10px] font-medium mt-1">QL Chấm công</span>
                </Link>
                <Link 
                  href="/payroll"
                  className="flex flex-col items-center justify-center flex-1 py-1 text-slate-600 hover:text-teal-700 transition-colors"
                >
                  <Calculator className="h-5 w-5" />
                  <span className="text-[10px] font-medium mt-1">Chốt công</span>
                </Link>
                <Link 
                  href="/audit-logs"
                  className="flex flex-col items-center justify-center flex-1 py-1 text-slate-600 hover:text-teal-700 transition-colors"
                >
                  <History className="h-5 w-5" />
                  <span className="text-[10px] font-medium mt-1">{navText.auditLogs}</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </ProfileProvider>
  );
}
