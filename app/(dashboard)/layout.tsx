import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileProvider, UserProfile } from '@/components/profile-provider';
import { DesktopSidebar } from '@/components/desktop-sidebar';
import { MobileNav } from '@/components/mobile-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogoutButton } from '@/components/logout-button';
import { Toaster } from 'sonner';
import { roleLabels } from '@/lib/i18n/vi';


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
    .select('id, email, first_name, last_name, role, department_id, title_id, phone, status, hire_date, avatar_url')
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
    avatar_url: profile.avatar_url,
  };

  const displayRole = roleLabels[typedProfile.role] || typedProfile.role;

  return (
    <ProfileProvider initialProfile={typedProfile}>
      <Toaster richColors position="top-right" />
      <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
        
        {/* Desktop Left Sidebar (>= 800px) */}
        <DesktopSidebar />


        {/* Desktop & Mobile Main Content Shell */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          
          {/* Mobile Header (< 800px / md screen layout) */}
          <header className="flex md:hidden items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-850 w-full z-40">
            <div className="flex items-center">
              <img src="/logo.png" alt="Elite Star" className="h-10 w-auto object-contain dark:invert-[0.1]" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold px-2 py-0.5 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 rounded-full border border-teal-200 dark:border-teal-900/60 uppercase text-[9px]">
                {displayRole}
              </span>
              <ThemeToggle className="!p-1.5 !rounded-lg" />
              <LogoutButton className="p-1 px-2 text-xs !bg-transparent !w-auto" showText={false} />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pb-20 md:pb-8 bg-slate-50 dark:bg-slate-950">
            <div className="p-4 md:p-8 max-w-7xl w-full mx-auto">
              {children}
            </div>
          </main>

          {/* Mobile Bottom Navigation (< 800px / md screen layout) */}
          <MobileNav role={typedProfile.role} />
        </div>
      </div>
    </ProfileProvider>
  );
}
