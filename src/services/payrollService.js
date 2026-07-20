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
    const defaultRuns = [];
    localStorage.setItem('hrms_payroll_runs', JSON.stringify(defaultRuns));
  }

  if (!localStorage.getItem('hrms_payslips')) {
    const defaultPayslips = [];
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
  if (gross <= 0) {
    return {
      gross_salary: 0,
      basic_salary: 0,
      hra: 0,
      da: 0,
      special_allowance: 0,
      pf_deduction: 0,
      professional_tax: 0,
      tds_deduction: 0,
      other_allowances: 0,
      other_deductions: 0,
      net_salary: 0
    };
  }
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
    net_salary: Number(Math.max(0, gross - (pf + pt + tds)).toFixed(2))
  };
};

// ----------------------------------------------------
// SALARY STRUCTURES SERVICE
// ----------------------------------------------------
export const getSalaryStructures = async (companyId) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const list = JSON.parse(localStorage.getItem('hrms_salary_structures') || '[]');
    if (companyId) {
      return list.filter(s => s.companyId === companyId);
    }
    return list;
  }
  
  let finalCompanyId = companyId;
  if (!finalCompanyId) {
    const session = await getCurrentSession();
    const authUser = session?.user;
    if (authUser) {
      const profile = await getUserProfile({ userId: authUser.id });
      finalCompanyId = profile?.companyId;
    }
  }

  if (!finalCompanyId) {
    return [];
  }

  const { data, error } = await supabase
    .from('salary_structures')
    .select('*')
    .eq('companyId', finalCompanyId)
    .order('name');
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
        "companyId": finalCompanyId
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
        "companyId": finalCompanyId
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
export const getEmployeeSalaries = async (companyId) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const salaries = JSON.parse(localStorage.getItem('hrms_employee_salaries') || '{}');
    return salaries;
  }

  if (!companyId) {
    return {};
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, employee_salaries(*)')
    .eq('companyId', companyId);
  if (error) throw error;
  
  // Transform into mapping object: { [userId]: salaryObj }
  const mapping = {};
  if (data) {
    data.forEach(user => {
      if (user.employee_salaries) {
        // PostgREST returns a single object or an array. In a 1-to-1 relationship, it is returned as an object.
        // Let's handle both cases just in case.
        const salary = Array.isArray(user.employee_salaries) ? user.employee_salaries[0] : user.employee_salaries;
        if (salary) {
          mapping[user.id] = salary;
        }
      }
    });
  }
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
export const getPayrollRuns = async (companyId) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const list = JSON.parse(localStorage.getItem('hrms_payroll_runs') || '[]');
    if (companyId) {
      return list.filter(r => r.companyId === companyId)
        .sort((a, b) => b.month_year.localeCompare(a.month_year));
    }
    return list.sort((a, b) => b.month_year.localeCompare(a.month_year));
  }

  if (!companyId) {
    return [];
  }

  const { data, error } = await supabase
    .from('payroll_runs')
    .select('*')
    .eq('companyId', companyId)
    .order('month_year', { ascending: false });

  if (error) throw error;
  return data;
};

export const createPayrollRun = async (monthYear, companyId) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const list = JSON.parse(localStorage.getItem('hrms_payroll_runs') || '[]');
    const exists = list.find(r => r.month_year === monthYear && r.companyId === companyId);
    if (exists) {
      return exists;
    }
    const newRun = {
      id: list.length ? Math.max(...list.map(r => r.id)) + 1 : 1,
      companyId: companyId || 1,
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

  if (!companyId) {
    throw new Error('companyId is required to create a payroll run.');
  }

  // Check if a run already exists for this company and month
  const { data: existingRun, error: checkError } = await supabase
    .from('payroll_runs')
    .select('*')
    .eq('companyId', companyId)
    .eq('month_year', monthYear)
    .maybeSingle();

  if (existingRun) {
    return existingRun;
  }

  const { data, error } = await supabase
    .from('payroll_runs')
    .insert({ month_year: monthYear, status: 'Draft', "companyId": companyId })
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

  if (cleanPayslips.length === 0) {
    return [];
  }

  let { data, error } = await supabase
    .from('payslips')
    .upsert(cleanPayslips, { onConflict: 'userId,month_year' })
    .select();

  if (error && (error.message?.includes('adjustment_notes') || error.details?.includes('adjustment_notes') || error.message?.includes('schema cache'))) {
    console.warn("Column 'adjustment_notes' is missing or not cached in 'payslips' table. Retrying without it.");
    const cleanWithoutNotes = cleanPayslips.map(p => {
      const item = { ...p };
      delete item.adjustment_notes;
      return item;
    });
    const retryResult = await supabase
      .from('payslips')
      .upsert(cleanWithoutNotes, { onConflict: 'userId,month_year' })
      .select();
    
    if (retryResult.error) throw retryResult.error;
    
    if (retryResult.data) {
      retryResult.data = retryResult.data.map((item, idx) => ({
        ...item,
        adjustment_notes: cleanPayslips[idx]?.adjustment_notes || ''
      }));
    }
    return retryResult.data;
  }

  if (error) throw error;
  return data;
};

// ----------------------------------------------------
// SALARY HISTORY SERVICE
// ----------------------------------------------------
export const getSalaryHistory = async (userId = null, companyId = null) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const history = JSON.parse(localStorage.getItem('hrms_salary_history') || '[]');
    if (userId) {
      return history.filter(h => h.userId === userId).sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return history.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  if (userId) {
    const { data, error } = await supabase
      .from('salary_history')
      .select('*')
      .eq('userId', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  if (!companyId) {
    return [];
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, salary_history(*)')
    .eq('companyId', companyId);
  if (error) throw error;

  const list = [];
  if (data) {
    data.forEach(user => {
      if (Array.isArray(user.salary_history)) {
        list.push(...user.salary_history);
      }
    });
  }
  return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};
