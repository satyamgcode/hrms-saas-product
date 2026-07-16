<script setup>
import defaultLogo from '../../assets/home-logo.svg';
import { useRouter, useRoute } from 'vue-router';
import { ref, watch, onMounted } from 'vue';
import { getCurrentSession, getUserProfile, getCompany } from '../../services/api';
import { supabase } from '../../utils/supabase';

const orgName = ref('HRMS Admin');
const orgLogo = ref(defaultLogo);
const loggedInUser = ref({ name: 'Admin', role: 'Admin' });
const isSidebarCollapsed = ref(false);
const isMobileMenuOpen = ref(false);

const router = useRouter();
const route = useRoute();

onMounted(async () => {
  const session = await getCurrentSession();
  const authUser = session?.user;

  if (!authUser) {
    router.push('/signin');
    return;
  }

  const profile = await getUserProfile({ email: authUser.email });
  if (profile?.role?.toLowerCase() !== 'admin') {
    // If not Admin, kick back to overview
    router.push('/overview');
    return;
  }

  loggedInUser.value = {
    name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email || 'Admin',
    role: profile?.role || 'Admin',
    email: authUser.email,
  };

  await loadCompanyDetails(profile?.companyId || 1);

  window.addEventListener('company-updated', async () => {
    await loadCompanyDetails(profile?.companyId || 1);
  });
});

const loadCompanyDetails = async (companyId) => {
  try {
    const companyData = await getCompany(companyId);
    if (companyData) {
      orgName.value = companyData.name;
      orgLogo.value = companyData.logo || defaultLogo;
    }
  } catch (error) {
    console.error('Error fetching company info in Admin:', error);
  }
};

const handleLogout = async () => {
  await supabase.auth.signOut();
  router.push('/signin');
};

const sideBarList = [
  { text: 'Dashboard', route: '/admin/dashboard', icon: 'mdi-view-dashboard' },
  { text: 'Employees', route: '/admin/employees', icon: 'mdi-account-group' },
  { text: 'Leave Approvals', route: '/admin/leaves', icon: 'mdi-calendar-clock' },
  { text: 'Payroll Management', route: '/admin/payroll', icon: 'mdi-cash-multiple' },
  { text: 'Attendance Management', route: '/admin/attendance', icon: 'mdi-clock-check-outline' },
  { text: 'Company Policies', route: '/admin/policies', icon: 'mdi-file-document' }
];

const activeTab = ref(route.path);

const setActive = (link) => {
  activeTab.value = link.route;
  router.push(link.route);
  isMobileMenuOpen.value = false;
};

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
};

watch(route, () => {
  activeTab.value = route.path;
});
</script>

<template>
  <div class="flex h-screen bg-gray-50 font-sans overflow-hidden text-gray-800">
    <!-- Mobile Overlay -->
    <div v-if="isMobileMenuOpen" class="fixed inset-0 bg-black/50 z-[60] lg:hidden backdrop-blur-sm transition-opacity"
      @click="isMobileMenuOpen = false">
    </div>

    <!-- Sidebar -->
    <aside :class="[
      'fixed lg:static inset-y-0 left-0 z-[70] bg-white border-r border-purple-200 shadow-xl lg:shadow-none transition-all duration-300 ease-in-out flex flex-col',
      isSidebarCollapsed ? 'w-20' : 'w-72',
      isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    ]">
      <!-- Sidebar Header -->
      <div class="h-20 flex items-center px-6 border-b border-gray-100 flex-shrink-0">
        <div class="flex items-center min-w-0">
          <div
            class="flex-shrink-0 w-10 h-10 bg-brand-purple/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
            <img :src="orgLogo" alt="Logo" class="h-6 w-6 object-contain" />
          </div>
          <h1 v-show="!isSidebarCollapsed" class="text-lg font-black tracking-tight text-gray-900 truncate">
            {{ orgName }}
          </h1>
        </div>
      </div>

      <!-- Navigation Menu -->
      <nav class="flex-grow py-6 px-4 space-y-1.5 custom-scrollbar">
        <div v-for="link in sideBarList" :key="link.text" @click="setActive(link)" :class="[
          'group flex items-center p-3 rounded-2xl transition-all duration-200 cursor-pointer relative',
          activeTab === link.route
            ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/25'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
        ]">
          <div :class="[
            'flex-shrink-0 transition-transform group-hover:scale-110 flex items-center justify-center w-6 h-6',
            activeTab === link.route ? 'text-white' : 'text-gray-450 group-hover:text-gray-700'
          ]">
            <i :class="['mdi', link.icon, 'text-xl']"></i>
          </div>
          <span v-show="!isSidebarCollapsed" class="text-sm font-bold whitespace-nowrap ml-3">{{ link.text }}</span>

          <!-- Tooltip for collapsed mode -->
          <div v-if="isSidebarCollapsed"
            class="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border border-gray-800">
            {{ link.text }}
          </div>
        </div>
      </nav>

      <!-- Profile & Logout Section -->
      <div class="p-4 mt-auto border-t border-gray-100 bg-gray-50/50">
        <div
          :class="['flex items-center', isSidebarCollapsed ? 'justify-center' : 'p-2 bg-white rounded-2xl shadow-sm border border-gray-100']">
          <div class="relative flex-shrink-0">
            <img :src="`https://ui-avatars.com/api/?name=${loggedInUser.name}&background=8A3EEA&color=fff`"
              alt="Profile" class="w-10 h-10 rounded-full border-2 border-brand-purple/10 shadow-sm" />
            <div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>

          <div v-show="!isSidebarCollapsed" class="ml-3 flex-grow min-w-0">
            <p class="text-sm font-bold text-gray-900 truncate">{{ loggedInUser.name }}</p>
            <p class="text-[10px] uppercase tracking-wider font-black text-gray-400 truncate">{{ loggedInUser.role }}
            </p>
          </div>

          <button v-show="!isSidebarCollapsed" @click="handleLogout"
            class="ml-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
            <i class="mdi mdi-logout text-lg"></i>
          </button>
        </div>

        <button v-if="isSidebarCollapsed" @click="handleLogout"
          class="mt-4 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all mx-auto">
          <i class="mdi mdi-logout text-lg"></i>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-grow flex flex-col min-w-0 overflow-hidden relative">
      <!-- Navbar / Header -->
      <header class="h-20 flex items-center justify-between px-8 bg-white/95 backdrop-blur-md border-b border-purple-100 z-40 flex-shrink-0">
        <div class="flex items-center gap-4">
          <!-- Mobile Menu Toggle -->
          <button @click="isMobileMenuOpen = true"
            class="lg:hidden p-2 text-gray-500 hover:text-brand-purple hover:bg-brand-purple/10 rounded-xl transition-all">
            <i class="mdi mdi-menu text-2xl"></i>
          </button>

          <!-- Sidebar Collapse Toggle (Desktop) -->
          <button @click="toggleSidebar"
            class="hidden lg:flex p-2 text-gray-400 hover:text-brand-purple hover:bg-brand-purple/10 border border-transparent hover:border-brand-purple/10 rounded-xl transition-all shadow-sm">
            <i :class="['mdi text-2xl', isSidebarCollapsed ? 'mdi-menu-open' : 'mdi-menu']"></i>
          </button>

          <div class="h-8 w-px bg-purple-100 mx-2 hidden lg:block"></div>

          <!-- Title -->
          <h2 class="text-lg font-black text-gray-950 tracking-tight hidden sm:block">
            {{ activeTab === '/admin/settings' ? 'Company & HRMS Settings' : (sideBarList.find(l => l.route === activeTab)?.text || 'Admin Panel') }}
          </h2>
        </div>

        <div class="flex items-center gap-3">
          <!-- Simple "Admin" Status Indicator -->
          <span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest bg-purple-50 text-purple-650 border border-purple-100 shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
            Admin
          </span>

          <!-- Settings Icon Button -->
          <button @click="setActive({ text: 'Company & HRMS Settings', route: '/admin/settings' })" :class="[
            'w-10 h-10 flex items-center justify-center rounded-xl border transition-all duration-200 relative group shadow-sm',
            activeTab === '/admin/settings'
              ? 'bg-brand-purple border-brand-purple text-white shadow-md shadow-brand-purple/20'
              : 'bg-white border-gray-200 text-gray-500 hover:text-brand-purple hover:bg-brand-purple/10 hover:border-brand-purple/20'
          ]" title="Settings">
            <i class="mdi mdi-cog text-lg"></i>
          </button>

          <!-- Back to Employee Profile / View Button -->
          <button 
            @click="router.push('/overview')" 
            class="flex items-center gap-2 px-5 py-2.5 border border-brand-orange/30 bg-brand-orange/10 hover:bg-brand-orange text-brand-orange hover:text-white rounded-xl font-bold text-xs transition-all duration-200 active:scale-95 shadow-md shadow-brand-orange/5"
            title="Switch to Employee Workspace"
          >
            <i class="mdi mdi-account-circle text-base"></i>
            <span>Employee View</span>
          </button>
        </div>
      </header>

      <!-- View Area -->
      <div class="flex-grow overflow-y-auto p-4 lg:p-6 custom-scrollbar bg-purple-50">
        <div class="w-full mx-auto">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" :key="$route.path" />
            </transition>
          </router-view>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
