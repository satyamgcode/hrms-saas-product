-- =======================================================
-- SQL MIGRATION: PROJECTS, CLIENTS & ASSIGNMENTS WORKFLOW
-- =======================================================

-- 1. Create Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  industry TEXT,
  "companyId" INTEGER DEFAULT 1 REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Planning', -- 'Planning', 'In Progress', 'On Hold', 'Completed'
  start_date DATE,
  end_date DATE,
  client_id INTEGER REFERENCES public.clients(id) ON DELETE SET NULL,
  "companyId" INTEGER DEFAULT 1 REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Project Assignments Junction Table
CREATE TABLE IF NOT EXISTS public.project_assignments (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'Member', -- 'Lead', 'Member', 'Consultant', 'Developer'
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;

-- 5. Policies for public.clients
DROP POLICY IF EXISTS "Users can read clients in their company" ON public.clients;
CREATE POLICY "Users can read clients in their company" ON public.clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u."companyId" = clients."companyId"
    )
  );

DROP POLICY IF EXISTS "Admins can modify clients in their company" ON public.clients;
CREATE POLICY "Admins can modify clients in their company" ON public.clients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u."companyId" = clients."companyId"
      AND u.role = 'Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u."companyId" = clients."companyId"
      AND u.role = 'Admin'
    )
  );

-- 6. Policies for public.projects
DROP POLICY IF EXISTS "Users can read projects in their company" ON public.projects;
CREATE POLICY "Users can read projects in their company" ON public.projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u."companyId" = projects."companyId"
    )
  );

DROP POLICY IF EXISTS "Admins can modify projects in their company" ON public.projects;
CREATE POLICY "Admins can modify projects in their company" ON public.projects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u."companyId" = projects."companyId"
      AND u.role = 'Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u."companyId" = projects."companyId"
      AND u.role = 'Admin'
    )
  );

-- 7. Policies for public.project_assignments
DROP POLICY IF EXISTS "Users can read assignments in their company" ON public.project_assignments;
CREATE POLICY "Users can read assignments in their company" ON public.project_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u."companyId" = (
        SELECT p."companyId" FROM public.projects p 
        WHERE p.id = project_assignments.project_id
      )
    )
  );

DROP POLICY IF EXISTS "Admins can modify assignments in their company" ON public.project_assignments;
CREATE POLICY "Admins can modify assignments in their company" ON public.project_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'Admin'
      AND u."companyId" = (
        SELECT p."companyId" FROM public.projects p 
        WHERE p.id = project_assignments.project_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'Admin'
      AND u."companyId" = (
        SELECT p."companyId" FROM public.projects p 
        WHERE p.id = project_assignments.project_id
      )
    )
  );

-- 8. Seed Initial Data for Company 1
INSERT INTO public.clients (id, name, email, phone, industry, "companyId")
VALUES 
  (1, 'Acme Corporation', 'billing@acme.com', '+1 (555) 901-2345', 'Retail & Logistics', 1),
  (2, 'Initech Solutions', 'contact@initech.com', '+1 (555) 890-1234', 'Financial Services', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.projects (id, name, description, status, start_date, end_date, client_id, "companyId")
VALUES 
  (1, 'E-Commerce Gateway Integration', 'Developing custom payment middleware and shopping cart connectors for retail partners.', 'In Progress', '2026-01-15', '2026-09-30', 1, 1),
  (2, 'Cloud Storage Sync Client', 'Building secure end-to-end encrypted backup systems for corporate payroll files.', 'Planning', '2026-08-01', '2026-12-31', 2, 1)
ON CONFLICT (id) DO NOTHING;

-- 9. Synchronize Auto-Incrementing Primary Key Sequences
SELECT setval(pg_get_serial_sequence('public.clients', 'id'), COALESCE(MAX(id), 1)) FROM public.clients;
SELECT setval(pg_get_serial_sequence('public.projects', 'id'), COALESCE(MAX(id), 1)) FROM public.projects;
SELECT setval(pg_get_serial_sequence('public.project_assignments', 'id'), COALESCE(MAX(id), 1)) FROM public.project_assignments;
