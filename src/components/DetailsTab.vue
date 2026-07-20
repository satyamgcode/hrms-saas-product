<script setup>
import EmployeePage from './EmployeePage.vue';
import { ref, onMounted } from 'vue';
import { getCurrentUser, getUserProfile, updateUserProfile } from '../services/api';

const isEditing = ref(false);
const saving = ref(false);

const employeeData = ref({
  id: null,
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
    const user = await getCurrentUser();
    if (user) {
      const data = await getUserProfile({ email: user.email });
      if (data) {
        employeeData.value = {
          ...data,
          role: data.designation || data.role || 'Member',
          department: data.department || 'Technology',
          employeeId: data.id ? `EMP${String(data.id).padStart(6, '0')}` : 'EMP000001',
          location: data.location || 'Remote',
          joiningDate: data.joining_date || '2024-01-01',
          profilePicture: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || user.email)}&background=8A3EEA&color=fff`
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
  if (!employeeData.value.id) return;
  saving.value = true;
  try {
    const updated = await updateUserProfile(employeeData.value.id, {
      phone: employeeData.value.phone,
      bio: employeeData.value.bio
    });
    if (updated) {
      employeeData.value.phone = updated.phone !== undefined ? updated.phone : employeeData.value.phone;
      employeeData.value.bio = updated.bio !== undefined ? updated.bio : employeeData.value.bio;
      isEditing.value = false;
    } else {
      isEditing.value = false;
    }
  } catch (error) {
    console.error('Error updating details:', error);
  } finally {
    saving.value = false;
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
                Profile Details
              </h2>
              <p class="text-gray-500 font-medium mt-1">
                View your official information and update contact details
              </p>
            </div>
          </div>

          <button
            @click="toggleEditMode"
            :class="[
              'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex-shrink-0 active:scale-95 shadow-sm',
              isEditing 
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-500/20'
            ]"
          >
            <i :class="['mdi text-base', isEditing ? 'mdi-close' : 'mdi-pencil-outline']"></i>
            <span>{{ isEditing ? 'Cancel Edit' : 'Edit Profile' }}</span>
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
              <div class="relative inline-block">
                <img
                  :src="employeeData.profilePicture"
                  alt="Profile"
                  class="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-xl mb-4"
                />
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
                  <a v-if="employeeData.phone" :href="`tel:${employeeData.phone}`" class="text-gray-900 font-bold hover:text-purple-600 transition-colors">
                    {{ employeeData.phone }}
                  </a>
                  <p v-else class="text-gray-400 font-bold text-sm">Not provided</p>
                </div>
                <div>
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Personal Website</label>
                  <a v-if="employeeData.website" :href="employeeData.website" target="_blank" class="text-purple-600 font-bold hover:underline break-all">
                    {{ employeeData.website }}
                  </a>
                  <p v-else class="text-gray-400 font-bold text-sm">Not provided</p>
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

          <!-- Edit Mode Form (Compact, No Tag Badges) -->
          <div v-else class="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
            <div class="border-b border-gray-100 pb-3">
              <h4 class="text-lg font-black text-gray-900">
                Edit Profile Information
              </h4>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Full Name (Read-Only) -->
              <div class="space-y-1">
                <label class="text-xs font-bold text-gray-500 ml-0.5">Full Name</label>
                <div class="relative">
                  <i class="mdi mdi-account absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    :value="employeeData.name"
                    disabled
                    class="w-full pl-10 pr-3.5 py-2.5 bg-gray-100/70 border border-gray-200/50 rounded-xl text-sm font-semibold text-gray-500 cursor-not-allowed select-none"
                  />
                </div>
              </div>

              <!-- Job Title (Read-Only) -->
              <div class="space-y-1">
                <label class="text-xs font-bold text-gray-500 ml-0.5">Job Title</label>
                <div class="relative">
                  <i class="mdi mdi-briefcase-outline absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    :value="employeeData.role"
                    disabled
                    class="w-full pl-10 pr-3.5 py-2.5 bg-gray-100/70 border border-gray-200/50 rounded-xl text-sm font-semibold text-gray-500 cursor-not-allowed select-none"
                  />
                </div>
              </div>

              <!-- Email Address (Read-Only) -->
              <div class="space-y-1">
                <label class="text-xs font-bold text-gray-500 ml-0.5">Email Address</label>
                <div class="relative">
                  <i class="mdi mdi-email-outline absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="email"
                    :value="employeeData.email"
                    disabled
                    class="w-full pl-10 pr-3.5 py-2.5 bg-gray-100/70 border border-gray-200/50 rounded-xl text-sm font-semibold text-gray-500 cursor-not-allowed select-none"
                  />
                </div>
              </div>

              <!-- Phone Number (EDITABLE) -->
              <div class="space-y-1">
                <label class="text-xs font-bold text-gray-800 ml-0.5">Phone Number</label>
                <div class="relative">
                  <i class="mdi mdi-phone-outline absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-600"></i>
                  <input
                    type="tel"
                    v-model="employeeData.phone"
                    placeholder="Enter phone number..."
                    class="w-full pl-10 pr-3.5 py-2.5 bg-white border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-600 text-sm font-semibold text-gray-900 outline-none transition-all"
                  />
                </div>
              </div>

              <!-- Joining Date (Read-Only) -->
              <div class="space-y-1">
                <label class="text-xs font-bold text-gray-500 ml-0.5">Joining Date</label>
                <div class="relative">
                  <i class="mdi mdi-calendar-outline absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    :value="employeeData.joiningDate"
                    disabled
                    class="w-full pl-10 pr-3.5 py-2.5 bg-gray-100/70 border border-gray-200/50 rounded-xl text-sm font-semibold text-gray-500 cursor-not-allowed select-none"
                  />
                </div>
              </div>

              <!-- Location (Read-Only) -->
              <div class="space-y-1">
                <label class="text-xs font-bold text-gray-500 ml-0.5">Location</label>
                <div class="relative">
                  <i class="mdi mdi-map-marker-outline absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    :value="employeeData.location"
                    disabled
                    class="w-full pl-10 pr-3.5 py-2.5 bg-gray-100/70 border border-gray-200/50 rounded-xl text-sm font-semibold text-gray-500 cursor-not-allowed select-none"
                  />
                </div>
              </div>

              <!-- Professional Bio (EDITABLE) -->
              <div class="md:col-span-2 space-y-1">
                <label class="text-xs font-bold text-gray-800 ml-0.5">Professional Bio</label>
                <textarea
                  v-model="employeeData.bio"
                  rows="3"
                  class="w-full p-3.5 bg-white border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-600 text-sm font-medium text-gray-900 resize-none outline-none transition-all"
                  placeholder="Share a brief overview of your professional background..."
                ></textarea>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="mt-5 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                @click="toggleEditMode"
                class="px-5 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                @click="updateDetails"
                :disabled="saving"
                class="px-6 py-2.5 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition-all shadow-md shadow-purple-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
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
