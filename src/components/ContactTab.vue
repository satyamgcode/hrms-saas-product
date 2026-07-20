<script setup>
import { ref, onMounted } from 'vue';
import { getCurrentUser, getUserProfile, updateUserProfile } from '../services/api';
import EmployeePage from './EmployeePage.vue';

const contactData = ref({
  id: null,
  email: 'Loading...',
  phone: '',
  currentAddress: '',
  permanentAddress: '',
  officeAddress: '',
  socialLinks: {
    linkedin: '#',
    twitter: '#',
    facebook: '#',
  },
});

const isEditing = ref(false);
const saving = ref(false);

onMounted(async () => {
  try {
    const user = await getCurrentUser();
    if (user) {
      const data = await getUserProfile({ email: user.email });
      if (data) {
        contactData.value = {
          ...data,
          currentAddress: data.current_address || '',
          permanentAddress: data.permanent_address || '',
          officeAddress: data.office_address || 'HQ Corporate Offices',
          socialLinks: data.social_links || { linkedin: '#', twitter: '#', facebook: '#' }
        };
      }
    }
  } catch (error) {
    console.error('Error fetching contact details:', error);
  }
});

const toggleEdit = () => {
  isEditing.value = !isEditing.value;
};

const saveChanges = async () => {
  if (!contactData.value.id) return;
  saving.value = true;
  try {
    const updated = await updateUserProfile(contactData.value.id, {
      current_address: contactData.value.currentAddress,
      permanent_address: contactData.value.permanentAddress
    });
    if (updated) {
      contactData.value.currentAddress = updated.current_address || contactData.value.currentAddress;
      contactData.value.permanentAddress = updated.permanent_address || contactData.value.permanentAddress;
      isEditing.value = false;
    } else {
      isEditing.value = false;
    }
  } catch (error) {
    console.error('Error saving contact changes:', error);
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <EmployeePage>
    <div class="mt-4 sm:mt-6 animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
      
      <!-- Premium Header Card -->
      <div class="bg-white p-6 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div class="flex items-center gap-5">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-brand-purple to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-200">
            <i class="mdi mdi-card-account-phone-outline text-3xl sm:text-4xl"></i>
          </div>
          <div>
            <h2 class="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Contact & Address Details
            </h2>
            <p class="text-gray-500 font-medium mt-1">
              Manage your residential address records and view official contact information
            </p>
          </div>
        </div>

        <button
          @click="toggleEdit"
          :class="[
            'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex-shrink-0 active:scale-95 shadow-sm',
            isEditing 
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
              : 'bg-brand-purple text-white hover:bg-purple-700 shadow-purple-500/20'
          ]"
        >
          <i :class="['mdi text-base', isEditing ? 'mdi-close' : 'mdi-pencil-outline']"></i>
          <span>{{ isEditing ? 'Cancel Edit' : 'Edit Addresses' }}</span>
        </button>
      </div>

      <!-- Main Section Cards -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left Column: Official Contact Info (Read-Only) -->
        <div class="space-y-6">
          <div class="bg-white p-6 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 space-y-6">
            <div class="border-b border-gray-50 pb-4">
              <h3 class="text-lg font-black text-gray-900 flex items-center gap-2">
                <i class="mdi mdi-account-box-outline text-brand-purple"></i> Official Contacts
              </h3>
            </div>

            <!-- Email -->
            <div class="space-y-1">
              <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Work Email</label>
              <a :href="`mailto:${contactData.email}`" class="text-sm font-bold text-gray-900 hover:text-brand-purple transition-colors truncate block">
                {{ contactData.email || 'Not available' }}
              </a>
            </div>

            <!-- Phone -->
            <div class="space-y-1">
              <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Phone Number</label>
              <a v-if="contactData.phone" :href="`tel:${contactData.phone}`" class="text-sm font-bold text-gray-900 hover:text-brand-purple transition-colors block">
                {{ contactData.phone }}
              </a>
              <p v-else class="text-sm font-bold text-gray-400">Not provided</p>
            </div>

            <!-- Office Address -->
            <div class="space-y-1 pt-2 border-t border-gray-50">
              <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Office Location</label>
              <p class="text-sm font-bold text-gray-800 leading-snug">
                {{ contactData.officeAddress || 'HQ Corporate Offices' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Right Column: Addresses Form & View -->
        <div class="lg:col-span-2">
          
          <!-- View Mode -->
          <div v-if="!isEditing" class="bg-white p-6 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 space-y-6">
            <h3 class="text-lg font-black text-gray-900 border-b border-gray-50 pb-4 flex items-center gap-2">
              <i class="mdi mdi-map-marker-radius-outline text-brand-purple"></i> Residential Address Records
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Current Address -->
              <div class="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-2">
                <div class="flex items-center gap-2 text-brand-purple">
                  <i class="mdi mdi-home-outline text-xl"></i>
                  <h4 class="text-xs font-black uppercase tracking-widest">Current Address</h4>
                </div>
                <p class="text-sm font-medium text-gray-700 leading-relaxed pt-1">
                  {{ contactData.currentAddress || 'No current address provided.' }}
                </p>
              </div>

              <!-- Permanent Address -->
              <div class="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-2">
                <div class="flex items-center gap-2 text-brand-purple">
                  <i class="mdi mdi-home-city-outline text-xl"></i>
                  <h4 class="text-xs font-black uppercase tracking-widest">Permanent Address</h4>
                </div>
                <p class="text-sm font-medium text-gray-700 leading-relaxed pt-1">
                  {{ contactData.permanentAddress || 'No permanent address provided.' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Edit Mode Form (Compact, No Tag Badges) -->
          <div v-else class="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
            <div class="border-b border-gray-100 pb-3">
              <h3 class="text-lg font-black text-gray-900">
                Update Residential Addresses
              </h3>
            </div>

            <div class="space-y-4">
              <!-- Current Address Input -->
              <div class="space-y-1">
                <label class="text-xs font-bold text-gray-700 ml-0.5">Current Address</label>
                <textarea
                  v-model="contactData.currentAddress"
                  rows="2"
                  class="w-full p-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-purple focus:bg-white text-sm font-medium text-gray-900 resize-none outline-none transition-all"
                  placeholder="Enter your current address..."
                ></textarea>
              </div>

              <!-- Permanent Address Input -->
              <div class="space-y-1">
                <label class="text-xs font-bold text-gray-700 ml-0.5">Permanent Address</label>
                <textarea
                  v-model="contactData.permanentAddress"
                  rows="2"
                  class="w-full p-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-purple focus:bg-white text-sm font-medium text-gray-900 resize-none outline-none transition-all"
                  placeholder="Enter your permanent address..."
                ></textarea>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="mt-5 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                @click="toggleEdit"
                class="px-5 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                @click="saveChanges"
                :disabled="saving"
                class="px-6 py-2.5 bg-brand-purple text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition-all shadow-md shadow-purple-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                <i v-if="saving" class="mdi mdi-loading mdi-spin text-sm"></i>
                <span>{{ saving ? 'Saving...' : 'Save Changes' }}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </EmployeePage>
</template>
