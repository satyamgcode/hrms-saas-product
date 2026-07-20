<script setup>
import { ref, onMounted, computed } from 'vue';
import { getCurrentUser, getUserProfile, getLeaves, createLeave, deleteLeave } from '../services/api';
import EmployeePage from './EmployeePage.vue';
import { addToast } from '../services/toastService';

const leaves = ref([]);
const loading = ref(true);
const showRequestModal = ref(false);
const submitting = ref(false);
const errorMessage = ref('');

const currentUserProfile = ref(null);
const currentUserId = ref('');
const currentCompanyId = ref(null);

const leaveForm = ref({
  type: 'Casual',
  startDate: '',
  endDate: '',
  reason: ''
});

// Maximum quotas
const QUOTAS = {
  Casual: 8,
  Sick: 8,
  Annual: 8
};

const loadLeaveData = async () => {
  loading.value = true;
  try {
    const user = await getCurrentUser();
    if (user) {
      currentUserId.value = user.id;
      const profile = await getUserProfile({ userId: user.id });
      if (profile) {
        currentUserProfile.value = profile;
        currentCompanyId.value = profile.companyId;
      }
      leaves.value = await getLeaves({ userId: user.id });
    }
  } catch (error) {
    console.error('Error loading leaves:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(loadLeaveData);

// Calculation Helpers
const getLeaveDuration = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const diffTime = Math.abs(e - s);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

// Calculate Working Days dynamically
const workingDays = computed(() => {
  if (!currentUserProfile.value) return 200; // fallback default
  const joinStr = currentUserProfile.value.joining_date || '2026-01-01';
  const joinDate = new Date(joinStr);
  const today = new Date();

  // Calculate business days
  let count = 0;
  const curDate = new Date(joinDate);
  while (curDate <= today) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sat/Sun
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return count || 1;
});

// Leaves taken by type (Approved only)
const approvedLeaves = computed(() => {
  return leaves.value.filter(l => l.status === 'Approved');
});

const leavesTakenByType = computed(() => {
  const taken = { Sick: 0, Casual: 0, Annual: 0, Unpaid: 0 };
  approvedLeaves.value.forEach(l => {
    const duration = getLeaveDuration(l.start_date, l.end_date);
    if (taken[l.type] !== undefined) {
      taken[l.type] += duration;
    } else {
      taken.Unpaid += duration;
    }
  });
  return taken;
});

const totalLeavesApprovedDays = computed(() => {
  return Object.values(leavesTakenByType.value).reduce((acc, curr) => acc + curr, 0);
});

const remainingLeaves = computed(() => {
  const totalQuota = QUOTAS.Casual + QUOTAS.Sick + QUOTAS.Annual;
  // Don't subtract unpaid leaves from the paid quota
  const paidTaken = leavesTakenByType.value.Casual + leavesTakenByType.value.Sick + leavesTakenByType.value.Annual;
  return Math.max(0, totalQuota - paidTaken);
});

const attendanceRate = computed(() => {
  const days = workingDays.value;
  const leavesTaken = totalLeavesApprovedDays.value;
  if (days <= 0) return 100;
  return Math.max(0, Math.min(100, ((days - leavesTaken) / days) * 100)).toFixed(1);
});

const pendingLeavesCount = computed(() => {
  return leaves.value.filter(l => l.status === 'Pending').length;
});

// Actions
const submitLeaveRequest = async () => {
  errorMessage.value = '';
  if (!leaveForm.value.startDate || !leaveForm.value.endDate) {
    errorMessage.value = 'Please select both start and end dates.';
    return;
  }
  if (new Date(leaveForm.value.startDate) > new Date(leaveForm.value.endDate)) {
    errorMessage.value = 'Start date cannot be after end date.';
    return;
  }
  if (!leaveForm.value.reason.trim()) {
    errorMessage.value = 'Please state a reason for your leave.';
    return;
  }

  submitting.value = true;
  try {
    const newLeave = {
      userId: currentUserId.value,
      companyId: currentCompanyId.value || 1,
      start_date: leaveForm.value.startDate,
      end_date: leaveForm.value.endDate,
      type: leaveForm.value.type,
      reason: leaveForm.value.reason,
      status: 'Pending'
    };

    const saved = await createLeave(newLeave);
    leaves.value.unshift(saved);
    showRequestModal.value = false;
    // reset form
    leaveForm.value = { type: 'Casual', startDate: '', endDate: '', reason: '' };
    addToast('Leave request submitted successfully!', 'success');
  } catch (err) {
    console.error(err);
    errorMessage.value = err.message || 'Failed to submit leave request.';
  } finally {
    submitting.value = false;
  }
};

const cancelLeaveRequest = async (id) => {
  if (confirm('Are you sure you want to cancel this leave request?')) {
    try {
      await deleteLeave(id);
      leaves.value = leaves.value.filter(l => l.id !== id);
      addToast('Leave request cancelled.', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to cancel request: ' + err.message, 'error');
    }
  }
};
</script>

<template>
  <EmployeePage>
    <div class="mt-4 sm:mt-6 animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">

      <!-- Premium Title Section -->
      <div
        class="bg-white p-6 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div class="flex items-center gap-4">
          <div
            class="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-purple to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-100">
            <i class="mdi mdi-calendar-clock text-3xl"></i>
          </div>
          <div>
            <h2 class="text-2xl font-black text-gray-900 tracking-tight">Leave Management</h2>
            <p class="text-sm text-gray-500 font-medium mt-1">Manage your leaves, view entitlements, and check
              attendance metrics</p>
          </div>
        </div>

        <button @click="showRequestModal = true"
          class="w-full sm:w-auto bg-brand-purple hover:bg-brand-purple/95 text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-xl shadow-brand-purple/20 active:scale-95">
          <i class="mdi mdi-plus"></i>
          Request Leave
        </button>
      </div>

      <!-- Quick stats grids -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div class="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <i class="mdi mdi-briefcase text-xl"></i>
          </div>
          <div>
            <p class="text-3xl font-black text-gray-900">{{ workingDays }}</p>
            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Working Days</p>
          </div>
        </div>

        <div
          class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div class="w-11 h-11 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4">
            <i class="mdi mdi-calendar-check text-xl"></i>
          </div>
          <div>
            <p class="text-3xl font-black text-gray-900">{{ totalLeavesApprovedDays }}</p>
            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Leaves Approved</p>
          </div>
        </div>

        <div
          class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div class="w-11 h-11 bg-purple-50 text-brand-purple rounded-xl flex items-center justify-center mb-4">
            <i class="mdi mdi-ticket text-xl"></i>
          </div>
          <div>
            <p class="text-3xl font-black text-gray-900">{{ remainingLeaves }}</p>
            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Remaining Leaves</p>
          </div>
        </div>

        <div
          class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div class="w-11 h-11 bg-orange-50 text-brand-orange rounded-xl flex items-center justify-center mb-4">
            <i class="mdi mdi-percent text-xl"></i>
          </div>
          <div>
            <p class="text-3xl font-black text-gray-900">{{ attendanceRate }}%</p>
            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Attendance Rate</p>
          </div>
        </div>
      </div>

      <!-- Main leave content division -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <!-- Left: Entitlements breakdown -->
        <div class="lg:col-span-1 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div>
            <h3 class="text-lg font-black text-gray-900">Leave Quotas</h3>
            <p class="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Annual Allotted Balances</p>
          </div>

          <div class="space-y-6">
            <!-- Casual Leave -->
            <div class="space-y-2">
              <div class="flex justify-between text-sm font-bold">
                <span class="text-gray-700">Casual Leave</span>
                <span class="text-gray-900">{{ leavesTakenByType.Casual }} / {{ QUOTAS.Casual }} Days</span>
              </div>
              <div class="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                <div class="h-full bg-brand-purple rounded-full transition-all duration-500"
                  :style="{ width: `${Math.min(100, (leavesTakenByType.Casual / QUOTAS.Casual) * 100)}%` }"></div>
              </div>
            </div>

            <!-- Sick Leave -->
            <div class="space-y-2">
              <div class="flex justify-between text-sm font-bold">
                <span class="text-gray-700">Sick Leave</span>
                <span class="text-gray-900">{{ leavesTakenByType.Sick }} / {{ QUOTAS.Sick }} Days</span>
              </div>
              <div class="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                <div class="h-full bg-blue-500 rounded-full transition-all duration-500"
                  :style="{ width: `${Math.min(100, (leavesTakenByType.Sick / QUOTAS.Sick) * 100)}%` }"></div>
              </div>
            </div>

            <!-- Annual Leave -->
            <div class="space-y-2">
              <div class="flex justify-between text-sm font-bold">
                <span class="text-gray-700">Annual Leave</span>
                <span class="text-gray-900">{{ leavesTakenByType.Annual }} / {{ QUOTAS.Annual }} Days</span>
              </div>
              <div class="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                <div class="h-full bg-green-500 rounded-full transition-all duration-500"
                  :style="{ width: `${Math.min(100, (leavesTakenByType.Annual / QUOTAS.Annual) * 100)}%` }"></div>
              </div>
            </div>

            <!-- Unpaid Leave (if any taken) -->
            <div v-if="leavesTakenByType.Unpaid > 0" class="space-y-2">
              <div class="flex justify-between text-sm font-bold">
                <span class="text-gray-700">Unpaid Leave</span>
                <span class="text-red-650">{{ leavesTakenByType.Unpaid }} Days Taken</span>
              </div>
              <div class="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                <div class="h-full bg-red-400 rounded-full transition-all duration-500" style="width: 100%"></div>
              </div>
            </div>
          </div>

          <div
            class="pt-6 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-400">
            <span>Pending approvals:</span>
            <span class="px-2 py-0.5 rounded-full bg-orange-50 text-brand-orange border border-orange-100 font-bold">{{
              pendingLeavesCount }} Requests</span>
          </div>
        </div>

        <!-- Right: Leave History -->
        <div class="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div>
            <h3 class="text-lg font-black text-gray-900">Leave History</h3>
            <p class="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Logs of requested leaves</p>
          </div>

          <div v-if="loading" class="flex justify-center py-12">
            <span class="animate-spin h-10 w-10 border-4 border-brand-purple border-t-transparent rounded-full"></span>
          </div>

          <div v-else-if="leaves.length > 0" class="overflow-x-auto rounded-2xl border border-gray-50">
            <table class="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr
                  class="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th class="py-4 px-5">Type / Reason</th>
                  <th class="py-4 px-5">Duration</th>
                  <th class="py-4 px-5">Days</th>
                  <th class="py-4 px-5">Status</th>
                  <th class="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50 text-sm font-semibold">
                <tr v-for="leave in leaves" :key="leave.id" class="hover:bg-gray-50/50 transition-colors">
                  <td class="py-4 px-5">
                    <p class="font-bold text-gray-900">{{ leave.type }} Leave</p>
                    <p class="text-xs text-gray-400 font-medium mt-0.5 truncate max-w-[200px]" :title="leave.reason">{{
                      leave.reason }}</p>
                  </td>
                  <td class="py-4 px-5 text-gray-650">
                    <p class="text-xs font-bold">{{ new Date(leave.start_date).toLocaleDateString() }} - {{ new
                      Date(leave.end_date).toLocaleDateString() }}</p>
                  </td>
                  <td class="py-4 px-5 font-bold text-gray-900">
                    {{ getLeaveDuration(leave.start_date, leave.end_date) }}
                  </td>
                  <td class="py-4 px-5">
                    <span :class="[
                      'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
                      leave.status === 'Pending' ? 'bg-orange-50 text-brand-orange border border-orange-100' :
                        leave.status === 'Approved' ? 'bg-green-50 text-green-650 border border-green-100' :
                          'bg-red-50 text-red-650 border border-red-100'
                    ]">
                      {{ leave.status }}
                    </span>
                    <p v-if="leave.comments"
                      class="text-[10px] text-gray-450 italic mt-1 font-medium max-w-[150px] truncate"
                      :title="leave.comments">
                      Admin: "{{ leave.comments }}"
                    </p>
                  </td>
                  <td class="py-4 px-5 text-right">
                    <button v-if="leave.status === 'Pending'" @click="cancelLeaveRequest(leave.id)"
                      class="px-3 py-1.5 text-xs font-bold text-red-650 hover:bg-red-50 rounded-xl transition-all border border-red-100">
                      Cancel
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <div
              class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
              <i class="mdi mdi-calendar-remove text-3xl text-gray-400"></i>
            </div>
            <h3 class="text-lg font-bold text-gray-900">No leaves logged</h3>
            <p class="text-sm text-gray-500 mt-1 font-medium">You haven't requested any leaves yet.</p>
          </div>
        </div>
      </div>

      <!-- Request Leave Modal -->
      <div v-if="showRequestModal"
        class="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
        <div
          class="bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-gray-100 p-6 sm:p-8 animate-in zoom-in-95 duration-200 relative">

          <button @click="showRequestModal = false"
            class="absolute top-6 right-6 p-2 rounded-xl text-gray-400 hover:text-gray-950 hover:bg-gray-100 transition-colors">
            <i class="mdi mdi-close text-xl"></i>
          </button>

          <div class="mb-6">
            <h3 class="text-2xl font-black text-gray-900 tracking-tight">Request Time Off</h3>
            <p class="text-sm text-gray-500 font-medium mt-1">Submit a leave request for administrative review</p>
          </div>

          <div class="space-y-5">
            <!-- Leave Type -->
            <div>
              <label class="block text-xs font-black text-gray-450 uppercase tracking-widest mb-2 ml-1">Leave
                Type</label>
              <div class="relative">
                <select v-model="leaveForm.type"
                  class="w-full pl-5 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-purple focus:outline-none font-bold text-gray-700 cursor-pointer appearance-none">
                  <option value="Casual">Casual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Annual">Annual Leave</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </select>
                <i
                  class="mdi mdi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xl"></i>
              </div>
            </div>

            <!-- Date Range -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-black text-gray-450 uppercase tracking-widest mb-2 ml-1">Start
                  Date</label>
                <input type="date" v-model="leaveForm.startDate"
                  class="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-purple focus:outline-none font-bold text-gray-700" />
              </div>
              <div>
                <label class="block text-xs font-black text-gray-450 uppercase tracking-widest mb-2 ml-1">End
                  Date</label>
                <input type="date" v-model="leaveForm.endDate"
                  class="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-purple focus:outline-none font-bold text-gray-700" />
              </div>
            </div>

            <!-- Reason -->
            <div>
              <label class="block text-xs font-black text-gray-450 uppercase tracking-widest mb-2 ml-1">Reason for
                Leave</label>
              <textarea v-model="leaveForm.reason" rows="3"
                placeholder="Explain the reasons for your leave application..."
                class="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-purple focus:outline-none font-semibold text-gray-700 resize-none"></textarea>
            </div>

            <!-- Error message -->
            <p v-if="errorMessage" class="text-xs font-bold text-red-650 ml-1">{{ errorMessage }}</p>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
              <button @click="showRequestModal = false" :disabled="submitting"
                class="w-1/2 py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-2xl transition-all border border-gray-200 active:scale-98">
                Cancel
              </button>
              <button @click="submitLeaveRequest" :disabled="submitting"
                class="w-1/2 py-3.5 bg-brand-purple hover:bg-brand-purple/95 text-white font-black rounded-2xl transition-all shadow-lg shadow-brand-purple/20 active:scale-98 flex items-center justify-center gap-2">
                <span v-if="submitting"
                  class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                <span v-else>Submit Request</span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </EmployeePage>
</template>
