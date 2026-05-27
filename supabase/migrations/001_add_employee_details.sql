-- Migration: Bổ sung trường thông tin nhân viên và bảng Kỷ luật
-- Hướng dẫn: Sếp vui lòng copy toàn bộ nội dung file này và chạy trong SQL Editor của Supabase.

-- 1. Thêm các cột mới vào bảng profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS employee_code text UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female', 'other')),
ADD COLUMN IF NOT EXISTS education_level text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS hometown text,
ADD COLUMN IF NOT EXISTS biography text;

-- 2. Tạo bảng Kỷ luật (disciplinary_records)
CREATE TABLE IF NOT EXISTS public.disciplinary_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  record_date date NOT NULL DEFAULT current_date,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Thêm index cho bảng Kỷ luật
CREATE INDEX IF NOT EXISTS idx_disciplines_employee_id ON public.disciplinary_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_disciplines_date ON public.disciplinary_records(record_date);

-- Enable RLS trên bảng Kỷ luật
ALTER TABLE public.disciplinary_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies cho bảng Kỷ luật
CREATE POLICY "Admins and HR have full control on disciplinary records"
  ON public.disciplinary_records FOR ALL
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('admin', 'hr'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'hr'));

CREATE POLICY "Managers can read disciplinary records in their department"
  ON public.disciplinary_records FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'manager' AND
    public.get_user_department(employee_id) = public.get_user_department(auth.uid())
  );

CREATE POLICY "Employees can view their own disciplinary records"
  ON public.disciplinary_records FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- 3. Cấu hình Supabase Storage cho Avatar (Tùy chọn)
-- Tạo bucket 'avatars' nếu chưa có
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy cho phép mọi người xem avatar
CREATE POLICY "Avatar images are publicly accessible."
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

-- Policy cho phép Admin/HR upload avatar
CREATE POLICY "Admin and HR can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.role() = 'authenticated' AND 
    public.get_user_role(auth.uid()) IN ('admin', 'hr')
  );

-- Policy cho phép cập nhật/xóa avatar
CREATE POLICY "Admin and HR can update avatars"
  ON storage.objects FOR UPDATE
  WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.role() = 'authenticated' AND 
    public.get_user_role(auth.uid()) IN ('admin', 'hr')
  );

CREATE POLICY "Admin and HR can delete avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND 
    auth.role() = 'authenticated' AND 
    public.get_user_role(auth.uid()) IN ('admin', 'hr')
  );
