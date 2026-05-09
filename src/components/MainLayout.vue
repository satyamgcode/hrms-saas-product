<script setup>
import defaultLogo from '../assets/home-logo.svg';
import { useRouter, useRoute } from 'vue-router';
import MainHeader from './headers/MainHeader.vue';
import { ref, watch, onMounted } from 'vue';

import employee from '../assets/icons/employee.svg';
import performance from '../assets/icons/performance.svg';
import user from '../assets/icons/user.svg';
import chat from '../assets/icons/chat.svg';
import shop from '../assets/icons/shop.svg';
import mailbox from '../assets/icons/mailbox.svg';
import Holiday from '../assets/icons/holiday-calendar.svg'

const orgName = ref('HRMS Software');
const orgLogo = ref(defaultLogo);

onMounted(() => {
  const storedOrgName = localStorage.getItem('orgName');
  const storedOrgLogo = localStorage.getItem('orgLogo'); // Assuming logo was saved as base64 or URL
  if (storedOrgName) orgName.value = storedOrgName;
  if (storedOrgLogo) orgLogo.value = storedOrgLogo;
});

// Sidebar items
const sideBarList = [
  {
    text: 'Employee',
    route: '/overview',
    icon: employee,
  },
  {
    text: 'Performance',
    route: '/performance',
    icon: performance,
  },
  {
    text: 'User',
    route: '/users',
    icon: user,
  },
  {
    text: 'Chat',
    route: '/chatroom',
    icon: chat,
  },
  {
    text: ' Policy Documents',
    route: '/companypolicy',
    icon: shop,
  },
  {
    text: 'Holidays',
    route: '/holidays',
    icon: Holiday ,
  }
];

const router = useRouter();
const route = useRoute();

const activeTab = ref(route.path);

const setActive = (link) => {
  activeTab.value = link.route;
  router.push(link.route);
};

watch(route, () => {
  activeTab.value = route.path;
});
</script>

<template>
  <div class="flex h-screen">
    <!-- Sidebar -->
    <div class="flex flex-col justify-between bg-white px-4 py-6 w-60 h-full min-w-60 border-r border-gray-100 shadow-sm">
      <!-- Logo -->
      <div class="flex items-center mb-10 px-2">
        <div class="p-1.5 bg-brand-purple/10 rounded-lg mr-3">
          <img :src="orgLogo" alt="Logo" class="h-6 w-6 object-contain" />
        </div>
        <span class="text-xl font-black tracking-tight text-gray-900 truncate">
          {{ orgName }}
        </span>
      </div>

      <!-- Sidebar Menu -->
      <div class="flex-grow space-y-1">
        <div v-for="link in sideBarList" :key="link.text" 
             :class="{'bg-brand-purple/10 text-brand-purple': activeTab === link.route, 'text-gray-500 hover:bg-gray-50': activeTab !== link.route}"
             class="flex items-center p-3 rounded-xl transition-all duration-200 cursor-pointer group"
             @click="setActive(link)">
          <div class="mr-3 transition-transform group-hover:scale-110" :class="{'brightness-0 saturate-100 invert-[34%] sepia-[98%] saturate-[2857%] hue-rotate-[245deg] brightness-[88%] contrast-[101%]': activeTab === link.route}">
            <img :src="link.icon" class="w-5 h-5" />
          </div>
          <span class="text-sm font-bold">{{ link.text }}</span>
        </div>
      </div>

      <!-- Profile section -->
      <div class="mt-auto pt-6 border-t border-gray-100">
        <div class="flex items-center p-2 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer">
          <img src="https://randomuser.me/api/portraits/men/1.jpg" alt="Profile" class="w-10 h-10 rounded-full mr-3 border-2 border-brand-purple/20" />
          <div class="flex-1 min-w-0">
            <div class="text-gray-900 font-bold text-sm truncate">Satyam Gupta</div>
            <div class="text-gray-400 text-xs truncate">Admin</div>
          </div>
          <span class="mdi mdi-dots-vertical text-gray-400 ml-2"></span>
        </div>
      </div>
    </div>

    <!-- Main content area -->
    <div class="flex-grow bg-gray-50 overflow-auto">
      <div class="sticky top-0 z-50">
        <MainHeader />
      </div>
      <div class="p-6">
        <router-view />
      </div>
    </div>
  </div>
</template>

<style>
@import url('https://cdn.materialdesignicons.com/5.4.55/css/materialdesignicons.min.css');
</style>
