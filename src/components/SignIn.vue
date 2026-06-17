<template>
  <div
    class="min-h-screen flex items-center justify-center font-['Outfit',sans-serif] relative overflow-hidden bg-gray-900">
    <!-- Background Image with Overlay -->
    <div class="absolute inset-0 z-0">
      <img src="../assets/login-bg.png" class="w-full h-full object-cover" alt="Background" />
      <div class="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>
    </div>

    <!-- Decorative Background Elements (adjusted opacity) -->
    <div
      class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#8A3EEA]/20 rounded-full blur-[120px] animate-pulse">
    </div>
    <div
      class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#F3901B]/20 rounded-full blur-[120px] animate-pulse"
      style="animation-delay: 2s"></div>


    <div
      class="flex w-full max-w-5xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(138,62,234,0.15)] overflow-hidden min-h-[600px] relative z-10 border border-white/50 backdrop-blur-sm mx-4">
      <!-- Left Side: Company Information -->
      <div
        class="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#8A3EEA] via-[#a365f5] to-[#F3901B] p-16 text-white flex-col justify-between relative overflow-hidden">
        <div class="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div class="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>

        <div class="relative z-10">
          <div v-if="company" class="flex flex-col gap-6">
            <div class="bg-white/20 backdrop-blur-md p-4 rounded-xl inline-block w-fit">
              <img :src="company.logo" :alt="company.name" class="h-12 w-auto" />
            </div>
            <div>
              <h1 class="text-4xl font-bold mb-4">{{ company.name }}</h1>
              <p class="text-lg text-white/90 leading-relaxed">
                {{ company.description }}
              </p>
            </div>

            <div class="space-y-4 mt-8">
              <div class="flex items-center gap-3 text-white/80">
                <i class="mdi mdi-map-marker text-xl"></i>
                <span>{{ company.address }}</span>
              </div>
              <div class="flex items-center gap-3 text-white/80">
                <i class="mdi mdi-phone text-xl"></i>
                <span>{{ company.phone }}</span>
              </div>
              <div class="flex items-center gap-3 text-white/80">
                <i class="mdi mdi-web text-xl"></i>
                <span>{{ company.website }}</span>
              </div>
            </div>
          </div>
          <div v-else class="animate-pulse flex flex-col gap-6">
            <div class="h-16 w-16 bg-white/20 rounded-xl"></div>
            <div class="h-10 w-48 bg-white/20 rounded"></div>
            <div class="h-24 w-full bg-white/20 rounded"></div>
          </div>
        </div>

        <div class="relative z-10">
          <p class="text-white/60 text-sm">© 2026 {{ company ? company.name : 'HRMS' }}. All rights reserved.</p>
        </div>
      </div>

      <!-- Right Side: Login Fields -->
      <div class="w-full md:w-1/2 p-12 flex flex-col justify-center">
        <div class="max-w-md mx-auto w-full">
          <h2 class="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h2>
          <p class="text-gray-500 mb-8">Please enter your details to sign in</p>

          <form @submit.prevent="handleSignIn" class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <i class="mdi mdi-email-outline"></i>
                </span>
                <input v-model="email" type="email" placeholder="admin@example.com"
                  class="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8A3EEA] focus:border-transparent outline-none transition-all"
                  required />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <i class="mdi mdi-lock-outline"></i>
                </span>
                <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="••••••••"
                  class="block w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8A3EEA] focus:border-transparent outline-none transition-all"
                  required />
                <button type="button" @click="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#8A3EEA] transition-colors focus:outline-none">
                  <i :class="['mdi', showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline']"></i>
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <label class="flex items-center text-sm text-gray-600">
                <input type="checkbox" class="rounded border-gray-300 text-[#8A3EEA] focus:ring-[#8A3EEA] mr-2" />
                Remember me
              </label>
              <a href="#" class="text-sm font-medium text-[#8A3EEA] hover:text-[#F3901B] transition-colors">Forgot
                password?</a>
            </div>

            <button type="submit" :disabled="loading"
              class="w-full bg-[#8A3EEA] hover:bg-[#7a34d6] text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl hover:shadow-purple-500/30 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              <span v-if="loading"
                class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
              {{ loading ? 'Signing in...' : 'Sign In' }}
            </button>
          </form>

          <div v-if="error" class="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {{ error }}
          </div>

          <p class="mt-8 text-center text-sm text-gray-500">
            Don't have an account?
            <a href="#" class="font-medium text-[#8A3EEA] hover:text-[#F3901B]">Contact Administrator</a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getCompany } from '../services/api';
import { authService } from '../services/authService';

const router = useRouter();
const email = ref('admin@example.com');
const password = ref('admin');
const company = ref(null);
const loading = ref(false);
const error = ref('');
const showPassword = ref(false);

onMounted(async () => {
  try {
    const data = await getCompany(1);
    company.value = data || {
      name: 'HRMS Software',
      description: 'Your complete workforce management solution.',
      logo: 'https://placehold.co/100x100/F3901B/white?text=HR',
      address: 'Cloud Based System',
      phone: '+1 800 HRMS',
      website: 'www.hrms.com'
    };
  } catch (err) {
    console.error('Failed to fetch company details:', err);
    company.value = {
      name: 'HRMS Software',
      description: 'Your complete workforce management solution.',
      logo: 'https://placehold.co/100x100/F3901B/white?text=HR',
      address: 'Cloud Based System',
      phone: '+1 800 HRMS',
      website: 'www.hrms.com'
    };
  }
});

const handleSignIn = async () => {
  loading.value = true;
  error.value = '';

  try {
    await authService.signIn(email.value, password.value);
    router.push('/overview');
  } catch (err) {
    error.value = err?.message || 'Login failed. Please check your credentials.';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
@import url('https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css');

input:focus {
  border-color: #8A3EEA;
}
</style>
