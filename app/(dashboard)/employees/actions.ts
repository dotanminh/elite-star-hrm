'use server';

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Helper to create a standalone, non-cookie-persistent Supabase client
function createStandaloneClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

// Helper to create a cookie-based Supabase client using @supabase/ssr in actions
function createCookieClient() {
  const cookieStore = cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set(name, value, { ...options, secure: process.env.NODE_ENV === 'production' });
      },
      remove(name: string, options: any) {
        cookieStore.set(name, '', { ...options, maxAge: 0, secure: process.env.NODE_ENV === 'production' });
      },
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, { ...options, secure: process.env.NODE_ENV === 'production' })
        );
      },
    },
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
    },
  });
}

export async function createEmployeeAction(data: {
  fullName: string;
  phone: string;
  role: string;
  departmentId: string;
  titleId: string;
  status: string;
  hireDate: string;
  employeeCode?: string;
  gender?: string;
  educationLevel?: string;
  address?: string;
  hometown?: string;
  biography?: string;
  actorId: string;
}) {
  try {
    const standaloneClient = createStandaloneClient();
    const cookieClient = createCookieClient();

    // Auto-generate employee_code if not provided
    let finalEmployeeCode = data.employeeCode;
    if (!finalEmployeeCode) {
      const { data: latestProfile } = await cookieClient
        .from('profiles')
        .select('employee_code')
        .ilike('employee_code', 'ES%')
        .order('employee_code', { ascending: false })
        .limit(1)
        .single();
      
      let nextNumber = 1;
      if (latestProfile && latestProfile.employee_code) {
        const numPart = parseInt(latestProfile.employee_code.replace('ES', ''), 10);
        if (!isNaN(numPart)) {
          nextNumber = numPart + 1;
        }
      }
      finalEmployeeCode = `ES${nextNumber.toString().padStart(3, '0')}`;
    }

    // Split Full Name into First and Last Name
    const nameParts = data.fullName.trim().split(' ');
    const firstName = nameParts.pop() || '';
    const lastName = nameParts.join(' ');

    // Auto-generate email
    const finalEmail = `${finalEmployeeCode.toLowerCase()}@elitestar.local`;

    // 1. Sign up the user in Auth using standalone client (doesn't modify cookies)
    const { data: authData, error: authError } = await standaloneClient.auth.signUp({
      email: finalEmail,
      password: '123456', // Default temporary password
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: data.role,
          phone: data.phone,
          hire_date: data.hireDate
        }
      }
    });

    if (authError) throw authError;

    const newUserId = authData.user?.id;
    if (!newUserId) throw new Error('Không nhận được ID từ hệ thống Auth');

    // 2. Associate department and title (runs with cookie client as current actor's session)
    const { error: profileError } = await cookieClient
      .from('profiles')
      .update({
        department_id: data.departmentId || null,
        title_id: data.titleId || null,
        employee_code: finalEmployeeCode,
        gender: data.gender || null,
        education_level: data.educationLevel || null,
        address: data.address || null,
        hometown: data.hometown || null,
        biography: data.biography || null,
      })
      .eq('id', newUserId);

    if (profileError) throw profileError;

    // 3. Write record into Audit Logs
    const { error: auditError } = await cookieClient
      .from('audit_logs')
      .insert({
        actor_id: data.actorId,
        action: 'create_employee',
        table_name: 'profiles',
        record_id: newUserId,
        new_values: {
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          role: data.role,
          phone: data.phone,
          department_id: data.departmentId || null,
          title_id: data.titleId || null,
          status: data.status,
          hire_date: data.hireDate,
          employee_code: finalEmployeeCode,
          gender: data.gender || null,
          education_level: data.educationLevel || null,
          address: data.address || null,
          hometown: data.hometown || null,
          biography: data.biography || null,
        }
      });

    if (auditError) throw auditError;

    return { success: true, userId: newUserId };
  } catch (err: any) {
    console.error('Error in createEmployeeAction:', err);
    return { success: false, error: err.message || 'Đã xảy ra lỗi khi tạo nhân viên' };
  }
}

export async function deleteEmployeeAction(employeeId: string, actorId: string) {
  try {
    const cookieClient = createCookieClient();

    // Log the deletion action before deleting
    await cookieClient
      .from('audit_logs')
      .insert({
        actor_id: actorId,
        action: 'delete_employee',
        table_name: 'profiles',
        record_id: employeeId
      });

    // We can only delete from profiles if RLS permits. 
    const { error: deleteError } = await cookieClient
      .from('profiles')
      .delete()
      .eq('id', employeeId);

    if (deleteError) throw deleteError;

    return { success: true };
  } catch (err: any) {
    console.error('Error in deleteEmployeeAction:', err);
    return { success: false, error: err.message || 'Đã xảy ra lỗi khi xóa nhân viên' };
  }
}
