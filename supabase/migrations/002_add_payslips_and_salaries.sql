-- Migration: Bổ sung trường lương cơ bản, phụ cấp và bảng Phiếu lương (payslips)
-- Hướng dẫn: Sếp vui lòng copy toàn bộ nội dung file này và chạy trong SQL Editor của Supabase.

-- 1. Thêm các cột lương cơ bản và phụ cấp vào bảng profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS basic_salary numeric(12,2) DEFAULT 0.00 NOT null,
ADD COLUMN IF NOT EXISTS allowance numeric(12,2) DEFAULT 0.00 NOT null;

-- 2. Tạo bảng Phiếu lương (payslips)
CREATE TABLE IF NOT EXISTS public.payslips (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  standard_days integer NOT NULL,
  actual_days numeric(4,1) NOT NULL,
  basic_salary numeric(12,2) NOT NULL,
  allowance numeric(12,2) NOT NULL,
  attendance_bonus numeric(12,2) DEFAULT 0.00 NOT NULL,
  late_deductions numeric(12,2) DEFAULT 0.00 NOT NULL,
  other_bonuses numeric(12,2) DEFAULT 0.00 NOT NULL,
  other_deductions numeric(12,2) DEFAULT 0.00 NOT NULL,
  net_salary numeric(12,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
  note text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_employee_period UNIQUE (employee_id, period_start, period_end)
);

-- Thêm các index cho bảng payslips
CREATE INDEX IF NOT EXISTS idx_payslips_employee_id ON public.payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslips_period ON public.payslips(period_start, period_end);

-- Enable RLS trên bảng payslips
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

-- RLS Policies cho bảng payslips
CREATE POLICY "Admins and HR have full control on payslips"
  ON public.payslips FOR ALL
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('admin', 'hr'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'hr'));

CREATE POLICY "Employees can read their own published payslips"
  ON public.payslips FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid() AND status = 'published');
