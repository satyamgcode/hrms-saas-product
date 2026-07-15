import { supabase } from '../utils/supabase';

// Helper to determine if we fall back to localStorage
let useLocalStorage = false;
let dbCheckPromise = null;

const checkDbConnection = async () => {
  try {
    const { error } = await supabase.from('salary_structures').select('id').limit(1);
    if (error && (error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('42P01'))) {
      console.warn("Supabase payroll tables not found. Switching to localStorage fallback.");
      useLocalStorage = true;
    }
  } catch (err) {
    console.warn("Failed to connect to Supabase. Switching to localStorage fallback.", err);
    useLocalStorage = true;
  }
};

const ensureDbChecked = async () => {
  if (!dbCheckPromise) {
    dbCheckPromise = checkDbConnection();
  }
  await dbCheckPromise;
};

// Seed Local Storage Data
const seedLocalStorage = () => {
  if (!localStorage.getItem('hrms_salary_structures')) {
    const defaultStructures = [
      {
        id: 1,
        name: 'Standard IT Structure',
        description: 'Default structure for engineering and office personnel',
        basic_percent: 50.0,
        hra_percent: 20.0,
        da_percent: 10.0,
        special_allowance_percent: 20.0,
        pf_percent: 12.0,
        professional_tax: 200.0,
        tds_percent: 10.0,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Executive Management Structure',
        description: 'For directors, managers, and executives with higher tax bracket',
        basic_percent: 45.0,
        hra_percent: 25.0,
        da_percent: 10.0,
        special_allowance_percent: 20.0,
        pf_percent: 12.0,
        professional_tax: 200.0,
        tds_percent: 20.0,
        created_at: new Date().toISOString()
      }
    ];
    localStorage.setItem('hrms_salary_structures', JSON.stringify(defaultStructures));
  }

  if (!localStorage.getItem('hrms_employee_salaries')) {
    const defaultSalaries = {};
    localStorage.setItem('hrms_employee_salaries', JSON.stringify(defaultSalaries));
  }

  if (!localStorage.getItem('hrms_payroll_runs')) {
    const defaultRuns = [
      {
        id: 1,
        month_year: '2026-05',
        status: 'Paid',
        total_employees: 2,
        total_gross: 18000,
        total_deductions: 3280,
        total_net: 14720,
        processed_at: '2026-05-30T17:00:00.000Z',
        created_at: '2026-05-30T09:00:00.000Z'
      },
      {
        id: 2,
        month_year: '2026-06',
        status: 'Paid',
        total_employees: 2,
        total_gross: 18000,
        total_deductions: 3280,
        total_net: 14720,
        processed_at: '2026-06-30T17:00:00.000Z',
        created_at: '2026-06-30T09:00:00.000Z'
      }
    ];
    localStorage.setItem('hrms_payroll_runs', JSON.stringify(defaultRuns));
  }

  if (!localStorage.getItem('hrms_payslips')) {
    const defaultPayslips = [
      // June 2026 Payslips
      {
        id: 'mock-ps-1',
        payroll_run_id: 2,
        userId: '1', // Admin Satyam Gupta
        month_year: '2026-06',
        gross_salary: 10000.0,
        basic_salary: 5000.0,
        hra: 2000.0,
        da: 1000.0,
        special_allowance: 2000.0,
        pf_deduction: 600.0,
        professional_tax: 200.0,
        tds_deduction: 1000.0,
        other_allowances: 0.0,
        other_deductions: 0.0,
        net_salary: 8200.0,
        payment_status: 'Paid',
        payment_method: 'Bank Transfer',
        payment_date: '2026-06-30',
        leaves_taken: 1,
        working_days: 30,
        created_at: '2026-06-30T17:00:00.000Z'
      },
      {
        id: 'mock-ps-2',
        payroll_run_id: 2,
        userId: '2', // Employee Jane Doe
        month_year: '2026-06',
        gross_salary: 8000.0,
        basic_salary: 4000.0,
        hra: 1600.0,
        da: 800.0,
        special_allowance: 1600.0,
        pf_deduction: 480.0,
        professional_tax: 200.0,
        tds_deduction: 800.0,
        other_allowances: 0.0,
        other_deductions: 0.0,
        net_salary: 6520.0,
        payment_status: 'Paid',
        payment_method: 'Bank Transfer',
        payment_date: '2026-06-30',
        leaves_taken: 2,
        working_days: 30,
        created_at: '2026-06-30T17:00:00.000Z'
      }
    ];
    localStorage.setItem('hrms_payslips', JSON.stringify(defaultPayslips));
  }

  if (!localStorage.getItem('hrms_salary_history')) {
    const defaultHistory = [];
    localStorage.setItem('hrms_salary_history', JSON.stringify(defaultHistory));
  }
};

// Seed initial data
seedLocalStorage();

// Helper calculation function
export const calculateBreakdown = (gross, structure) => {
  const basic = Number(((gross * (structure.basic_percent ?? 50)) / 100).toFixed(2));
  const hra = Number(((gross * (structure.hra_percent ?? 20)) / 100).toFixed(2));
  const da = Number(((gross * (structure.da_percent ?? 10)) / 100).toFixed(2));
  // Special acts as balance to ensure gross is exact sum
  const special = Number((gross - (basic + hra + da)).toFixed(2));
  
  const pf = Number(((basic * (structure.pf_percent ?? 12)) / 100).toFixed(2));
  const pt = Number((structure.professional_tax ?? 200));
  const tds = Number(((gross * (structure.tds_percent ?? 10)) / 100).toFixed(2));

  return {
    gross_salary: gross,
    basic_salary: basic,
    hra,
    da,
    special_allowance: special,
    pf_deduction: pf,
    professional_tax: pt,
    tds_deduction: tds,
    other_allowances: 0,
    other_deductions: 0,
    net_salary: Number((gross - (pf + pt + tds)).toFixed(2))
  };
};

// ----------------------------------------------------
// SALARY STRUCTURES SERVICE
// ----------------------------------------------------
export const getSalaryStructures = async () => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const list = JSON.parse(localStorage.getItem('hrms_salary_structures') || '[]');
    if (list.length === 0) {
      const defaultStructures = [
        {
          id: 1,
          name: 'Standard IT Structure',
          description: 'Default structure for engineering and office personnel',
          basic_percent: 50.0,
          hra_percent: 20.0,
          da_percent: 10.0,
          special_allowance_percent: 20.0,
          pf_percent: 12.0,
          professional_tax: 200.0,
          tds_percent: 10.0,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Executive Management Structure',
          description: 'For directors, managers, and executives with higher tax bracket',
          basic_percent: 45.0,
          hra_percent: 25.0,
          da_percent: 10.0,
          special_allowance_percent: 20.0,
          pf_percent: 12.0,
          professional_tax: 200.0,
          tds_percent: 20.0,
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('hrms_salary_structures', JSON.stringify(defaultStructures));
      return defaultStructures;
    }
    return list;
  }
  
  const { data, error } = await supabase.from('salary_structures').select('*').order('name');
  if (error) throw error;

  if (data && data.length === 0) {
    const defaultStructures = [
      {
        name: 'Standard IT Structure',
        description: 'Default structure for engineering and office personnel',
        basic_percent: 50.0,
        hra_percent: 20.0,
        da_percent: 10.0,
        special_allowance_percent: 20.0,
        pf_percent: 12.0,
        professional_tax: 200.0,
        tds_percent: 10.0,
        "companyId": 1
      },
      {
        name: 'Executive Management Structure',
        description: 'For directors, managers, and executives with higher tax bracket',
        basic_percent: 45.0,
        hra_percent: 25.0,
        da_percent: 10.0,
        special_allowance_percent: 20.0,
        pf_percent: 12.0,
        professional_tax: 200.0,
        tds_percent: 20.0,
        "companyId": 1
      }
    ];
    const { data: insertedData, error: insertError } = await supabase
      .from('salary_structures')
      .insert(defaultStructures)
      .select();
    if (!insertError && insertedData) {
      return insertedData;
    }
  }

  return data;
};

export const saveSalaryStructure = async (structure) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const list = JSON.parse(localStorage.getItem('hrms_salary_structures') || '[]');
    let saved;
    if (structure.id) {
      const idx = list.findIndex(s => s.id === structure.id);
      saved = { ...list[idx], ...structure, updated_at: new Date().toISOString() };
      list[idx] = saved;
    } else {
      saved = {
        ...structure,
        id: list.length ? Math.max(...list.map(s => s.id)) + 1 : 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      list.push(saved);
    }
    localStorage.setItem('hrms_salary_structures', JSON.stringify(list));
    return saved;
  }

  const { data, error } = await supabase
    .from('salary_structures')
    .upsert({ ...structure, updated_at: new Date().toISOString() })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteSalaryStructure = async (id) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const list = JSON.parse(localStorage.getItem('hrms_salary_structures') || '[]');
    const filtered = list.filter(s => s.id !== id);
    localStorage.setItem('hrms_salary_structures', JSON.stringify(filtered));
    return;
  }

  const { error } = await supabase.from('salary_structures').delete().eq('id', id);
  if (error) throw error;
};

// ----------------------------------------------------
// EMPLOYEE SALARY ALLOCATIONS SERVICE
// ----------------------------------------------------
export const getEmployeeSalaries = async () => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const salaries = JSON.parse(localStorage.getItem('hrms_employee_salaries') || '{}');
    return salaries;
  }

  const { data, error } = await supabase.from('employee_salaries').select('*');
  if (error) throw error;
  
  // Transform into mapping object: { [userId]: salaryObj }
  const mapping = {};
  data.forEach(item => {
    mapping[item.id] = item;
  });
  return mapping;
};

export const getEmployeeSalaryById = async (userId) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const salaries = JSON.parse(localStorage.getItem('hrms_employee_salaries') || '{}');
    return salaries[userId] || null;
  }

  const { data, error } = await supabase
    .from('employee_salaries')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const saveEmployeeSalary = async (salaryAllocation) => {
  await ensureDbChecked();
  const userId = salaryAllocation.id;
  const previousSalary = await getEmployeeSalaryById(userId);

  // Strictly sanitize input to match employee_salaries database schema columns
  const cleanAllocation = {
    id: salaryAllocation.id,
    structure_id: salaryAllocation.structure_id ? Number(salaryAllocation.structure_id) : null,
    gross_salary: Number(salaryAllocation.gross_salary || 0),
    basic_salary: Number(salaryAllocation.basic_salary || 0),
    hra: Number(salaryAllocation.hra || 0),
    da: Number(salaryAllocation.da || 0),
    special_allowance: Number(salaryAllocation.special_allowance || 0),
    pf_deduction: Number(salaryAllocation.pf_deduction || 0),
    professional_tax: Number(salaryAllocation.professional_tax || 0),
    tds_deduction: Number(salaryAllocation.tds_deduction || 0),
    other_allowances: Number(salaryAllocation.other_allowances || 0),
    other_deductions: Number(salaryAllocation.other_deductions || 0),
    net_salary: Number(salaryAllocation.net_salary || 0),
    payment_method: salaryAllocation.payment_method || 'Bank Transfer',
    bank_name: salaryAllocation.bank_name || '',
    bank_account_no: salaryAllocation.bank_account_no || '',
    bank_ifsc_code: salaryAllocation.bank_ifsc_code || '',
    currency: salaryAllocation.currency || 'USD',
    updated_at: new Date().toISOString()
  };

  if (useLocalStorage) {
    const salaries = JSON.parse(localStorage.getItem('hrms_employee_salaries') || '{}');
    const updated = {
      ...previousSalary,
      ...cleanAllocation
    };
    salaries[userId] = updated;
    localStorage.setItem('hrms_employee_salaries', JSON.stringify(salaries));

    // Log Salary History
    const history = JSON.parse(localStorage.getItem('hrms_salary_history') || '[]');
    history.push({
      id: history.length + 1,
      userId,
      previous_gross: previousSalary?.gross_salary || null,
      new_gross: salaryAllocation.gross_salary,
      change_type: previousSalary ? 'Revision' : 'Joining',
      effective_date: new Date().toISOString().split('T')[0],
      notes: salaryAllocation.notes || 'Salary Allocation Updated',
      created_at: new Date().toISOString()
    });
    localStorage.setItem('hrms_salary_history', JSON.stringify(history));

    return updated;
  }

  // Save to Supabase
  const { data, error } = await supabase
    .from('employee_salaries')
    .upsert(cleanAllocation)
    .select()
    .single();

  if (error) throw error;

  // Insert salary history record
  await supabase.from('salary_history').insert({
    userId,
    previous_gross: previousSalary?.gross_salary || null,
    new_gross: salaryAllocation.gross_salary,
    change_type: previousSalary ? 'Revision' : 'Joining',
    effective_date: new Date().toISOString().split('T')[0],
    notes: salaryAllocation.notes || 'Salary Allocation Updated'
  });

  return data;
};

// ----------------------------------------------------
// PAYROLL RUNS SERVICE
// ----------------------------------------------------
export const getPayrollRuns = async () => {
  await ensureDbChecked();
  if (useLocalStorage) {
    return JSON.parse(localStorage.getItem('hrms_payroll_runs') || '[]')
      .sort((a, b) => b.month_year.localeCompare(a.month_year));
  }

  const { data, error } = await supabase
    .from('payroll_runs')
    .select('*')
    .order('month_year', { ascending: false });

  if (error) throw error;
  return data;
};

export const createPayrollRun = async (monthYear) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const list = JSON.parse(localStorage.getItem('hrms_payroll_runs') || '[]');
    const exists = list.find(r => r.month_year === monthYear);
    if (exists) {
      return exists;
    }
    const newRun = {
      id: list.length ? Math.max(...list.map(r => r.id)) + 1 : 1,
      companyId: 1,
      month_year: monthYear,
      status: 'Draft',
      total_employees: 0,
      total_gross: 0,
      total_deductions: 0,
      total_net: 0,
      created_at: new Date().toISOString()
    };
    list.push(newRun);
    localStorage.setItem('hrms_payroll_runs', JSON.stringify(list));
    return newRun;
  }

  const { data, error } = await supabase
    .from('payroll_runs')
    .insert({ month_year: monthYear, status: 'Draft', "companyId": 1 })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updatePayrollRunStatus = async (runId, status, totals = {}) => {
  await ensureDbChecked();
  const processedAt = status === 'Paid' ? new Date().toISOString() : null;

  if (useLocalStorage) {
    const list = JSON.parse(localStorage.getItem('hrms_payroll_runs') || '[]');
    const idx = list.findIndex(r => r.id === Number(runId));
    if (idx !== -1) {
      const updated = {
        ...list[idx],
        status,
        ...totals,
        processed_at: processedAt || list[idx].processed_at,
        updated_at: new Date().toISOString()
      };
      list[idx] = updated;
      localStorage.setItem('hrms_payroll_runs', JSON.stringify(list));

      // If status is updated to Paid, we also update all payslips associated with it to Paid
      if (status === 'Paid') {
        const payslips = JSON.parse(localStorage.getItem('hrms_payslips') || '[]');
        const updatedPayslips = payslips.map(p => {
          if (p.payroll_run_id === Number(runId)) {
            return {
              ...p,
              payment_status: 'Paid',
              payment_date: new Date().toISOString().split('T')[0]
            };
          }
          return p;
        });
        localStorage.setItem('hrms_payslips', JSON.stringify(updatedPayslips));
      }

      return updated;
    }
    throw new Error('Payroll run not found locally');
  }

  const payload = {
    status,
    ...totals,
    updated_at: new Date().toISOString()
  };
  if (processedAt) {
    payload.processed_at = processedAt;
  }

  const { data, error } = await supabase
    .from('payroll_runs')
    .update(payload)
    .eq('id', runId)
    .select()
    .single();

  if (error) throw error;

  if (status === 'Paid') {
    await supabase
      .from('payslips')
      .update({
        payment_status: 'Paid',
        payment_date: new Date().toISOString().split('T')[0]
      })
      .eq('payroll_run_id', runId);
  }

  return data;
};

// ----------------------------------------------------
// EMPLOYEE PAYSLIPS SERVICE
// ----------------------------------------------------
export const getPayslips = async (userId = null) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const list = JSON.parse(localStorage.getItem('hrms_payslips') || '[]');
    if (userId) {
      return list.filter(p => p.userId === userId).sort((a, b) => b.month_year.localeCompare(a.month_year));
    }
    return list.sort((a, b) => b.month_year.localeCompare(a.month_year));
  }

  let query = supabase.from('payslips').select('*, user:users(name, full_name, designation, department, email)');
  if (userId) {
    query = query.eq('userId', userId);
  }

  const { data, error } = await query.order('month_year', { ascending: false });
  if (error) throw error;
  return data;
};

export const getPayslipsByRun = async (runId) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const list = JSON.parse(localStorage.getItem('hrms_payslips') || '[]');
    return list.filter(p => p.payroll_run_id === Number(runId));
  }

  const { data, error } = await supabase
    .from('payslips')
    .select('*, user:users(name, full_name, designation, department, email)')
    .eq('payroll_run_id', runId);

  if (error) throw error;
  return data;
};

export const bulkSavePayslips = async (payslipsList) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const existing = JSON.parse(localStorage.getItem('hrms_payslips') || '[]');
    
    // Remove previous payslips for same run to avoid conflicts
    const runId = payslipsList[0]?.payroll_run_id;
    let filtered = existing;
    if (runId) {
      filtered = existing.filter(p => p.payroll_run_id !== runId);
    }

    const savedList = payslipsList.map((p, idx) => ({
      ...p,
      id: p.id || `mock-ps-${Date.now()}-${idx}`,
      created_at: new Date().toISOString()
    }));

    const merged = [...filtered, ...savedList];
    localStorage.setItem('hrms_payslips', JSON.stringify(merged));
    return savedList;
  }

  // Clean data for DB insertion (make sure user key doesn't get inserted)
  const cleanPayslips = payslipsList.map(p => {
    const item = { ...p };
    delete item.user;
    return item;
  });

  const { data, error } = await supabase
    .from('payslips')
    .upsert(cleanPayslips)
    .select();

  if (error) throw error;
  return data;
};

// ----------------------------------------------------
// SALARY HISTORY SERVICE
// ----------------------------------------------------
export const getSalaryHistory = async (userId = null) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const history = JSON.parse(localStorage.getItem('hrms_salary_history') || '[]');
    if (userId) {
      return history.filter(h => h.userId === userId).sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return history.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  let query = supabase.from('salary_history').select('*');
  if (userId) {
    query = query.eq('userId', userId);
  }
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};
