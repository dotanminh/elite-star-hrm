-- Elite Star HRM Seed Data
-- Standard Hyphens (-) and Commas are used. No Em-Dashes.
-- Enables pgcrypto and populates all tables with rich mock data.

create extension if not exists pgcrypto;

-- 1. Clear Existing Data
truncate table auth.users cascade;
truncate table public.departments cascade;
truncate table public.titles cascade;
truncate table public.leave_requests cascade;
truncate table public.attendance_logs cascade;
truncate table public.audit_logs cascade;

-- 2. Seed Departments
insert into public.departments (id, name, description) values
  ('11111111-1111-1111-1111-111111111111', 'Pickleball', 'Elite Star professional courts, coaching staff, and coordination'),
  ('22222222-2222-2222-2222-222222222222', 'F&B', 'Cafe, kitchen, and bar services for players and guests'),
  ('33333333-3333-3333-3333-333333333333', 'HR', 'Human resources, recruiting, payroll, and employee relations'),
  ('44444444-4444-4444-4444-444444444444', 'Ops', 'Facility operations, scheduling, front desk, and maintenance');

-- 3. Seed Titles (Chức danh)
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

-- 4. Seed Auth Users (Will trigger on_auth_user_created automatically to build profiles)
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
  updated_at
) values
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'toiminhvuive@gmail.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Minh", "last_name": "Do", "role": "admin", "phone": "0987654321"}',
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000002',
  'authenticated',
  'authenticated',
  'hr.manager@elitestar.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Ha", "last_name": "Nguyen", "role": "hr", "phone": "0987654322"}',
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000003',
  'authenticated',
  'authenticated',
  'pb.manager@elitestar.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Quang", "last_name": "Tran", "role": "manager", "phone": "0987654323"}',
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000004',
  'authenticated',
  'authenticated',
  'fb.barista@elitestar.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "An", "last_name": "Le", "role": "employee", "phone": "0987654324"}',
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000005',
  'authenticated',
  'authenticated',
  'ops.staff@elitestar.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Binh", "last_name": "Pham", "role": "employee", "phone": "0987654325"}',
  now(),
  now()
);

-- 5. Associate Department and Title ids (Since triggers created the profiles, we update them)
update public.profiles set department_id = '44444444-4444-4444-4444-444444444444', title_id = 'd1111111-1111-1111-1111-111111111111' where id = '00000000-0000-0000-0000-000000000001';
update public.profiles set department_id = '33333333-3333-3333-3333-333333333333', title_id = 'c1111111-1111-1111-1111-111111111111' where id = '00000000-0000-0000-0000-000000000002';
update public.profiles set department_id = '11111111-1111-1111-1111-111111111111', title_id = 'a1111111-1111-1111-1111-111111111111' where id = '00000000-0000-0000-0000-000000000003';
update public.profiles set department_id = '22222222-2222-2222-2222-222222222222', title_id = 'b2222222-2222-2222-2222-222222222222' where id = '00000000-0000-0000-0000-000000000004';
update public.profiles set department_id = '44444444-4444-4444-4444-444444444444', title_id = 'd3333333-3333-3333-3333-333333333333' where id = '00000000-0000-0000-0000-000000000005';

-- 6. Seed Leave Requests
insert into public.leave_requests (id, employee_id, leave_type, start_date, end_date, reason, status, approved_by, approved_at, manager_comment) values
  -- An approved leave request for An Le (F&B)
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '00000000-0000-0000-0000-000000000004', 'annual', '2026-06-01', '2026-06-05', 'Family vacation', 'approved', '00000000-0000-0000-0000-000000000002', now(), 'Approved by HR manager'),
  -- A pending leave request for Binh Pham (Ops)
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '00000000-0000-0000-0000-000000000005', 'sick', '2026-05-28', '2026-05-28', 'Doctor appointment', 'pending', null, null, null);

-- 7. Seed Attendance Logs
insert into public.attendance_logs (employee_id, work_date, check_in, check_out, check_in_ip, check_out_ip, status) values
  -- Minh Do (Admin) yesterday
  ('00000000-0000-0000-0000-000000000001', '2026-05-26', '2026-05-26 08:00:00+07', '2026-05-26 17:00:00+07', '127.0.0.1', '127.0.0.1', 'present'),
  -- Ha Nguyen (HR) yesterday
  ('00000000-0000-0000-0000-000000000002', '2026-05-26', '2026-05-26 08:15:00+07', '2026-05-26 17:30:00+07', '127.0.0.1', '127.0.0.1', 'present'),
  -- Quang Tran (Manager) yesterday
  ('00000000-0000-0000-0000-000000000003', '2026-05-26', '2026-05-26 08:30:00+07', '2026-05-26 17:00:00+07', '127.0.0.1', '127.0.0.1', 'present'),
  -- An Le (Employee) yesterday
  ('00000000-0000-0000-0000-000000000004', '2026-05-26', '2026-05-26 09:15:00+07', '2026-05-26 18:00:00+07', '127.0.0.1', '127.0.0.1', 'late');

-- 8. Seed Audit Logs
insert into public.audit_logs (actor_id, action, table_name, record_id, old_values, new_values, ip_address) values
  ('00000000-0000-0000-0000-000000000001', 'create_user', 'profiles', '00000000-0000-0000-0000-000000000004', null, '{"first_name": "An", "last_name": "Le", "role": "employee"}', '127.0.0.1'),
  ('00000000-0000-0000-0000-000000000002', 'approve_leave', 'leave_requests', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '{"status": "pending"}', '{"status": "approved"}', '127.0.0.1');
