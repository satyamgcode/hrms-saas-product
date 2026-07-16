<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getCurrentSession, getUserProfile } from '../../services/api';
import searchIcon from '../../assets/icons/search.svg';

const searchQuery = ref('');
const router = useRouter();
const isAdmin = ref(false);

const navigateToSettings = () => {
  router.push('/settings');
};

const navigateToAdmin = () => {
  router.push('/admin/dashboard');
};

onMounted(async () => {
  try {
    const session = await getCurrentSession();
    const authUser = session?.user;
    if (authUser) {
      const profile = await getUserProfile({ userId: authUser.id });
      isAdmin.value = profile?.role?.toLowerCase() === 'admin';
    }
  } catch (error) {
    console.error('Error checking admin role in header:', error);
  }
});
</script>

<template>
  <div class="flex items-center gap-4">
    <!-- Search Bar -->
    <div class="relative group hidden md:block">
      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors">
        <img :src="searchIcon" class="w-4 h-4 opacity-40 group-focus-within:opacity-100 transition-opacity" />
      </div>
      <input 
        type="text" 
        v-model="searchQuery"
        placeholder="Search employee directory, policies..." 
        class="block w-64 lg:w-[420px] pl-11 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-brand-purple/5 focus:border-brand-purple focus:bg-white transition-all shadow-sm"
      />
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2.5">
      <!-- Notification Button -->
      <button class="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-brand-purple hover:bg-brand-purple/10 hover:border-brand-purple/20 shadow-sm transition-all duration-200 relative">
        <i class="mdi mdi-bell-outline text-lg"></i>
        <span class="absolute top-2 right-2 w-2 h-2 bg-red-500 border border-white rounded-full animate-pulse"></span>
      </button>
      
      <!-- Settings Button -->
      <button @click="navigateToSettings" class="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-brand-purple hover:bg-brand-purple/10 hover:border-brand-purple/20 shadow-sm transition-all duration-200" title="Account Settings">
        <i class="mdi mdi-cog-outline text-lg"></i>
      </button>

      <!-- Admin Panel Switch -->
      <button 
        v-if="isAdmin" 
        @click="navigateToAdmin" 
        class="flex items-center gap-2 px-5 py-2.5 bg-brand-purple text-white hover:bg-brand-purple/95 font-bold text-xs rounded-xl transition-all duration-200 active:scale-95 shadow-md shadow-brand-purple/20 border border-brand-purple/10"
        title="Access Administrative Console"
      >
        <i class="mdi mdi-shield-crown text-sm"></i>
        <span>Admin Panel</span>
      </button>
    </div>
  </div>
</template>