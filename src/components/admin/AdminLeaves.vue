<script setup>
import { ref, onMounted, computed } from 'vue';
import { getLeaves, updateLeaveStatus, getCurrentSession, getUserProfile } from '../../services/api';

const leaves = ref([]);
const loading = ref(true);
const actionModal = ref({
  show: false,
  leaveId: null,
  status: '', // 'Approved' or 'Rejected'
  comments: '',
  submitting: false
});

const adminCompanyId = ref(null);

const loadLeaves = async () => {
  loading.value = true;
  try {
    const session = await getCurrentSession();
    const authUser = session?.user;
    if (authUser) {
      const profile = await getUserProfile({ userId: authUser.id });
      if (profile) {
        adminCompanyId.value = profile.companyId;
      }
    }
    leaves.value = await getLeaves({ companyId: adminCompanyId.value });
  } catch (error) {
    console.error('Error fetching leaves in admin:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(loadLeaves);

const getLeaveDuration = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const diffTime = Math.abs(e - s);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

// Filter states
const search = ref('');
const statusFilter = ref('');

// Computed Lists
const pendingLeaves = computed(() => {
  return leaves.value.filter(l => l.status === 'Pending');
});

const processedLeaves = computed(() => {
  return leaves.value.filter(l => {
    const matchesSearch = (l.user?.name || l.user?.full_name || '').toLowerCase().includes(search.value.toLowerCase()) || 
                          (l.user?.email || '').toLowerCase().includes(search.value.toLowerCase());
    
    const matchesStatus = !statusFilter.value || l.status === statusFilter.value;
    return matchesSearch && matchesStatus;
  });
});

// Statistics
const stats = computed(() => {
  const res = { total: 0, pending: 0, approved: 0, rejected: 0 };
  leaves.value.forEach(l => {
    res.total++;
    if (l.status === 'Pending') res.pending++;
    else if (l.status === 'Approved') res.approved++;
    else if (l.status === 'Rejected') res.rejected++;
  });
  return res;
});

// Process action
const openActionModal = (id, status) => {
  actionModal.value = {
    show: true,
    leaveId: id,
    status,
    comments: '',
    submitting: false
  };
};

const submitAction = async () => {
  if (actionModal.value.status === 'Rejected' && !actionModal.value.comments.trim()) {
    alert('Please provide a reason/comments for the rejection.');
    return;
  }

  actionModal.value.submitting = true;
  try {
    const updated = await updateLeaveStatus(actionModal.value.leaveId, {
      status: actionModal.value.status,
      comments: actionModal.value.comments
    });
    
    // Update local leaves array
    const index = leaves.value.findIndex(l => l.id === actionModal.value.leaveId);
    if (index !== -1) {
      leaves.value[index] = {
        ...leaves.value[index],
        status: updated.status,
        comments: updated.comments,
        updated_at: updated.updated_at
      };
    }
    
    actionModal.value.show = false;
    alert(`Leave request ${actionModal.value.status.toLowerCase()} successfully!`);
  } catch (error) {
    console.error('Failed to update leave status:', error);
    alert('Failed to update status: ' + error.message);
  } finally {
    actionModal.value.submitting = false;
  }
};
</script>

<template>
  <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black tracking-tight text-gray-900">Leave Approvals</h1>
        <p class="text-gray-500 font-medium">Review, approve, and track employee time-off request logs</p>
      </div>
      <button @click="loadLeaves" class="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-bold flex items-center gap-2 border border-gray-200 active:scale-95 shadow-sm transition-all">
        <i class="mdi mdi-refresh"></i> Refresh Lists
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-20">
      <span class="animate-spin h-10 w-10 border-4 border-brand-purple border-t-transparent rounded-full"></span>
    </div>

    <div v-else class="space-y-8">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div class="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20">
            <i class="mdi mdi-clipboard-text text-2xl"></i>
          </div>
          <div>
            <p class="text-3xl font-black text-gray-900">{{ stats.total }}</p>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Leave Requests</p>
          </div>
        </div>

        <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div class="w-12 h-12 bg-orange-500/10 text-brand-orange rounded-2xl flex items-center justify-center mb-4 border border-brand-orange/20">
            <i class="mdi mdi-clock-alert text-2xl"></i>
          </div>
          <div>
            <p class="text-3xl font-black text-gray-900">{{ stats.pending }}</p>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Approvals</p>
          </div>
        </div>

        <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div class="w-12 h-12 bg-green-500/10 text-green-600 rounded-2xl flex items-center justify-center mb-4 border border-green-500/20">
            <i class="mdi mdi-check-circle text-2xl"></i>
          </div>
          <div>
            <p class="text-3xl font-black text-gray-900">{{ stats.approved }}</p>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Approved Requests</p>
          </div>
        </div>

        <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div class="w-12 h-12 bg-red-500/10 text-red-600 rounded-2xl flex items-center justify-center mb-4 border border-red-500/20">
            <i class="mdi mdi-close-circle text-2xl"></i>
          </div>
          <div>
            <p class="text-3xl font-black text-gray-900">{{ stats.rejected }}</p>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rejected Requests</p>
          </div>
        </div>
      </div>

      <!-- Section: Pending Approvals -->
      <div class="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div>
          <h2 class="text-xl font-black text-gray-900">Pending Requests</h2>
          <p class="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Leaves awaiting review</p>
        </div>

        <div v-if="pendingLeaves.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div v-for="leave in pendingLeaves" :key="leave.id" 
               class="bg-gray-55/30 p-6 rounded-[24px] border border-gray-100 flex flex-col justify-between hover:border-brand-purple/20 transition-all">
            <div class="space-y-4">
              <!-- Employee Header -->
              <div class="flex items-center gap-3">
                <img :src="leave.user?.avatar || `https://ui-avatars.com/api/?name=${leave.user?.name || leave.user?.full_name}&background=8A3EEA&color=fff`" 
                     class="w-11 h-11 rounded-full object-cover border border-gray-100 shadow-sm" />
                <div>
                  <p class="text-gray-900 font-bold">{{ leave.user?.name || leave.user?.full_name }}</p>
                  <p class="text-xs text-gray-500 font-medium">{{ leave.user?.email }}</p>
                </div>
              </div>

              <!-- Leave Details -->
              <div class="grid grid-cols-2 gap-2 text-xs font-bold text-gray-650 bg-white p-3 rounded-2xl border border-gray-100">
                <div>
                  <span class="text-gray-400 font-medium block">Type</span>
                  <span class="text-brand-purple">{{ leave.type }} Leave</span>
                </div>
                <div>
                  <span class="text-gray-400 font-medium block">Duration</span>
                  <span>{{ getLeaveDuration(leave.start_date, leave.end_date) }} Days</span>
                </div>
                <div class="col-span-2 pt-2 border-t border-gray-50">
                  <span class="text-gray-400 font-medium block">Dates</span>
                  <span>{{ new Date(leave.start_date).toLocaleDateString() }} - {{ new Date(leave.end_date).toLocaleDateString() }}</span>
                </div>
              </div>

              <!-- Reason -->
              <div class="text-xs bg-white p-3 rounded-2xl border border-gray-100">
                <span class="text-gray-400 font-medium block mb-1">Reason</span>
                <p class="text-gray-700 font-semibold italic">"{{ leave.reason }}"</p>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex gap-2.5 mt-5">
              <button @click="openActionModal(leave.id, 'Rejected')" 
                      class="w-1/2 py-2.5 text-xs bg-white text-red-650 border border-red-100 font-bold rounded-xl hover:bg-red-50 transition-all active:scale-95">
                Reject
              </button>
              <button @click="openActionModal(leave.id, 'Approved')" 
                      class="w-1/2 py-2.5 text-xs bg-brand-purple text-white font-bold rounded-xl hover:bg-brand-purple/95 transition-all shadow-md shadow-brand-purple/10 active:scale-95">
                Approve
              </button>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
          <div class="w-14 h-14 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
            <i class="mdi mdi-calendar-check text-2xl text-gray-400"></i>
          </div>
          <h3 class="text-base font-bold text-gray-900">No pending requests</h3>
          <p class="text-xs text-gray-500 mt-1">Excellent! All leave requests have been processed.</p>
        </div>
      </div>

      <!-- Section: Request Logs History -->
      <div class="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-black text-gray-900">All Request Logs</h2>
            <p class="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Leave archives of corporate personnel</p>
          </div>

          <!-- Search and filters -->
          <div class="flex flex-wrap gap-3 items-center">
            <div class="relative w-full sm:w-56">
              <i class="mdi mdi-magnify absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input v-model="search" type="text" placeholder="Search employee..." 
                     class="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-xs font-semibold" />
            </div>

            <select v-model="statusFilter" class="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-purple">
              <option value="">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>

        <div v-if="processedLeaves.length > 0" class="overflow-x-auto rounded-2xl border border-gray-50">
          <table class="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th class="py-4 px-5">Employee</th>
                <th class="py-4 px-5">Leave Info</th>
                <th class="py-4 px-5">Duration</th>
                <th class="py-4 px-5">Reason</th>
                <th class="py-4 px-5">Status / Comments</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 text-sm font-semibold">
              <tr v-for="leave in processedLeaves" :key="leave.id" class="hover:bg-gray-55/30 transition-colors">
                <td class="py-4 px-5 flex items-center gap-3">
                  <img :src="leave.user?.avatar || `https://ui-avatars.com/api/?name=${leave.user?.name || leave.user?.full_name}&background=8A3EEA&color=fff`" 
                       class="w-9 h-9 rounded-full object-cover border border-gray-100" />
                  <div>
                    <p class="text-gray-900 font-bold text-xs">{{ leave.user?.name || leave.user?.full_name }}</p>
                    <p class="text-[10px] text-gray-450">{{ leave.user?.email }}</p>
                  </div>
                </td>
                <td class="py-4 px-5">
                  <p class="font-bold text-gray-900 text-xs">{{ leave.type }} Leave</p>
                  <p class="text-[10px] text-gray-450 mt-0.5">{{ getLeaveDuration(leave.start_date, leave.end_date) }} Days</p>
                </td>
                <td class="py-4 px-5 text-xs text-gray-650">
                  {{ new Date(leave.start_date).toLocaleDateString() }} - {{ new Date(leave.end_date).toLocaleDateString() }}
                </td>
                <td class="py-4 px-5">
                  <p class="text-xs text-gray-700 font-medium truncate max-w-[200px]" :title="leave.reason">{{ leave.reason }}</p>
                </td>
                <td class="py-4 px-5">
                  <span :class="[
                    'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider',
                    leave.status === 'Pending' ? 'bg-orange-50 text-brand-orange border border-orange-100' :
                    leave.status === 'Approved' ? 'bg-green-50 text-green-650 border border-green-100' : 
                    'bg-red-50 text-red-650 border border-red-100'
                  ]">
                    {{ leave.status }}
                  </span>
                  <p v-if="leave.comments" class="text-[10px] text-gray-450 italic mt-1 font-medium max-w-[180px] truncate" :title="leave.comments">
                    "{{ leave.comments }}"
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="text-center py-12">
          <p class="text-xs text-gray-400 font-bold">No leave request logs match your query.</p>
        </div>
      </div>
    </div>

    <!-- Approve / Reject feedback comments Modal -->
    <div v-if="actionModal.show" 
         class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div class="bg-white rounded-[32px] w-full max-w-md shadow-2xl border border-gray-100 p-6 sm:p-8 animate-in zoom-in-95 duration-200 relative">
        <button @click="actionModal.show = false" class="absolute top-6 right-6 p-2 rounded-xl text-gray-400 hover:text-gray-950 hover:bg-gray-100 transition-colors">
          <i class="mdi mdi-close text-xl"></i>
        </button>

        <div class="mb-5">
          <h3 class="text-xl font-black text-gray-900 tracking-tight">
            {{ actionModal.status === 'Approved' ? 'Approve Leave Request' : 'Reject Leave Request' }}
          </h3>
          <p class="text-xs text-gray-500 font-medium mt-1">Specify feedback or review comments for the employee</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-black text-gray-450 uppercase tracking-widest mb-2 ml-1">Administrative Comments</label>
            <textarea v-model="actionModal.comments" rows="3" 
                      :placeholder="actionModal.status === 'Approved' ? 'E.g., Approved, have a good time off.' : 'Please explain the reason for rejection (required)...'"
                      class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-purple focus:outline-none font-semibold text-gray-700 resize-none text-sm"></textarea>
          </div>

          <div class="flex gap-3 pt-2">
            <button @click="actionModal.show = false" :disabled="actionModal.submitting"
                    class="w-1/2 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-2xl transition-all border border-gray-200 active:scale-98 text-sm">
              Cancel
            </button>
            <button @click="submitAction" :disabled="actionModal.submitting"
                    :class="[
                      'w-1/2 py-3 text-white font-black rounded-2xl transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 text-sm',
                      actionModal.status === 'Approved' ? 'bg-brand-purple hover:bg-brand-purple/95 shadow-brand-purple/20' : 'bg-red-650 hover:bg-red-700 shadow-red-500/10'
                    ]">
              <span v-if="actionModal.submitting" class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
              <span v-else>Confirm Action</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
