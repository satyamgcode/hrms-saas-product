<template>
  <div class="flex-grow flex items-center justify-center min-h-[70vh] bg-gray-50 px-6 font-['Outfit',sans-serif]">
    <div class="max-w-md w-full bg-white border border-gray-100 rounded-3xl shadow-sm p-10 text-center hover:shadow-lg transition-shadow duration-300">
      
      <!-- Pulsing Glow Warning Icon -->
      <div class="relative w-24 h-24 bg-brand-purple/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <div class="absolute inset-0 rounded-full bg-brand-purple/20 animate-ping"></div>
        <svg class="w-12 h-12 text-brand-purple animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <!-- Copy -->
      <h2 class="text-3xl font-black text-gray-900 mb-2">Page Not Found</h2>
      <p class="text-gray-500 mb-8 leading-relaxed">
        The page you are looking for does not exist or has been moved. Use the sidebar to navigate back to safety.
      </p>

      <!-- Action Button -->
      <button @click="handleRedirect"
        class="w-full bg-[#8A3EEA] hover:bg-[#7a34d6] text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl hover:shadow-purple-500/30 transform active:scale-[0.98] transition-all flex items-center justify-center gap-3">
        <i class="mdi mdi-home-outline text-xl"></i>
        <span>{{ btnText }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getUserProfile } from '../services/api';
import { supabase } from '../utils/supabase';

const router = useRouter();
const isLoggedIn = ref(false);
const userRole = ref('');
const btnText = ref('Go to Dashboard');

onMounted(async () => {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (session?.user) {
      isLoggedIn.value = true;
      const profile = await getUserProfile({ email: session.user.email });
      userRole.value = profile?.role?.toLowerCase() || 'employee';
      btnText.value = userRole.value === 'admin' ? 'Back to Admin Dashboard' : 'Back to Overview';
    }
  } catch (err) {
    console.error('Failed to get session details:', err);
  }
});

const handleRedirect = () => {
  if (isLoggedIn.value) {
    if (userRole.value === 'admin') {
      router.push('/admin/dashboard');
    } else {
      router.push('/overview');
    }
  } else {
    router.push('/signin');
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
@import url('https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css');
</style>
