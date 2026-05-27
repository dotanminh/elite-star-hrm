'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';

interface LogoutButtonProps {
  className?: string;
  showText?: boolean;
}

export function LogoutButton({ className = '', showText = true }: LogoutButtonProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Force refreshing the page so the middleware runs and redirects to /login
      router.refresh();
      router.push('/login');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className={`flex items-center gap-2 text-sm text-red-600 hover:text-red-800 transition-colors w-full px-4 py-2 rounded-md hover:bg-red-50 text-left ${className}`}
    >
      <LogOut className="h-4 w-4" />
      {showText && <span>Log Out</span>}
    </button>
  );
}
