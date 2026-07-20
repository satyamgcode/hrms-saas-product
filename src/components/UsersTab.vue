<script setup>
import { ref, onMounted, computed } from 'vue';
import { getUsers, getCurrentSession, getUserProfile } from '../services/api';

const users = ref([]);
const loading = ref(true);
const currentCompanyId = ref(null);
const searchQuery = ref('');
const selectedUser = ref(null);

const loadUsers = async () => {
  loading.value = true;
  try {
    const session = await getCurrentSession();
    const authUser = session?.user;
    if (authUser) {
      const profile = await getUserProfile({ userId: authUser.id });
      if (profile) {
        currentCompanyId.value = profile.companyId;
      }
    }
    users.value = await getUsers(currentCompanyId.value);
  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    loading.value = false;
  }
};

const filteredUsers = computed(() => {
  if (!searchQuery.value.trim()) return users.value;
  const q = searchQuery.value.toLowerCase().trim();
  return users.value.filter((user) => {
    const name = (user.name || user.full_name || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const role = (user.role || '').toLowerCase();
    const designation = (user.designation || '').toLowerCase();
    const department = (user.department || '').toLowerCase();
    const location = (user.location || '').toLowerCase();
    const phone = (user.phone || '').toLowerCase();
    return (
      name.includes(q) ||
      email.includes(q) ||
      role.includes(q) ||
      designation.includes(q) ||
      department.includes(q) ||
      location.includes(q) ||
      phone.includes(q)
    );
  });
});

const openUserModal = (user) => {
  selectedUser.value = user;
};

const closeUserModal = () => {
  selectedUser.value = null;
};

const clearSearch = () => {
  searchQuery.value = '';
};

onMounted(loadUsers);
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <!-- Premium Header Section -->
    <div class="bg-white p-5 sm:p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-orange to-red-500 flex items-center justify-center text-white shadow-lg shadow-orange-200">
          <i class="mdi mdi-account-group text-3xl"></i>
        </div>
        <div>
          <h2 class="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Team Directory</h2>
          <p class="text-sm font-medium text-gray-500 mt-1">
            Manage and connect with your team members
            <span v-if="!loading && users.length > 0" class="text-brand-purple font-bold ml-1">
              ({{ filteredUsers.length }} of {{ users.length }})
            </span>
          </p>
        </div>
      </div>
      
      <div class="flex items-center gap-3 w-full md:w-auto">
        <div class="relative w-full md:w-72">
          <i class="mdi mdi-magnify absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search by name, role, email, dept..." 
            class="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200/60 rounded-xl focus:ring-2 focus:ring-brand-purple focus:border-transparent focus:bg-white transition-all text-sm font-medium outline-none"
          />
          <button 
            v-if="searchQuery" 
            @click="clearSearch"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
            title="Clear search"
          >
            <i class="mdi mdi-close-circle text-base"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-20">
      <span class="animate-spin h-10 w-10 border-4 border-brand-purple border-t-transparent rounded-full shadow-lg"></span>
    </div>

    <!-- Users Grid -->
    <div v-else-if="filteredUsers.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div 
        v-for="user in filteredUsers" 
        :key="user.id" 
        @click="openUserModal(user)"
        class="group bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-gray-100 hover:border-brand-purple/30 hover:shadow-xl hover:shadow-brand-purple/5 transition-all duration-300 flex items-center gap-4 cursor-pointer relative overflow-hidden"
      >
        <div class="relative flex-shrink-0">
          <img 
            :src="user.avatar || `https://ui-avatars.com/api/?name=${user.name || user.full_name}&background=8A3EEA&color=fff`" 
            :alt="user.name || user.full_name" 
            class="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm group-hover:scale-105 transition-transform duration-300" 
          />
          <!-- Online Status Indicator -->
          <span :class="[user.status === 'inactive' ? 'bg-gray-400' : 'bg-green-500', 'absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full']"></span>
        </div>
        
        <div class="flex-grow min-w-0">
          <h3 class="text-sm font-bold text-gray-900 truncate group-hover:text-brand-purple transition-colors">{{ user.name || user.full_name }}</h3>
          <p class="text-xs font-semibold text-brand-purple capitalize truncate mt-0.5">{{ user.role || 'Employee' }}</p>
          <p class="text-[10px] text-gray-500 uppercase tracking-wider truncate mt-1">{{ user.designation || user.department || 'General' }}</p>
        </div>
        
        <div class="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 md:opacity-100">
          <a 
            :href="`mailto:${user.email}`" 
            @click.stop 
            class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-brand-orange hover:bg-orange-50 rounded-lg transition-colors" 
            title="Email User"
          >
            <i class="mdi mdi-email-outline text-base"></i>
          </a>
          <button 
            @click.stop="openUserModal(user)"
            class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-brand-purple hover:bg-purple-50 rounded-lg transition-colors" 
            title="View Profile Details"
          >
            <i class="mdi mdi-arrow-right text-base"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty / No Search Results State -->
    <div v-else class="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
      <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <i class="mdi mdi-account-off-outline text-4xl text-gray-400"></i>
      </div>
      <h3 class="text-lg font-bold text-gray-900">No team members found</h3>
      <p class="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
        {{ searchQuery ? `No matches found for "${searchQuery}". Try searching for something else.` : 'There are no team members in this directory.' }}
      </p>
      <button 
        v-if="searchQuery" 
        @click="clearSearch"
        class="mt-4 px-5 py-2.5 bg-brand-purple/10 text-brand-purple font-bold rounded-xl hover:bg-brand-purple hover:text-white transition-all text-xs"
      >
        Clear Search
      </button>
    </div>

    <!-- User Details Modal -->
    <div 
      v-if="selectedUser" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      @click.self="closeUserModal"
    >
      <div class="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        <!-- Header Banner -->
        <div class="relative bg-gradient-to-r from-[#8A3EEA] via-purple-600 to-[#F3901B] p-6 text-white">
          <button 
            @click="closeUserModal"
            class="absolute top-4 right-4 w-9 h-9 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
            title="Close"
          >
            <i class="mdi mdi-close text-xl"></i>
          </button>

          <div class="flex flex-col sm:flex-row items-center sm:items-end gap-5 pt-2">
            <img 
              :src="selectedUser.avatar || `https://ui-avatars.com/api/?name=${selectedUser.name || selectedUser.full_name}&background=8A3EEA&color=fff`" 
              :alt="selectedUser.name || selectedUser.full_name"
              class="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-white shadow-xl object-cover" 
            />
            <div class="text-center sm:text-left flex-grow">
              <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h3 class="text-2xl font-black text-white tracking-tight">{{ selectedUser.name || selectedUser.full_name }}</h3>
                <span class="px-3 py-0.5 bg-white/20 backdrop-blur-md text-white text-xs font-black uppercase tracking-wider rounded-full">
                  {{ selectedUser.role || 'Employee' }}
                </span>
              </div>
              <p class="text-white/90 font-medium text-sm">{{ selectedUser.designation || 'Team Member' }}</p>
              <p class="text-white/70 text-xs mt-1 flex items-center justify-center sm:justify-start gap-1">
                <i class="mdi mdi-domain"></i> {{ selectedUser.department || 'General Department' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Scrollable Modal Content -->
        <div class="p-6 overflow-y-auto space-y-6 flex-grow">
          
          <!-- Key Details Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Email -->
            <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start gap-3">
              <div class="w-10 h-10 bg-brand-purple/10 text-brand-purple rounded-xl flex items-center justify-center flex-shrink-0">
                <i class="mdi mdi-email-outline text-xl"></i>
              </div>
              <div class="min-w-0 flex-grow">
                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</p>
                <a :href="`mailto:${selectedUser.email}`" class="text-sm font-bold text-gray-900 truncate block hover:text-brand-purple transition-colors">
                  {{ selectedUser.email || 'Not available' }}
                </a>
              </div>
            </div>

            <!-- Phone -->
            <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start gap-3">
              <div class="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <i class="mdi mdi-phone-outline text-xl"></i>
              </div>
              <div class="min-w-0 flex-grow">
                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</p>
                <a v-if="selectedUser.phone" :href="`tel:${selectedUser.phone}`" class="text-sm font-bold text-gray-900 truncate block hover:text-brand-purple transition-colors">
                  {{ selectedUser.phone }}
                </a>
                <p v-else class="text-sm font-bold text-gray-400">Not provided</p>
              </div>
            </div>

            <!-- Location -->
            <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start gap-3">
              <div class="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <i class="mdi mdi-map-marker-outline text-xl"></i>
              </div>
              <div class="min-w-0 flex-grow">
                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</p>
                <p class="text-sm font-bold text-gray-900 truncate">{{ selectedUser.location || 'Remote / Unspecified' }}</p>
              </div>
            </div>

            <!-- Joining Date -->
            <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start gap-3">
              <div class="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <i class="mdi mdi-calendar-check-outline text-xl"></i>
              </div>
              <div class="min-w-0 flex-grow">
                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date Joined</p>
                <p class="text-sm font-bold text-gray-900 truncate">{{ selectedUser.joining_date || 'N/A' }}</p>
              </div>
            </div>
          </div>

          <!-- About / Bio Section -->
          <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <h4 class="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <i class="mdi mdi-information-outline text-brand-purple"></i> About Employee
            </h4>
            <p class="text-sm font-medium text-gray-600 leading-relaxed">
              {{ selectedUser.bio || 'No bio available for this employee.' }}
            </p>
          </div>

          <!-- Addresses & Website (if provided) -->
          <div v-if="selectedUser.current_address || selectedUser.office_address || selectedUser.website" class="space-y-3">
            <h4 class="text-xs font-black text-gray-400 uppercase tracking-widest">Additional Details</h4>
            
            <div v-if="selectedUser.office_address" class="text-xs text-gray-600">
              <span class="font-bold text-gray-700">Office Address:</span> {{ selectedUser.office_address }}
            </div>
            
            <div v-if="selectedUser.current_address" class="text-xs text-gray-600">
              <span class="font-bold text-gray-700">Current Address:</span> {{ selectedUser.current_address }}
            </div>
            
            <div v-if="selectedUser.website" class="text-xs text-gray-600">
              <span class="font-bold text-gray-700">Website:</span> 
              <a :href="selectedUser.website" target="_blank" class="text-brand-purple hover:underline ml-1 font-semibold">
                {{ selectedUser.website }}
              </a>
            </div>
          </div>

          <!-- Quick Metrics (if available) -->
          <div v-if="selectedUser.team || selectedUser.projects || selectedUser.awards || selectedUser.clients" class="grid grid-cols-4 gap-3">
            <div class="bg-purple-50/50 p-3 rounded-xl text-center border border-purple-100">
              <p class="text-lg font-black text-brand-purple">{{ selectedUser.team || 0 }}</p>
              <p class="text-[10px] font-bold text-gray-500 uppercase">Team</p>
            </div>
            <div class="bg-orange-50/50 p-3 rounded-xl text-center border border-orange-100">
              <p class="text-lg font-black text-brand-orange">{{ selectedUser.projects || 0 }}</p>
              <p class="text-[10px] font-bold text-gray-500 uppercase">Projects</p>
            </div>
            <div class="bg-blue-50/50 p-3 rounded-xl text-center border border-blue-100">
              <p class="text-lg font-black text-blue-600">{{ selectedUser.awards || 0 }}</p>
              <p class="text-[10px] font-bold text-gray-500 uppercase">Awards</p>
            </div>
            <div class="bg-emerald-50/50 p-3 rounded-xl text-center border border-emerald-100">
              <p class="text-lg font-black text-emerald-600">{{ selectedUser.clients || 0 }}</p>
              <p class="text-[10px] font-bold text-gray-500 uppercase">Clients</p>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <a 
            v-if="selectedUser.email"
            :href="`mailto:${selectedUser.email}`"
            class="px-5 py-2.5 bg-brand-purple hover:bg-brand-purple/90 text-white font-bold rounded-xl transition-all shadow-md shadow-brand-purple/20 text-xs flex items-center gap-2"
          >
            <i class="mdi mdi-email text-base"></i> Send Email
          </a>
          <button 
            @click="closeUserModal"
            class="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 font-bold rounded-xl transition-all text-xs ml-auto"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  </div>
</template>
