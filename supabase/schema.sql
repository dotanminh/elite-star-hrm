-- Elite Star HRM Database Schema
-- Standard Hyphens (-) and Commas are used. No Em-Dashes.
-- Clean, professional, robust, and highly secure.

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- 1. Departments Table
create table public.departments (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Titles (Chức danh) Table
create table public.titles (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  department_id uuid references public.departments(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Profiles Table (1:1 with auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  employee_code text unique,
  email text not null unique,
  first_name text not null,
  last_name text not null,
  avatar_url text,
  gender text check (gender in ('male', 'female', 'other')),
  education_level text,
  address text,
  hometown text,
  biography text,
  department_id uuid references public.departments(id) on delete set null,
  title_id uuid references public.titles(id) on delete set null,
  role text not null check (role in ('admin', 'hr', 'manager', 'employee')) default 'employee',
  phone text,
  status text not null check (status in ('active', 'suspended', 'terminated')) default 'active',
  hire_date date default current_date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3.5 Disciplinary Records Table
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

-- 4. Leave Requests (Nghỉ phép) Table
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

-- 5. Attendance Logs (Chấm công) Table
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

-- 6. Audit Logs Table (Immutable insert-only pattern)
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

-- Performance Indexes
create index idx_profiles_department_id on public.profiles(department_id);
create index idx_profiles_title_id on public.profiles(title_id);
create index idx_titles_department_id on public.titles(department_id);
create index idx_leave_requests_employee_id on public.leave_requests(employee_id);
create index idx_attendance_logs_employee_id on public.attendance_logs(employee_id);
create index idx_attendance_logs_work_date on public.attendance_logs(work_date);
create index idx_audit_logs_actor_id on public.audit_logs(actor_id);
create index idx_audit_logs_created_at on public.audit_logs(created_at desc);

-- Enable Row Level Security (RLS)
alter table public.departments enable row level security;
alter table public.titles enable row level security;
alter table public.profiles enable row level security;
alter table public.leave_requests enable row level security;
alter table public.attendance_logs enable row level security;
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

-- Departments Table Policies
create policy "Allow all authenticated users to read departments"
  on public.departments for select
  to authenticated
  using (true);

create policy "Admins and HR have full control on departments"
  on public.departments for all
  to authenticated
  using (public.get_user_role(auth.uid()) in ('admin', 'hr'))
  with check (public.get_user_role(auth.uid()) in ('admin', 'hr'));

-- Titles Table Policies
create policy "Allow all authenticated users to read titles"
  on public.titles for select
  to authenticated
  using (true);

create policy "Admins and HR have full control on titles"
  on public.titles for all
  to authenticated
  using (public.get_user_role(auth.uid()) in ('admin', 'hr'))
  with check (public.get_user_role(auth.uid()) in ('admin', 'hr'));

-- Profiles Table Policies
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

-- Leave Requests Table Policies
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

-- Attendance Logs Table Policies
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

-- Audit Logs Table Policies (Immutable insert-only pattern)
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

-- Triggers for Auth User Synchronization

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
    hire_date
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', 'Employee'),
    coalesce(new.raw_user_meta_data->>'last_name', 'User'),
    v_role,
    new.raw_user_meta_data->>'phone',
    'active',
    coalesce((new.raw_user_meta_data->>'hire_date')::date, current_date)
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

drop trigger if exists on_auth_user_created on auth.users;
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

-- Disciplinary Records Indexes and RLS
create index idx_disciplines_employee_id on public.disciplinary_records(employee_id);
create index idx_disciplines_date on public.disciplinary_records(record_date);

alter table public.disciplinary_records enable row level security;

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

-- Storage Bucket setup for Avatars
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
