<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { adminApi } from '../../services/adminApi';
import { getCurrentSession, getUserProfile } from '../../services/api';
import {
  getShifts,
  saveShift,
  deleteShift,
  assignShiftToEmployee,
  getAllAttendanceToday,
  getPendingCorrections,
  reviewCorrection,
  getAttendanceReport
} from '../../services/attendanceService';
import { addToast } from '../../services/toastService';

// Tabs
const activeTab = ref('monitor');
const tabs = [
  { id: 'monitor', text: 'Real-time Monitor', icon: 'mdi-monitor' },
  { id: 'corrections', text: 'Correction Requests', icon: 'mdi-clipboard-check-outline' },
  { id: 'reports', text: 'Monthly Reports', icon: 'mdi-file-chart-outline' },
  { id: 'shifts', text: 'Shift Configuration', icon: 'mdi-calendar-clock' }
];

// Core state variables
const loading = ref(true);
const adminCompanyId = ref(1);
const adminUserId = ref(null);
const employees = ref([]);
const shifts = ref([]);

// Real-time monitor data
const monitorList = ref([]);

// Corrections data
const pendingCorrections = ref([]);
const reviewComments = ref({});

// Reports data
const selectedMonth = ref(new Date().toISOString().slice(0, 7)); // "YYYY-MM"
const reportSummary = ref({ workingDays: 20, totalDays: 31, reports: [] });
const reportSearch = ref('');
const reportDeptFilter = ref('');

// Shift management data
const showShiftModal = ref(false);
const shiftForm = ref({
  id: null,
  name: '',
  start_time: '09:00:00',
  end_time: '18:00:00',
  late_buffer: 15
});

// Load core dependencies
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
    }

    // Fetch lists
    employees.value = await adminApi.getAllEmployees(adminCompanyId.value);
    shifts.value = await getShifts(adminCompanyId.value);

    // Load active tab data
    await loadTabSpecificData();
  } catch (error) {
    console.error('Failed to load admin attendance data:', error);
  } finally {
    loading.value = false;
  }
};

const loadTabSpecificData = async () => {
  if (activeTab.value === 'monitor') {
    monitorList.value = await getAllAttendanceToday(adminCompanyId.value);
  } else if (activeTab.value === 'corrections') {
    pendingCorrections.value = (await getPendingCorrections(adminCompanyId.value)) || [];
    // Initialize review comment state
    pendingCorrections.value.forEach(c => {
      reviewComments.value[c.id] = '';
    });
  } else if (activeTab.value === 'reports') {
    reportSummary.value = await getAttendanceReport(selectedMonth.value, adminCompanyId.value);
  }
};

onMounted(loadData);

watch(activeTab, async () => {
  loading.value = true;
  try {
    await loadTabSpecificData();
  } catch (err) {
    console.error('Failed to load tab specific attendance data:', err);
  } finally {
    loading.value = false;
  }
});

watch(selectedMonth, async () => {
  if (activeTab.value === 'reports') {
    loading.value = true;
    try {
      reportSummary.value = await getAttendanceReport(selectedMonth.value, adminCompanyId.value);
    } catch (err) {
      console.error('Failed to load attendance report for month:', err);
    } finally {
      loading.value = false;
    }
  }
});

// ----------------------------------------------------
// MONITOR OPERATIONS
// ----------------------------------------------------
const monitorStats = computed(() => {
  const list = monitorList.value;
  const total = list.length;
  const present = list.filter(l => l.status === 'Present' || l.status === 'Late' || l.status === 'On Break').length;
  const late = list.filter(l => l.status === 'Late').length;
  const breaks = list.filter(l => l.status === 'On Break' || l.active_break).length;
  const absent = list.filter(l => l.status === 'Absent' || !l.clock_in).length;

  return { total, present, late, breaks, absent };
});

const formatTime = (isoString) => {
  if (!isoString) return '--:--';
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ----------------------------------------------------
// CORRECTION OPERATIONS
// ----------------------------------------------------
const handleCorrectionReview = async (correctionId, status, targetUserId) => {
  const comments = reviewComments.value[correctionId] || '';
  if (status === 'Rejected' && !comments.trim()) {
    addToast('Please enter a rejection comment to explain the decision.', 'warning');
    return;
  }

  if (confirm(`Are you sure you want to mark this request as ${status}?`)) {
    try {
      await reviewCorrection(correctionId, status, comments, adminUserId.value, targetUserId);
      addToast(`Correction request has been ${status.toLowerCase()} successfully!`, 'success');
      // Reload tab list
      pendingCorrections.value = await getPendingCorrections(adminCompanyId.value);
    } catch (e) {
      addToast('Failed to update correction status: ' + e.message, 'error');
    }
  }
};

// ----------------------------------------------------
// REPORTS OPERATIONS
// ----------------------------------------------------
const departments = computed(() => {
  const depts = new Set(employees.value.map(e => e.department || 'General'));
  return Array.from(depts);
});

const filteredReports = computed(() => {
  let reportsList = reportSummary.value.reports || [];

  if (reportSearch.value) {
    const q = reportSearch.value.toLowerCase();
    reportsList = reportsList.filter(r => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }

  if (reportDeptFilter.value) {
    reportsList = reportsList.filter(r => r.department === reportDeptFilter.value);
  }

  return reportsList;
});

// CSV Export
const exportReportCSV = () => {
  const reportsList = filteredReports.value;
  if (!reportsList.length) {
    addToast('No report logs available to export.', 'warning');
    return;
  }

  // Header row
  let csvContent = "Employee,Email,Department,Working Days,Days Present,Late Days,Half Days,Absences,Work Hours,Break Hours,Est. Payroll Deduction\n";

  reportsList.forEach(r => {
    // Basic calculation for mockup: let's estimate payroll deductions to include in CSV
    // Deduction = (Assigned Salary / Working Days) * Absences
    // For general report, we show details.
    const row = [
      `"${r.name}"`,
      `"${r.email}"`,
      `"${r.department}"`,
      r.workingDays,
      r.presentDays,
      r.lateCount,
      r.halfDays,
      r.absences,
      r.totalWorkingHours,
      r.totalBreakHours,
      `$${(r.absences * 100).toFixed(0)}` // Mock Estimated Deduction in CSV
    ];
    csvContent += row.join(",") + "\n";
  });

  // Download trigger
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `attendance_report_${selectedMonth.value}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ----------------------------------------------------
// SHIFT CONFIGURATION OPERATIONS
// ----------------------------------------------------
const openAddShift = () => {
  shiftForm.value = {
    id: null,
    name: '',
    start_time: '09:00:00',
    end_time: '18:00:00',
    late_buffer: 15
  };
  showShiftModal.value = true;
};

const openEditShift = (shift) => {
  shiftForm.value = {
    id: shift.id,
    name: shift.name,
    start_time: shift.start_time,
    end_time: shift.end_time,
    late_buffer: shift.late_buffer
  };
  showShiftModal.value = true;
};

const handleSaveShift = async () => {
  if (!shiftForm.value.name || !shiftForm.value.start_time || !shiftForm.value.end_time) {
    addToast('Please fill out all shift settings fields.', 'warning');
    return;
  }

  try {
    const payload = {
      ...shiftForm.value,
      companyId: adminCompanyId.value
    };
    await saveShift(payload);
    addToast('Shift settings saved successfully!', 'success');
    shifts.value = await getShifts(adminCompanyId.value);
    showShiftModal.value = false;
  } catch (e) {
    addToast('Failed to save shift: ' + e.message, 'error');
  }
};

const handleDeleteShift = async (id) => {
  if (confirm('Are you sure you want to delete this shift? Active employees assigned to it will default to General Shift.')) {
    try {
      await deleteShift(id);
      shifts.value = await getShifts(adminCompanyId.value);
      addToast('Shift deleted successfully.', 'success');
    } catch (e) {
      addToast('Failed to delete shift: ' + e.message, 'error');
    }
  }
};

// Assign Shift to Employee
const handleAssignShift = async (empId, shiftId) => {
  try {
    await assignShiftToEmployee(empId, shiftId);

    // Update local state in employees list
    const idx = employees.value.findIndex(e => e.id === empId);
    if (idx !== -1) {
      employees.value[idx].shift_id = shiftId;
    }
    addToast('Shift assigned to employee successfully!', 'success');
  } catch (e) {
    addToast('Failed to assign shift: ' + e.message, 'error');
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black tracking-tight text-gray-900">Attendance Management</h1>
        <p class="text-gray-500 font-medium">Configure shifts, monitor active logs, review corrections, and compile
          reports.</p>
      </div>
      <!-- Month filter for reports layout -->
      <div v-if="activeTab === 'reports'" class="flex items-center gap-2">
        <span class="text-sm font-bold text-gray-500">Selected Month:</span>
        <input v-model="selectedMonth" type="month"
          class="px-4 py-2 border border-gray-200 rounded-xl font-bold bg-white text-gray-800 focus:ring-2 focus:ring-brand-purple focus:outline-none" />
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div
      class="flex border-b border-gray-200 gap-1 bg-white p-1 rounded-2xl shadow-sm border border-gray-100 max-w-fit overflow-x-hidden">
      <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id" :class="[
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
    <div v-if="loading"
      class="flex justify-center items-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
      <span class="animate-spin h-10 w-10 border-4 border-brand-purple border-t-transparent rounded-full"></span>
    </div>

    <div v-else class="space-y-6">

      <!-- ==================================================== -->
      <!-- TAB 1: REAL-TIME MONITOR -->
      <!-- ==================================================== -->
      <div v-if="activeTab === 'monitor'" class="space-y-6">
        <!-- Stats widget -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div class="w-10 h-10 rounded-xl bg-purple-50 text-brand-purple flex items-center justify-center mb-3">
              <i class="mdi mdi-account-group text-xl"></i>
            </div>
            <p class="text-2xl font-black text-gray-900">{{ monitorStats.total }}</p>
            <p class="text-xs font-bold text-gray-400 uppercase mt-0.5">Total Personnel</p>
          </div>

          <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div class="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-3">
              <i class="mdi mdi-account-check text-xl"></i>
            </div>
            <p class="text-2xl font-black text-green-600">{{ monitorStats.present }}</p>
            <p class="text-xs font-bold text-gray-400 uppercase mt-0.5">Present Today</p>
          </div>

          <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div class="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3">
              <i class="mdi mdi-clock-alert text-xl"></i>
            </div>
            <p class="text-2xl font-black text-orange-650">{{ monitorStats.late }}</p>
            <p class="text-xs font-bold text-gray-400 uppercase mt-0.5">Late Clock-Ins</p>
          </div>

          <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div class="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center mb-3">
              <i class="mdi mdi-pause-circle text-xl"></i>
            </div>
            <p class="text-2xl font-black text-yellow-600">{{ monitorStats.breaks }}</p>
            <p class="text-xs font-bold text-gray-400 uppercase mt-0.5">Active Breaks</p>
          </div>

          <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div class="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <i class="mdi mdi-account-minus text-xl"></i>
            </div>
            <p class="text-2xl font-black text-red-650">{{ monitorStats.absent }}</p>
            <p class="text-xs font-bold text-gray-400 uppercase mt-0.5">Absent / Out</p>
          </div>
        </div>

        <!-- Monitoring list table -->
        <div class="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div class="p-6 border-b border-gray-50 bg-gray-50/20">
            <h3 class="text-lg font-black text-gray-900">Today's active logs</h3>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-gray-100 text-gray-400 text-xs font-black uppercase bg-gray-50/50">
                  <th class="py-4 px-6">Employee</th>
                  <th class="py-4 px-6">Shift Assigned</th>
                  <th class="py-4 px-6">Clock In Time</th>
                  <th class="py-4 px-6">Clock Out Time</th>
                  <th class="py-4 px-6">Hours Worked</th>
                  <th class="py-4 px-6">Status Today</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50 text-sm font-semibold text-gray-700">
                <tr v-for="item in monitorList" :key="item.userId" class="hover:bg-gray-50/50">
                  <td class="py-4 px-6 flex items-center gap-3">
                    <img :src="`https://ui-avatars.com/api/?name=${item.user?.name}&background=8A3EEA&color=fff`"
                      alt="Avatar" class="w-9 h-9 rounded-full border border-gray-100" />
                    <div>
                      <p class="font-bold text-gray-900">{{ item.user?.name }}</p>
                      <p class="text-xs text-gray-400 font-medium">{{ item.user?.email }}</p>
                    </div>
                  </td>
                  <td class="py-4 px-6 text-xs font-bold">
                    {{shifts.find(s => s.id === (employees.find(e => e.id === item.userId)?.shift_id || 1))?.name ||
                      'General Shift'}}
                  </td>
                  <td class="py-4 px-6 font-mono text-xs">{{ formatTime(item.clock_in) }}</td>
                  <td class="py-4 px-6 font-mono text-xs">{{ formatTime(item.clock_out) }}</td>
                  <td class="py-4 px-6 font-mono text-xs">{{ item.working_hours ? `${item.working_hours}h` : '--' }}
                  </td>
                  <td class="py-4 px-6">
                    <span :class="[
                      'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider',
                      item.status === 'Present' ? 'bg-green-50 text-green-600' :
                        item.status === 'Late' ? 'bg-orange-50 text-orange-600' :
                          item.status === 'On Break' ? 'bg-yellow-100 text-yellow-750 animate-pulse' :
                            item.status === 'Half Day' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-600'
                    ]">
                      {{ item.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ==================================================== -->
      <!-- TAB 2: CORRECTION REQUESTS -->
      <!-- ==================================================== -->
      <div v-if="activeTab === 'corrections'" class="space-y-6">
        <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 class="text-lg font-black text-gray-900">Pending correction approvals</h3>

          <div class="space-y-4">
            <div v-for="corr in pendingCorrections" :key="corr.id"
              class="bg-gray-50 border border-gray-150 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">

              <!-- Left: Employee & submit info -->
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <img :src="`https://ui-avatars.com/api/?name=${corr.user?.name}&background=8A3EEA&color=fff`"
                    alt="Avatar" class="w-10 h-10 rounded-full" />
                  <div>
                    <h4 class="font-black text-gray-900">{{ corr.user?.name }}</h4>
                    <p class="text-xs text-brand-purple font-black">Employee Log Correction</p>
                  </div>
                </div>
                <div class="text-xs font-bold text-gray-500 space-y-1">
                  <div>Date to Correct: <span class="text-gray-800 font-black">{{ corr.date ? new
                    Date(corr.date).toLocaleDateString([], {
                      weekday: 'short', month: 'short', day: 'numeric', year:
                        'numeric'
                    }) : 'N/A' }}</span></div>
                  <div>Submitted: <span>{{ corr.created_at ? new Date(corr.created_at).toLocaleDateString() : 'N/A'
                  }}</span></div>
                </div>
              </div>

              <!-- Middle: Adjustment request & reason -->
              <div class="space-y-3">
                <div
                  class="grid grid-cols-2 gap-4 text-xs font-bold text-gray-600 bg-white p-3 rounded-2xl border border-gray-150 shadow-sm">
                  <div>
                    <span class="text-gray-400 block mb-0.5">Requested In</span>
                    <span class="font-mono text-gray-800 text-sm">{{ formatTime(corr.requested_clock_in) }}</span>
                  </div>
                  <div>
                    <span class="text-gray-400 block mb-0.5">Requested Out</span>
                    <span class="font-mono text-gray-800 text-sm">{{ formatTime(corr.requested_clock_out) }}</span>
                  </div>
                </div>

                <div class="text-xs">
                  <span class="text-gray-400 font-bold block mb-1">Reason for request:</span>
                  <p class="bg-white px-3 py-2 rounded-xl border border-gray-100 italic text-gray-600">{{ corr.reason }}
                  </p>
                </div>
              </div>

              <!-- Right: Admin Actions -->
              <div class="space-y-3 flex flex-col justify-between">
                <div>
                  <label class="block text-xs font-black uppercase text-gray-400 mb-1">Approval/Rejection Note</label>
                  <input v-model="reviewComments[corr.id]" type="text"
                    placeholder="Explain decision or write comments..."
                    class="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-purple text-gray-800" />
                </div>

                <div class="flex gap-2 justify-end">
                  <button @click="handleCorrectionReview(corr.id, 'Rejected', corr.userId)"
                    class="px-4 py-2 border border-red-200 text-red-650 hover:bg-red-50 font-bold text-xs rounded-xl transition-all">
                    Reject
                  </button>
                  <button @click="handleCorrectionReview(corr.id, 'Approved', corr.userId)"
                    class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold text-xs rounded-xl shadow-md transition-all">
                    Approve Request
                  </button>
                </div>
              </div>

            </div>

            <div v-if="!pendingCorrections.length" class="text-center py-12 text-gray-400 font-bold">
              There are no pending correction requests.
            </div>
          </div>
        </div>
      </div>

      <!-- ==================================================== -->
      <!-- TAB 3: MONTHLY REPORTS -->
      <!-- ==================================================== -->
      <div v-if="activeTab === 'reports'" class="space-y-6">
        <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">

          <!-- Filters & Actions row -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex flex-wrap items-center gap-3 flex-grow">
              <!-- Search -->
              <div class="relative w-64">
                <i class="mdi mdi-magnify absolute left-3 top-2.5 text-gray-400 text-lg"></i>
                <input v-model="reportSearch" type="text" placeholder="Search employee..."
                  class="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-purple bg-white text-gray-850" />
              </div>

              <!-- Department Filter -->
              <select v-model="reportDeptFilter"
                class="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-purple bg-white text-gray-800">
                <option value="">All Departments</option>
                <option v-for="dept in departments" :key="dept" :value="dept">{{ dept }}</option>
              </select>
            </div>

            <button @click="exportReportCSV"
              class="px-5 py-2.5 bg-brand-purple hover:bg-brand-purple/95 text-white rounded-xl font-bold text-sm shadow-md flex items-center gap-2 active:scale-95 transition-all">
              <i class="mdi mdi-file-export-outline text-lg"></i> Export CSV
            </button>
          </div>

          <!-- Report table summary -->
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-gray-100 text-gray-400 text-xs font-black uppercase bg-gray-50/50">
                  <th class="py-4 px-6">Employee</th>
                  <th class="py-4 px-6">Department</th>
                  <th class="py-4 px-6 text-center">Required Days</th>
                  <th class="py-4 px-6 text-center">Days Present</th>
                  <th class="py-4 px-6 text-center">Absences</th>
                  <th class="py-4 px-6 text-center">Late Logs</th>
                  <th class="py-4 px-6 text-center">Half Days</th>
                  <th class="py-4 px-6 text-center">Total Hours</th>
                  <th class="py-4 px-6 text-center">Break Hours</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50 text-sm font-semibold text-gray-700">
                <tr v-for="r in filteredReports" :key="r.employeeId" class="hover:bg-gray-50/50">
                  <td class="py-4 px-6">
                    <p class="font-bold text-gray-900">{{ r.name }}</p>
                    <p class="text-xs text-gray-400 font-medium">{{ r.email }}</p>
                  </td>
                  <td class="py-4 px-6 font-medium text-gray-550">{{ r.department }}</td>
                  <td class="py-4 px-6 text-center text-gray-900 font-mono">{{ r.workingDays }}d</td>
                  <td class="py-4 px-6 text-center text-green-600 font-mono">{{ r.presentDays }}d</td>
                  <td class="py-4 px-6 text-center text-red-600 font-mono">{{ r.absences }}d</td>
                  <td class="py-4 px-6 text-center text-orange-600 font-mono">{{ r.lateCount }}</td>
                  <td class="py-4 px-6 text-center text-yellow-750 font-mono">{{ r.halfDays }}</td>
                  <td class="py-4 px-6 text-center text-gray-900 font-mono font-bold">{{ r.totalWorkingHours }}h</td>
                  <td class="py-4 px-6 text-center text-gray-500 font-mono">{{ r.totalBreakHours }}h</td>
                </tr>
                <tr v-if="!filteredReports.length">
                  <td colspan="9" class="text-center py-12 text-gray-400 font-bold bg-white">
                    No matching report logs found.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ==================================================== -->
      <!-- TAB 4: SHIFT CONFIGURATIONS -->
      <!-- ==================================================== -->
      <div v-if="activeTab === 'shifts'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Shifts Listing & Editor -->
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-black text-gray-900">Shift Templates</h3>
              <button @click="openAddShift"
                class="px-4 py-2 bg-brand-purple hover:bg-brand-purple/95 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1">
                <i class="mdi mdi-plus"></i> Create Shift
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="shift in shifts" :key="shift.id"
                class="bg-gray-50 border border-gray-150 rounded-3xl p-5 space-y-3 relative hover:shadow-md transition-all">
                <div class="flex justify-between items-start">
                  <div>
                    <h4 class="font-black text-gray-900">{{ shift.name }}</h4>
                    <p class="text-xs text-gray-400 font-bold mt-0.5">Buffer: {{ shift.late_buffer }} minutes</p>
                  </div>
                  <div class="flex gap-1" v-if="shift.id > 1"> <!-- General Shift is protected from delete -->
                    <button @click="openEditShift(shift)"
                      class="p-1 hover:text-brand-purple text-gray-400 transition-colors">
                      <i class="mdi mdi-pencil-outline text-lg"></i>
                    </button>
                    <button @click="handleDeleteShift(shift.id)"
                      class="p-1 hover:text-red-500 text-gray-400 transition-colors">
                      <i class="mdi mdi-trash-can-outline text-lg"></i>
                    </button>
                  </div>
                  <div
                    class="text-[10px] uppercase bg-purple-100 text-brand-purple font-black tracking-wider px-2 py-0.5 rounded-full"
                    v-else>
                    Protected
                  </div>
                </div>

                <div
                  class="grid grid-cols-2 gap-3 text-xs font-bold text-gray-650 bg-white p-3 rounded-2xl border border-gray-100">
                  <div>
                    <span class="text-gray-400 block text-[10px] uppercase font-black tracking-wider">Start Time</span>
                    <span class="font-mono text-gray-800 text-sm">{{ shift.start_time?.slice(0, 5) }}</span>
                  </div>
                  <div>
                    <span class="text-gray-400 block text-[10px] uppercase font-black tracking-wider">End Time</span>
                    <span class="font-mono text-gray-800 text-sm">{{ shift.end_time?.slice(0, 5) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Assign Shift Panel -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 class="text-lg font-black text-gray-900">Assign Shifts</h3>
            <p class="text-xs text-gray-400 font-semibold">Allocate shift timing schedules to employees.</p>

            <div class="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
              <div v-for="emp in employees.filter(e => e.status !== 'inactive')" :key="emp.id"
                class="p-3 bg-gray-50 border border-gray-150 rounded-2xl flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-bold text-gray-900 truncate">{{ emp.name || emp.full_name }}</p>
                  <p class="text-[10px] text-gray-400 uppercase tracking-wider font-black truncate">
                    Shift: {{shifts.find(s => s.id === Number(emp.shift_id || 1))?.name || 'General'}}
                  </p>
                </div>

                <select :value="emp.shift_id || 1" @change="handleAssignShift(emp.id, $event.target.value)"
                  class="px-2 py-1.5 border border-gray-200 rounded-xl text-xs font-bold bg-white text-gray-800 focus:outline-none text-right">
                  <option v-for="s in shifts" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>

    <!-- MODAL: ADD/EDIT SHIFT TEMPLATE -->
    <div v-if="showShiftModal"
      class="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-sm w-full border border-gray-150 shadow-2xl p-6 relative animate-fade-in">
        <div class="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <h3 class="text-lg font-black text-gray-900">
            {{ shiftForm.id ? 'Edit Shift Configuration' : 'Create Shift Template' }}
          </h3>
          <button @click="showShiftModal = false" class="text-gray-400 hover:text-gray-650">
            <i class="mdi mdi-close text-xl"></i>
          </button>
        </div>

        <form @submit.prevent="handleSaveShift" class="space-y-4 text-xs font-bold text-gray-600">
          <div>
            <label class="block text-gray-400 mb-1.5 uppercase font-black">Shift Name</label>
            <input v-model="shiftForm.name" type="text" placeholder="e.g. Night Shift" required
              class="w-full px-4 py-2.5 bg-gray-50 border border-gray-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-805 text-sm font-semibold" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-400 mb-1.5 uppercase font-black">Start Time</label>
              <input v-model="shiftForm.start_time" type="time" required step="1"
                class="w-full px-3 py-2 bg-gray-50 border border-gray-255 rounded-xl focus:outline-none text-sm font-semibold" />
            </div>
            <div>
              <label class="block text-gray-400 mb-1.5 uppercase font-black">End Time</label>
              <input v-model="shiftForm.end_time" type="time" required step="1"
                class="w-full px-3 py-2 bg-gray-50 border border-gray-255 rounded-xl focus:outline-none text-sm font-semibold" />
            </div>
          </div>

          <div>
            <label class="block text-gray-400 mb-1.5 uppercase font-black">Late Buffer (minutes)</label>
            <input v-model.number="shiftForm.late_buffer" type="number" required
              class="w-full px-4 py-2.5 bg-gray-50 border border-gray-250 rounded-xl focus:outline-none text-sm font-semibold" />
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-4">
            <button type="button" @click="showShiftModal = false"
              class="px-4 py-2 border border-gray-250 rounded-xl text-gray-600 font-bold text-sm">
              Cancel
            </button>
            <button type="submit"
              class="px-4 py-2 bg-brand-purple hover:bg-brand-purple/95 text-white rounded-xl font-bold text-sm shadow-md">
              Save Shift
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://cdn.materialdesignicons.com/5.4.55/css/materialdesignicons.min.css');

.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
</style>
