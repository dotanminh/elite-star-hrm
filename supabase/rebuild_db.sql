-- Elite Star HRM - Complete Clean Rebuild Schema
-- Standard Hyphens (-) and Commas are used. No Em-Dashes.
-- Generated based on sếp Minh Đỗ's custom SQL schema and trigger rules.

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- =========================================
-- 1. CLEAN UP PREVIOUS ENTITIES IF THEY EXIST
-- =========================================
drop trigger if exists on_profile_update on public.profiles;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_auth_user_sync() cascade;
drop function if exists public.secure_profile_update() cascade;
drop function if exists public.get_user_role(uuid) cascade;
drop function if exists public.get_user_department(uuid) cascade;

drop table if exists public.audit_logs cascade;
drop table if exists public.attendance_logs cascade;
drop table if exists public.leave_requests cascade;
drop table if exists public.disciplinary_records cascade;
drop table if exists public.payslips cascade;
drop table if exists public.profiles cascade;
drop table if exists public.titles cascade;
drop table if exists public.departments cascade;

-- Clean up storage policies on shared storage.objects table
drop policy if exists "Avatar images are publicly accessible." on storage.objects;
drop policy if exists "Admin and HR can upload avatars" on storage.objects;
drop policy if exists "Admin and HR can update avatars" on storage.objects;
drop policy if exists "Admin and HR can delete avatars" on storage.objects;

-- delete existing identities for admin if they exist
delete from auth.identities where user_id = '00000000-0000-0000-0000-000000000001';
delete from auth.users where id = '00000000-0000-0000-0000-000000000001';

-- =========================================
-- 2. CREATE CORE SCHEMA TABLES
-- =========================================

-- Departments Table
create table public.departments (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Titles (Chức danh) Table
create table public.titles (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  department_id uuid references public.departments(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Profiles Table (1:1 with auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  first_name text not null,
  last_name text not null,
  department_id uuid references public.departments(id) on delete set null,
  title_id uuid references public.titles(id) on delete set null,
  role text not null check (role in ('admin', 'hr', 'manager', 'employee')) default 'employee',
  phone text,
  status text not null check (status in ('active', 'suspended', 'terminated')) default 'active',
  hire_date date default current_date not null,
  employee_code text unique,
  avatar_url text,
  gender text check (gender in ('male', 'female', 'other')),
  education_level text,
  address text,
  hometown text,
  biography text,
  basic_salary numeric(12,2) default 0.00 not null,
  allowance numeric(12,2) default 0.00 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Leave Requests Table
create table public.leave_requests (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references public.profiles(id) on delete cascade not null,
  leave_type text not null check (leave_type in ('annual', 'sick', 'unpaid', 'maternity', 'other')),
  start_date date not null,
  end_date date not null,
  reason text not null,
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamp with time zone,
  manager_comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint valid_dates check (end_date >= start_date)
);

-- Attendance Logs Table
create table public.attendance_logs (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references public.profiles(id) on delete cascade not null,
  work_date date not null default current_date,
  check_in timestamp with time zone,
  check_out timestamp with time zone,
  check_in_ip text,
  check_out_ip text,
  status text not null check (status in ('present', 'absent', 'late', 'half_day', 'on_leave')) default 'present',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (employee_id, work_date),
  constraint valid_checkout check (check_out is null or check_out >= check_in)
);

-- Disciplinary Records (Kỷ luật) Table
create table public.disciplinary_records (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references public.profiles(id) on delete cascade not null,
  reason text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')) default 'medium',
  record_date date not null default current_date,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Payslips (Phiếu lương) Table
create table public.payslips (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references public.profiles(id) on delete cascade not null,
  period_start date not null,
  period_end date not null,
  standard_days integer not null,
  actual_days numeric(4,1) not null,
  basic_salary numeric(12,2) not null,
  allowance numeric(12,2) not null,
  attendance_bonus numeric(12,2) default 0.00 not null,
  late_deductions numeric(12,2) default 0.00 not null,
  other_bonuses numeric(12,2) default 0.00 not null,
  other_deductions numeric(12,2) default 0.00 not null,
  net_salary numeric(12,2) not null,
  status text not null check (status in ('draft', 'published')) default 'draft',
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_employee_period unique (employee_id, period_start, period_end)
);

-- Audit Logs Table (Immutable insert-only pattern)
create table public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  actor_id uuid references public.profiles(id) on delete restrict not null,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================
-- 3. CREATE INDEXES
-- =========================================
create index idx_profiles_department_id on public.profiles(department_id);
create index idx_profiles_title_id on public.profiles(title_id);
create index idx_titles_department_id on public.titles(department_id);
create index idx_leave_requests_employee_id on public.leave_requests(employee_id);
create index idx_attendance_logs_employee_id on public.attendance_logs(employee_id);
create index idx_attendance_logs_work_date on public.attendance_logs(work_date);
create index idx_disciplines_employee_id on public.disciplinary_records(employee_id);
create index idx_disciplines_date on public.disciplinary_records(record_date);
create index idx_payslips_employee_id on public.payslips(employee_id);
create index idx_payslips_period on public.payslips(period_start, period_end);
create index idx_audit_logs_actor_id on public.audit_logs(actor_id);
create index idx_audit_logs_created_at on public.audit_logs(created_at desc);

-- =========================================
-- 4. ROW LEVEL SECURITY (RLS) & HELPER FUNCTIONS
-- =========================================
alter table public.departments enable row level security;
alter table public.titles enable row level security;
alter table public.profiles enable row level security;
alter table public.leave_requests enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.disciplinary_records enable row level security;
alter table public.payslips enable row level security;
alter table public.audit_logs enable row level security;

-- Helper Functions to prevent RLS recursion loops
create or replace function public.get_user_role(p_user_id uuid)
returns text
security definer
set search_path = public
language plpgsql
as $$
declare
  v_role text;
begin
  select role into v_role from public.profiles where id = p_user_id;
  return coalesce(v_role, 'employee');
end;
$$;

create or replace function public.get_user_department(p_user_id uuid)
returns uuid
security definer
set search_path = public
language plpgsql
as $$
declare
  v_dept_id uuid;
begin
  select department_id into v_dept_id from public.profiles where id = p_user_id;
  return v_dept_id;
end;
$$;

-- RLS Policies
-- Departments Policies
create policy "Allow all authenticated users to read departments"
  on public.departments for select
  to authenticated
  using (true);
create policy "Admins and HR have full control on departments"
  on public.departments for all
  to authenticated
  using (public.get_user_role(auth.uid()) in ('admin', 'hr'))
  with check (public.get_user_role(auth.uid()) in ('admin', 'hr'));

-- Titles Policies
create policy "Allow all authenticated users to read titles"
  on public.titles for select
  to authenticated
  using (true);
create policy "Admins and HR have full control on titles"
  on public.titles for all
  to authenticated
  using (public.get_user_role(auth.uid()) in ('admin', 'hr'))
  with check (public.get_user_role(auth.uid()) in ('admin', 'hr'));

-- Profiles Policies
create policy "Admins and HR have full control on profiles"
  on public.profiles for all
  to authenticated
  using (public.get_user_role(auth.uid()) in ('admin', 'hr'))
  with check (public.get_user_role(auth.uid()) in ('admin', 'hr'));
create policy "Allow users to read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());
create policy "Allow users to update own contact info"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
create policy "Allow managers to read profiles in their department"
  on public.profiles for select
  to authenticated
  using (
    public.get_user_role(auth.uid()) = 'manager' and
    department_id = public.get_user_department(auth.uid())
  );
create policy "Allow managers to update profiles in their department"
  on public.profiles for update
  to authenticated
  using (
    public.get_user_role(auth.uid()) = 'manager' and
    department_id = public.get_user_department(auth.uid())
  )
  with check (
    public.get_user_role(auth.uid()) = 'manager' and
    department_id = public.get_user_department(auth.uid())
  );

-- Leave Requests Policies
create policy "Admins and HR have full control on leave requests"
  on public.leave_requests for all
  to authenticated
  using (public.get_user_role(auth.uid()) in ('admin', 'hr'))
  with check (public.get_user_role(auth.uid()) in ('admin', 'hr'));
create policy "Employees can read own leave requests"
  on public.leave_requests for select
  to authenticated
  using (employee_id = auth.uid());
create policy "Employees can create own leave requests"
  on public.leave_requests for insert
  to authenticated
  with check (employee_id = auth.uid() and status = 'pending');
create policy "Employees can update own pending leave requests"
  on public.leave_requests for update
  to authenticated
  using (employee_id = auth.uid() and status = 'pending')
  with check (employee_id = auth.uid() and status = 'pending');
create policy "Employees can delete own pending leave requests"
  on public.leave_requests for delete
  to authenticated
  using (employee_id = auth.uid() and status = 'pending');
create policy "Managers can view leave requests in their department"
  on public.leave_requests for select
  to authenticated
  using (
    public.get_user_role(auth.uid()) = 'manager' and
    public.get_user_department(employee_id) = public.get_user_department(auth.uid())
  );
create policy "Managers can update leave requests in their department"
  on public.leave_requests for update
  to authenticated
  using (
    public.get_user_role(auth.uid()) = 'manager' and
    public.get_user_department(employee_id) = public.get_user_department(auth.uid())
  )
  with check (
    public.get_user_role(auth.uid()) = 'manager' and
    public.get_user_department(employee_id) = public.get_user_department(auth.uid())
  );

-- Attendance Logs Policies
create policy "Admins and HR have full control on attendance logs"
  on public.attendance_logs for all
  to authenticated
  using (public.get_user_role(auth.uid()) in ('admin', 'hr'))
  with check (public.get_user_role(auth.uid()) in ('admin', 'hr'));
create policy "Employees can read own attendance logs"
  on public.attendance_logs for select
  to authenticated
  using (employee_id = auth.uid());
create policy "Employees can create own attendance logs"
  on public.attendance_logs for insert
  to authenticated
  with check (employee_id = auth.uid());
create policy "Employees can update own attendance logs"
  on public.attendance_logs for update
  to authenticated
  using (employee_id = auth.uid())
  with check (employee_id = auth.uid());
create policy "Managers can read attendance logs in their department"
  on public.attendance_logs for select
  to authenticated
  using (
    public.get_user_role(auth.uid()) = 'manager' and
    public.get_user_department(employee_id) = public.get_user_department(auth.uid())
  );
create policy "Managers can update attendance logs in their department"
  on public.attendance_logs for update
  to authenticated
  using (
    public.get_user_role(auth.uid()) = 'manager' and
    public.get_user_department(employee_id) = public.get_user_department(auth.uid())
  )
  with check (
    public.get_user_role(auth.uid()) = 'manager' and
    public.get_user_department(employee_id) = public.get_user_department(auth.uid())
  );

-- Disciplinary Records Policies
create policy "Admins and HR have full control on disciplinary records"
  on public.disciplinary_records for all
  to authenticated
  using (public.get_user_role(auth.uid()) in ('admin', 'hr'))
  with check (public.get_user_role(auth.uid()) in ('admin', 'hr'));
create policy "Managers can read disciplinary records in their department"
  on public.disciplinary_records for select
  to authenticated
  using (
    public.get_user_role(auth.uid()) = 'manager' and
    public.get_user_department(employee_id) = public.get_user_department(auth.uid())
  );
create policy "Employees can view their own disciplinary records"
  on public.disciplinary_records for select
  to authenticated
  using (employee_id = auth.uid());

-- Payslips Policies
create policy "Admins and HR have full control on payslips"
  on public.payslips for all
  to authenticated
  using (public.get_user_role(auth.uid()) in ('admin', 'hr'))
  with check (public.get_user_role(auth.uid()) in ('admin', 'hr'));
create policy "Employees can read their own published payslips"
  on public.payslips for select
  to authenticated
  using (employee_id = auth.uid() and status = 'published');

-- Audit Logs Policies
create policy "Admins and HR can read all audit logs"
  on public.audit_logs for select
  to authenticated
  using (public.get_user_role(auth.uid()) in ('admin', 'hr'));
create policy "Employees can read own audit logs"
  on public.audit_logs for select
  to authenticated
  using (actor_id = auth.uid());
create policy "Managers can read audit logs in their department"
  on public.audit_logs for select
  to authenticated
  using (
    public.get_user_role(auth.uid()) = 'manager' and
    public.get_user_department(actor_id) = public.get_user_department(auth.uid())
  );
create policy "Allow all authenticated users to create audit logs for themselves"
  on public.audit_logs for insert
  to authenticated
  with check (actor_id = auth.uid());

-- =========================================
-- 5. TRIGGER FUNCTIONS FOR AUTH & SECURITY
-- =========================================

-- Trigger function for Auth User Synchronization
create or replace function public.handle_auth_user_sync()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare
  v_role text := 'employee';
begin
  -- Elevate the very first registered user to 'admin' for easy bootstrapping
  if not exists (select 1 from public.profiles) then
    v_role := 'admin';
  else
    v_role := coalesce(new.raw_user_meta_data->>'role', 'employee');
  end if;
  insert into public.profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    phone,
    status,
    hire_date,
    basic_salary,
    allowance
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', 'Employee'),
    coalesce(new.raw_user_meta_data->>'last_name', 'User'),
    v_role,
    new.raw_user_meta_data->>'phone',
    'active',
    coalesce((new.raw_user_meta_data->>'hire_date')::date, current_date),
    0.00,
    0.00
  )
  on conflict (id) do update
  set
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    updated_at = now(); -- We NEVER update role on metadata updates to prevent client role-escalation
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_auth_user_sync();

-- Secure Profiles Update Trigger
create or replace function public.secure_profile_update()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare
  v_actor_role text;
begin
  -- If the actor is not 'admin' or 'hr' and is authenticated, restrict updates
  if auth.uid() is not null then
    v_actor_role := public.get_user_role(auth.uid());
    if v_actor_role not in ('admin', 'hr') then
      new.role := old.role;
      new.department_id := old.department_id;
      new.title_id := old.title_id;
      new.status := old.status;
      new.hire_date := old.hire_date;
    end if;
  end if;
  -- Email can only be updated via auth.users
  new.email := old.email;
  new.updated_at := now();
  return new;
end;
$$;

create trigger on_profile_update
  before update on public.profiles
  for each row execute function public.secure_profile_update();

-- =========================================
-- 6. STORAGE BUCKET FOR AVATARS
-- =========================================
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Admin and HR can upload avatars"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and 
    auth.role() = 'authenticated' and 
    public.get_user_role(auth.uid()) in ('admin', 'hr')
  );

create policy "Admin and HR can update avatars"
  on storage.objects for update
  with check (
    bucket_id = 'avatars' and 
    auth.role() = 'authenticated' and 
    public.get_user_role(auth.uid()) in ('admin', 'hr')
  );

create policy "Admin and HR can delete avatars"
  on storage.objects for delete
  using (
    bucket_id = 'avatars' and 
    auth.role() = 'authenticated' and 
    public.get_user_role(auth.uid()) in ('admin', 'hr')
  );

-- =========================================
-- 7. SEED STANDARD DEPARTMENTS AND TITLES
-- =========================================
insert into public.departments (id, name, description) values
  ('11111111-1111-1111-1111-111111111111', 'Pickleball', 'Elite Star professional courts, coaching staff, and coordination'),
  ('22222222-2222-2222-2222-222222222222', 'F&B', 'Cafe, kitchen, and bar services for players and guests'),
  ('33333333-3333-3333-3333-333333333333', 'HR', 'Human resources, recruiting, payroll, and employee relations'),
  ('44444444-4444-4444-4444-444444444444', 'Ops', 'Facility operations, scheduling, front desk, and maintenance');

insert into public.titles (id, name, department_id) values
  -- Pickleball
  ('a1111111-1111-1111-1111-111111111111', 'Head Coach', '11111111-1111-1111-1111-111111111111'),
  ('a2222222-2222-2222-2222-222222222222', 'Assistant Coach', '11111111-1111-1111-1111-111111111111'),
  ('a3333333-3333-3333-3333-333333333333', 'Court Coordinator', '11111111-1111-1111-1111-111111111111'),
  -- F&B
  ('b1111111-1111-1111-1111-111111111111', 'Cafe Manager', '22222222-2222-2222-2222-222222222222'),
  ('b2222222-2222-2222-2222-222222222222', 'Barista', '22222222-2222-2222-2222-222222222222'),
  ('b3333333-3333-3333-3333-333333333333', 'Chef', '22222222-2222-2222-2222-222222222222'),
  -- HR
  ('c1111111-1111-1111-1111-111111111111', 'HR Manager', '33333333-3333-3333-3333-333333333333'),
  ('c2222222-2222-2222-2222-222222222222', 'Recruiter', '33333333-3333-3333-3333-333333333333'),
  -- Ops
  ('d1111111-1111-1111-1111-111111111111', 'Operations Director', '44444444-4444-4444-4444-444444444444'),
  ('d2222222-2222-2222-2222-222222222222', 'Facility Supervisor', '44444444-4444-4444-4444-444444444444'),
  ('d3333333-3333-3333-3333-333333333333', 'Operations Staff', '44444444-4444-4444-4444-444444444444');

-- =========================================
-- 8. SEED SOLE ADMIN ACCOUNT (dotanminh@gmail.com)
-- =========================================

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'dotanminh@gmail.com',
  crypt('Minh@2310', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Minh", "last_name": "Đỗ", "role": "admin", "phone": "0987654321"}',
  now(),
  now(),
  '', '', '', ''
);

-- Link identity to support modern Supabase logins
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) values
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '{"sub": "00000000-0000-0000-0000-000000000001", "email": "dotanminh@gmail.com"}',
  'email',
  'dotanminh@gmail.com', -- Provider ID is the email address for standard email provider
  now(),
  now(),
  now()
);

-- Update profile fields for Admin (Link to Ops and Director Title)
update public.profiles 
set 
  department_id = '44444444-4444-4444-4444-444444444444', 
  title_id = 'd1111111-1111-1111-1111-111111111111',
  employee_code = 'es000'
where id = '00000000-0000-0000-0000-000000000001';
