<script setup>
import { ref, onMounted, computed } from 'vue';
import { getCurrentUser, getUserProfile, getCompany } from '../services/api';
import { getEmployeeSalaryById, getPayslips, getSalaryHistory } from '../services/payrollService';
import EmployeePage from './EmployeePage.vue';

const loading = ref(true);
const currentUser = ref(null);
const userProfile = ref(null);
const employeeSalary = ref(null);
const payslipsList = ref([]);
const salaryRevisions = ref([]);
const companyInfo = ref(null);

// Modal
const showPayslipModal = ref(false);
const selectedPayslip = ref(null);

const loadEmployeePayrollData = async () => {
  loading.value = true;
  try {
    const user = await getCurrentUser();
    if (user) {
      currentUser.value = user;
      const profile = await getUserProfile({ email: user.email });
      if (profile) {
        userProfile.value = profile;
        
        // Fetch company details
        const companyId = profile.companyId || 1;
        companyInfo.value = await getCompany(companyId);
        
        // Fetch payroll data for this specific user
        employeeSalary.value = await getEmployeeSalaryById(profile.id);
        payslipsList.value = await getPayslips(profile.id);
        salaryRevisions.value = await getSalaryHistory(profile.id);
      }
    }
  } catch (error) {
    console.error('Failed to load employee payroll data:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(loadEmployeePayrollData);

// Print handler
const triggerPrint = () => {
  window.print();
};

// Helper to get currency symbols
const getCurrencySymbol = (currency) => {
  return currency === 'INR' ? '₹' : '$';
};

// Convert number to words helper for payslip Net Salary
const numberToWords = (num, currency) => {
  if (!num || num === 0) return 'Zero';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertThreeDigit = (n) => {
    let word = '';
    if (n >= 100) {
      word += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      word += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      word += a[n];
    }
    return word;
  };

  const roundedNum = Math.floor(num);
  let result = '';
  
  if (roundedNum >= 1000000) {
    result += convertThreeDigit(Math.floor(roundedNum / 1000000)) + 'Million ';
  }
  const thousands = Math.floor((roundedNum % 1000000) / 1000);
  if (thousands > 0) {
    result += convertThreeDigit(thousands) + 'Thousand ';
  }
  const rem = roundedNum % 1000;
  if (rem > 0) {
    result += convertThreeDigit(rem);
  }
  
  const cents = Math.round((num - roundedNum) * 100);
  if (cents > 0) {
    const fractionalUnit = currency === 'INR' ? 'Paise' : 'Cents';
    result += 'and ' + convertThreeDigit(cents) + ' ' + fractionalUnit;
  }
  
  const currencyUnit = currency === 'INR' ? 'Rupees Only' : 'Dollars Only';
  return result.trim() + ' ' + currencyUnit;
};

const viewPayslip = (payslip) => {
  selectedPayslip.value = {
    ...payslip,
    employeeName: userProfile.value?.name || userProfile.value?.full_name || currentUser.value?.email,
    designation: userProfile.value?.designation || 'Staff Member',
    department: userProfile.value?.department || 'HQ operations',
    employeeId: userProfile.value?.id || 'N/A'
  };
  showPayslipModal.value = true;
};
</script>

<template>
  <EmployeePage>
    <div v-if="loading" class="flex justify-center items-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
      <span class="animate-spin h-10 w-10 border-4 border-brand-purple border-t-transparent rounded-full"></span>
    </div>

    <div v-else class="space-y-8 print:hidden">
      <!-- 1. Compensation Summary & Bank Details -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Left: Salary Breakdown Card -->
        <div class="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm lg:col-span-2 space-y-6">
          <h3 class="text-xl font-black text-gray-900 flex items-center gap-2">
            <i class="mdi mdi-cash text-brand-purple"></i> Current Compensation Structure
          </h3>
          
          <div v-if="employeeSalary" class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div class="flex justify-between border-b border-gray-50 pb-2">
              <span class="text-gray-450 font-bold">Gross Salary:</span>
              <span class="text-gray-900 font-extrabold text-base">{{ getCurrencySymbol(employeeSalary.currency) }}{{ employeeSalary.gross_salary?.toLocaleString() }} / mo</span>
            </div>
            <div class="flex justify-between border-b border-gray-50 pb-2">
              <span class="text-gray-450 font-bold">Basic Salary:</span>
              <span class="text-gray-900 font-extrabold">{{ getCurrencySymbol(employeeSalary.currency) }}{{ employeeSalary.basic_salary?.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between border-b border-gray-50 pb-2">
              <span class="text-gray-450 font-bold">HRA Allowance:</span>
              <span class="text-gray-900 font-extrabold">{{ getCurrencySymbol(employeeSalary.currency) }}{{ employeeSalary.hra?.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between border-b border-gray-50 pb-2">
              <span class="text-gray-450 font-bold">DA Allowance:</span>
              <span class="text-gray-900 font-extrabold">{{ getCurrencySymbol(employeeSalary.currency) }}{{ employeeSalary.da?.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between border-b border-gray-50 pb-2">
              <span class="text-gray-450 font-bold">Special Allowance:</span>
              <span class="text-gray-900 font-extrabold">{{ getCurrencySymbol(employeeSalary.currency) }}{{ employeeSalary.special_allowance?.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between border-b border-gray-50 pb-2 text-red-500 font-semibold">
              <span>PF Deduction:</span>
              <span>-{{ getCurrencySymbol(employeeSalary.currency) }}{{ employeeSalary.pf_deduction?.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between border-b border-gray-50 pb-2 text-red-500 font-semibold">
              <span>TDS Deduction:</span>
              <span>-{{ getCurrencySymbol(employeeSalary.currency) }}{{ employeeSalary.tds_deduction?.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between border-b border-gray-50 pb-2 text-red-500 font-semibold">
              <span>Professional Tax:</span>
              <span>-{{ getCurrencySymbol(employeeSalary.currency) }}{{ employeeSalary.professional_tax }}</span>
            </div>
            <div class="col-span-2 pt-4 flex justify-between items-center border-t border-gray-100">
              <span class="text-brand-purple font-black text-lg">Net Payable (Calculated Take-Home):</span>
              <span class="text-green-600 font-black text-2xl">{{ getCurrencySymbol(employeeSalary.currency) }}{{ employeeSalary.net_salary?.toLocaleString() }}</span>
            </div>
          </div>

          <div v-else class="text-center py-8 text-gray-400 font-bold">
            <i class="mdi mdi-alert-circle-outline text-3xl mb-2 block"></i>
            Salary structure is not configured for your profile yet. Please contact HR.
          </div>
        </div>

        <!-- Right: Bank details -->
        <div class="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h3 class="text-xl font-black text-gray-900 flex items-center gap-2">
            <i class="mdi mdi-bank text-brand-purple"></i> Bank Transfer Account
          </h3>

          <div v-if="employeeSalary && employeeSalary.payment_method === 'Bank Transfer'" class="space-y-4 font-semibold text-sm">
            <div class="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
              <div class="flex justify-between">
                <span class="text-gray-400 text-xs uppercase">Bank Name</span>
                <span class="text-gray-900">{{ employeeSalary.bank_name || 'N/A' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400 text-xs uppercase">Account No</span>
                <span class="text-gray-900 tracking-wider font-bold">{{ employeeSalary.bank_account_no || 'N/A' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400 text-xs uppercase">IFSC / SWIFT</span>
                <span class="text-gray-900">{{ employeeSalary.bank_ifsc_code || 'N/A' }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2 text-xs text-brand-orange font-bold">
              <i class="mdi mdi-security text-sm"></i>
              <span>Salary will be credited by 30th of every month.</span>
            </div>
          </div>
          
          <div v-else-if="employeeSalary" class="p-4 bg-gray-50 rounded-2xl text-center text-gray-500 font-bold text-sm border border-gray-100">
            <i class="mdi mdi-cash-register text-3xl mb-1 text-gray-400 block"></i>
            Disbursement Method: {{ employeeSalary.payment_method }}
          </div>

          <div v-else class="text-center py-8 text-gray-400 font-bold">
            No disbursement details configured.
          </div>
        </div>
      </div>

      <!-- 2. Payslips Table -->
      <div class="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div class="p-6 border-b border-gray-100">
          <h3 class="text-lg font-black text-gray-900 flex items-center gap-2">
            <i class="mdi mdi-file-document text-brand-purple"></i> Monthly Payslip Statements
          </h3>
        </div>
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-gray-150 bg-gray-50/50 text-gray-550 text-xs uppercase tracking-wider font-bold">
              <th class="py-4 px-6">Pay Period</th>
              <th class="py-4 px-6">Earnings Total</th>
              <th class="py-4 px-6">Deductions</th>
              <th class="py-4 px-6">Net Take-Home</th>
              <th class="py-4 px-6">Status</th>
              <th class="py-4 px-6 text-right">Statements</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 text-sm font-medium">
            <tr v-for="ps in payslipsList" :key="ps.id" class="hover:bg-gray-55/35">
              <td class="py-4 px-6 text-gray-900 font-bold flex items-center gap-2.5">
                <i class="mdi mdi-file-pdf text-red-500 text-xl"></i>
                {{ ps.month_year }}
              </td>
              <td class="py-4 px-6 text-gray-700">
                {{ getCurrencySymbol(ps.currency) }}{{ (Number(ps.gross_salary) + Number(ps.other_allowances || 0)).toLocaleString() }}
              </td>
              <td class="py-4 px-6 text-red-500">
                -{{ getCurrencySymbol(ps.currency) }}{{ (Number(ps.pf_deduction) + Number(ps.professional_tax) + Number(ps.tds_deduction) + Number(ps.other_deductions || 0)).toLocaleString() }}
              </td>
              <td class="py-4 px-6 text-gray-900 font-black">
                {{ getCurrencySymbol(ps.currency) }}{{ ps.net_salary?.toLocaleString() }}
              </td>
              <td class="py-4 px-6">
                <span :class="[
                  'px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider',
                  ps.payment_status === 'Paid' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-orange-50 text-orange-650 border border-orange-100'
                ]">
                  {{ ps.payment_status }}
                </span>
              </td>
              <td class="py-4 px-6 text-right">
                <button @click="viewPayslip(ps)" class="px-3 py-1.5 bg-brand-purple/10 text-brand-purple hover:bg-brand-purple hover:text-white rounded-xl transition-all font-bold text-xs">
                  View Payslip
                </button>
              </td>
            </tr>
            <tr v-if="!payslipsList.length">
              <td colspan="6" class="text-center py-10 text-gray-450 font-bold">
                No payslip history found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 3. Salary Revision History Timeline -->
      <div class="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <h3 class="text-lg font-black text-gray-900 flex items-center gap-2">
          <i class="mdi mdi-chart-line text-brand-purple"></i> Compensation Adjustments History
        </h3>
        
        <div class="relative pl-6 border-l border-gray-150 space-y-6">
          <div v-for="rev in salaryRevisions" :key="rev.id" class="relative">
            <!-- circle point -->
            <div class="absolute -left-[31px] top-1.5 w-4 h-4 bg-brand-purple rounded-full border-2 border-white ring-4 ring-purple-100 shadow-sm"></div>
            
            <div class="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 font-semibold text-sm max-w-2xl">
              <div class="flex items-center justify-between gap-4 mb-2">
                <span class="px-2 py-0.5 bg-purple-50 text-brand-purple text-[10px] font-black uppercase tracking-wider rounded-md">{{ rev.change_type }}</span>
                <span class="text-xs text-gray-400 font-bold">{{ rev.effective_date }}</span>
              </div>
              <p class="text-gray-900 font-bold">
                Gross Salary adjusted from 
                <span class="text-gray-500">{{ getCurrencySymbol(employeeSalary?.currency) }}{{ rev.previous_gross || '0' }}</span> 
                to 
                <span class="text-brand-purple">{{ getCurrencySymbol(employeeSalary?.currency) }}{{ rev.new_gross }}</span>
              </p>
              <p class="text-xs text-gray-450 font-medium mt-1 italic">Note: {{ rev.notes }}</p>
            </div>
          </div>
          <div v-if="!salaryRevisions.length" class="text-gray-450 text-sm font-bold pl-2 py-2">
            No past salary adjustments or increments logged.
          </div>
        </div>
      </div>
    </div>

    <!-- ==================================================== -->
    <!-- PRINTABLE DIGITAL PAYSLIP MODAL -->
    <!-- ==================================================== -->
    <div v-if="showPayslipModal && selectedPayslip" 
         class="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:static print:bg-white print:backdrop-none print:z-auto">
      <div class="bg-white rounded-3xl max-w-3xl w-full border border-gray-150 shadow-2xl p-8 relative flex flex-col justify-between print:border-none print:shadow-none print:rounded-none print:p-0 max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible">
        
        <!-- Modal Controls -->
        <div class="flex items-center justify-between pb-4 border-b border-gray-100 mb-6 print:hidden">
          <h3 class="text-lg font-black text-gray-900 flex items-center gap-1.5">
            <i class="mdi mdi-file-pdf text-red-500 text-xl"></i> Statement Preview
          </h3>
          <div class="flex gap-2">
            <button @click="triggerPrint" class="px-4 py-2 bg-brand-purple hover:bg-brand-purple/95 text-white font-bold rounded-xl flex items-center gap-2 text-sm shadow-md transition-all">
              <i class="mdi mdi-printer"></i> Print Payslip
            </button>
            <button @click="showPayslipModal = false" class="p-2 text-gray-400 hover:text-gray-650 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-250 transition-all">
              <i class="mdi mdi-close text-xl"></i>
            </button>
          </div>
        </div>

        <!-- Real Payslip Content -->
        <div class="space-y-6 print:py-6" id="payslip-print-section">
          <!-- Corporate Header -->
          <div class="flex items-start justify-between border-b-2 border-gray-900 pb-4">
            <div>
              <h2 class="text-2xl font-black text-gray-900 uppercase">{{ companyInfo?.name || 'HRMS' }}</h2>
              <p class="text-xs text-gray-500 font-bold mt-0.5">{{ companyInfo?.address || 'System Address' }}</p>
              <p class="text-xs text-gray-400">{{ companyInfo?.email || 'info@hrms.com' }} | {{ companyInfo?.website || 'www.hrms.com' }}</p>
            </div>
            <div class="text-right">
              <h3 class="text-lg font-black text-gray-900 uppercase tracking-wide">PAYSLIP STATEMENT</h3>
              <p class="text-xs text-brand-purple font-black mt-1 uppercase tracking-wider">MONTH: {{ selectedPayslip.month_year }}</p>
              <div v-if="selectedPayslip.payment_status === 'Paid'" 
                   class="inline-block mt-2 px-3 py-1 bg-green-500 text-white text-xs font-black rounded-lg uppercase tracking-wider shadow-sm select-none border border-green-600">
                PAID
              </div>
            </div>
          </div>

          <!-- Employee and Attendance details -->
          <div class="grid grid-cols-2 gap-6 text-xs border-b border-gray-200 pb-4 font-semibold text-gray-700">
            <div class="space-y-1.5">
              <div>Employee Name: <span class="text-gray-900 font-bold ml-1">{{ selectedPayslip.employeeName }}</span></div>
              <div>Designation: <span class="text-gray-900 font-bold ml-1">{{ selectedPayslip.designation }}</span></div>
              <div>Department: <span class="text-gray-900 font-bold ml-1">{{ selectedPayslip.department }}</span></div>
              <div>Employee ID: <span class="text-gray-900 font-bold ml-1 truncate max-w-[200px] inline-block align-bottom">{{ selectedPayslip.employeeId }}</span></div>
            </div>
            <div class="space-y-1.5 text-right">
              <div>Disbursement Method: <span class="text-gray-900 font-bold ml-1">{{ selectedPayslip.payment_method }}</span></div>
              <div>Period Working Days: <span class="text-gray-900 font-bold ml-1">{{ selectedPayslip.working_days }} Days</span></div>
              <div>Leaves Taken: <span class="text-gray-900 font-bold ml-1">{{ selectedPayslip.leaves_taken }} Days</span></div>
              <div>Paid Pay Days: <span class="text-gray-900 font-bold ml-1">{{ selectedPayslip.working_days - selectedPayslip.leaves_taken }} Days</span></div>
            </div>
          </div>

          <!-- Earnings vs Deductions Table -->
          <div class="border border-gray-300 rounded-xl overflow-hidden font-semibold text-xs">
            <div class="grid grid-cols-2 bg-gray-50 border-b border-gray-300 text-gray-800 font-black uppercase text-[10px] tracking-widest">
              <div class="py-2.5 px-4 border-r border-gray-300">Earnings Components</div>
              <div class="py-2.5 px-4">Deductions Components</div>
            </div>
            <div class="grid grid-cols-2 divide-x divide-gray-300 min-h-[160px] text-gray-700">
              <!-- Earnings list -->
              <div class="p-4 space-y-2">
                <div class="flex justify-between">
                  <span>Basic Salary</span>
                  <span class="text-gray-900">{{ getCurrencySymbol(selectedPayslip.currency) }}{{ selectedPayslip.basic_salary?.toLocaleString() }}</span>
                </div>
                <div class="flex justify-between">
                  <span>House Rent Allowance (HRA)</span>
                  <span class="text-gray-900">{{ getCurrencySymbol(selectedPayslip.currency) }}{{ selectedPayslip.hra?.toLocaleString() }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Dearness Allowance (DA)</span>
                  <span class="text-gray-900">{{ getCurrencySymbol(selectedPayslip.currency) }}{{ selectedPayslip.da?.toLocaleString() }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Special Allowance</span>
                  <span class="text-gray-900">{{ getCurrencySymbol(selectedPayslip.currency) }}{{ selectedPayslip.special_allowance?.toLocaleString() }}</span>
                </div>
                <div v-if="selectedPayslip.other_allowances" class="flex justify-between text-green-600 font-bold">
                  <span>Custom Month Allowance</span>
                  <span>+{{ getCurrencySymbol(selectedPayslip.currency) }}{{ selectedPayslip.other_allowances?.toLocaleString() }}</span>
                </div>
              </div>
              
              <!-- Deductions list -->
              <div class="p-4 space-y-2">
                <div class="flex justify-between">
                  <span>Provident Fund (PF)</span>
                  <span class="text-gray-900">-{{ getCurrencySymbol(selectedPayslip.currency) }}{{ selectedPayslip.pf_deduction?.toLocaleString() }}</span>
                </div>
                <div class="flex justify-between">
                  <span>TDS / Income Tax</span>
                  <span class="text-gray-900">-{{ getCurrencySymbol(selectedPayslip.currency) }}{{ selectedPayslip.tds_deduction?.toLocaleString() }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Professional Tax</span>
                  <span class="text-gray-900">-{{ getCurrencySymbol(selectedPayslip.currency) }}{{ selectedPayslip.professional_tax }}</span>
                </div>
                <div v-if="selectedPayslip.other_deductions" class="flex justify-between text-red-500 font-bold">
                  <span>Custom Month Deductions</span>
                  <span>-{{ getCurrencySymbol(selectedPayslip.currency) }}{{ selectedPayslip.other_deductions?.toLocaleString() }}</span>
                </div>
              </div>
            </div>

            <!-- Summary Totals -->
            <div class="grid grid-cols-2 border-t border-gray-300 font-black text-gray-900">
              <div class="py-2.5 px-4 flex justify-between border-r border-gray-300 bg-gray-50/50">
                <span>Total Earnings:</span>
                <span>{{ getCurrencySymbol(selectedPayslip.currency) }}{{ (Number(selectedPayslip.gross_salary) + Number(selectedPayslip.other_allowances || 0)).toLocaleString() }}</span>
              </div>
              <div class="py-2.5 px-4 flex justify-between bg-gray-50/50">
                <span>Total Deductions:</span>
                <span>-{{ getCurrencySymbol(selectedPayslip.currency) }}{{ (Number(selectedPayslip.pf_deduction) + Number(selectedPayslip.professional_tax) + Number(selectedPayslip.tds_deduction) + Number(selectedPayslip.other_deductions || 0)).toLocaleString() }}</span>
              </div>
            </div>
          </div>

          <!-- Net Payout Panel -->
          <div class="bg-gray-900 text-white rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 font-black">
            <div>
              <p class="text-[10px] text-gray-400 uppercase tracking-widest">Net Take-Home Payable</p>
              <p class="text-sm text-gray-250 italic font-bold mt-1">{{ numberToWords(selectedPayslip.net_salary, selectedPayslip.currency) }}</p>
            </div>
            <div class="text-right">
              <p class="text-2xl text-green-400">{{ getCurrencySymbol(selectedPayslip.currency) }}{{ selectedPayslip.net_salary?.toLocaleString() }}</p>
            </div>
          </div>

          <!-- Signature footer -->
          <div class="flex items-end justify-between pt-10 text-[10px] font-bold text-gray-400">
            <div class="text-center w-36">
              <div class="border-b border-gray-300 pb-1 text-gray-700">{{ selectedPayslip.employeeName }}</div>
              <p class="mt-1">Employee Signature</p>
            </div>
            <div class="text-center w-36">
              <div class="border-b border-gray-300 pb-1 text-gray-700">HR payroll dept</div>
              <p class="mt-1">Authorized Signatory</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  </EmployeePage>
</template>

<style>
/* CSS Print Styles to isolate the payslip preview */
@media print {
  body * {
    visibility: hidden;
  }
  #payslip-print-section, #payslip-print-section * {
    visibility: visible;
  }
  #payslip-print-section {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    border: none !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  .print\:hidden {
    display: none !important;
  }
  .print\:p-0 {
    padding: 0 !important;
  }
  .print\:static {
    position: static !important;
  }
  .print\:bg-white {
    background-color: white !important;
  }
  .print\:border-none {
    border: none !important;
  }
  .print\:shadow-none {
    box-shadow: none !important;
  }
  .print\:rounded-none {
    border-radius: 0 !important;
  }
}
</style>
