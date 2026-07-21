-- ==========================================
-- HRMS DATABASE SETUP SCHEMA
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Create Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  logo TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  departments TEXT[] DEFAULT ARRAY['Software Development', 'Creative Design', 'Marketing', 'Sales', 'Human Resources', 'Finance'],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert Default Company
INSERT INTO public.companies (id, name, description, logo, address, phone, email, website, departments)
VALUES (
  1, 
  'TechCorp Solutions', 
  'Leading the way in digital transformation and innovative software solutions.', 
  'https://placehold.co/100x100/F3901B/white?text=TC', 
  '123 Innovation Drive, Silicon Valley, CA', 
  '+1 (555) 123-4567', 
  'info@techcorp.com', 
  'www.techcorp.com',
  ARRAY['Software Development', 'Creative Design', 'Marketing', 'Sales', 'Human Resources', 'Finance']
) ON CONFLICT (id) DO NOTHING;

-- 3. Create Users (Employee Profile) Table linked to auth.users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'Employee',
  "companyId" INTEGER DEFAULT 1 REFERENCES public.companies(id),
  designation TEXT,
  department TEXT,
  phone TEXT,
  website TEXT,
  location TEXT,
  bio TEXT,
  joining_date DATE,
  current_address TEXT,
  permanent_address TEXT,
  office_address TEXT,
  social_links JSONB DEFAULT '{}',
  team INTEGER DEFAULT 0,
  awards INTEGER DEFAULT 0,
  projects INTEGER DEFAULT 0,
  clients INTEGER DEFAULT 0,
  avatar TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Policies Table
CREATE TABLE IF NOT EXISTS public.policies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  category TEXT,
  "companyId" INTEGER DEFAULT 1 REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Insert Default Policies
INSERT INTO public.policies (id, name, url, category, "companyId")
VALUES 
  (1, 'Company Terms and Conditions', 'https://example.com/terms.pdf', 'Legal', 1),
  (2, 'Employee Conduct Policy', 'https://example.com/conduct.pdf', 'HR', 1),
  (3, 'Work From Home Policy', 'https://example.com/wfh.pdf', 'Operations', 1)
ON CONFLICT (id) DO NOTHING;

-- 6. Create Holidays Table
CREATE TABLE IF NOT EXISTS public.holidays (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Insert Default Holidays
INSERT INTO public.holidays (id, name, date, type)
VALUES 
  (1, 'New Year''s Day', '2026-01-01', 'Public'),
  (2, 'Independence Day', '2026-08-15', 'National'),
  (3, 'Christmas Day', '2026-12-25', 'Public'),
  (4, 'Company Anniversary', '2026-10-10', 'Optional')
ON CONFLICT (id) DO NOTHING;

-- 8. Create User Documents Table
CREATE TABLE IF NOT EXISTS public.user_documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT,
  name TEXT,
  url TEXT,
  status TEXT DEFAULT 'Pending',
  "rejectionReason" TEXT DEFAULT '',
  "uploadedBy" TEXT DEFAULT 'Employee',
  "lastModified" TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create Required Document Templates Table
CREATE TABLE IF NOT EXISTS public.required_document_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  description TEXT,
  "isRequired" BOOLEAN DEFAULT true,
  "companyId" INTEGER DEFAULT 1 REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- 1. Policies for public.companies
DROP POLICY IF EXISTS "Allow authenticated users to read companies" ON public.companies;
CREATE POLICY "Allow authenticated users to read companies"
ON public.companies
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert companies" ON public.companies;
CREATE POLICY "Allow authenticated users to insert companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admins to manage companies" ON public.companies;
CREATE POLICY "Allow admins to manage companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
)
WITH CHECK (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
);

DROP POLICY IF EXISTS "Allow admins to delete companies" ON public.companies;
CREATE POLICY "Allow admins to delete companies"
ON public.companies
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
);

-- 2. Policies for public.users (Employee Profiles)
DROP POLICY IF EXISTS "Allow authenticated users to view profiles" ON public.users;
CREATE POLICY "Allow authenticated users to view profiles"
ON public.users
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.users;
CREATE POLICY "Allow users to insert their own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.users;
CREATE POLICY "Allow users to update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow admins to manage profiles" ON public.users;
CREATE POLICY "Allow admins to manage profiles"
ON public.users
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
);

-- 3. Policies for public.policies
DROP POLICY IF EXISTS "Allow authenticated users to read policies" ON public.policies;
CREATE POLICY "Allow authenticated users to read policies"
ON public.policies
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow admins to manage policies" ON public.policies;
CREATE POLICY "Allow admins to manage policies"
ON public.policies
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
);

-- 4. Policies for public.holidays
DROP POLICY IF EXISTS "Allow authenticated users to read holidays" ON public.holidays;
CREATE POLICY "Allow authenticated users to read holidays"
ON public.holidays
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow admins to manage holidays" ON public.holidays;
CREATE POLICY "Allow admins to manage holidays"
ON public.holidays
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
);

-- 5. Policies for public.user_documents
DROP POLICY IF EXISTS "Allow users and admins to view documents" ON public.user_documents;
CREATE POLICY "Allow users and admins to view documents"
ON public.user_documents
FOR SELECT
TO authenticated
USING (
  auth.uid() = "userId" OR
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
);

DROP POLICY IF EXISTS "Allow users and admins to insert documents" ON public.user_documents;
CREATE POLICY "Allow users and admins to insert documents"
ON public.user_documents
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = "userId" OR
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
);

DROP POLICY IF EXISTS "Allow users and admins to update documents" ON public.user_documents;
CREATE POLICY "Allow users and admins to update documents"
ON public.user_documents
FOR UPDATE
TO authenticated
USING (
  auth.uid() = "userId" OR
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
)
WITH CHECK (
  auth.uid() = "userId" OR
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
);

-- 6. Policies for public.required_document_templates
ALTER TABLE public.required_document_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view required_document_templates" ON public.required_document_templates;
CREATE POLICY "Allow authenticated users to view required_document_templates"
ON public.required_document_templates
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage required_document_templates" ON public.required_document_templates;
CREATE POLICY "Allow authenticated users to manage required_document_templates"
ON public.required_document_templates
FOR ALL
TO authenticated
USING (true);

-- ==========================================
-- PROFILES TABLE & POLICIES (Admin & Company Onboarding)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  onboarding_step INTEGER DEFAULT 1,
  is_onboarded BOOLEAN DEFAULT false,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated users to read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow users to insert their own profile_row" ON public.profiles;
CREATE POLICY "Allow users to insert their own profile_row"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to update their own profile_row" ON public.profiles;
CREATE POLICY "Allow users to update their own profile_row"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow admins to manage profiles_table" ON public.profiles;
CREATE POLICY "Allow admins to manage profiles_table"
ON public.profiles
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
);

-- ==========================================
-- AUTHENTICATION TRIGGER FOR USER PROFILE
-- ==========================================

-- Create or replace the handle_new_user function to respect the metadata role and companyId,
-- dynamically creating a new company record if an Admin registers with a custom company name.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_company_id INTEGER;
  company_name_val TEXT;
  user_role TEXT;
BEGIN
  -- Extract user role and custom company name from metadata
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'Employee');
  company_name_val := new.raw_user_meta_data->>'company_name';
  
  -- If Admin signs up with a company name, insert a new company record
  IF LOWER(user_role) = 'admin' AND company_name_val IS NOT NULL AND company_name_val <> '' THEN
    INSERT INTO public.companies (name, description, email, website)
    VALUES (
      company_name_val,
      'Workspace for ' || company_name_val || '. Configure your organization details in settings.',
      new.email,
      'www.' || lower(regexp_replace(company_name_val, '[^a-zA-Z0-9]', '', 'g')) || '.com'
    )
    RETURNING id INTO new_company_id;
  ELSE
    -- Otherwise, default to companyId 1 or use metadata companyId if present
    new_company_id := COALESCE((new.raw_user_meta_data->>'companyId')::integer, 1);
  END IF;

  -- 1. Insert into public.users (Employee Profiles)
  INSERT INTO public.users (id, email, name, full_name, role, "companyId")
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    user_role,
    new_company_id
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    "companyId" = COALESCE(EXCLUDED."companyId", public.users."companyId");

  -- 2. Insert into public.profiles (Admin & Company Onboarding Profiles)
  INSERT INTO public.profiles (id, email, full_name, company_name, role, onboarding_step, is_onboarded)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    company_name_val,
    user_role,
    1,
    CASE WHEN LOWER(user_role) = 'admin' THEN false ELSE true END
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    company_name = COALESCE(EXCLUDED.company_name, public.profiles.company_name);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- SALARY & PAYROLL MANAGEMENT TABLES
-- ==========================================

-- 1. Salary Structures (Templates)
CREATE TABLE IF NOT EXISTS public.salary_structures (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  "companyId" INTEGER DEFAULT 1 REFERENCES public.companies(id) ON DELETE CASCADE,
  basic_percent NUMERIC DEFAULT 50.0, -- % of Gross Salary
  hra_percent NUMERIC DEFAULT 20.0, -- % of Gross Salary or % of Basic
  da_percent NUMERIC DEFAULT 10.0, -- % of Gross Salary
  special_allowance_percent NUMERIC DEFAULT 20.0, -- % of Gross Salary
  pf_percent NUMERIC DEFAULT 12.0, -- % of Basic for PF deduction
  professional_tax NUMERIC DEFAULT 200.0, -- Fixed monthly deduction
  tds_percent NUMERIC DEFAULT 10.0, -- Average TDS percentage of gross
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Employee Salary Allocations (linking Gross Salary and Structure to user)
CREATE TABLE IF NOT EXISTS public.employee_salaries (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  structure_id INTEGER REFERENCES public.salary_structures(id) ON DELETE SET NULL,
  gross_salary NUMERIC NOT NULL DEFAULT 0.0,
  basic_salary NUMERIC NOT NULL DEFAULT 0.0,
  hra NUMERIC NOT NULL DEFAULT 0.0,
  da NUMERIC NOT NULL DEFAULT 0.0,
  special_allowance NUMERIC NOT NULL DEFAULT 0.0,
  pf_deduction NUMERIC NOT NULL DEFAULT 0.0,
  professional_tax NUMERIC NOT NULL DEFAULT 200.0,
  tds_deduction NUMERIC NOT NULL DEFAULT 0.0,
  other_allowances NUMERIC NOT NULL DEFAULT 0.0,
  other_deductions NUMERIC NOT NULL DEFAULT 0.0,
  net_salary NUMERIC NOT NULL DEFAULT 0.0,
  payment_method TEXT DEFAULT 'Bank Transfer',
  bank_name TEXT,
  bank_account_no TEXT,
  bank_ifsc_code TEXT,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Payroll Runs
CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id SERIAL PRIMARY KEY,
  "companyId" INTEGER DEFAULT 1 REFERENCES public.companies(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Format: "YYYY-MM" (e.g. "2026-07")
  status TEXT DEFAULT 'Draft', -- Draft, Processing, Approved, Paid
  total_employees INTEGER DEFAULT 0,
  total_gross NUMERIC DEFAULT 0.0,
  total_deductions NUMERIC DEFAULT 0.0,
  total_net NUMERIC DEFAULT 0.0,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("companyId", month_year)
);

-- 4. Employee Payslips (individual pay details generated per payroll run)
CREATE TABLE IF NOT EXISTS public.payslips (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  payroll_run_id INTEGER REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  "userId" UUID REFERENCES public.users(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- "YYYY-MM"
  gross_salary NUMERIC NOT NULL DEFAULT 0.0,
  basic_salary NUMERIC NOT NULL DEFAULT 0.0,
  hra NUMERIC NOT NULL DEFAULT 0.0,
  da NUMERIC NOT NULL DEFAULT 0.0,
  special_allowance NUMERIC NOT NULL DEFAULT 0.0,
  pf_deduction NUMERIC NOT NULL DEFAULT 0.0,
  professional_tax NUMERIC NOT NULL DEFAULT 0.0,
  tds_deduction NUMERIC NOT NULL DEFAULT 0.0,
  other_allowances NUMERIC NOT NULL DEFAULT 0.0,
  other_deductions NUMERIC NOT NULL DEFAULT 0.0,
  net_salary NUMERIC NOT NULL DEFAULT 0.0,
  payment_status TEXT DEFAULT 'Pending', -- Pending, Processing, Paid, Cancelled
  payment_method TEXT DEFAULT 'Bank Transfer',
  payment_date DATE,
  currency TEXT DEFAULT 'USD',
  leaves_taken INTEGER DEFAULT 0,
  working_days INTEGER DEFAULT 30,
  adjustment_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("userId", month_year)
);

-- 5. Salary History (records of all changes to gross or structures)
CREATE TABLE IF NOT EXISTS public.salary_history (
  id SERIAL PRIMARY KEY,
  "userId" UUID REFERENCES public.users(id) ON DELETE CASCADE,
  previous_gross NUMERIC,
  new_gross NUMERIC,
  change_type TEXT, -- Promotion, Revision, Structure Change, Joining
  effective_date DATE,
  notes TEXT,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on the new tables
ALTER TABLE public.salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_history ENABLE ROW LEVEL SECURITY;

-- 1. Policies for salary_structures
DROP POLICY IF EXISTS "Allow authenticated users to read structures" ON public.salary_structures;
CREATE POLICY "Allow authenticated users to read structures"
ON public.salary_structures FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admins to manage structures" ON public.salary_structures;
CREATE POLICY "Allow admins to manage structures"
ON public.salary_structures FOR ALL TO authenticated
USING (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
)
WITH CHECK (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
);

-- 2. Policies for employee_salaries
DROP POLICY IF EXISTS "Allow users to view own salary" ON public.employee_salaries;
CREATE POLICY "Allow users to view own salary"
ON public.employee_salaries FOR SELECT TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow admins to manage employee salaries" ON public.employee_salaries;
CREATE POLICY "Allow admins to manage employee salaries"
ON public.employee_salaries FOR ALL TO authenticated
USING (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
)
WITH CHECK (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
);

-- 3. Policies for payroll_runs
DROP POLICY IF EXISTS "Allow admins to manage payroll runs" ON public.payroll_runs;
CREATE POLICY "Allow admins to manage payroll runs"
ON public.payroll_runs FOR ALL TO authenticated
USING (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
)
WITH CHECK (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
);

DROP POLICY IF EXISTS "Allow authenticated users to read payroll runs" ON public.payroll_runs;
CREATE POLICY "Allow authenticated users to read payroll runs"
ON public.payroll_runs FOR SELECT TO authenticated USING (true);

-- 4. Policies for payslips
DROP POLICY IF EXISTS "Allow users to view own payslips" ON public.payslips;
CREATE POLICY "Allow users to view own payslips"
ON public.payslips FOR SELECT TO authenticated
USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "Allow admins to manage payslips" ON public.payslips;
CREATE POLICY "Allow admins to manage payslips"
ON public.payslips FOR ALL TO authenticated
USING (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
)
WITH CHECK (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
);

-- 5. Policies for salary_history
DROP POLICY IF EXISTS "Allow users to view own salary history" ON public.salary_history;
CREATE POLICY "Allow users to view own salary history"
ON public.salary_history FOR SELECT TO authenticated
USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "Allow admins to manage salary history" ON public.salary_history;
CREATE POLICY "Allow admins to manage salary history"
ON public.salary_history FOR ALL TO authenticated
USING (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
)
WITH CHECK (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
);

-- ==========================================
-- SCHEMA UPDATE: RUN THIS IF YOU GET SCHEMA CACHE ERRORS FOR NEW COLUMNS
-- ==========================================
ALTER TABLE public.employee_salaries ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE public.employee_salaries ADD COLUMN IF NOT EXISTS net_salary NUMERIC NOT NULL DEFAULT 0.0;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS adjustment_notes TEXT;

-- Force reload PostgREST schema cache to recognize new columns immediately
NOTIFY pgrst, 'reload schema';

-- ==========================================
-- ATTENDANCE & SHIFT MANAGEMENT TABLES
-- ==========================================

-- 1. Shifts Table
CREATE TABLE IF NOT EXISTS public.shifts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  late_buffer INTEGER DEFAULT 15, -- minutes
  "companyId" INTEGER DEFAULT 1 REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Shifts
INSERT INTO public.shifts (id, name, start_time, end_time, late_buffer, "companyId")
VALUES 
  (1, 'General Shift', '09:00:00', '18:00:00', 15, 1),
  (2, 'Morning Shift', '07:00:00', '15:00:00', 10, 1),
  (3, 'Evening Shift', '15:00:00', '23:00:00', 10, 1),
  (4, 'Night Shift', '23:00:00', '07:00:00', 15, 1)
ON CONFLICT (id) DO NOTHING;

-- Add shift_id to users table (if not exists)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "shift_id" INTEGER REFERENCES public.shifts(id) ON DELETE SET NULL;

-- 2. Attendance Logs Table
CREATE TABLE IF NOT EXISTS public.attendance (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  working_hours NUMERIC DEFAULT 0.0,
  status TEXT DEFAULT 'Absent', -- Present, Late, Half Day, Absent
  shift_id INTEGER REFERENCES public.shifts(id) ON DELETE SET NULL,
  "companyId" INTEGER DEFAULT 1 REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("userId", date)
);

-- 3. Breaks Table
CREATE TABLE IF NOT EXISTS public.breaks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  attendance_id TEXT REFERENCES public.attendance(id) ON DELETE CASCADE,
  "userId" UUID REFERENCES public.users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration INTEGER DEFAULT 0, -- seconds
  reason TEXT, -- Lunch, Tea, Meeting, Personal
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Attendance Corrections Table
CREATE TABLE IF NOT EXISTS public.attendance_corrections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  attendance_id TEXT REFERENCES public.attendance(id) ON DELETE SET NULL,
  "userId" UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  requested_clock_in TIMESTAMPTZ,
  requested_clock_out TIMESTAMPTZ,
  reason TEXT,
  status TEXT DEFAULT 'Pending', -- Pending, Approved, Rejected
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Shifts
DROP POLICY IF EXISTS "Allow authenticated users to read shifts" ON public.shifts;
CREATE POLICY "Allow authenticated users to read shifts"
ON public.shifts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admins to manage shifts" ON public.shifts;
CREATE POLICY "Allow admins to manage shifts"
ON public.shifts FOR ALL TO authenticated
USING (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
)
WITH CHECK (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
);

-- Attendance
DROP POLICY IF EXISTS "Allow users to view own attendance" ON public.attendance;
CREATE POLICY "Allow users to view own attendance"
ON public.attendance FOR SELECT TO authenticated
USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "Allow users to manage own attendance logs" ON public.attendance;
CREATE POLICY "Allow users to manage own attendance logs"
ON public.attendance FOR ALL TO authenticated
USING (
  auth.uid() = "userId" OR
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
)
WITH CHECK (
  auth.uid() = "userId" OR
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
);

-- Breaks
DROP POLICY IF EXISTS "Allow users to view own breaks" ON public.breaks;
CREATE POLICY "Allow users to view own breaks"
ON public.breaks FOR SELECT TO authenticated
USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "Allow users to manage own breaks" ON public.breaks;
CREATE POLICY "Allow users to manage own breaks"
ON public.breaks FOR ALL TO authenticated
USING (auth.uid() = "userId")
WITH CHECK (auth.uid() = "userId");

-- Corrections
DROP POLICY IF EXISTS "Allow users to view own corrections" ON public.attendance_corrections;
CREATE POLICY "Allow users to view own corrections"
ON public.attendance_corrections FOR SELECT TO authenticated
USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "Allow users to submit own corrections" ON public.attendance_corrections;
CREATE POLICY "Allow users to submit own corrections"
ON public.attendance_corrections FOR INSERT TO authenticated
WITH CHECK (auth.uid() = "userId");

DROP POLICY IF EXISTS "Allow admins to manage corrections" ON public.attendance_corrections;
CREATE POLICY "Allow admins to manage corrections"
ON public.attendance_corrections FOR ALL TO authenticated
USING (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
)
WITH CHECK (
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
);

-- Force reload schema cache for new tables
NOTIFY pgrst, 'reload schema';

-- 18. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT, -- Can be UUID text, or special targets like 'admin' / 'hr'
  "companyId" INTEGER DEFAULT 1 REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'warning', 'success', 'error'
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read notifications" ON public.notifications;
CREATE POLICY "Allow authenticated users to read notifications"
ON public.notifications FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert notifications" ON public.notifications;
CREATE POLICY "Allow authenticated users to insert notifications"
ON public.notifications FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update notifications" ON public.notifications;
CREATE POLICY "Allow authenticated users to update notifications"
ON public.notifications FOR UPDATE
TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete notifications" ON public.notifications;
CREATE POLICY "Allow authenticated users to delete notifications"
ON public.notifications FOR DELETE
TO authenticated USING (true);



