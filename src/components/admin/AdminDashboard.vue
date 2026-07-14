<script setup>
import { ref, onMounted } from 'vue';
import { adminApi } from '../../services/adminApi';
import { getCurrentSession, getUserProfile } from '../../services/api';

const employees = ref([]);
const loading = ref(true);
const adminCompanyId = ref(null);

const stats = ref({
  total: 0,
  active: 0,
  departments: 0,
  projects: 0,
  awards: 0
});

const recentEmployees = ref([]);

const loadDashboardData = async () => {
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

    const data = await adminApi.getAllEmployees(adminCompanyId.value);
    employees.value = data;

    // Calculate statistics
    stats.value.total = data.length;
    stats.value.active = data.filter(e => e.status !== 'inactive').length;
    
    // Departments
    const depts = new Set(data.map(e => e.department).filter(Boolean));
    stats.value.departments = depts.size || 1; // Default to at least 1 (e.g. general/tech)

    // Total Projects and Awards
    stats.value.projects = data.reduce((acc, curr) => acc + (Number(curr.projects) || 0), 0);
    stats.value.awards = data.reduce((acc, curr) => acc + (Number(curr.awards) || 0), 0);

    // Recent Hires (last 5 added or sorted by joining_date)
    recentEmployees.value = [...data]
      .filter(e => e.joining_date)
      .sort((a, b) => new Date(b.joining_date) - new Date(a.joining_date))
      .slice(0, 5);

  } catch (error) {
    console.error('Failed to load dashboard data:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(loadDashboardData);
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black tracking-tight text-gray-900">System Dashboard</h1>
        <p class="text-gray-500 font-medium">Real-time statistics and workforce oversight</p>
      </div>
      <button @click="loadDashboardData" class="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-bold flex items-center gap-2 border border-gray-200 active:scale-95 shadow-sm transition-all">
        <i class="mdi mdi-refresh"></i> Refresh Data
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-20">
      <span class="animate-spin h-10 w-10 border-4 border-brand-purple border-t-transparent rounded-full"></span>
    </div>

    <div v-else class="space-y-6">
      <!-- Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div class="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20">
            <i class="mdi mdi-account-group text-2xl"></i>
          </div>
          <div>
            <p class="text-3xl font-black text-gray-900">{{ stats.total }}</p>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Headcount</p>
          </div>
        </div>

        <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div class="w-12 h-12 bg-green-500/10 text-green-600 rounded-2xl flex items-center justify-center mb-4 border border-green-500/20">
            <i class="mdi mdi-account-check text-2xl"></i>
          </div>
          <div>
            <p class="text-3xl font-black text-gray-900">{{ stats.active }}</p>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Employees</p>
          </div>
        </div>

        <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div class="w-12 h-12 bg-purple-500/10 text-brand-purple rounded-2xl flex items-center justify-center mb-4 border border-brand-purple/20">
            <i class="mdi mdi-domain text-2xl"></i>
          </div>
          <div>
            <p class="text-3xl font-black text-gray-900">{{ stats.departments }}</p>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Departments</p>
          </div>
        </div>

        <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div class="w-12 h-12 bg-orange-500/10 text-brand-orange rounded-2xl flex items-center justify-center mb-4 border border-brand-orange/20">
            <i class="mdi mdi-briefcase-check text-2xl"></i>
          </div>
          <div>
            <p class="text-3xl font-black text-gray-900">{{ stats.projects }}</p>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Projects</p>
          </div>
        </div>

        <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div class="w-12 h-12 bg-pink-500/10 text-pink-600 rounded-2xl flex items-center justify-center mb-4 border border-pink-500/20">
            <i class="mdi mdi-trophy text-2xl"></i>
          </div>
          <div>
            <p class="text-3xl font-black text-gray-900">{{ stats.awards }}</p>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recognitions / Awards</p>
          </div>
        </div>
      </div>

      <!-- Detail Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Recent Hires Card -->
        <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm lg:col-span-2">
          <h2 class="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <i class="mdi mdi-clock-outline text-brand-purple"></i> Recent Onboardings
          </h2>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider font-bold">
                  <th class="py-3 px-4">Employee</th>
                  <th class="py-3 px-4">Department / Designation</th>
                  <th class="py-3 px-4">Joining Date</th>
                  <th class="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 text-sm font-medium">
                <tr v-for="emp in recentEmployees" :key="emp.id" class="hover:bg-gray-50/50 transition-colors">
                  <td class="py-4 px-4 flex items-center gap-3">
                    <img :src="emp.avatar || `https://ui-avatars.com/api/?name=${emp.name}&background=8A3EEA&color=fff`" 
                         class="w-10 h-10 rounded-full object-cover border border-gray-100" />
                    <div>
                      <p class="text-gray-900 font-bold">{{ emp.name || emp.full_name }}</p>
                      <p class="text-xs text-gray-500">{{ emp.email }}</p>
                    </div>
                  </td>
                  <td class="py-4 px-4">
                    <p class="text-gray-900">{{ emp.department || 'General' }}</p>
                    <p class="text-xs text-gray-500">{{ emp.designation || 'Member' }}</p>
                  </td>
                  <td class="py-4 px-4 text-gray-600">
                    {{ emp.joining_date || 'N/A' }}
                  </td>
                  <td class="py-4 px-4">
                    <span :class="[
                       'px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider',
                       emp.status === 'inactive' ? 'bg-red-50 text-red-650 border border-red-100' : 'bg-green-50 text-green-650 border border-green-100'
                    ]">
                      {{ emp.status || 'Active' }}
                    </span>
                  </td>
                </tr>
                <tr v-if="recentEmployees.length === 0">
                  <td colspan="4" class="text-center py-8 text-gray-400">
                    No onboarding logs found.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Quick actions / distribution -->
        <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
            <i class="mdi mdi-flash text-brand-purple"></i> Quick Actions
          </h2>

          <div class="grid grid-cols-1 gap-3">
            <router-link to="/admin/employees" class="flex items-center gap-4 p-4 bg-gray-50 hover:bg-purple-50/40 rounded-2xl border border-gray-100 transition-all group">
              <div class="w-10 h-10 rounded-xl bg-brand-purple/10 text-brand-purple flex items-center justify-center group-hover:scale-115 transition-transform">
                <i class="mdi mdi-account-plus text-xl"></i>
              </div>
              <div>
                <p class="text-gray-900 font-bold text-sm">Add New Employee</p>
                <p class="text-xs text-gray-500">Onboard a member onto Supabase</p>
              </div>
            </router-link>

            <router-link to="/admin/employees" class="flex items-center gap-4 p-4 bg-gray-50 hover:bg-purple-50/40 rounded-2xl border border-gray-100 transition-all group">
              <div class="w-10 h-10 rounded-xl bg-orange-500/10 text-brand-orange flex items-center justify-center group-hover:scale-115 transition-transform">
                <i class="mdi mdi-account-search text-xl"></i>
              </div>
              <div>
                <p class="text-gray-900 font-bold text-sm">Search Directory</p>
                <p class="text-xs text-gray-500">Manage profile and contact information</p>
              </div>
            </router-link>
          </div>

          <div class="pt-6 border-t border-gray-100">
            <p class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Department Strength</p>
            <div class="space-y-3">
              <div v-for="dept in Array.from(new Set(employees.map(e => e.department).filter(Boolean))).slice(0, 3)" :key="dept" class="space-y-1">
                <div class="flex justify-between text-xs font-bold text-gray-700">
                  <span>{{ dept }}</span>
                  <span>{{ employees.filter(e => e.department === dept).length }}</span>
                </div>
                <div class="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full bg-brand-purple rounded-full" 
                       :style="{ width: `${(employees.filter(e => e.department === dept).length / (employees.length || 1)) * 100}%` }"></div>
                </div>
              </div>
              <div v-if="employees.length === 0" class="text-sm text-gray-400">
                No department records available.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
