import { supabase } from '../utils/supabase';
import { adminApi } from './adminApi';

let useLocalStorage = false;
let dbCheckPromise = null;

const checkDbConnection = async () => {
  try {
    const { error } = await supabase.from('candidates').select('id').limit(1);
    if (error && (error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('42P01'))) {
      console.warn("Supabase candidates table not found. Switching to localStorage fallback.");
      useLocalStorage = true;
    }
  } catch (err) {
    console.warn("Failed to connect to Supabase for candidates. Switching to localStorage fallback.", err);
    useLocalStorage = true;
  }
};

const ensureDbChecked = async () => {
  if (!dbCheckPromise) {
    dbCheckPromise = checkDbConnection();
  }
  await dbCheckPromise;
};

// ----------------------------------------------------
// LOCAL STORAGE SEED SYSTEM
// ----------------------------------------------------
const DEFAULT_CANDIDATES = [
  {
    id: 1,
    name: 'Aisha Sharma',
    email: 'aisha.sharma@example.com',
    phone: '+91 98765 43210',
    department: 'Software Development',
    designation: 'Frontend Developer',
    notice_period: 'Immediate',
    expected_joining_date: '2026-08-01',
    expected_salary: '12,00,000 INR',
    current_salary: '8,50,000 INR',
    status: 'Screening',
    current_round: 1,
    notes: 'Strong resume, active on GitHub. Communication skills are excellent. Good knowledge of React and Vue.',
    companyId: 1,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
  },
  {
    id: 2,
    name: 'Rohan Gupta',
    email: 'rohan.gupta@example.com',
    phone: '+91 87654 32109',
    department: 'Creative Design',
    designation: 'Senior UI/UX Designer',
    notice_period: '30 Days',
    expected_joining_date: '2026-09-01',
    expected_salary: '18,00,000 INR',
    current_salary: '14,00,000 INR',
    status: 'Technical Round',
    current_round: 2,
    notes: 'Portfolio is very impressive. Cleared the design task with high scores. Needs to be interviewed by Creative Director.',
    companyId: 1,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
  },
  {
    id: 3,
    name: 'Emily Watson',
    email: 'emily.w@example.com',
    phone: '+1 (555) 019-2834',
    department: 'Marketing',
    designation: 'Growth Marketer',
    notice_period: '60 Days',
    expected_joining_date: '2026-10-01',
    expected_salary: '$95,000 USD',
    current_salary: '$80,000 USD',
    status: 'HR Round',
    current_round: 4,
    notes: 'Cultural fit is great. Led successful campaigns at her previous startup. Undergoing final review of salary requirements.',
    companyId: 1,
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 4,
    name: 'Vikram Patel',
    email: 'vikram.p@example.com',
    phone: '+91 76543 21098',
    department: 'Software Development',
    designation: 'Backend Engineer',
    notice_period: 'Immediate',
    expected_joining_date: '2026-08-05',
    expected_salary: '16,00,000 INR',
    current_salary: '12,50,000 INR',
    status: 'Hired',
    current_round: 5,
    notes: 'Cleared all rounds with flying colors. Very strong problem-solving skills in Node.js and SQL. Offered rolled out and accepted!',
    companyId: 1,
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 5,
    name: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    phone: '+1 (555) 438-9281',
    department: 'Finance',
    designation: 'Financial Analyst',
    notice_period: '15 Days',
    expected_joining_date: '2026-08-15',
    expected_salary: '$75,000 USD',
    current_salary: '$70,000 USD',
    status: 'Rejected',
    current_round: 2,
    notes: 'Lacks experience in SaaS finance models. Answered core accounting questions incorrectly.',
    companyId: 1,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const seedCandidates = () => {
  if (!localStorage.getItem('hrms_candidates')) {
    localStorage.setItem('hrms_candidates', JSON.stringify(DEFAULT_CANDIDATES));
  }
};

seedCandidates();

// Helper to throw DB errors
const throwIfError = (error) => {
  if (error) {
    console.error('Supabase Recruitment error:', error);
    throw error;
  }
};

// ----------------------------------------------------
// CANDIDATES SERVICE METHODS
// ----------------------------------------------------

export const getCandidates = async (companyId = 1) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const list = JSON.parse(localStorage.getItem('hrms_candidates') || '[]');
    return list.filter(c => c.companyId === companyId);
  }

  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('companyId', companyId)
    .order('created_at', { ascending: false });

  throwIfError(error);
  return data;
};

export const createCandidate = async (payload) => {
  await ensureDbChecked();
  const cleanPayload = {
    ...payload,
    companyId: payload.companyId || 1,
    created_at: new Date().toISOString()
  };

  if (useLocalStorage) {
    const list = JSON.parse(localStorage.getItem('hrms_candidates') || '[]');
    const nextId = list.length > 0 ? Math.max(...list.map(c => typeof c.id === 'number' ? c.id : 0)) + 1 : 1;
    const newCandidate = { ...cleanPayload, id: nextId };
    list.push(newCandidate);
    localStorage.setItem('hrms_candidates', JSON.stringify(list));
    return newCandidate;
  }

  const { data, error } = await supabase
    .from('candidates')
    .insert([cleanPayload])
    .select()
    .single();

  throwIfError(error);
  return data;
};

export const updateCandidate = async (id, payload) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const list = JSON.parse(localStorage.getItem('hrms_candidates') || '[]');
    const index = list.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Candidate not found');
    const updatedCandidate = { ...list[index], ...payload };
    list[index] = updatedCandidate;
    localStorage.setItem('hrms_candidates', JSON.stringify(list));
    return updatedCandidate;
  }

  const { data, error } = await supabase
    .from('candidates')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  throwIfError(error);
  return data;
};

export const deleteCandidate = async (id) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    let list = JSON.parse(localStorage.getItem('hrms_candidates') || '[]');
    list = list.filter(c => c.id !== id);
    localStorage.setItem('hrms_candidates', JSON.stringify(list));
    return true;
  }

  const { error } = await supabase
    .from('candidates')
    .delete()
    .eq('id', id);

  throwIfError(error);
  return true;
};

export const hireCandidate = async (candidate, companyId = 1) => {
  await ensureDbChecked();

  const employeePayload = {
    name: candidate.name,
    full_name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    role: 'Employee',
    companyId: companyId,
    designation: candidate.designation,
    department: candidate.department,
    status: 'active',
    joining_date: candidate.expected_joining_date || new Date().toISOString().split('T')[0],
    password: 'Password123!', // Default temporary password for hired employee
    social_links: { facebook: '', twitter: '', linkedin: '' }
  };

  if (useLocalStorage) {
    const usersListKey = `hrms_users_fallback`;
    const users = JSON.parse(localStorage.getItem(usersListKey) || '[]');
    
    if (!users.some(u => u.email === candidate.email)) {
      const nextId = users.length > 0 ? 'user_' + (users.length + 1) : 'user_1';
      const newEmployee = { 
        ...employeePayload, 
        id: nextId, 
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name)}&background=8A3EEA&color=fff` 
      };
      users.push(newEmployee);
      localStorage.setItem(usersListKey, JSON.stringify(users));
    }

    await updateCandidate(candidate.id, { status: 'Hired' });
    return true;
  }

  // Use the adminApi to create employee, which sets up auth and user profile
  const data = await adminApi.createEmployee(employeePayload);
  await updateCandidate(candidate.id, { status: 'Hired' });
  return data;
};
