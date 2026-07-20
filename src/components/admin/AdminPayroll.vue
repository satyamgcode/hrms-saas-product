<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { adminApi } from '../../services/adminApi';
import { getCurrentSession, getUserProfile, getLeaves } from '../../services/api';
import {
  getSalaryStructures,
  saveSalaryStructure,
  deleteSalaryStructure,
  getEmployeeSalaries,
  saveEmployeeSalary,
  getPayrollRuns,
  createPayrollRun,
  updatePayrollRunStatus,
  getPayslipsByRun,
  bulkSavePayslips,
  calculateBreakdown,
  getSalaryHistory
} from '../../services/payrollService';
import { getAttendanceReport } from '../../services/attendanceService';
import { addToast } from '../../services/toastService';

// Tabs
const activeTab = ref('dashboard');
const tabs = [
  { id: 'dashboard', text: 'Dashboard', icon: 'mdi-view-dashboard' },
  { id: 'structures', text: 'Salary Structures', icon: 'mdi-file-tree' },
  { id: 'assign', text: 'Assign Salaries', icon: 'mdi-account-cash' },
  { id: 'process', text: 'Run Payroll', icon: 'mdi-cash-register' }
];

// Data variables
const loading = ref(true);
const adminCompanyId = ref(1);
const adminUserId = ref(null);
const companyCurrency = ref('USD');
const employees = ref([]);
const structures = ref([]);
const salaries = ref({});
const runs = ref([]);
const leaves = ref([]);
const history = ref([]);

// Selected run variables
const selectedMonth = ref(new Date().toISOString().slice(0, 7)); // "YYYY-MM"
const currentRun = ref(null);
const currentPayslips = ref([]);
const isProcessing = ref(false);

// Modals
const showStructureModal = ref(false);
const structureForm = ref({
  id: null,
  name: '',
  description: '',
  basic_percent: 50,
  hra_percent: 20,
  da_percent: 10,
  special_allowance_percent: 20,
  pf_percent: 12,
  professional_tax: 200,
  tds_percent: 10
});

const showSalaryModal = ref(false);
const salaryForm = ref({
  id: null,
  employeeName: '',
  structure_id: '',
  gross_salary: 0,
  bank_name: '',
  bank_account_no: '',
  bank_ifsc_code: '',
  payment_method: 'Bank Transfer',
  notes: ''
});

// Edit adjustment modal
const showAdjustmentModal = ref(false);
const adjustmentForm = ref({
  employeeId: null,
  employeeName: '',
  other_allowances: 0,
  other_deductions: 0,
  adjustment_notes: ''
});

// Load all data
const loadData = async () => {
  loading.value = true;
  try {
    const session = await getCurrentSession();
    const authUser = session?.user;
    if (authUser) {
      adminUserId.value = authUser.id;
      const profile = await getUserProfile({ userId: authUser.id });
      if (profile) {
        adminCompanyId.value = profile.companyId || 1;
      }
      
      const savedPrefs = localStorage.getItem(`hrms_preferences_${adminCompanyId.value}`);
      if (savedPrefs) {
        try {
          const prefs = JSON.parse(savedPrefs);
          if (prefs.currency) {
            companyCurrency.value = prefs.currency;
          }
        } catch (e) {
          console.error("Failed to parse preferences:", e);
        }
      }
    }

    // Fetch dependencies
    employees.value = await adminApi.getAllEmployees(adminCompanyId.value);
    structures.value = await getSalaryStructures(adminCompanyId.value);
    salaries.value = await getEmployeeSalaries(adminCompanyId.value);
    runs.value = await getPayrollRuns(adminCompanyId.value);
    history.value = await getSalaryHistory(null, adminCompanyId.value);
    
    try {
      leaves.value = await getLeaves({ companyId: adminCompanyId.value });
    } catch (e) {
      console.warn("Could not load leaves for payroll:", e);
    }

    // Initialize current payroll run for selected month
    await loadPayrollRunForMonth();

  } catch (error) {
    console.error('Failed to load payroll data:', error);
  } finally {
    loading.value = false;
  }
};

const loadPayrollRunForMonth = async () => {
  const matchingRun = runs.value.find(r => r.month_year === selectedMonth.value);
  if (matchingRun) {
    currentRun.value = matchingRun;
    currentPayslips.value = await getPayslipsByRun(matchingRun.id);
  } else {
    currentRun.value = null;
    currentPayslips.value = [];
  }
};

onMounted(loadData);

watch(selectedMonth, async () => {
  loading.value = true;
  await loadPayrollRunForMonth();
  loading.value = false;
});

// ----------------------------------------------------
// STRUCTURE ACTIONS
// ----------------------------------------------------
const openAddStructure = () => {
  structureForm.value = {
    id: null,
    name: '',
    description: '',
    basic_percent: 50,
    hra_percent: 20,
    da_percent: 10,
    special_allowance_percent: 20,
    pf_percent: 12,
    professional_tax: 200,
    tds_percent: 10
  };
  showStructureModal.value = true;
};

const openEditStructure = (struct) => {
  structureForm.value = { ...struct };
  showStructureModal.value = true;
};

const handleSaveStructure = async () => {
  const f = structureForm.value;
  const totalPercent = Number(f.basic_percent) + Number(f.hra_percent) + Number(f.da_percent) + Number(f.special_allowance_percent);
  if (totalPercent !== 100) {
    addToast(`Earning percentages must sum to exactly 100%. Current sum: ${totalPercent}%`, 'warning');
    return;
  }

  try {
    const saved = await saveSalaryStructure({
      ...f,
      companyId: adminCompanyId.value
    });
    const idx = structures.value.findIndex(s => s.id === saved.id);
    if (idx !== -1) {
      structures.value[idx] = saved;
    } else {
      structures.value.push(saved);
    }
    showStructureModal.value = false;
  } catch (e) {
    console.error(e);
    addToast('Failed to save structure: ' + e.message, 'error');
  }
};

const handleDeleteStructure = async (id) => {
  if (confirm('Are you sure you want to delete this structure? Employees assigned to it will revert to basic templates.')) {
    try {
      await deleteSalaryStructure(id);
      structures.value = structures.value.filter(s => s.id !== id);
    } catch (e) {
      addToast('Failed to delete structure: ' + e.message, 'error');
    }
  }
};

// Helper to render currency symbols
const getCurrencySymbol = (currency) => {
  return currency === 'INR' ? '₹' : '$';
};

// ----------------------------------------------------
// SALARY ALLOCATION ACTIONS
// ----------------------------------------------------
const openEditSalary = (emp) => {
  const salary = salaries.value[emp.id] || {};
  salaryForm.value = {
    id: emp.id,
    employeeName: emp.name || emp.full_name,
    structure_id: salary.structure_id || (structures.value[0]?.id || ''),
    gross_salary: salary.gross_salary || 3000, // default placeholder gross
    bank_name: salary.bank_name || '',
    bank_account_no: salary.bank_account_no || '',
    bank_ifsc_code: salary.bank_ifsc_code || '',
    payment_method: salary.payment_method || 'Bank Transfer',
    currency: salary.currency || 'USD',
    notes: ''
  };
  showSalaryModal.value = true;
};

// Live Breakdown calculation inside Modal
const liveBreakdown = computed(() => {
  const selectedStruct = structures.value.find(s => s.id === Number(salaryForm.value.structure_id));
  if (!selectedStruct || !salaryForm.value.gross_salary) {
    return { gross_salary: 0, basic_salary: 0, hra: 0, da: 0, special_allowance: 0, pf_deduction: 0, professional_tax: 0, tds_deduction: 0, net_salary: 0 };
  }
  return calculateBreakdown(Number(salaryForm.value.gross_salary), selectedStruct);
});

const handleSaveSalary = async () => {
  try {
    const struct = structures.value.find(s => s.id === Number(salaryForm.value.structure_id));
    if (!struct) {
      addToast('Please select a valid structure template.', 'warning');
      return;
    }

    const calculated = calculateBreakdown(Number(salaryForm.value.gross_salary), struct);

    const payload = {
      id: salaryForm.value.id,
      structure_id: Number(salaryForm.value.structure_id),
      gross_salary: Number(salaryForm.value.gross_salary),
      bank_name: salaryForm.value.bank_name,
      bank_account_no: salaryForm.value.bank_account_no,
      bank_ifsc_code: salaryForm.value.bank_ifsc_code,
      payment_method: salaryForm.value.payment_method,
      currency: salaryForm.value.currency || 'USD',
      notes: salaryForm.value.notes,
      ...calculated
    };

    const saved = await saveEmployeeSalary(payload);
    salaries.value[saved.id] = saved;
    showSalaryModal.value = false;
    
    // Refresh history
    history.value = await getSalaryHistory();
  } catch (e) {
    addToast('Failed to save salary assignment: ' + e.message, 'error');
  }
};

// ----------------------------------------------------
// PAYROLL RUN OPERATIONS
// ----------------------------------------------------
const calculateApprovedLeaves = (userId, monthStr) => {
  if (!leaves.value.length) return 0;
  const startMonth = new Date(monthStr + "-01");
  const endMonth = new Date(new Date(monthStr + "-01").getFullYear(), startMonth.getMonth() + 1, 0);

  return leaves.value.reduce((total, leave) => {
    if (leave.userId === userId && leave.status === 'Approved') {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      
      // Calculate overlapping days
      const overlapStart = leaveStart > startMonth ? leaveStart : startMonth;
      const overlapEnd = leaveEnd < endMonth ? leaveEnd : endMonth;
      
      if (overlapStart <= overlapEnd) {
        const diffTime = Math.abs(overlapEnd - overlapStart);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return total + diffDays;
      }
    }
    return total;
  }, 0);
};

const handleInitiatePayroll = async () => {
  isProcessing.value = true;
  try {
    // 1. Create payroll run record
    const run = await createPayrollRun(selectedMonth.value, adminCompanyId.value);
    
    // Fetch monthly attendance report for all employees to integrate
    const attReport = await getAttendanceReport(selectedMonth.value, adminCompanyId.value);
    const workingDaysCount = attReport.workingDays || 22;

    // 2. Compute payslips for all active employees
    const generatedPayslips = [];
    employees.value.forEach(emp => {
      if (emp.status === 'inactive') return;
      
      const salaryDetails = salaries.value[emp.id];
      const struct = structures.value.find(s => s.id === (salaryDetails?.structure_id || structures.value[0]?.id));
      
      const gross = salaryDetails?.gross_salary || 0;
      const payslipBase = struct ? calculateBreakdown(gross, struct) : {
        gross_salary: gross,
        basic_salary: gross * 0.5,
        hra: gross * 0.2,
        da: gross * 0.1,
        special_allowance: gross * 0.2,
        pf_deduction: gross * 0.5 * 0.12,
        professional_tax: 200,
        tds_deduction: gross * 0.1,
        net_salary: gross - (gross * 0.5 * 0.12 + 200 + gross * 0.1)
      };

      const leavesCount = calculateApprovedLeaves(emp.id, selectedMonth.value);

      // Attendance Deductions logic integration
      const empAtt = attReport.reports?.find(r => r.employeeId === emp.id);
      const absences = empAtt ? empAtt.absences : 0;
      const presentDays = empAtt ? empAtt.presentDays : workingDaysCount;
      const dailyWage = gross / workingDaysCount;
      const unpaidDeduction = Number((dailyWage * absences).toFixed(2));
      
      const finalNetSalary = Number((payslipBase.net_salary - unpaidDeduction).toFixed(2));
      const adjustmentNotes = unpaidDeduction > 0 
        ? `Attendance: ${absences} days absent (Present: ${presentDays}/${workingDaysCount}d)` 
        : 'Full attendance';

      generatedPayslips.push({
        payroll_run_id: run.id,
        userId: emp.id,
        month_year: selectedMonth.value,
        ...payslipBase,
        other_allowances: 0,
        other_deductions: unpaidDeduction,
        net_salary: finalNetSalary,
        adjustment_notes: adjustmentNotes,
        payment_status: 'Pending',
        payment_method: salaryDetails?.payment_method || 'Bank Transfer',
        currency: salaryDetails?.currency || 'USD',
        leaves_taken: leavesCount,
        working_days: workingDaysCount,
        user: emp // keeps a local ref for rendering
      });
    });

    // Save payslips
    const savedPayslips = await bulkSavePayslips(generatedPayslips);
    
    // Refresh local lists
    runs.value = await getPayrollRuns(adminCompanyId.value);
    await loadPayrollRunForMonth();

  } catch (e) {
    addToast('Failed to initiate payroll: ' + e.message, 'error');
  } finally {
    isProcessing.value = false;
  }
};

const openEditAdjustment = (payslip) => {
  adjustmentForm.value = {
    userId: payslip.userId,
    employeeName: payslip.user?.name || payslip.user?.full_name || 'Employee',
    other_allowances: payslip.other_allowances || 0,
    other_deductions: payslip.other_deductions || 0,
    adjustment_notes: payslip.adjustment_notes || ''
  };
  showAdjustmentModal.value = true;
};

const handleSaveAdjustment = async () => {
  try {
    const idx = currentPayslips.value.findIndex(p => p.userId === adjustmentForm.value.userId);
    if (idx !== -1) {
      const p = currentPayslips.value[idx];
      const allowances = Number(adjustmentForm.value.other_allowances);
      const deductions = Number(adjustmentForm.value.other_deductions);
      
      const newNet = Number((p.gross_salary + allowances - (p.pf_deduction + p.professional_tax + p.tds_deduction + deductions)).toFixed(2));
      
      currentPayslips.value[idx] = {
        ...p,
        other_allowances: allowances,
        other_deductions: deductions,
        net_salary: newNet,
        adjustment_notes: adjustmentForm.value.adjustment_notes
      };

      // Bulk save immediately to persist changes
      await bulkSavePayslips(currentPayslips.value);
      showAdjustmentModal.value = false;
    }
  } catch (e) {
    addToast('Failed to save adjustment: ' + e.message, 'error');
  }
};

const handleFinalizePayroll = async (status) => {
  if (confirm(`Are you sure you want to transition this payroll to ${status}?`)) {
    try {
      // Calculate totals
      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;

      currentPayslips.value.forEach(p => {
        totalGross += (Number(p.gross_salary) + Number(p.other_allowances));
        totalDeductions += (Number(p.pf_deduction) + Number(p.professional_tax) + Number(p.tds_deduction) + Number(p.other_deductions));
        totalNet += Number(p.net_salary);
      });

      const totals = {
        total_employees: currentPayslips.value.length,
        total_gross: totalGross,
        total_deductions: totalDeductions,
        total_net: totalNet
      };

      await updatePayrollRunStatus(currentRun.value.id, status, totals);
      
      // Reload runs
      runs.value = await getPayrollRuns(adminCompanyId.value);
      await loadPayrollRunForMonth();
      addToast(`Payroll run status transitioned to ${status} successfully!`, 'success');
    } catch (e) {
      addToast('Failed to finalize payroll status: ' + e.message, 'error');
    }
  }
};

// Helper to format mixed or single currency stats
const formatCurrencyAmount = (usdVal, inrVal) => {
  const parts = [];
  if (usdVal > 0 || (usdVal === 0 && inrVal === 0)) {
    parts.push(`$${Number(usdVal).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`);
  }
  if (inrVal > 0) {
    parts.push(`₹${Number(inrVal).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`);
  }
  return parts.join(' / ');
};

// Dashboard Stats & Graph Allocation
const dashboardStats = computed(() => {
  const activeRuns = runs.value.filter(r => r.status === 'Paid');
  const latestRun = activeRuns[0] || null;
  
  let usdGrossTotal = 0;
  let inrGrossTotal = 0;
  let usdCount = 0;
  let inrCount = 0;
  let activeEmployeeCount = employees.value.filter(e => e.status !== 'inactive').length;

  Object.values(salaries.value).forEach(s => {
    const gross = Number(s.gross_salary || 0);
    if (s.currency === 'INR') {
      inrGrossTotal += gross;
      inrCount++;
    } else {
      usdGrossTotal += gross;
      usdCount++;
    }
  });

  const usdAvg = usdCount > 0 ? (usdGrossTotal / usdCount).toFixed(2) : '0.00';
  const inrAvg = inrCount > 0 ? (inrGrossTotal / inrCount).toFixed(2) : '0.00';

  let averageSalaryStr = '';
  if (usdCount > 0 && inrCount > 0) {
    averageSalaryStr = `$${Number(usdAvg).toLocaleString()} / ₹${Number(inrAvg).toLocaleString()}`;
  } else if (inrCount > 0) {
    averageSalaryStr = `₹${Number(inrAvg).toLocaleString()}`;
  } else {
    averageSalaryStr = `$${Number(usdAvg).toLocaleString()}`;
  }

  let totalGrossPayrollStr = '';
  if (usdGrossTotal > 0 && inrGrossTotal > 0) {
    totalGrossPayrollStr = `$${usdGrossTotal.toLocaleString()} / ₹${inrGrossTotal.toLocaleString()}`;
  } else if (inrGrossTotal > 0) {
    totalGrossPayrollStr = `₹${inrGrossTotal.toLocaleString()}`;
  } else {
    totalGrossPayrollStr = `$${usdGrossTotal.toLocaleString()}`;
  }

  return {
    latestPaidMonth: latestRun ? latestRun.month_year : 'No paid month',
    latestTotalPayout: latestRun ? latestRun.total_net : 0,
    averageSalary: averageSalaryStr,
    totalEmployees: activeEmployeeCount,
    totalGrossPayroll: totalGrossPayrollStr
  };
});

const departmentAllocation = computed(() => {
  const allocation = {};
  
  employees.value.forEach(emp => {
    if (emp.status === 'inactive') return;
    const salary = salaries.value[emp.id];
    const gross = Number(salary?.gross_salary || 0);
    const curr = salary?.currency || 'USD';
    const dept = emp.department || 'General';
    
    if (!allocation[dept]) {
      allocation[dept] = { USD: 0, INR: 0 };
    }
    allocation[dept][curr] += gross;
  });

  return Object.keys(allocation).map(dept => {
    const usdAmt = allocation[dept].USD;
    const inrAmt = allocation[dept].INR;
    
    const amountStr = formatCurrencyAmount(usdAmt, inrAmt);

    const deptEmployees = employees.value.filter(e => e.status !== 'inactive' && (e.department || 'General') === dept).length;
    const totalActive = employees.value.filter(e => e.status !== 'inactive').length;
    const percentage = totalActive ? Math.round((deptEmployees / totalActive) * 100) : 0;

    return {
      name: dept,
      amountStr,
      percentage,
      totalVal: usdAmt + inrAmt // for sorting
    };
  }).sort((a, b) => b.totalVal - a.totalVal);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black tracking-tight text-gray-900">Payroll Management</h1>
        <p class="text-gray-500 font-medium">Define structures, assign compensation, and run monthly payroll cycles.</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm font-bold text-gray-500">Active Month:</span>
        <input v-model="selectedMonth" type="month" 
               class="px-4 py-2 border border-gray-200 rounded-xl font-bold bg-white text-gray-800 focus:ring-2 focus:ring-brand-purple focus:outline-none" />
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex border-b border-gray-200 gap-1 bg-white p-1 rounded-2xl shadow-sm border border-gray-100 max-w-2xl">
      <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
              :class="[
                'flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all flex-1 justify-center whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-brand-purple text-white shadow-md shadow-brand-purple/20'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              ]">
        <i :class="['mdi', tab.icon, 'text-lg']"></i>
        <span>{{ tab.text }}</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
      <span class="animate-spin h-10 w-10 border-4 border-brand-purple border-t-transparent rounded-full"></span>
    </div>

    <div v-else class="space-y-6">
      
      <!-- ==================================================== -->
      <!-- TAB 1: DASHBOARD -->
      <!-- ==================================================== -->
      <div v-if="activeTab === 'dashboard'" class="space-y-6">
        <!-- Metric Grid -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div class="w-10 h-10 rounded-xl bg-purple-50 text-brand-purple flex items-center justify-center mb-4">
              <i class="mdi mdi-cash-multiple text-xl"></i>
            </div>
            <p class="text-2xl font-black text-gray-900">{{ getCurrencySymbol(companyCurrency) }}{{ dashboardStats.latestTotalPayout.toLocaleString() }}</p>
            <p class="text-xs font-bold text-gray-400 uppercase mt-1">Payout ({{ dashboardStats.latestPaidMonth }})</p>
          </div>

          <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div class="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-4">
              <i class="mdi mdi-calculator text-xl"></i>
            </div>
            <p class="text-2xl font-black text-gray-900">{{ dashboardStats.averageSalary }}</p>
            <p class="text-xs font-bold text-gray-400 uppercase mt-1">Average Gross Salary</p>
          </div>

          <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <i class="mdi mdi-account-group text-xl"></i>
            </div>
            <p class="text-2xl font-black text-gray-900">{{ dashboardStats.totalEmployees }}</p>
            <p class="text-xs font-bold text-gray-400 uppercase mt-1">Active Personnel</p>
          </div>

          <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div class="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
              <i class="mdi mdi-bank-transfer text-xl"></i>
            </div>
            <p class="text-2xl font-black text-gray-900">{{ dashboardStats.totalGrossPayroll }}</p>
            <p class="text-xs font-bold text-gray-400 uppercase mt-1">Total Monthly Liability</p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Allocation progress charts -->
          <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm lg:col-span-2">
            <h3 class="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
              <i class="mdi mdi-chart-pie text-brand-purple"></i> Department Allocation
            </h3>
            
            <div class="space-y-5">
              <div v-for="dept in departmentAllocation" :key="dept.name" class="space-y-2">
                <div class="flex items-center justify-between text-sm font-bold text-gray-700">
                  <span>{{ dept.name }}</span>
                  <span>{{ dept.amountStr }} ({{ dept.percentage }}%)</span>
                </div>
                <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full bg-brand-purple rounded-full transition-all duration-500" :style="{ width: `${dept.percentage}%` }"></div>
                </div>
              </div>
              <div v-if="!departmentAllocation.length" class="text-center py-10 text-gray-450 font-bold">
                No active department data.
              </div>
            </div>
          </div>

          <!-- History Runs Log -->
          <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 class="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
              <i class="mdi mdi-history text-brand-purple"></i> Payroll Log
            </h3>
            
            <div class="flow-root">
              <ul role="list" class="-mb-8">
                <li v-for="(run, runIdx) in runs.slice(0, 5)" :key="run.id">
                  <div class="relative pb-8">
                    <span v-if="runIdx !== runs.length - 1" class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-150" aria-hidden="true"></span>
                    <div class="relative flex space-x-3">
                      <div>
                        <span :class="[
                          run.status === 'Paid' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white',
                          'h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white'
                        ]">
                          <i :class="['mdi', run.status === 'Paid' ? 'mdi-check-bold' : 'mdi-clock-outline']"></i>
                        </span>
                      </div>
                      <div class="flex-grow min-w-0 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p class="text-sm font-black text-gray-900">Payroll {{ run.month_year }}</p>
                          <p class="text-xs text-gray-500">Processed: {{ getCurrencySymbol(companyCurrency) }}{{ run.total_net?.toLocaleString() }}</p>
                        </div>
                        <div class="text-right text-xs font-bold text-gray-400">
                          <span :class="[
                            'px-2 py-0.5 rounded-full uppercase text-[10px] font-black tracking-wider',
                            run.status === 'Paid' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                          ]">{{ run.status }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
              <div v-if="!runs.length" class="text-center py-10 text-gray-450 font-bold">
                No runs recorded.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================================================== -->
      <!-- TAB 2: SALARY STRUCTURES -->
      <!-- ==================================================== -->
      <div v-if="activeTab === 'structures'" class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-black text-gray-900">Compensation Templates</h3>
          <button @click="openAddStructure" class="px-4 py-2 bg-brand-purple hover:bg-brand-purple/95 text-white font-bold rounded-xl flex items-center gap-2 text-sm shadow-md">
            <i class="mdi mdi-plus"></i> Add Structure
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div v-for="struct in structures" :key="struct.id" 
               class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative">
            <div>
              <div class="flex items-start justify-between mb-4">
                <div>
                  <h4 class="text-lg font-black text-gray-900">{{ struct.name }}</h4>
                  <p class="text-xs text-gray-400 font-bold mt-0.5">Template ID: {{ struct.id }}</p>
                </div>
                <div class="flex gap-1.5">
                  <button @click="openEditStructure(struct)" class="p-2 bg-gray-50 hover:bg-brand-purple/10 text-gray-500 hover:text-brand-purple rounded-xl border border-gray-200 transition-colors">
                    <i class="mdi mdi-pencil-outline"></i>
                  </button>
                  <button @click="handleDeleteStructure(struct.id)" class="p-2 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-650 rounded-xl border border-gray-200 transition-colors">
                    <i class="mdi mdi-delete-outline"></i>
                  </button>
                </div>
              </div>
              
              <p class="text-sm font-medium text-gray-500 mb-6 leading-relaxed">{{ struct.description || 'No description provided for this template.' }}</p>

              <!-- Components grid -->
              <div class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm font-semibold border-t border-gray-50 pt-4">
                <div class="flex justify-between border-b border-gray-50 pb-1.5">
                  <span class="text-gray-400">Basic Pay:</span>
                  <span class="text-gray-900 font-bold">{{ struct.basic_percent }}%</span>
                </div>
                <div class="flex justify-between border-b border-gray-50 pb-1.5">
                  <span class="text-gray-400">HRA Allowance:</span>
                  <span class="text-gray-900 font-bold">{{ struct.hra_percent }}%</span>
                </div>
                <div class="flex justify-between border-b border-gray-50 pb-1.5">
                  <span class="text-gray-400">DA Allowance:</span>
                  <span class="text-gray-900 font-bold">{{ struct.da_percent }}%</span>
                </div>
                <div class="flex justify-between border-b border-gray-50 pb-1.5">
                  <span class="text-gray-400">Special Allowance:</span>
                  <span class="text-gray-900 font-bold">{{ struct.special_allowance_percent }}%</span>
                </div>
                <div class="flex justify-between border-b border-gray-50 pb-1.5">
                  <span class="text-gray-400">Provident Fund (PF):</span>
                  <span class="text-gray-900 font-bold">{{ struct.pf_percent }}%</span>
                </div>
                <div class="flex justify-between border-b border-gray-50 pb-1.5">
                  <span class="text-gray-400">TDS / Income Tax:</span>
                  <span class="text-gray-900 font-bold">{{ struct.tds_percent }}%</span>
                </div>
                <div class="flex justify-between pb-1.5 col-span-2">
                  <span class="text-gray-400">Professional Tax:</span>
                  <span class="text-gray-900 font-bold">${{ struct.professional_tax }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-if="!structures.length" class="text-center py-20 text-gray-450 font-bold col-span-2 bg-white rounded-3xl border border-gray-100">
            No salary structure templates defined yet.
          </div>
        </div>
      </div>

      <!-- ==================================================== -->
      <!-- TAB 3: ASSIGN SALARIES -->
      <!-- ==================================================== -->
      <div v-if="activeTab === 'assign'" class="space-y-6">
        <div class="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-gray-150 bg-gray-50/50 text-gray-550 text-xs uppercase tracking-wider font-bold">
                <th class="py-4 px-6">Employee</th>
                <th class="py-4 px-6">Template Structure</th>
                <th class="py-4 px-6">Gross Monthly</th>
                <th class="py-4 px-6">Net Monthly (Calc)</th>
                <th class="py-4 px-6">Payment Info</th>
                <th class="py-4 px-6 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 text-sm font-medium">
              <tr v-for="emp in employees.filter(e => e.status !== 'inactive')" :key="emp.id" class="hover:bg-gray-55/40">
                <td class="py-4 px-6 flex items-center gap-3">
                  <img :src="emp.avatar || `https://ui-avatars.com/api/?name=${emp.name}&background=8A3EEA&color=fff`" 
                       class="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-100" />
                  <div>
                    <p class="text-gray-900 font-bold">{{ emp.name || emp.full_name }}</p>
                    <p class="text-xs text-gray-500 font-bold mt-0.5">{{ emp.department || 'HQ Operations' }}</p>
                  </div>
                </td>
                <td class="py-4 px-6 text-gray-700">
                  <span class="inline-flex items-center px-2.5 py-1 bg-purple-50 text-brand-purple text-xs font-bold rounded-lg border border-purple-100">
                    {{ structures.find(s => s.id === salaries[emp.id]?.structure_id)?.name || 'Not Configured' }}
                  </span>
                </td>
                <td class="py-4 px-6 text-gray-900 font-bold">
                  {{ getCurrencySymbol(salaries[emp.id]?.currency) }}{{ salaries[emp.id]?.gross_salary?.toLocaleString() || '0' }}
                </td>
                <td class="py-4 px-6 text-green-600 font-bold">
                  {{ getCurrencySymbol(salaries[emp.id]?.currency) }}{{ salaries[emp.id]?.net_salary?.toLocaleString() || '0' }}
                </td>
                <td class="py-4 px-6">
                  <p class="text-gray-950 font-bold text-xs">{{ salaries[emp.id]?.payment_method || 'N/A' }}</p>
                  <p class="text-xs text-gray-500 mt-0.5 font-bold truncate max-w-[150px]">{{ salaries[emp.id]?.bank_name || 'No bank assigned' }}</p>
                </td>
                <td class="py-4 px-6 text-right">
                  <button @click="openEditSalary(emp)" class="px-3.5 py-1.5 bg-gray-50 hover:bg-brand-purple/10 text-gray-500 hover:text-brand-purple border border-gray-200 hover:border-brand-purple/20 rounded-xl transition-all font-bold text-xs">
                    Assign / Edit
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ==================================================== -->
      <!-- TAB 4: RUN PAYROLL -->
      <!-- ==================================================== -->
      <div v-if="activeTab === 'process'" class="space-y-6">
        <div class="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-brand-purple text-2xl">
              <i class="mdi mdi-calendar-text"></i>
            </div>
            <div>
              <h4 class="text-lg font-black text-gray-900">Payroll Cycle for {{ selectedMonth }}</h4>
              <p class="text-sm font-semibold text-gray-400 mt-0.5">
                Status: 
                <span v-if="currentRun" :class="[
                  'px-2 py-0.5 text-xs rounded-full font-bold uppercase tracking-wider',
                  currentRun.status === 'Paid' ? 'bg-green-50 text-green-600 border border-green-150' : 'bg-orange-50 text-orange-600 border border-orange-150'
                ]">{{ currentRun.status }}</span>
                <span v-else class="text-gray-500 font-bold">Uninitiated</span>
              </p>
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <button v-if="!currentRun" @click="handleInitiatePayroll" :disabled="isProcessing"
                    class="px-5 py-2.5 bg-brand-purple hover:bg-brand-purple/95 disabled:bg-purple-300 text-white rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-all text-sm shadow-md">
              <i class="mdi mdi-play"></i> Initiate Monthly Payroll
            </button>
            <button v-if="currentRun && currentRun.status === 'Draft'" @click="handleFinalizePayroll('Approved')"
                    class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 text-sm shadow-md">
              <i class="mdi mdi-check-decagram"></i> Approve Draft Run
            </button>
            <button v-if="currentRun && currentRun.status === 'Approved'" @click="handleFinalizePayroll('Paid')"
                    class="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center gap-2 text-sm shadow-md">
              <i class="mdi mdi-currency-usd"></i> Release Payout / Mark Paid
            </button>
          </div>
        </div>

        <div v-if="currentRun" class="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-gray-150 bg-gray-50/50 text-gray-550 text-xs uppercase tracking-wider font-bold">
                  <th class="py-4 px-6">Employee</th>
                  <th class="py-4 px-6">Salary Breakdown</th>
                  <th class="py-4 px-6 text-center">Approved Leaves</th>
                  <th class="py-4 px-6">Deductions</th>
                  <th class="py-4 px-6">Custom Adjustments</th>
                  <th class="py-4 px-6">Net Payable</th>
                  <th class="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 text-sm font-medium">
                <tr v-for="ps in currentPayslips" :key="ps.id" class="hover:bg-gray-55/30">
                  <td class="py-4 px-6 flex items-center gap-3">
                    <img :src="ps.user?.avatar || `https://ui-avatars.com/api/?name=${ps.user?.name || 'Employee'}&background=8A3EEA&color=fff`" 
                         class="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-100" />
                    <div>
                      <p class="text-gray-900 font-bold">{{ ps.user?.name || ps.user?.full_name || 'Staff' }}</p>
                      <p class="text-xs text-gray-500 font-bold mt-0.5">{{ ps.user?.designation || 'Staff Member' }}</p>
                    </div>
                  </td>
                  <td class="py-4 px-6">
                    <div class="text-xs space-y-0.5 font-bold text-gray-600">
                      <div>Gross: <span class="text-gray-900">{{ getCurrencySymbol(ps.currency) }}{{ ps.gross_salary?.toLocaleString() }}</span></div>
                      <div>Basic: <span class="text-gray-900">{{ getCurrencySymbol(ps.currency) }}{{ ps.basic_salary?.toLocaleString() }}</span></div>
                      <div>HRA: <span class="text-gray-900">{{ getCurrencySymbol(ps.currency) }}{{ ps.hra?.toLocaleString() }}</span></div>
                    </div>
                  </td>
                  <td class="py-4 px-6 text-center text-gray-900 font-bold">
                    {{ ps.leaves_taken }} days
                  </td>
                  <td class="py-4 px-6">
                    <div class="text-xs space-y-0.5 font-bold text-gray-600">
                      <div>PF: <span class="text-red-500">{{ getCurrencySymbol(ps.currency) }}{{ ps.pf_deduction }}</span></div>
                      <div>TDS: <span class="text-red-500">{{ getCurrencySymbol(ps.currency) }}{{ ps.tds_deduction }}</span></div>
                      <div>PT: <span class="text-red-500">{{ getCurrencySymbol(ps.currency) }}{{ ps.professional_tax }}</span></div>
                    </div>
                  </td>
                  <td class="py-4 px-6">
                    <div class="text-xs space-y-0.5 font-bold text-gray-600" v-if="ps.other_allowances || ps.other_deductions">
                      <div v-if="ps.other_allowances">Allowance: <span class="text-green-600">+{{ getCurrencySymbol(ps.currency) }}{{ ps.other_allowances }}</span></div>
                      <div v-if="ps.other_deductions">Deduction: <span class="text-red-650">-{{ getCurrencySymbol(ps.currency) }}{{ ps.other_deductions }}</span></div>
                      <div class="text-[10px] text-gray-400 italic">{{ ps.adjustment_notes }}</div>
                    </div>
                    <span v-else class="text-gray-400 text-xs italic font-bold">No adjustments</span>
                  </td>
                  <td class="py-4 px-6 text-gray-950 font-black text-base">
                    {{ getCurrencySymbol(ps.currency) }}{{ ps.net_salary?.toLocaleString() }}
                  </td>
                  <td class="py-4 px-6 text-right">
                    <button v-if="currentRun.status === 'Draft'" @click="openEditAdjustment(ps)"
                            class="px-2.5 py-1.5 bg-gray-50 border border-gray-200 text-gray-500 hover:text-brand-purple hover:bg-brand-purple/10 rounded-xl transition-all"
                            title="Add Allowance/Deduction">
                      <i class="mdi mdi-cash-plus text-lg"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else class="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
          <div class="max-w-sm mx-auto space-y-4">
            <div class="w-16 h-16 rounded-full bg-purple-50 text-brand-purple flex items-center justify-center text-3xl mx-auto">
              <i class="mdi mdi-cash-multiple"></i>
            </div>
            <h4 class="text-xl font-black text-gray-900">Payroll Cycle is empty</h4>
            <p class="text-sm font-semibold text-gray-400">You haven't initiated the payroll calculations for the selected month. Click below to begin compiling details.</p>
            <button @click="handleInitiatePayroll" :disabled="isProcessing"
                    class="px-5 py-2.5 bg-brand-purple hover:bg-brand-purple/95 text-white rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-all text-sm mx-auto shadow-md">
              <i class="mdi mdi-play"></i> Compute Payroll Runs
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- ========================================== -->
  <!-- MODAL: ADD/EDIT STRUCTURE -->
  <!-- ========================================== -->
  <div v-if="showStructureModal" class="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-xl w-full border border-gray-150 shadow-2xl p-6 relative animate-fade-in">
      <div class="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
        <h3 class="text-xl font-black text-gray-900">
          {{ structureForm.id ? 'Edit Structure Settings' : 'Create Salary Structure' }}
        </h3>
        <button @click="showStructureModal = false" class="text-gray-400 hover:text-gray-600">
          <i class="mdi mdi-close text-2xl"></i>
        </button>
      </div>

      <form @submit.prevent="handleSaveStructure" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label class="block text-xs font-black uppercase text-gray-450 mb-1.5">Structure Name</label>
            <input v-model="structureForm.name" type="text" placeholder="e.g. Executive Developer" required
                   class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold" />
          </div>
          <div class="col-span-2">
            <label class="block text-xs font-black uppercase text-gray-450 mb-1.5">Description</label>
            <textarea v-model="structureForm.description" rows="2" placeholder="Describe who is assigned to this template..."
                      class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold"></textarea>
          </div>

          <!-- Basic components -->
          <div>
            <label class="block text-xs font-black uppercase text-gray-450 mb-1.5">Basic Pay (% of Gross)</label>
            <input v-model.number="structureForm.basic_percent" type="number" step="0.1" required
                   class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold" />
          </div>
          <div>
            <label class="block text-xs font-black uppercase text-gray-450 mb-1.5">HRA (% of Gross)</label>
            <input v-model.number="structureForm.hra_percent" type="number" step="0.1" required
                   class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold" />
          </div>
          <div>
            <label class="block text-xs font-black uppercase text-gray-450 mb-1.5">DA (% of Gross)</label>
            <input v-model.number="structureForm.da_percent" type="number" step="0.1" required
                   class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold" />
          </div>
          <div>
            <label class="block text-xs font-black uppercase text-gray-450 mb-1.5">Special Allowance (% of Gross)</label>
            <input v-model.number="structureForm.special_allowance_percent" type="number" step="0.1" required
                   class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold" />
          </div>
          
          <!-- Deductions -->
          <div>
            <label class="block text-xs font-black uppercase text-gray-450 mb-1.5">PF Deduction (% of Basic)</label>
            <input v-model.number="structureForm.pf_percent" type="number" step="0.1" required
                   class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold" />
          </div>
          <div>
            <label class="block text-xs font-black uppercase text-gray-450 mb-1.5">TDS / Income Tax (% of Gross)</label>
            <input v-model.number="structureForm.tds_percent" type="number" step="0.1" required
                   class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold" />
          </div>
          <div class="col-span-2">
            <label class="block text-xs font-black uppercase text-gray-450 mb-1.5">Professional Tax (Fixed Cash)</label>
            <input v-model.number="structureForm.professional_tax" type="number" required
                   class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold" />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4 border-t border-gray-150 mt-6">
          <button type="button" @click="showStructureModal = false" class="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold text-sm">Cancel</button>
          <button type="submit" class="px-5 py-2.5 bg-brand-purple text-white rounded-xl font-bold text-sm">Save Structure</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- MODAL: ASSIGN SALARY -->
  <!-- ========================================== -->
  <div v-if="showSalaryModal" class="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-4xl w-full border border-gray-150 shadow-2xl p-6 relative flex flex-col md:flex-row gap-6 animate-fade-in">
      
      <!-- Input fields form -->
      <div class="flex-1 space-y-4">
        <div class="flex items-center justify-between pb-4 border-b border-gray-100 mb-2">
          <h3 class="text-xl font-black text-gray-900">Assign Salary to {{ salaryForm.employeeName }}</h3>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-black uppercase text-gray-450 mb-1.5">Salary Template Structure</label>
            <select v-model="salaryForm.structure_id" required
                    class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold">
              <option v-for="s in structures" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-black uppercase text-gray-450 mb-1.5">Gross Monthly Salary</label>
            <input v-model.number="salaryForm.gross_salary" type="number" required
                   class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold" />
          </div>

          <div class="col-span-2">
            <label class="block text-xs font-black uppercase text-gray-450 mb-1.5">Currency Type</label>
            <select v-model="salaryForm.currency" required
                    class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold">
              <option value="USD">USD ($)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>

          <div class="col-span-2">
            <label class="block text-xs font-black uppercase text-gray-450 mb-1.5">Payment Method</label>
            <select v-model="salaryForm.payment_method"
                    class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold">
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Cash">Cash</option>
            </select>
          </div>

          <!-- Bank Details (Conditional) -->
          <div v-if="salaryForm.payment_method === 'Bank Transfer'" class="col-span-2 grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div>
              <label class="block text-xs font-black uppercase text-gray-400 mb-1">Bank Name</label>
              <input v-model="salaryForm.bank_name" type="text" placeholder="e.g. JPMorgan Chase"
                     class="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-black uppercase text-gray-400 mb-1">Account No</label>
              <input v-model="salaryForm.bank_account_no" type="text" placeholder="e.g. 123456789"
                     class="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-black uppercase text-gray-400 mb-1">Bank IFSC / Swift</label>
              <input v-model="salaryForm.bank_ifsc_code" type="text" placeholder="e.g. JPMC000123"
                     class="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none" />
            </div>
          </div>

          <div class="col-span-2">
            <label class="block text-xs font-black uppercase text-gray-450 mb-1.5">Revision Notes</label>
            <input v-model="salaryForm.notes" type="text" placeholder="e.g. Annual hike, joining assignment"
                   class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold" />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4 border-t border-gray-150 mt-6">
          <button type="button" @click="showSalaryModal = false" class="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold text-sm">Cancel</button>
          <button type="button" @click="handleSaveSalary" class="px-5 py-2.5 bg-brand-purple text-white rounded-xl font-bold text-sm">Save Assignment</button>
        </div>
      </div>

      <!-- Live calculations breakdown display panel -->
      <div class="w-full md:w-80 bg-gray-50 border border-gray-100 rounded-3xl p-6 space-y-4">
        <h4 class="text-sm font-black text-gray-900 uppercase tracking-widest border-b border-gray-200 pb-2">Salary Breakdown</h4>
        
        <div class="space-y-2.5 text-sm font-semibold">
          <div class="flex justify-between text-gray-550 border-b border-gray-200/50 pb-1">
            <span>Gross Monthly:</span>
            <span class="text-gray-900 font-bold">{{ getCurrencySymbol(salaryForm.currency) }}{{ liveBreakdown.gross_salary?.toLocaleString() }}</span>
          </div>
          <div class="flex justify-between text-gray-550 border-b border-gray-200/50 pb-1">
            <span>Basic Pay:</span>
            <span class="text-gray-900 font-bold">{{ getCurrencySymbol(salaryForm.currency) }}{{ liveBreakdown.basic_salary?.toLocaleString() }}</span>
          </div>
          <div class="flex justify-between text-gray-550 border-b border-gray-200/50 pb-1">
            <span>HRA:</span>
            <span class="text-gray-900 font-bold">{{ getCurrencySymbol(salaryForm.currency) }}{{ liveBreakdown.hra?.toLocaleString() }}</span>
          </div>
          <div class="flex justify-between text-gray-550 border-b border-gray-200/50 pb-1">
            <span>DA:</span>
            <span class="text-gray-900 font-bold">{{ getCurrencySymbol(salaryForm.currency) }}{{ liveBreakdown.da?.toLocaleString() }}</span>
          </div>
          <div class="flex justify-between text-gray-550 border-b border-gray-200/50 pb-1">
            <span>Special Allowance:</span>
            <span class="text-gray-900 font-bold">{{ getCurrencySymbol(salaryForm.currency) }}{{ liveBreakdown.special_allowance?.toLocaleString() }}</span>
          </div>

          <div class="pt-2 text-red-500 font-bold">Deductions</div>
          <div class="flex justify-between text-gray-550 border-b border-gray-200/50 pb-1 text-xs">
            <span>Provident Fund (PF):</span>
            <span>-{{ getCurrencySymbol(salaryForm.currency) }}{{ liveBreakdown.pf_deduction }}</span>
          </div>
          <div class="flex justify-between text-gray-550 border-b border-gray-200/50 pb-1 text-xs">
            <span>TDS / Income Tax:</span>
            <span>-{{ getCurrencySymbol(salaryForm.currency) }}{{ liveBreakdown.tds_deduction }}</span>
          </div>
          <div class="flex justify-between text-gray-550 border-b border-gray-200/50 pb-1 text-xs">
            <span>Professional Tax:</span>
            <span>-{{ getCurrencySymbol(salaryForm.currency) }}{{ liveBreakdown.professional_tax }}</span>
          </div>

          <div class="flex justify-between text-base font-black text-gray-900 border-t border-gray-200 pt-3 mt-4">
            <span class="text-brand-purple">Net Payout:</span>
            <span class="text-green-600">{{ getCurrencySymbol(salaryForm.currency) }}{{ liveBreakdown.net_salary?.toLocaleString() }}</span>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- ========================================== -->
  <!-- MODAL: ADD CUSTOM ADJUSTMENTS -->
  <!-- ========================================== -->
  <div v-if="showAdjustmentModal" class="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-md w-full border border-gray-150 shadow-2xl p-6 relative animate-fade-in">
      <div class="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
        <h3 class="text-xl font-black text-gray-900">Adjust Payout: {{ adjustmentForm.employeeName }}</h3>
        <button @click="showAdjustmentModal = false" class="text-gray-400 hover:text-gray-600">
          <i class="mdi mdi-close text-2xl"></i>
        </button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-black uppercase text-gray-450 mb-1.5">Custom Month Allowances (Bonus, etc.)</label>
          <input v-model.number="adjustmentForm.other_allowances" type="number"
                 class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold" />
        </div>
        <div>
          <label class="block text-xs font-black uppercase text-gray-450 mb-1.5">Custom Month Deductions (Loss of Pay, etc.)</label>
          <input v-model.number="adjustmentForm.other_deductions" type="number"
                 class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold" />
        </div>
        <div>
          <label class="block text-xs font-black uppercase text-gray-450 mb-1.5">Adjustment Reasons / Notes</label>
          <input v-model="adjustmentForm.adjustment_notes" type="text" placeholder="e.g. Q2 Performance Bonus"
                 class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold" />
        </div>

        <div class="flex justify-end gap-2 pt-4 border-t border-gray-150 mt-6">
          <button type="button" @click="showAdjustmentModal = false" class="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold text-sm">Cancel</button>
          <button type="button" @click="handleSaveAdjustment" class="px-5 py-2.5 bg-brand-purple text-white rounded-xl font-bold text-sm">Apply Adjustments</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fade-in {
  animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
