<script setup>
import EmployeePage from './EmployeePage.vue';
import { ref, onMounted } from 'vue';
import { getApiUrl } from '../services/api';

const isEditing = ref(false);

const employeeData = ref({
  name: 'Loading...',
  role: '',
  department: '',
  employeeId: '',
  email: '',
  phone: '',
  website: '',
  location: '',
  joiningDate: '',
  team: 0,
  awards: 0,
  projects: 0,
  clients: 0,
  profilePicture: 'https://via.placeholder.com/150',
  socialLinks: {
    facebook: '#',
    twitter: '#',
    linkedin: '#',
  },
  bio: '',
});

onMounted(async () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      const response = await fetch(getApiUrl(`users/${user.id}`));
      if (response.ok) {
        const data = await response.json();
        employeeData.value = {
          ...data,
          role: data.designation,
          department: data.department || 'Technology',
          employeeId: `EMP${data.id.padStart(6, '0')}`,
          location: data.location || 'Remote',
          joiningDate: data.joiningDate || '2024-01-01',
          profilePicture: data.avatar || 'https://via.placeholder.com/150'
        };
      }
    }
  } catch (error) {
    console.error('Error fetching employee details:', error);
  }
});

const toggleEditMode = () => {
  isEditing.value = !isEditing.value;
};

const updateDetails = async () => {
  try {
    const response = await fetch(getApiUrl(`users/${employeeData.value.id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeData.value)
    });
    if (response.ok) {
      isEditing.value = false;
    }
  } catch (error) {
    console.error('Error updating details:', error);
  }
};
</script>

<template>
  <EmployeePage>
    <div class="mt-4 sm:mt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <!-- Premium Header Section -->
      <div class="bg-white p-6 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="flex items-center gap-5">
            <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-200">
              <i class="mdi mdi-account-details text-3xl sm:text-4xl"></i>
            </div>
            <div>
              <h2 class="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                Profile Settings
              </h2>
              <p class="text-gray-500 font-medium mt-1">
                Manage your personal information and preferences
              </p>
            </div>
          </div>

          <button
            @click="toggleEditMode"
            :class="[
              'group relative flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-bold transition-all duration-300 overflow-hidden',
              isEditing 
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-xl shadow-purple-500/25 hover:-translate-y-0.5'
            ]"
          >
            <i :class="['mdi transition-transform group-hover:scale-110', isEditing ? 'mdi-close' : 'mdi-pencil-outline']"></i>
            {{ isEditing ? 'Cancel Edit' : 'Edit Profile' }}
          </button>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- Left Sidebar: Identity Card -->
        <div class="lg:col-span-4 xl:col-span-3 space-y-6">
          <div class="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
            <div class="h-24 bg-gradient-to-r from-purple-600 to-indigo-600"></div>
            <div class="px-6 pb-8 -mt-12 text-center">
              <div class="relative inline-block group">
                <img
                  :src="employeeData.profilePicture"
                  alt="Profile"
                  class="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-xl mb-4 transition-transform group-hover:scale-105"
                />
                <div v-if="isEditing" class="absolute inset-0 flex items-center justify-center bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <i class="mdi mdi-camera text-white text-2xl"></i>
                </div>
              </div>
              <h3 class="text-xl font-black text-gray-900 break-words leading-tight">
                {{ employeeData.name }}
              </h3>
              <p class="text-purple-600 font-bold text-sm uppercase tracking-widest mt-1">
                {{ employeeData.role }}
              </p>
              
              <div class="mt-8 space-y-4">
                <div class="flex items-center p-3 bg-gray-50 rounded-2xl group transition-colors hover:bg-purple-50">
                  <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-purple-600 shadow-sm mr-3 group-hover:bg-purple-600 group-hover:text-white transition-all">
                    <i class="mdi mdi-domain"></i>
                  </div>
                  <div class="text-left overflow-hidden">
                    <p class="text-[10px] font-black text-gray-400 uppercase">Department</p>
                    <p class="text-sm font-bold text-gray-700 truncate">{{ employeeData.department }}</p>
                  </div>
                </div>

                <div class="flex items-center p-3 bg-gray-50 rounded-2xl group transition-colors hover:bg-purple-50">
                  <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-purple-600 shadow-sm mr-3 group-hover:bg-purple-600 group-hover:text-white transition-all">
                    <i class="mdi mdi-identifier"></i>
                  </div>
                  <div class="text-left overflow-hidden">
                    <p class="text-[10px] font-black text-gray-400 uppercase">Employee ID</p>
                    <p class="text-sm font-bold text-gray-700 truncate">{{ employeeData.employeeId }}</p>
                  </div>
                </div>

                <div class="flex items-center p-3 bg-gray-50 rounded-2xl group transition-colors hover:bg-purple-50">
                  <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-purple-600 shadow-sm mr-3 group-hover:bg-purple-600 group-hover:text-white transition-all">
                    <i class="mdi mdi-map-marker"></i>
                  </div>
                  <div class="text-left overflow-hidden">
                    <p class="text-[10px] font-black text-gray-400 uppercase">Location</p>
                    <p class="text-sm font-bold text-gray-700 truncate">{{ employeeData.location }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Section: Details & Forms -->
        <div class="lg:col-span-8 xl:col-span-9">
          
          <!-- View Mode -->
          <div v-if="!isEditing" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Contact Card -->
            <div class="bg-white p-6 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
              <h4 class="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                <i class="mdi mdi-card-account-phone text-purple-600"></i>
                Contact Information
              </h4>
              <div class="space-y-6">
                <div>
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Email Address</label>
                  <a :href="`mailto:${employeeData.email}`" class="text-gray-900 font-bold hover:text-purple-600 transition-colors break-all">
                    {{ employeeData.email }}
                  </a>
                </div>
                <div>
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Phone Number</label>
                  <a :href="`tel:${employeeData.phone}`" class="text-gray-900 font-bold hover:text-purple-600 transition-colors">
                    {{ employeeData.phone }}
                  </a>
                </div>
                <div>
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Personal Website</label>
                  <a :href="employeeData.website" target="_blank" class="text-purple-600 font-bold hover:underline break-all">
                    {{ employeeData.website }}
                  </a>
                </div>
              </div>
            </div>

            <!-- Employment Card -->
            <div class="bg-white p-6 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
              <h4 class="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                <i class="mdi mdi-briefcase text-purple-600"></i>
                Work Information
              </h4>
              <div class="space-y-6">
                <div>
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Joining Date</label>
                  <p class="text-gray-900 font-bold">{{ employeeData.joiningDate }}</p>
                </div>
                <div>
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Employment Status</label>
                  <span class="inline-flex items-center px-3 py-1 bg-green-50 text-green-600 text-xs font-black uppercase rounded-full">
                    Active
                  </span>
                </div>
                <div>
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Department</label>
                  <p class="text-gray-900 font-bold">{{ employeeData.department }}</p>
                </div>
              </div>
            </div>

            <!-- Bio Card -->
            <div class="bg-white p-6 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 md:col-span-2">
              <h4 class="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <i class="mdi mdi-text-account text-purple-600"></i>
                Professional Bio
              </h4>
              <p class="text-gray-600 leading-relaxed font-medium">
                {{ employeeData.bio || 'No professional bio added yet. Tell us more about yourself!' }}
              </p>
            </div>
          </div>

          <!-- Edit Mode Form -->
          <div v-else class="bg-white p-6 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
            <h4 class="text-xl font-black text-gray-900 mb-8 border-b border-gray-50 pb-4">
              Edit Your Information
            </h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <div class="relative">
                  <i class="mdi mdi-account absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    v-model="employeeData.name"
                    class="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all font-bold text-gray-700"
                  />
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Job Title</label>
                <div class="relative">
                  <i class="mdi mdi-briefcase-outline absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    v-model="employeeData.role"
                    class="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all font-bold text-gray-700"
                  />
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                <div class="relative">
                  <i class="mdi mdi-email-outline absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="email"
                    v-model="employeeData.email"
                    class="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all font-bold text-gray-700"
                  />
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div class="relative">
                  <i class="mdi mdi-phone-outline absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="tel"
                    v-model="employeeData.phone"
                    class="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all font-bold text-gray-700"
                  />
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Joining Date</label>
                <div class="relative">
                  <i class="mdi mdi-calendar-outline absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="date"
                    v-model="employeeData.joiningDate"
                    class="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all font-bold text-gray-700"
                  />
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Location</label>
                <div class="relative">
                  <i class="mdi mdi-map-marker-outline absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    v-model="employeeData.location"
                    class="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all font-bold text-gray-700"
                  />
                </div>
              </div>

              <div class="md:col-span-2 space-y-2">
                <label class="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Professional Bio</label>
                <textarea
                  v-model="employeeData.bio"
                  rows="4"
                  class="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all font-medium text-gray-700 resize-none"
                  placeholder="Tell us about your professional journey..."
                ></textarea>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="mt-10 flex flex-col sm:flex-row gap-4 border-t border-gray-50 pt-8">
              <button
                @click="updateDetails"
                class="flex-grow bg-purple-600 text-white py-4 px-8 rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/25 active:scale-95"
              >
                Save All Changes
              </button>
              <button
                @click="toggleEditMode"
                class="bg-gray-100 text-gray-600 py-4 px-8 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </EmployeePage>
</template>
