<script setup>
import defaultLogo from '../assets/home-logo.svg';
import { useRouter, useRoute } from 'vue-router';
import MainHeader from './headers/MainHeader.vue';
import { ref, watch, onMounted } from 'vue';
import { getCurrentSession, getUserProfile, getCompany } from '../services/api';
import { supabase } from '../utils/supabase';

import employee from '../assets/icons/employee.svg';
import user from '../assets/icons/user.svg';
import shop from '../assets/icons/shop.svg';
import mailbox from '../assets/icons/mailbox.svg';
import Holiday from '../assets/icons/holiday-calendar.svg';
import leaveIcon from '../assets/icons/leave.svg';

const orgName = ref('HRMS Software');
const orgLogo = ref(defaultLogo);
const loggedInUser = ref({ name: 'Guest', role: 'Employee' });
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
  const companyId = profile?.companyId || 1;

  loggedInUser.value = {
    name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email || 'User',
    role: profile?.role || 'Employee',
    email: authUser.email,
  };

  try {
    const companyData = await getCompany(companyId);
    if (companyData) {
      orgName.value = companyData.name;
      orgLogo.value = companyData.logo;
    }
  } catch (error) {
    console.error('Error fetching company info:', error);
  }
});

const handleLogout = async () => {
  await supabase.auth.signOut();
  router.push('/signin');
};

import { computed } from 'vue';

const sideBarList = computed(() => {
  const list = [
    { text: 'Employee', route: '/overview', icon: employee },
    { text: 'User', route: '/users', icon: user },
    { text: 'Leave Management', route: '/leaves', icon: leaveIcon },
    { text: 'Policy Documents', route: '/companypolicy', icon: shop },
    { text: 'Holidays', route: '/holidays', icon: Holiday },
  ];
  if (loggedInUser.value?.role?.toLowerCase() === 'admin') {
    list.push({ text: 'Admin Panel', route: '/admin/dashboard', icon: user });
  }
  return list;
});

const activeTab = ref(route.path);

const setActive = (link) => {
  activeTab.value = link.route;
  router.push(link.route);
  isMobileMenuOpen.value = false;
};

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
};

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

watch(route, () => {
  activeTab.value = route.path;
});
</script>

<template>
  <div class="flex h-screen bg-gray-50 font-sans overflow-hidden">
    <!-- Mobile Overlay -->
    <div v-if="isMobileMenuOpen" class="fixed inset-0 bg-black/50 z-[60] lg:hidden backdrop-blur-sm transition-opacity"
      @click="isMobileMenuOpen = false">
    </div>

    <!-- Sidebar -->
    <aside :class="[
      'fixed lg:static inset-y-0 left-0 z-[70] bg-white border-r border-gray-100 shadow-xl lg:shadow-none transition-all duration-300 ease-in-out flex flex-col',
      isSidebarCollapsed ? 'w-20' : 'w-72',
      isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    ]">
      <!-- Sidebar Header -->
      <div class="h-20 flex items-center px-6 border-b border-gray-50 flex-shrink-0">
        <div class="flex items-center min-w-0">
          <div
            class="flex-shrink-0 w-10 h-10 bg-brand-purple/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
            <img :src="orgLogo" alt="Logo" class="h-6 w-6 object-contain" />
          </div>
          <h1 v-show="!isSidebarCollapsed" class="text-lg font-black tracking-tight text-gray-900">
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
            'flex-shrink-0 transition-transform group-hover:scale-110',
            isSidebarCollapsed ? 'mx-auto' : 'mr-4',
            activeTab === link.route ? 'brightness-0 invert' : ''
          ]">
            <img :src="link.icon" class="w-5 h-5" />
          </div>
          <span v-show="!isSidebarCollapsed" class="text-sm font-bold whitespace-nowrap">{{ link.text }}</span>

          <!-- Tooltip for collapsed mode -->
          <div v-if="isSidebarCollapsed"
            class="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
            {{ link.text }}
          </div>
        </div>
      </nav>

      <!-- Profile & Logout Section -->
      <div class="p-4 mt-auto border-t border-gray-50 bg-gray-50/50">
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
      <header class="h-20 flex items-center justify-between px-6 bg-white border-b border-gray-100 z-40 flex-shrink-0">
        <div class="flex items-center gap-4">
          <!-- Mobile Menu Toggle -->
          <button @click="toggleMobileMenu"
            class="lg:hidden text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
            <i class="mdi mdi-menu text-2xl"></i>
          </button>

          <!-- Sidebar Collapse Toggle (Desktop) -->
          <button @click="toggleSidebar"
            class="hidden lg:flex p-2 text-gray-400 hover:text-brand-purple hover:bg-brand-purple/10 rounded-xl transition-all">
            <i :class="['mdi text-2xl', isSidebarCollapsed ? 'mdi-menu-open' : 'mdi-menu']"></i>
          </button>

          <div class="h-8 w-px bg-gray-100 mx-2 hidden lg:block"></div>

          <!-- Dynamic Breadcrumb or Page Title -->
          <h2 class="text-xl font-extrabold text-gray-900 hidden sm:block">
            {{sideBarList.find(l => l.route === activeTab)?.text || 'Dashboard'}}
          </h2>
        </div>

        <div class="flex items-center gap-4">
          <MainHeader />
        </div>
      </header>

      <!-- View Area -->
      <div class="flex-grow overflow-y-auto p-2 lg:p-4 custom-scrollbar">
        <div class="w-full mx-auto">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </div>
    </main>
  </div>
</template>

<style>
@import url('https://cdn.materialdesignicons.com/5.4.55/css/materialdesignicons.min.css');

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

:root {
  --brand-purple: #8A3EEA;
  --brand-orange: #F3901B;
}

.bg-brand-purple {
  background-color: var(--brand-purple);
}

.text-brand-purple {
  color: var(--brand-purple);
}

.bg-brand-purple\/10 {
  background-color: rgba(138, 62, 234, 0.1);
}

.border-brand-purple\/10 {
  border-color: rgba(138, 62, 234, 0.1);
}

.border-brand-purple\/20 {
  border-color: rgba(138, 62, 234, 0.2);
}

.shadow-brand-purple\/25 {
  shadow-color: rgba(138, 62, 234, 0.25);
}
</style>
