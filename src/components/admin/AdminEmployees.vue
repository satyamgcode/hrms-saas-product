<script setup>
import { ref, onMounted, computed } from 'vue';
import { adminApi } from '../../services/adminApi';
import { getCurrentSession, getUserProfile, getCompany } from '../../services/api';
import AddEditEmployeeModal from './AddEditEmployeeModal.vue';
import { addToast } from '../../services/toastService';

const employees = ref([]);
const loading = ref(true);
const search = ref('');
const filterDepartment = ref('');
const filterStatus = ref('');
const companyDepartments = ref([]);

const showModal = ref(false);
const selectedEmployee = ref(null);
const adminCompanyId = ref(null);

const loadEmployees = async () => {
  loading.value = true;
  try {
    const session = await getCurrentSession();
    const authUser = session?.user;
    if (authUser) {
      const profile = await getUserProfile({ userId: authUser.id });
      if (profile) {
        adminCompanyId.value = profile.companyId;
        
        // Load company departments
        const company = await getCompany(profile.companyId);
        if (company && Array.isArray(company.departments)) {
          companyDepartments.value = company.departments;
        }
      }
    }
    const data = await adminApi.getAllEmployees(adminCompanyId.value);
    employees.value = data;
  } catch (error) {
    console.error('Failed to load employees:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(loadEmployees);

// Computed list based on filters
const filteredEmployees = computed(() => {
  return employees.value.filter(emp => {
    const matchesSearch = (emp.name || emp.full_name || '').toLowerCase().includes(search.value.toLowerCase()) || 
                          (emp.email || '').toLowerCase().includes(search.value.toLowerCase()) ||
                          (emp.designation || '').toLowerCase().includes(search.value.toLowerCase());
    
    const matchesDept = !filterDepartment.value || emp.department === filterDepartment.value;
    const matchesStatus = !filterStatus.value || emp.status === filterStatus.value;
    
    return matchesSearch && matchesDept && matchesStatus;
  });
});

const departments = computed(() => {
  const depts = new Set([
    ...companyDepartments.value,
    ...employees.value.map(e => e.department).filter(Boolean)
  ]);
  return Array.from(depts);
});

const openAddModal = () => {
  selectedEmployee.value = null;
  showModal.value = true;
};

const openEditModal = (emp) => {
  selectedEmployee.value = emp;
  showModal.value = true;
};

const handleSave = async (formData) => {
  try {
    if (selectedEmployee.value) {
      // Editing
      const updated = await adminApi.updateEmployee(selectedEmployee.value.id, formData);
      const index = employees.value.findIndex(e => e.id === selectedEmployee.value.id);
      if (index !== -1) {
        employees.value[index] = updated;
      }
    } else {
      // Creating
      const created = await adminApi.createEmployee({
        ...formData,
        companyId: adminCompanyId.value
      });
      employees.value.unshift(created);
    }
    showModal.value = false;
  } catch (error) {
    console.error('Error saving employee:', error);
    addToast('Failed to save employee profile: ' + error.message, 'error');
  }
};

const handleDelete = async (emp) => {
  if (confirm(`Are you sure you want to deactivate employee: ${emp.name}?`)) {
    try {
      const updated = await adminApi.deleteEmployee(emp.id);
      const index = employees.value.findIndex(e => e.id === emp.id);
      if (index !== -1) {
        employees.value[index] = updated;
      }
    } catch (error) {
      console.error('Error deactivating employee:', error);
      addToast('Failed to deactivate: ' + error.message, 'error');
    }
  }
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black tracking-tight text-gray-900">Employee Directory</h1>
        <p class="text-gray-500 font-medium">Onboard, track, and manage official corporate personnel</p>
      </div>
      <button @click="openAddModal" class="px-5 py-2.5 bg-brand-purple hover:bg-brand-purple/95 text-white rounded-xl font-bold flex items-center gap-2 active:scale-95 shadow-lg shadow-brand-purple/25 transition-all">
        <i class="mdi mdi-plus"></i> Onboard Employee
      </button>
    </div>

    <!-- Filters Section -->
    <div class="p-6 bg-white rounded-3xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
      <div class="relative w-full md:w-80">
        <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
          <i class="mdi mdi-magnify text-lg"></i>
        </span>
        <input v-model="search" type="text" placeholder="Search by name, email, title..." 
               class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold" />
      </div>

      <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
        <select v-model="filterDepartment" class="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-purple">
          <option value="">All Departments</option>
          <option v-for="dept in departments" :key="dept" :value="dept">{{ dept }}</option>
        </select>

        <select v-model="filterStatus" class="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-purple">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center items-center py-20">
      <span class="animate-spin h-10 w-10 border-4 border-brand-purple border-t-transparent rounded-full"></span>
    </div>

    <!-- Directory Table -->
    <div v-else class="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-gray-100 text-gray-550 text-xs uppercase tracking-wider font-bold">
              <th class="py-4 px-6">Name / Details</th>
              <th class="py-4 px-6">Designation / Dept</th>
              <th class="py-4 px-6">Contact info</th>
              <th class="py-4 px-6">Date Joined</th>
              <th class="py-4 px-6">Status</th>
              <th class="py-4 px-6 text-right">Operations</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 text-sm font-medium">
            <tr v-for="emp in filteredEmployees" :key="emp.id" class="hover:bg-gray-55/50 transition-colors">
              <td class="py-4 px-6 flex items-center gap-3">
                <img :src="emp.avatar || `https://ui-avatars.com/api/?name=${emp.name}&background=8A3EEA&color=fff`" 
                     class="w-11 h-11 rounded-full object-cover border border-gray-100 shadow-sm" />
                <div>
                  <p class="text-gray-900 font-bold">{{ emp.name || emp.full_name }}</p>
                  <span class="inline-flex items-center px-2 py-0.5 bg-gray-50 border border-gray-200 text-brand-purple text-[10px] font-black uppercase tracking-wider rounded-md mt-0.5">
                    {{ emp.role || 'Employee' }}
                  </span>
                </div>
              </td>
              <td class="py-4 px-6">
                <p class="text-gray-900">{{ emp.designation || 'Staff Member' }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ emp.department || 'HQ Support' }}</p>
              </td>
              <td class="py-4 px-6">
                <p class="text-gray-900 text-xs">{{ emp.email }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ emp.phone || 'No phone added' }}</p>
              </td>
              <td class="py-4 px-6 text-gray-700">
                {{ emp.joining_date || 'N/A' }}
              </td>
              <td class="py-4 px-6">
                <span :class="[
                  'px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider',
                  emp.status === 'inactive' ? 'bg-red-50 text-red-650 border border-red-100' : 'bg-green-50 text-green-650 border border-green-100'
                ]">
                  {{ emp.status || 'Active' }}
                </span>
              </td>
              <td class="py-4 px-6 text-right">
                <div class="flex justify-end gap-2">
                  <button @click="openEditModal(emp)" 
                          class="w-9 h-9 rounded-xl bg-gray-50 hover:bg-brand-purple/10 hover:text-brand-purple text-gray-500 flex items-center justify-center transition-all border border-gray-200" 
                          title="Edit Details">
                    <i class="mdi mdi-pencil-outline text-lg"></i>
                  </button>
                  <button v-if="emp.status !== 'inactive'" @click="handleDelete(emp)" 
                          class="w-9 h-9 rounded-xl bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-500 flex items-center justify-center transition-all border border-gray-200" 
                          title="Deactivate Profile">
                    <i class="mdi mdi-account-off-outline text-lg"></i>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredEmployees.length === 0">
              <td colspan="6" class="text-center py-12 text-gray-450 font-bold">
                No matching employee entries found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form -->
    <AddEditEmployeeModal :show="showModal" :employee="selectedEmployee" @close="showModal = false" @save="handleSave" />
  </div>
</template>
