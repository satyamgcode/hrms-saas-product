import { supabase } from '../utils/supabase';
import { getUsers } from './api';

let useLocalStorage = !import.meta.env.VITE_SUPABASE_URL || 
  (!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY && !import.meta.env.VITE_SUPABASE_ANON_KEY);
let dbCheckPromise = null;

const checkDbConnection = async () => {
  if (useLocalStorage) return;
  try {
    const { error } = await supabase.from('clients').select('id').limit(1);
    if (error && (error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('42P01'))) {
      console.warn("Supabase clients table not found. Switching to localStorage fallback.");
      useLocalStorage = true;
    }
  } catch (err) {
    console.warn("Failed to connect to Supabase for clients. Switching to localStorage fallback.", err);
    useLocalStorage = true;
  }
};

const ensureDbChecked = async () => {
  if (!dbCheckPromise) {
    dbCheckPromise = checkDbConnection();
  }
  await dbCheckPromise;
};

// HELPER: Seed default local storage mock datasets if empty
const ensureLocalDataSeeded = () => {
  if (!useLocalStorage) return;

  if (!localStorage.getItem('hrms_clients')) {
    const defaultClients = [
      { id: 1, name: 'Acme Corporation', email: 'billing@acme.com', phone: '+1 (555) 901-2345', industry: 'Retail & Logistics', companyId: 1, created_at: new Date().toISOString() },
      { id: 2, name: 'Initech Solutions', email: 'contact@initech.com', phone: '+1 (555) 890-1234', industry: 'Financial Services', companyId: 1, created_at: new Date().toISOString() }
    ];
    localStorage.setItem('hrms_clients', JSON.stringify(defaultClients));
  }

  if (!localStorage.getItem('hrms_projects')) {
    const defaultProjects = [
      { id: 1, name: 'E-Commerce Gateway Integration', description: 'Developing custom payment middleware and shopping cart connectors for retail partners.', status: 'In Progress', start_date: '2026-01-15', end_date: '2026-09-30', client_id: 1, companyId: 1, created_at: new Date().toISOString() },
      { id: 2, name: 'Cloud Storage Sync Client', description: 'Building secure end-to-end encrypted backup systems for corporate payroll files.', status: 'Planning', start_date: '2026-08-01', end_date: '2026-12-31', client_id: 2, companyId: 1, created_at: new Date().toISOString() }
    ];
    localStorage.setItem('hrms_projects', JSON.stringify(defaultProjects));
  }

  if (!localStorage.getItem('hrms_project_assignments')) {
    localStorage.setItem('hrms_project_assignments', JSON.stringify([]));
  }
};

// ==========================================
// CLIENT SERVICES
// ==========================================

export const getClients = async (companyId = 1) => {
  await ensureDbChecked();
  ensureLocalDataSeeded();

  if (useLocalStorage) {
    const clients = JSON.parse(localStorage.getItem('hrms_clients') || '[]');
    return clients.filter(c => c.companyId === companyId);
  }

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('companyId', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const createClient = async (clientData) => {
  await ensureDbChecked();
  ensureLocalDataSeeded();

  if (useLocalStorage) {
    const clients = JSON.parse(localStorage.getItem('hrms_clients') || '[]');
    const newClient = {
      ...clientData,
      id: clients.length ? Math.max(...clients.map(c => c.id)) + 1 : 1,
      created_at: new Date().toISOString()
    };
    clients.push(newClient);
    localStorage.setItem('hrms_clients', JSON.stringify(clients));
    return newClient;
  }

  const { data, error } = await supabase
    .from('clients')
    .insert([clientData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateClient = async (id, clientData) => {
  await ensureDbChecked();
  ensureLocalDataSeeded();

  if (useLocalStorage) {
    const clients = JSON.parse(localStorage.getItem('hrms_clients') || '[]');
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Client not found');
    
    clients[idx] = { ...clients[idx], ...clientData };
    localStorage.setItem('hrms_clients', JSON.stringify(clients));
    return clients[idx];
  }

  const { data, error } = await supabase
    .from('clients')
    .update(clientData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteClient = async (id) => {
  await ensureDbChecked();
  ensureLocalDataSeeded();

  if (useLocalStorage) {
    const clients = JSON.parse(localStorage.getItem('hrms_clients') || '[]');
    const filtered = clients.filter(c => c.id !== id);
    localStorage.setItem('hrms_clients', JSON.stringify(filtered));
    return true;
  }

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

// ==========================================
// PROJECT SERVICES
// ==========================================

export const getProjects = async (companyId = 1) => {
  await ensureDbChecked();
  ensureLocalDataSeeded();

  if (useLocalStorage) {
    const projects = JSON.parse(localStorage.getItem('hrms_projects') || '[]');
    const clients = JSON.parse(localStorage.getItem('hrms_clients') || '[]');
    
    return projects
      .filter(p => p.companyId === companyId)
      .map(p => {
        const client = clients.find(c => c.id === p.client_id);
        return {
          ...p,
          client: client ? { name: client.name } : null
        };
      });
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*, client:clients(name)')
    .eq('companyId', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const createProject = async (projectData) => {
  await ensureDbChecked();
  ensureLocalDataSeeded();

  if (useLocalStorage) {
    const projects = JSON.parse(localStorage.getItem('hrms_projects') || '[]');
    const newProject = {
      ...projectData,
      id: projects.length ? Math.max(...projects.map(p => p.id)) + 1 : 1,
      created_at: new Date().toISOString()
    };
    projects.push(newProject);
    localStorage.setItem('hrms_projects', JSON.stringify(projects));
    return newProject;
  }

  const { data, error } = await supabase
    .from('projects')
    .insert([projectData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProject = async (id, projectData) => {
  await ensureDbChecked();
  ensureLocalDataSeeded();

  if (useLocalStorage) {
    const projects = JSON.parse(localStorage.getItem('hrms_projects') || '[]');
    const idx = projects.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Project not found');

    projects[idx] = { ...projects[idx], ...projectData };
    localStorage.setItem('hrms_projects', JSON.stringify(projects));
    return projects[idx];
  }

  const { data, error } = await supabase
    .from('projects')
    .update(projectData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteProject = async (id) => {
  await ensureDbChecked();
  ensureLocalDataSeeded();

  if (useLocalStorage) {
    const projects = JSON.parse(localStorage.getItem('hrms_projects') || '[]');
    const filtered = projects.filter(p => p.id !== id);
    localStorage.setItem('hrms_projects', JSON.stringify(filtered));
    return true;
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

// ==========================================
// PROJECT ASSIGNMENT SERVICES
// ==========================================

export const getProjectAssignments = async (projectId, companyId = 1) => {
  await ensureDbChecked();
  ensureLocalDataSeeded();

  // Pre-load active company employees to resolve details dynamically if relation join is null or in local mode
  let activeEmployees = [];
  try {
    activeEmployees = await getUsers(companyId);
  } catch (err) {
    console.warn('Failed to load users for assignments resolution:', err);
  }

  if (useLocalStorage) {
    const assignments = JSON.parse(localStorage.getItem('hrms_project_assignments') || '[]');
    const usersFallback = JSON.parse(localStorage.getItem('hrms_users_fallback') || '[]');
    
    // Combine local fallback list and database loaded users
    const allUsers = [...activeEmployees, ...usersFallback];

    return assignments
      .filter(a => a.project_id === projectId)
      .map(a => {
        const user = allUsers.find(u => u.id === a.user_id);
        return {
          ...a,
          user: user ? {
            id: user.id,
            name: user.name || user.full_name || user.email || 'Employee',
            full_name: user.full_name || user.name || 'Employee',
            email: user.email,
            avatar: user.avatar
          } : null
        };
      });
  }

  const { data, error } = await supabase
    .from('project_assignments')
    .select('*, user:users(id, name, full_name, email, avatar)')
    .eq('project_id', projectId);

  if (error) throw error;

  // Map and resolve nested user profiles
  return data.map(a => {
    let resolvedUser = a.user;
    if (!resolvedUser && a.user_id) {
      resolvedUser = activeEmployees.find(u => u.id === a.user_id) || null;
    }
    return {
      ...a,
      user: resolvedUser ? {
        id: resolvedUser.id,
        name: resolvedUser.name || resolvedUser.full_name || resolvedUser.email || 'Employee',
        full_name: resolvedUser.full_name || resolvedUser.name || 'Employee',
        email: resolvedUser.email,
        avatar: resolvedUser.avatar
      } : null
    };
  });
};

export const assignEmployeeToProject = async (assignmentData) => {
  await ensureDbChecked();
  ensureLocalDataSeeded();

  if (useLocalStorage) {
    const assignments = JSON.parse(localStorage.getItem('hrms_project_assignments') || '[]');
    
    // Check uniqueness
    const exists = assignments.some(a => a.project_id === assignmentData.project_id && a.user_id === assignmentData.user_id);
    if (exists) {
      throw new Error('Employee is already assigned to this project');
    }

    const newAssignment = {
      ...assignmentData,
      id: assignments.length ? Math.max(...assignments.map(a => a.id)) + 1 : 1,
      assigned_at: new Date().toISOString()
    };
    assignments.push(newAssignment);
    localStorage.setItem('hrms_project_assignments', JSON.stringify(assignments));
    return newAssignment;
  }

  const { data, error } = await supabase
    .from('project_assignments')
    .insert([assignmentData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const removeEmployeeFromProject = async (assignmentId) => {
  await ensureDbChecked();
  ensureLocalDataSeeded();

  if (useLocalStorage) {
    const assignments = JSON.parse(localStorage.getItem('hrms_project_assignments') || '[]');
    const filtered = assignments.filter(a => a.id !== assignmentId);
    localStorage.setItem('hrms_project_assignments', JSON.stringify(filtered));
    return true;
  }

  const { error } = await supabase
    .from('project_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) throw error;
  return true;
};

export const getEmployeeAssignments = async (userId) => {
  await ensureDbChecked();
  ensureLocalDataSeeded();

  if (useLocalStorage) {
    const assignments = JSON.parse(localStorage.getItem('hrms_project_assignments') || '[]');
    const projects = JSON.parse(localStorage.getItem('hrms_projects') || '[]');
    const clients = JSON.parse(localStorage.getItem('hrms_clients') || '[]');

    return assignments
      .filter(a => a.user_id === userId)
      .map(a => {
        const project = projects.find(p => p.id === a.project_id);
        let client = null;
        if (project) {
          client = clients.find(c => c.id === project.client_id);
        }

        return {
          ...a,
          project: project ? {
            ...project,
            client: client ? { name: client.name } : null
          } : null
        };
      })
      .filter(a => a.project !== null);
  }

  const { data, error } = await supabase
    .from('project_assignments')
    .select('*, project:projects(*, client:clients(name))')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
};
