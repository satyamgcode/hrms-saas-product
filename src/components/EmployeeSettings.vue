<script setup>
import { ref, onMounted } from 'vue';
import { getCurrentSession, getUserProfile, getCompany, updateUserProfile } from '../services/api';
import defaultLogo from '../assets/home-logo.svg';

const loading = ref(false);
const saving = ref(false);
const uploadingAvatar = ref(false);
const toastMessage = ref('');
const toastType = ref('success');

// Profile & Company Data
const userProfile = ref(null);
const companyData = ref(null);

const handleAvatarUpload = async (event) => {
  const file = event.target.files?.[0];
  if (!file || !userProfile.value) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('Image file size must be less than 5MB', 'error');
    return;
  }

  uploadingAvatar.value = true;
  const reader = new FileReader();

  reader.onload = async (e) => {
    const base64Data = e.target?.result;
    if (!base64Data) {
      uploadingAvatar.value = false;
      return;
    }
    try {
      const updated = await updateUserProfile(userProfile.value.id, { avatar: base64Data });
      if (updated && updated.avatar) {
        userProfile.value.avatar = updated.avatar;
      } else {
        userProfile.value.avatar = base64Data;
      }
      window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: userProfile.value }));
      showToast('Profile photo updated successfully!', 'success');
    } catch (err) {
      console.error('Failed to update avatar:', err);
      showToast('Failed to update profile photo.', 'error');
    } finally {
      uploadingAvatar.value = false;
    }
  };

  reader.readAsDataURL(file);
};

// Interactive User Preferences
const userPrefs = ref({
  notifyLeaveStatus: true,
  notifyPayslips: true,
  notifyCorrections: true,
  notifyAnnouncements: true,
  landingPage: '/overview'
});

const showToast = (message, type = 'success') => {
  toastMessage.value = message;
  toastType.value = type;
  setTimeout(() => {
    toastMessage.value = '';
  }, 4000);
};

const fetchData = async () => {
  loading.value = true;
  try {
    const session = await getCurrentSession();
    const authUser = session?.user;
    
    if (authUser) {
      const profile = await getUserProfile({ userId: authUser.id });
      if (profile) {
        userProfile.value = profile;
        
        // Fetch Company details
        const company = await getCompany(profile.companyId || 1);
        if (company) {
          companyData.value = company;
        }

        // Load saved preferences
        const saved = localStorage.getItem(`hrms_user_prefs_${profile.id}`);
        if (saved) {
          userPrefs.value = { ...userPrefs.value, ...JSON.parse(saved) };
        }
      }
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    showToast('Failed to load settings.', 'error');
  } finally {
    loading.value = false;
  }
};

const savePreferences = () => {
  if (!userProfile.value) return;
  saving.value = true;
  
  try {
    localStorage.setItem(`hrms_user_prefs_${userProfile.value.id}`, JSON.stringify(userPrefs.value));
    showToast('Preferences updated successfully!', 'success');
  } catch (err) {
    showToast('Failed to save preferences.', 'error');
  } finally {
    saving.value = false;
  }
};

onMounted(fetchData);
</script>

<template>
  <div class="space-y-6 pb-12 font-sans text-gray-800">
    <!-- Header banner -->
    <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-purple to-purple-800 text-white p-6 sm:p-8 shadow-xl shadow-brand-purple/20">
      <div class="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
      <div class="absolute -left-10 -bottom-10 w-40 h-40 bg-brand-orange/20 rounded-full blur-2xl"></div>
      
      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="px-3 py-1 rounded-full bg-white/20 text-xs font-black uppercase tracking-widest text-white/90">
            Employee Workspace
          </span>
          <h2 class="text-2xl sm:text-3xl font-black mt-2">Account & Settings</h2>
          <p class="text-white/80 mt-1 text-sm font-semibold max-w-xl">
            Review your corporate information, official department details, and configure your system workspace preferences.
          </p>
        </div>
        
        <div class="flex-shrink-0 flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/25">
            <i class="mdi mdi-cog-outline text-2xl text-white"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <transition name="slide-fade">
      <div v-if="toastMessage" :class="[
        'fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border font-bold text-sm transition-all',
        toastType === 'success' ? 'bg-emerald-50 border-emerald-150 text-emerald-700' : 'bg-red-50 border-red-150 text-red-700'
      ]">
        <i :class="['mdi text-xl', toastType === 'success' ? 'mdi-checkbox-marked-circle-outline' : 'mdi-alert-circle-outline']"></i>
        <span>{{ toastMessage }}</span>
      </div>
    </transition>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
      <div class="w-12 h-12 border-4 border-brand-purple border-t-transparent rounded-full animate-spin"></div>
      <p class="text-gray-500 font-bold mt-4 text-sm">Retrieving profile settings...</p>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Left Column: User Profile Badge -->
      <div class="space-y-6">
        <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 text-center space-y-4">
          <div class="relative w-24 h-24 mx-auto group">
            <img 
              :src="userProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.full_name || 'User')}&background=8A3EEA&color=fff`" 
              alt="Profile avatar" 
              class="w-24 h-24 rounded-full border-4 border-brand-purple/10 shadow-sm object-cover"
            />
            <div class="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full"></div>
            
            <input 
              type="file" 
              id="settings-avatar-upload" 
              accept="image/*" 
              @change="handleAvatarUpload" 
              class="hidden" 
            />
            <label 
              for="settings-avatar-upload"
              class="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
              title="Change Profile Photo"
            >
              <i v-if="uploadingAvatar" class="mdi mdi-loading mdi-spin text-xl"></i>
              <i v-else class="mdi mdi-camera text-xl"></i>
              <span class="text-[9px] font-bold mt-0.5">Upload</span>
            </label>
          </div>

          <div>
            <label 
              for="settings-avatar-upload" 
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-purple/10 hover:bg-brand-purple hover:text-white text-brand-purple rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <i v-if="uploadingAvatar" class="mdi mdi-loading mdi-spin text-sm"></i>
              <i v-else class="mdi mdi-upload text-sm"></i>
              <span>{{ uploadingAvatar ? 'Uploading...' : 'Change Profile Photo' }}</span>
            </label>
          </div>
          
          <div>
            <h3 class="text-lg font-black text-gray-950">{{ userProfile?.full_name || 'Official Profile' }}</h3>
            <p class="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">{{ userProfile?.designation || 'Staff Associate' }}</p>
          </div>

          <div class="pt-4 border-t border-gray-50 grid grid-cols-1 gap-2 text-left text-xs font-semibold text-gray-650">
            <div class="flex items-center gap-2">
              <i class="mdi mdi-email-outline text-brand-purple text-base"></i>
              <span class="truncate">{{ userProfile?.email }}</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="mdi mdi-phone-outline text-brand-purple text-base"></i>
              <span>{{ userProfile?.phone || 'No phone record' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="mdi mdi-map-marker-outline text-brand-purple text-base"></i>
              <span class="truncate">{{ userProfile?.location || 'Not Specified' }}</span>
            </div>
          </div>
        </div>

        <!-- Official Shift Badge (Read-Only) -->
        <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-3">
          <h4 class="text-xs font-black text-gray-400 uppercase tracking-widest block border-b border-gray-50 pb-2">
            My Registered Shift
          </h4>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-orange-500/10 text-brand-orange flex items-center justify-center">
              <i class="mdi mdi-clock-check-outline text-xl"></i>
            </div>
            <div>
              <p class="font-bold text-gray-900 text-sm">General Schedule</p>
              <p class="text-[10px] text-gray-400 font-black uppercase">09:00 AM - 06:00 PM</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Settings Panels -->
      <div class="lg:col-span-2 space-y-6">
        
        <!-- Tab 1: Company & Job Profile (Read-Only) -->
        <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
          <h3 class="text-sm font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-3">
            Organization Details
          </h3>
          
          <div class="flex items-start gap-4">
            <div class="w-16 h-16 rounded-full border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
              <img :src="companyData?.logo || defaultLogo" alt="Company logo" class="w-full h-full object-cover" />
            </div>
            <div>
              <h4 class="text-lg font-black text-gray-950">{{ companyData?.name || 'Registered Company' }}</h4>
              <p class="text-xs text-gray-550 leading-relaxed font-semibold mt-1">
                {{ companyData?.description || 'Corporate partner in workforce excellence.' }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-gray-50">
            <div class="space-y-1">
              <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Official Department</span>
              <p class="text-sm font-bold text-gray-800">{{ userProfile?.department || 'Operations' }}</p>
            </div>
            
            <div class="space-y-1">
              <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Date of Joining</span>
              <p class="text-sm font-bold text-gray-800">{{ userProfile?.joining_date || 'Not recorded' }}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="space-y-1">
              <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Company Contact Email</span>
              <p class="text-sm font-bold text-gray-800">{{ companyData?.email || 'hr@company.com' }}</p>
            </div>
            
            <div class="space-y-1">
              <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Corporate Office HQ</span>
              <p class="text-sm font-bold text-gray-800 truncate">{{ companyData?.address || 'HQ Corporate Offices' }}</p>
            </div>
          </div>
        </div>

        <!-- Tab 2: System Workspace Preferences (Editable) -->
        <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
          <h3 class="text-sm font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-3">
            System Alert Preferences
          </h3>

          <div class="space-y-4">
            <!-- Notify leave approval toggle -->
            <label class="flex items-center justify-between p-3 rounded-2xl border border-gray-50 bg-gray-50/20 hover:bg-gray-50 transition-all cursor-pointer">
              <div class="flex items-center gap-3">
                <i class="mdi mdi-calendar-alert text-lg text-brand-purple"></i>
                <div>
                  <span class="text-sm font-bold text-gray-900 block">Leave Updates</span>
                  <span class="text-[10px] text-gray-400 font-semibold block">Email notifications when leaves are approved/rejected</span>
                </div>
              </div>
              <input type="checkbox" v-model="userPrefs.notifyLeaveStatus" class="rounded border-gray-300 text-brand-purple focus:ring-brand-purple w-4 h-4" />
            </label>

            <!-- Notify payroll payslips toggle -->
            <label class="flex items-center justify-between p-3 rounded-2xl border border-gray-50 bg-gray-50/20 hover:bg-gray-50 transition-all cursor-pointer">
              <div class="flex items-center gap-3">
                <i class="mdi mdi-cash-register text-lg text-brand-purple"></i>
                <div>
                  <span class="text-sm font-bold text-gray-900 block">Payslip Announcements</span>
                  <span class="text-[10px] text-gray-400 font-semibold block">Email notification when monthly payslip statements compile</span>
                </div>
              </div>
              <input type="checkbox" v-model="userPrefs.notifyPayslips" class="rounded border-gray-300 text-brand-purple focus:ring-brand-purple w-4 h-4" />
            </label>

            <!-- Notify attendance corrections toggle -->
            <label class="flex items-center justify-between p-3 rounded-2xl border border-gray-50 bg-gray-50/20 hover:bg-gray-50 transition-all cursor-pointer">
              <div class="flex items-center gap-3">
                <i class="mdi mdi-clock-check-outline text-lg text-brand-purple"></i>
                <div>
                  <span class="text-sm font-bold text-gray-900 block">Correction Approvals</span>
                  <span class="text-[10px] text-gray-400 font-semibold block">Email updates when attendance logs corrections approvals submit</span>
                </div>
              </div>
              <input type="checkbox" v-model="userPrefs.notifyCorrections" class="rounded border-gray-300 text-brand-purple focus:ring-brand-purple w-4 h-4" />
            </label>
          </div>

          <div class="flex justify-end pt-4 border-t border-gray-50">
            <button 
              @click="savePreferences" 
              :disabled="saving"
              class="flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-purple text-white hover:bg-brand-purple/95 font-bold transition-all shadow-lg shadow-brand-purple/20 disabled:opacity-50 text-sm">
              <i v-if="saving" class="mdi mdi-loading mdi-spin text-base"></i>
              <i v-else class="mdi mdi-checkbox-marked-circle-outline text-base"></i>
              <span>{{ saving ? 'Updating Preferences...' : 'Save Preferences' }}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease-out;
}
.slide-fade-enter-from {
  transform: translateY(20px);
  opacity: 0;
}
.slide-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}
</style>
