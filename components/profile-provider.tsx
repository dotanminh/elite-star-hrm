'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export type UserRole = 'admin' | 'hr' | 'manager' | 'employee';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  department_id: string | null;
  title_id: string | null;
  phone: string | null;
  status: 'active' | 'suspended' | 'terminated';
  hire_date: string;
}

interface ProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({
  children,
  initialProfile,
}: {
  children: React.ReactNode;
  initialProfile: UserProfile | null;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [loading, setLoading] = useState(!initialProfile);
  const supabase = createClient();

  const refreshProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        return;
      }

      const { data: prof, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, department_id, title_id, phone, status, hire_date')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(prof as UserProfile);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialProfile) {
      refreshProfile();
    } else {
      setProfile(initialProfile);
      setLoading(false);
    }
  }, [initialProfile]);

  return (
    <ProfileContext.Provider value={{ profile, loading, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
