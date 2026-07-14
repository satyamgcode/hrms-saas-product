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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert Default Company
INSERT INTO public.companies (id, name, description, logo, address, phone, email, website)
VALUES (
  1, 
  'TechCorp Solutions', 
  'Leading the way in digital transformation and innovative software solutions.', 
  'https://placehold.co/100x100/F3901B/white?text=TC', 
  '123 Innovation Drive, Silicon Valley, CA', 
  '+1 (555) 123-4567', 
  'info@techcorp.com', 
  'www.techcorp.com'
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Insert Default Policies
INSERT INTO public.policies (id, name, url, category)
VALUES 
  (1, 'Company Terms and Conditions', 'https://example.com/terms.pdf', 'Legal'),
  (2, 'Employee Conduct Policy', 'https://example.com/conduct.pdf', 'HR'),
  (3, 'Work From Home Policy', 'https://example.com/wfh.pdf', 'Operations')
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
  "lastModified" TEXT,
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

DROP POLICY IF EXISTS "Allow users and admins to delete documents" ON public.user_documents;
CREATE POLICY "Allow users and admins to delete documents"
ON public.user_documents
FOR DELETE
TO authenticated
USING (
  auth.uid() = "userId" OR
  auth.jwt() ->> 'email' = 'testuser9@gmail.com' OR
  LOWER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin'
);

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

-- Create or replace the handle_new_user function to respect the metadata role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into public.users (Employee Profiles)
  INSERT INTO public.users (id, email, name, full_name, role, "companyId")
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'Employee'),
    1
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name;

  -- Insert into public.profiles (Admin & Company Onboarding Profiles)
  INSERT INTO public.profiles (id, email, full_name, role, onboarding_step, is_onboarded)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'Employee'),
    1,
    false
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
