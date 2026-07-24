<script setup>
import { ref, onMounted, computed } from 'vue';
import {
  getCandidates,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  hireCandidate
} from '../../services/recruitmentService';
import { getCompany, getCurrentSession, getUserProfile } from '../../services/api';
import { addToast } from '../../services/toastService';

const candidates = ref([]);
const loading = ref(true);
const search = ref('');
const filterDepartment = ref('');
const filterStatus = ref('');
const viewMode = ref('kanban'); // 'kanban' or 'table'
const companyDepartments = ref([]);
const showAddModal = ref(false);
const showEditModal = ref(false);
const selectedCandidate = ref(null);
const adminCompanyId = ref(1);

// Form States
const initialForm = {
  name: '',
  email: '',
  phone: '',
  department: '',
  designation: '',
  notice_period: 'Immediate',
  expected_joining_date: '',
  expected_salary: '',
  current_salary: '',
  notes: '',
  status: 'Screening',
  current_round: 1
};

const addForm = ref({ ...initialForm });
const editForm = ref({ ...initialForm });

// Interview stages configuration
const stages = [
  { key: 'Screening', label: 'Screening / Applied', icon: 'mdi-file-find-outline', color: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100' },
  { key: 'Technical Round', label: 'Technical Interview', icon: 'mdi-code-braces', color: 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100' },
  { key: 'Manager Round', label: 'Managerial Evaluation', icon: 'mdi-account-tie-outline', color: 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100' },
  { key: 'HR Round', label: 'HR & Culture Round', icon: 'mdi-handshake-outline', color: 'bg-teal-50 text-teal-700 border-teal-100 hover:bg-teal-100' },
  { key: 'Offered', label: 'Offer Extended', icon: 'mdi-email-outline', color: 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100' },
  { key: 'Hired', label: 'Hired & Joined', icon: 'mdi-account-check-outline', color: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' },
  { key: 'Rejected', label: 'Archived / Rejected', icon: 'mdi-account-remove-outline', color: 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100' }
];

const loadData = async () => {
  loading.value = true;
  try {
    const session = await getCurrentSession();
    const authUser = session?.user;
    if (authUser) {
      const profile = await getUserProfile({ userId: authUser.id });
      if (profile) {
        adminCompanyId.value = profile.companyId || 1;
      }
    }
    const company = await getCompany(adminCompanyId.value);
    if (company && Array.isArray(company.departments)) {
      companyDepartments.value = company.departments;
    } else {
      companyDepartments.value = ['Software Development', 'Creative Design', 'Marketing', 'Sales', 'Human Resources', 'Finance'];
    }

    const data = await getCandidates(adminCompanyId.value);
    candidates.value = data;
  } catch (error) {
    console.error('Failed to load candidate recruitment data:', error);
    addToast('Error loading candidate records', 'error');
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);

// Stats computation
const stats = computed(() => {
  const total = candidates.value.length;
  const interviewing = candidates.value.filter(c =>
    ['Technical Round', 'Manager Round', 'HR Round'].includes(c.status)
  ).length;
  const offered = candidates.value.filter(c => c.status === 'Offered').length;
  const hired = candidates.value.filter(c => c.status === 'Hired').length;
  const screening = candidates.value.filter(c => c.status === 'Screening').length;

  return [
    { label: 'Total Applicants', value: total, icon: 'mdi-account-group', color: 'text-purple-650 bg-purple-50' },
    { label: 'Screening', value: screening, icon: 'mdi-file-find-outline', color: 'text-blue-600 bg-blue-50' },
    { label: 'In Interviews', value: interviewing, icon: 'mdi-account-sync', color: 'text-amber-600 bg-amber-50' },
    { label: 'Offered', value: offered, icon: 'mdi-email-seal-outline', color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Hired & Ready', value: hired, icon: 'mdi-checkbox-marked-circle-outline', color: 'text-emerald-600 bg-emerald-50' }
  ];
});

// Filtering and search logic
const filteredCandidates = computed(() => {
  return candidates.value.filter(cand => {
    const matchesSearch = cand.name.toLowerCase().includes(search.value.toLowerCase()) ||
      cand.email.toLowerCase().includes(search.value.toLowerCase()) ||
      cand.designation.toLowerCase().includes(search.value.toLowerCase());
    const matchesDept = !filterDepartment.value || cand.department === filterDepartment.value;
    const matchesStatus = !filterStatus.value || cand.status === filterStatus.value;
    return matchesSearch && matchesDept && matchesStatus;
  });
});

// Group candidates by status for Kanban Board
const candidatesByStage = computed(() => {
  const grouped = {};
  stages.forEach(stage => {
    grouped[stage.key] = [];
  });
  filteredCandidates.value.forEach(cand => {
    if (grouped[cand.status]) {
      grouped[cand.status].push(cand);
    } else {
      // Fallback
      grouped['Screening'].push(cand);
    }
  });
  return grouped;
});

// Operations
const handleAddCandidate = async () => {
  if (!addForm.value.name || !addForm.value.email || !addForm.value.department || !addForm.value.designation) {
    addToast('Please fill all required fields', 'warning');
    return;
  }
  try {
    const payload = {
      ...addForm.value,
      companyId: adminCompanyId.value
    };
    const created = await createCandidate(payload);
    candidates.value.unshift(created);
    showAddModal.value = false;
    addForm.value = { ...initialForm };
    addToast('Candidate profile registered successfully!', 'success');
  } catch (error) {
    addToast('Failed to create candidate record', 'error');
  }
};

const openEdit = (candidate) => {
  selectedCandidate.value = candidate;
  editForm.value = { ...candidate };
  showEditModal.value = true;
};

const handleUpdateCandidate = async () => {
  if (!editForm.value.name || !editForm.value.email) {
    addToast('Name and Email are required', 'warning');
    return;
  }
  try {
    const updated = await updateCandidate(selectedCandidate.value.id, editForm.value);
    const index = candidates.value.findIndex(c => c.id === selectedCandidate.value.id);
    if (index !== -1) {
      candidates.value[index] = updated;
    }
    showEditModal.value = false;
    addToast('Candidate details updated successfully', 'success');
  } catch (error) {
    addToast('Failed to update candidate record', 'error');
  }
};

const handleDeleteCandidate = async (id) => {
  if (confirm('Are you sure you want to remove this candidate profile?')) {
    try {
      await deleteCandidate(id);
      candidates.value = candidates.value.filter(c => c.id !== id);
      showEditModal.value = false;
      addToast('Candidate record removed successfully', 'success');
    } catch (error) {
      addToast('Failed to delete candidate', 'error');
    }
  }
};

const moveStage = async (candidate, direction) => {
  const currentIndex = stages.findIndex(s => s.key === candidate.status);
  let nextIndex = currentIndex + direction;

  if (nextIndex >= 0 && nextIndex < stages.length) {
    const nextStage = stages[nextIndex].key;
    const nextRound = Math.max(1, candidate.current_round + direction);
    try {
      const updated = await updateCandidate(candidate.id, {
        status: nextStage,
        current_round: nextRound
      });
      const index = candidates.value.findIndex(c => c.id === candidate.id);
      if (index !== -1) {
        candidates.value[index] = updated;
      }
      addToast(`Moved candidate to ${stages[nextIndex].label}`, 'success');
    } catch (e) {
      addToast('Failed to update candidate status', 'error');
    }
  }
};

const rejectCandidate = async (candidate) => {
  try {
    const updated = await updateCandidate(candidate.id, { status: 'Rejected' });
    const index = candidates.value.findIndex(c => c.id === candidate.id);
    if (index !== -1) {
      candidates.value[index] = updated;
    }
    addToast('Candidate archived and marked as Rejected', 'info');
  } catch (e) {
    addToast('Failed to reject candidate', 'error');
  }
};

// Hire & onboarding conversion flow
const convertingId = ref(null);
const handleHireCandidate = async (candidate) => {
  convertingId.value = candidate.id;
  try {
    await hireCandidate(candidate, adminCompanyId.value);
    addToast(`Congratulations! ${candidate.name} has been hired and added as an active employee!`, 'success');
    await loadData(); // Reload listings
  } catch (error) {
    console.error('Failed to convert candidate:', error);
    addToast('Conversion failed: ' + (error.message || 'Error executing employee generation'), 'error');
  } finally {
    convertingId.value = null;
  }
};

const getNoticeColor = (notice) => {
  switch (notice) {
    case 'Immediate':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case '15 Days':
      return 'bg-teal-50 text-teal-700 border-teal-100';
    case '30 Days':
      return 'bg-blue-50 text-blue-700 border-blue-100';
    default:
      return 'bg-amber-50 text-amber-700 border-amber-100';
  }
};
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-8 bg-gray-50/50 no-scrollbar">
    <!-- Header Controls -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-black text-gray-950 tracking-tight">Recruitment & Interview Pipeline</h1>
        <p class="text-sm font-medium text-gray-500">Track incoming job candidates, schedules, interview progress, and
          hire onboarding profiles.</p>
      </div>

      <button @click="showAddModal = true"
        class="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-brand-purple text-white font-bold text-sm shadow-lg shadow-brand-purple/20 hover:bg-purple-700 transition-all gap-2 self-start md:self-auto">
        <i class="mdi mdi-account-plus text-lg"></i>
        Add New Candidate
      </button>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <div v-for="stat in stats" :key="stat.label"
        class="bg-white p-4 rounded-3xl border border-purple-100/50 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
        <div>
          <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{{ stat.label }}</p>
          <p class="text-2xl font-black text-gray-900">{{ stat.value }}</p>
        </div>
        <div :class="['w-12 h-12 rounded-2xl flex items-center justify-center', stat.color]">
          <i :class="['mdi', stat.icon, 'text-2xl']"></i>
        </div>
      </div>
    </div>

    <!-- Filters & View Switcher -->
    <div
      class="bg-white p-4 rounded-3xl border border-purple-100/50 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex flex-wrap items-center gap-3 flex-grow max-w-4xl">
        <!-- Search Input -->
        <div class="relative min-w-[240px] flex-grow">
          <i class="mdi mdi-magnify absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
          <input v-model="search" type="text" placeholder="Search by name, designation, email..."
            class="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all placeholder:text-gray-400" />
        </div>

        <!-- Department Filter -->
        <select v-model="filterDepartment"
          class="px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all">
          <option value="">All Departments</option>
          <option v-for="dept in companyDepartments" :key="dept" :value="dept">{{ dept }}</option>
        </select>

        <!-- Status Filter (For Table View) -->
        <select v-if="viewMode === 'table'" v-model="filterStatus"
          class="px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all">
          <option value="">All Stages</option>
          <option v-for="stage in stages" :key="stage.key" :value="stage.key">{{ stage.label }}</option>
        </select>
      </div>

      <!-- View Toggle buttons -->
      <div class="flex bg-gray-100 p-1.5 rounded-2xl self-start md:self-auto border border-gray-150 shadow-inner">
        <button @click="viewMode = 'kanban'"
          :class="['px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5', viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900']">
          <i class="mdi mdi-trello"></i>
          Pipeline Board
        </button>
        <button @click="viewMode = 'table'"
          :class="['px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5', viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900']">
          <i class="mdi mdi-table-large"></i>
          Table List
        </button>
      </div>
    </div>

    <!-- MAIN LOADING INDICATOR -->
    <div v-if="loading" class="flex-1 flex flex-col items-center justify-center py-16">
      <div class="w-12 h-12 border-4 border-brand-purple border-t-transparent rounded-full animate-spin mb-4"></div>
      <p class="text-sm font-bold text-gray-500">Syncing pipeline records...</p>
    </div>

    <!-- NO RECORDS PLACEHOLDER -->
    <div v-else-if="filteredCandidates.length === 0"
      class="bg-white border border-purple-100/50 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center">
      <div
        class="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 mb-4 animate-bounce">
        <i class="mdi mdi-briefcase-search text-4xl"></i>
      </div>
      <h3 class="text-lg font-black text-gray-950">No candidates match search criteria</h3>
      <p class="text-sm font-medium text-gray-500 max-w-sm mt-1">Try modifying your filters, clearing your search query,
        or add a fresh candidate applicant.</p>
    </div>

    <!-- VIEW 1: KANBAN BOARD -->
    <div v-else-if="viewMode === 'kanban'" class="flex-1 overflow-x-auto pb-6 no-scrollbar">
      <div class="flex gap-4 min-w-[1200px] h-full items-start">
        <div v-for="stage in stages" :key="stage.key"
          class="flex-shrink-0 w-80 bg-white/40 border border-purple-100/20 p-4 rounded-3xl flex flex-col max-h-[640px] shadow-sm backdrop-blur-sm">

          <!-- Column Header -->
          <div class="flex items-center justify-between mb-4 flex-shrink-0 pb-2 border-b border-gray-100">
            <div class="flex items-center gap-2">
              <span
                :class="['px-2.5 py-1 text-xs font-bold rounded-xl flex items-center justify-center border', stage.color]">
                <i :class="['mdi mr-1', stage.icon]"></i>
                {{ stage.key }}
              </span>
            </div>
            <span class="text-xs font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">
              {{ candidatesByStage[stage.key].length }}
            </span>
          </div>

          <!-- Column Cards Scrollable container -->
          <div class="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
            <!-- Candidate Cards -->
            <div v-for="cand in candidatesByStage[stage.key]" :key="cand.id"
              class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all group relative">

              <!-- Quick conversion banner -->
              <div v-if="cand.status === 'Hired'"
                class="mb-2 p-1.5 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                <span class="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Hired & Ready</span>
                <button @click="handleHireCandidate(cand)" :disabled="convertingId === cand.id"
                  class="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition disabled:opacity-50">
                  <span v-if="convertingId === cand.id">Creating...</span>
                  <span v-else>Onboard</span>
                </button>
              </div>

              <div class="flex justify-between items-start mb-2">
                <div>
                  <h4 class="text-sm font-bold text-gray-900 group-hover:text-brand-purple transition-all">{{ cand.name
                    }}</h4>
                  <p class="text-xs text-gray-500 font-medium">{{ cand.designation }}</p>
                </div>
                <button @click="openEdit(cand)"
                  class="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-brand-purple rounded-md hover:bg-gray-50 transition-all">
                  <i class="mdi mdi-pencil text-sm"></i>
                </button>
              </div>

              <!-- Badges Info -->
              <div class="flex flex-wrap gap-1.5 mb-3">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                  {{ cand.department }}
                </span>
                <span :class="['text-[10px] font-bold px-2 py-0.5 rounded border', getNoticeColor(cand.notice_period)]">
                  Notice: {{ cand.notice_period }}
                </span>
              </div>

              <!-- Metadata -->
              <div class="text-[11px] text-gray-400 space-y-1 border-t border-gray-50 pt-2 mb-3">
                <div class="flex justify-between">
                  <span>Expected Date:</span>
                  <span class="font-bold text-gray-600">{{ cand.expected_joining_date || 'TBD' }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Expectation:</span>
                  <span class="font-bold text-gray-600">{{ cand.expected_salary || 'N/A' }}</span>
                </div>
              </div>

              <!-- Quick Pipeline actions -->
              <div class="flex items-center justify-between gap-1.5 pt-2 border-t border-gray-100">
                <button v-if="cand.status !== 'Rejected'" @click="rejectCandidate(cand)"
                  class="p-1.5 text-xs text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                  title="Archive / Reject">
                  <i class="mdi mdi-close-circle-outline text-base"></i>
                </button>
                <div class="flex-grow"></div>
                <div class="flex gap-1">
                  <button v-if="stage.key !== 'Screening'" @click="moveStage(cand, -1)"
                    class="p-1 px-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-all text-xs"
                    title="Previous Stage">
                    <i class="mdi mdi-arrow-left"></i>
                  </button>
                  <button v-if="stage.key !== 'Hired' && stage.key !== 'Rejected'" @click="moveStage(cand, 1)"
                    class="p-1 px-2.5 bg-purple-50 text-brand-purple border border-purple-100 rounded-lg hover:bg-brand-purple hover:text-white transition-all text-xs font-bold"
                    title="Advance Stage">
                    Next <i class="mdi mdi-arrow-right ml-0.5"></i>
                  </button>
                </div>
              </div>

            </div>

            <!-- Empty stage slot placeholder -->
            <div v-if="candidatesByStage[stage.key].length === 0"
              class="border-2 border-dashed border-gray-100 rounded-2xl py-8 text-center text-xs text-gray-400 font-medium">
              No candidates in this stage
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- VIEW 2: TABLE LIST -->
    <div v-else class="bg-white border border-purple-100/50 shadow-sm rounded-3xl overflow-hidden flex-1 flex flex-col">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <th class="p-4 sm:p-5">Candidate Name</th>
              <th class="p-4">Department & Designation</th>
              <th class="p-4">Notice Period</th>
              <th class="p-4">Joining Expectation</th>
              <th class="p-4">Interview Stage</th>
              <th class="p-4">Expected Salary</th>
              <th class="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-150/50 text-sm">
            <tr v-for="cand in filteredCandidates" :key="cand.id" class="hover:bg-purple-50/20 transition-all group">
              <!-- Name Info -->
              <td class="p-4 sm:p-5">
                <div>
                  <p class="font-bold text-gray-900 group-hover:text-brand-purple transition-all">{{ cand.name }}</p>
                  <p class="text-xs text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                    <i class="mdi mdi-email-outline"></i> {{ cand.email }}
                    <span v-if="cand.phone" class="mx-1 text-gray-300">|</span>
                    <i v-if="cand.phone" class="mdi mdi-phone-outline"></i> {{ cand.phone }}
                  </p>
                </div>
              </td>

              <!-- Dept & Designation -->
              <td class="p-4">
                <div>
                  <span class="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-gray-100 text-gray-600 block w-max mb-1">
                    {{ cand.department }}
                  </span>
                  <p class="text-xs font-bold text-gray-800">{{ cand.designation }}</p>
                </div>
              </td>

              <!-- Notice Period -->
              <td class="p-4">
                <span
                  :class="['px-2.5 py-0.5 text-xs font-bold rounded-lg border', getNoticeColor(cand.notice_period)]">
                  {{ cand.notice_period }}
                </span>
              </td>

              <!-- Joining Date -->
              <td class="p-4 font-bold text-gray-700">
                {{ cand.expected_joining_date || 'Flexible' }}
              </td>

              <!-- Stage Badge -->
              <td class="p-4">
                <span
                  :class="['px-3 py-1 text-xs font-bold rounded-xl border flex items-center justify-center w-max', stages.find(s => s.key === cand.status)?.color || 'bg-gray-100 text-gray-600 border-gray-200']">
                  <i :class="['mdi mr-1', stages.find(s => s.key === cand.status)?.icon]"></i>
                  {{ cand.status }}
                </span>
              </td>

              <!-- Salaries -->
              <td class="p-4 font-bold text-gray-700">
                {{ cand.expected_salary || 'Negotiable' }}
              </td>

              <!-- Action Menu -->
              <td class="p-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button v-if="cand.status === 'Hired'" @click="handleHireCandidate(cand)"
                    :disabled="convertingId === cand.id"
                    class="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm hover:shadow-emerald-500/15 flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 border border-gray-100">
                    <i class="mdi mdi-account-check-outline text-sm"></i>
                    {{ convertingId === cand.id ? 'Onboarding...' : 'Onboard Hired' }}
                  </button>
                  <button @click="openEdit(cand)"
                    class="p-2 text-gray-400 hover:text-brand-purple hover:bg-purple-50 rounded-xl transition-all whitespace-nowrap"
                    title="View details">
                    <i class="mdi mdi-pencil text-lg"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL 1: ADD CANDIDATE MODAL -->
    <div v-if="showAddModal"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto bg-black/50 backdrop-blur-sm">
      <div
        class="relative w-full max-w-2xl bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-250">
        <!-- Header -->
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 class="text-lg font-black text-gray-900">Add Applicant Profile</h3>
            <p class="text-xs font-medium text-gray-500">Record a candidate's information to initiate screening.</p>
          </div>
          <button @click="showAddModal = false"
            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-250 rounded-xl transition-all">
            <i class="mdi mdi-close text-lg"></i>
          </button>
        </div>

        <!-- Content/Form -->
        <form @submit.prevent="handleAddCandidate" class="p-6 space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Full Name *</label>
              <input v-model="addForm.name" type="text" required placeholder="e.g. Rahul Sharma"
                class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all" />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Email Address
                *</label>
              <input v-model="addForm.email" type="email" required placeholder="name@example.com"
                class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Phone Number</label>
              <input v-model="addForm.phone" type="text" placeholder="e.g. +91 99999 88888"
                class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all" />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Notice Period</label>
              <select v-model="addForm.notice_period"
                class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all">
                <option value="Immediate">Immediate</option>
                <option value="15 Days">15 Days</option>
                <option value="30 Days">30 Days</option>
                <option value="60 Days">60 Days</option>
                <option value="90 Days">90 Days</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Applied Department
                *</label>
              <select v-model="addForm.department" required
                class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all">
                <option value="">Select Department</option>
                <option v-for="dept in companyDepartments" :key="dept" :value="dept">{{ dept }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Applied Designation
                *</label>
              <input v-model="addForm.designation" type="text" required placeholder="e.g. Product Manager"
                class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Expected Date of
                Joining</label>
              <input v-model="addForm.expected_joining_date" type="date"
                class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all" />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Current
                Salary</label>
              <input v-model="addForm.current_salary" type="text" placeholder="e.g. 10,00,000 INR"
                class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all" />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Expected
                Salary</label>
              <input v-model="addForm.expected_salary" type="text" placeholder="e.g. 15,00,000 INR"
                class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">HR Interviewer Notes &
              Feedback</label>
            <textarea v-model="addForm.notes" rows="3"
              placeholder="Enter notes or feedback regarding CV screening, initial communication or skill evaluation..."
              class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all resize-none"></textarea>
          </div>

          <!-- Actions -->
          <div class="flex justify-end items-center gap-3 pt-4 border-t border-gray-100 bg-gray-50/50 -mx-6 -mb-6 p-6">
            <button type="button" @click="showAddModal = false"
              class="px-5 py-2.5 rounded-2xl border border-gray-200 font-bold text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-all">
              Cancel
            </button>
            <button type="submit"
              class="px-5 py-2.5 rounded-2xl bg-brand-purple font-bold text-sm text-white hover:bg-purple-700 shadow-md shadow-brand-purple/10 transition-all">
              Save Candidate
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 2: DETAIL & EDIT CANDIDATE MODAL -->
    <div v-if="showEditModal"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto bg-black/50 backdrop-blur-sm">
      <div
        class="relative w-full max-w-2xl bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-250">
        <!-- Header -->
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 class="text-lg font-black text-gray-900">Manage Candidate Profile</h3>
            <p class="text-xs font-medium text-gray-500">Edit interview rounds, expected details, or review notes logs.
            </p>
          </div>
          <button @click="showEditModal = false"
            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-250 rounded-xl transition-all">
            <i class="mdi mdi-close text-lg"></i>
          </button>
        </div>

        <!-- Form content -->
        <form @submit.prevent="handleUpdateCandidate" class="p-6 space-y-4">

          <!-- Hired & Convert to Employee Top Banner -->
          <div v-if="editForm.status === 'Hired'"
            class="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mb-2 animate-in fade-in slide-in-from-top-4 duration-200">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <i class="mdi mdi-check-decagram text-xl animate-pulse"></i>
              </div>
              <div class="text-left">
                <h4 class="text-sm font-bold text-emerald-950">Candidate Status: Hired</h4>
                <p class="text-xs text-emerald-600 font-medium">This candidate is ready to join. Click to convert them
                  into an active system employee.</p>
              </div>
            </div>
            <button type="button" @click="handleHireCandidate(selectedCandidate)"
              :disabled="convertingId === selectedCandidate.id"
              class="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/15 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50">
              <i class="mdi mdi-account-check-outline text-sm"></i>
              {{ convertingId === selectedCandidate.id ? 'Converting...' : 'Convert to Employee' }}
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Candidate
                Name</label>
              <input v-model="editForm.name" type="text" required
                class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all" />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <input v-model="editForm.email" type="email" required
                class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Designation</label>
              <input v-model="editForm.designation" type="text" required
                class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all" />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Notice Period</label>
              <select v-model="editForm.notice_period"
                class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all">
                <option value="Immediate">Immediate</option>
                <option value="15 Days">15 Days</option>
                <option value="30 Days">30 Days</option>
                <option value="60 Days">60 Days</option>
                <option value="90 Days">90 Days</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Expected Date of
                Joining</label>
              <input v-model="editForm.expected_joining_date" type="date"
                class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all" />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Pipeline Stage /
                Status</label>
              <select v-model="editForm.status"
                class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all">
                <option v-for="stage in stages" :key="stage.key" :value="stage.key">{{ stage.label }}</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Current
                Salary</label>
              <input v-model="editForm.current_salary" type="text"
                class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all" />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Expected
                Salary</label>
              <input v-model="editForm.expected_salary" type="text"
                class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Interview Logs & HR
              Notes</label>
            <textarea v-model="editForm.notes" rows="4"
              class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all resize-none"></textarea>
          </div>

          <!-- Danger actions -->
          <div class="pt-4 border-t border-gray-100 flex items-center justify-between">
            <button type="button" @click="handleDeleteCandidate(selectedCandidate.id)"
              class="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 text-xs font-bold transition-all whitespace-nowrap">
              <i class="mdi mdi-delete-outline mr-1"></i> Delete Candidate Record
            </button>
          </div>

          <!-- Actions footer -->
          <div class="flex justify-end items-center gap-3 pt-4 border-t border-gray-100 bg-gray-50/50 -mx-6 -mb-6 p-6">
            <button type="button" @click="showEditModal = false"
              class="px-5 py-2.5 rounded-2xl border border-gray-200 font-bold text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-all">
              Close
            </button>
            <button type="submit"
              class="px-5 py-2.5 rounded-2xl bg-brand-purple font-bold text-sm text-white hover:bg-purple-700 shadow-md shadow-brand-purple/10 transition-all">
              Update Candidate
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Hide scrollbar for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.no-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
</style>
