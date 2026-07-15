<script setup>
import { ref, onMounted, computed } from 'vue';
import { getCompany, updateCompany, getUsers, uploadFile, getCurrentSession, getUserProfile } from '../../services/api';
import { getShifts } from '../../services/attendanceService';
import defaultLogo from '../../assets/home-logo.svg';

const activeTab = ref('profile'); // profile, departments, preferences
const loading = ref(false);
const saving = ref(false);
const toastMessage = ref('');
const toastType = ref('success'); // success, error

// Form Data
const companyId = ref(1);
const companyData = ref({
  name: '',
  description: '',
  logo: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  departments: []
});

const employees = ref([]);
const shiftsList = ref([]);
const newDepartmentName = ref('');
const editingDeptIndex = ref(null);
const editingDeptName = ref('');

// Preferences (stored in localStorage or simulated metadata)
const preferences = ref({
  currency: 'USD',
  allowCorrection: 'true',
  allowSelfClock: 'true',
  defaultShiftId: 1
});

// Toast notification trigger
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
    // Get logged-in user's profile to retrieve their companyId
    const session = await getCurrentSession();
    const authUser = session?.user;
    if (authUser) {
      const profile = await getUserProfile({ userId: authUser.id });
      if (profile) {
        companyId.value = profile.companyId || 1;
      }
    }

    // 1. Fetch Company Information
    const company = await getCompany(companyId.value);
    if (company) {
      companyData.value = {
        name: company.name || '',
        description: company.description || '',
        logo: company.logo || '',
        address: company.address || '',
        phone: company.phone || '',
        email: company.email || '',
        website: company.website || '',
        departments: Array.isArray(company.departments) ? [...company.departments] : []
      };
    }

    // 2. Fetch Employees (to show department strengths)
    const users = await getUsers(companyId.value);
    employees.value = users || [];

    // 3. Fetch Shifts
    const shifts = await getShifts();
    shiftsList.value = shifts || [];

    // 4. Load saved preferences from localStorage
    const savedPrefs = localStorage.getItem(`hrms_preferences_${companyId.value}`);
    if (savedPrefs) {
      preferences.value = { ...preferences.value, ...JSON.parse(savedPrefs) };
    }
  } catch (error) {
    console.error('Error fetching settings data:', error);
    showToast('Failed to load company configuration settings.', 'error');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});

// Logo Upload Handler
const handleLogoUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file.', 'error');
    return;
  }

  saving.value = true;
  try {
    const uploadedUrl = await uploadFile('company_logos', `company-${companyId.value}`, file);
    companyData.value.logo = uploadedUrl;
    showToast('Company logo uploaded successfully!', 'success');
  } catch (error) {
    console.error('Logo upload failed:', error);
    showToast('Failed to upload logo. Please try again.', 'error');
  } finally {
    saving.value = false;
  }
};

// Save Profile
const saveProfile = async () => {
  saving.value = true;
  try {
    const payload = {
      name: companyData.value.name,
      description: companyData.value.description,
      logo: companyData.value.logo,
      address: companyData.value.address,
      phone: companyData.value.phone,
      email: companyData.value.email,
      website: companyData.value.website,
      departments: companyData.value.departments
    };
    
    await updateCompany(companyId.value, payload);
    
    // Trigger header update by dispatching custom event
    window.dispatchEvent(new Event('company-updated'));
    
    showToast('Company profile settings saved successfully!', 'success');
  } catch (error) {
    console.error('Save company profile failed:', error);
    showToast('Failed to update company information.', 'error');
  } finally {
    saving.value = false;
  }
};

// Departments Logics
const departmentCounts = computed(() => {
  const counts = {};
  employees.value.forEach(emp => {
    const dept = emp.department || '';
    if (dept) {
      counts[dept] = (counts[dept] || 0) + 1;
    }
  });
  return counts;
});

const addDepartment = async () => {
  const dept = newDepartmentName.value.trim();
  if (!dept) return;

  if (companyData.value.departments.some(d => d.toLowerCase() === dept.toLowerCase())) {
    showToast(`Department "${dept}" already exists.`, 'error');
    return;
  }

  companyData.value.departments.push(dept);
  newDepartmentName.value = '';
  
  saving.value = true;
  try {
    await updateCompany(companyId.value, { departments: companyData.value.departments });
    showToast(`Department "${dept}" created successfully.`, 'success');
  } catch (err) {
    showToast('Could not save new department in database.', 'error');
  } finally {
    saving.value = false;
  }
};

const deleteDepartment = async (dept) => {
  const employeeCount = departmentCounts.value[dept] || 0;
  if (employeeCount > 0) {
    const proceed = confirm(`Warning: There are ${employeeCount} employees assigned to the "${dept}" department. Deleting it will leave their profiles with the deleted department name until updated. Do you still want to delete it?`);
    if (!proceed) return;
  } else {
    const proceed = confirm(`Are you sure you want to delete the "${dept}" department?`);
    if (!proceed) return;
  }

  companyData.value.departments = companyData.value.departments.filter(d => d !== dept);
  
  saving.value = true;
  try {
    await updateCompany(companyId.value, { departments: companyData.value.departments });
    showToast(`Department "${dept}" deleted successfully.`, 'success');
  } catch (err) {
    showToast('Failed to update departments list.', 'error');
  } finally {
    saving.value = false;
  }
};

const startEditDept = (index, name) => {
  editingDeptIndex.value = index;
  editingDeptName.value = name;
};

const saveEditDept = async (index) => {
  const oldName = companyData.value.departments[index];
  const newName = editingDeptName.value.trim();
  
  if (!newName || newName === oldName) {
    editingDeptIndex.value = null;
    return;
  }

  // Check duplicates
  if (companyData.value.departments.some((d, idx) => idx !== index && d.toLowerCase() === newName.toLowerCase())) {
    showToast(`Another department named "${newName}" already exists.`, 'error');
    return;
  }

  companyData.value.departments[index] = newName;
  editingDeptIndex.value = null;

  saving.value = true;
  try {
    await updateCompany(companyId.value, { departments: companyData.value.departments });
    showToast(`Department renamed from "${oldName}" to "${newName}".`, 'success');
  } catch (err) {
    showToast('Failed to save renamed department.', 'error');
  } finally {
    saving.value = false;
  }
};

const cancelEditDept = () => {
  editingDeptIndex.value = null;
};

// Save System Preferences
const savePreferences = () => {
  saving.value = true;
  try {
    localStorage.setItem(`hrms_preferences_${companyId.value}`, JSON.stringify(preferences.value));
    showToast('HRMS preferences saved successfully!', 'success');
  } catch (error) {
    showToast('Failed to save preferences.', 'error');
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- Header banner -->
    <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-purple to-purple-800 text-white p-6 sm:p-8 shadow-xl shadow-brand-purple/20">
      <div class="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
      <div class="absolute -left-10 -bottom-10 w-40 h-40 bg-brand-orange/20 rounded-full blur-2xl"></div>
      
      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="px-3 py-1 rounded-full bg-white/20 text-xs font-black uppercase tracking-widest text-white/90">
            System Admin Panel
          </span>
          <h2 class="text-2xl sm:text-3xl font-black mt-2">Company & HRMS Settings</h2>
          <p class="text-white/80 mt-1 text-sm font-semibold max-w-xl">
            Configure your enterprise company details, manage company departments, and tune HR system-wide settings.
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

    <!-- Tab navigation -->
    <div class="flex border-b border-gray-250/60 gap-1 overflow-x-auto pb-px">
      <button 
        @click="activeTab = 'profile'"
        :class="[
          'flex items-center gap-2.5 px-6 py-3.5 border-b-2 font-bold text-sm transition-all duration-200 whitespace-nowrap rounded-t-xl',
          activeTab === 'profile' 
            ? 'border-brand-purple text-brand-purple bg-brand-purple/5' 
            : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
        ]">
        <i class="mdi mdi-office-building text-lg"></i>
        <span>Company Profile</span>
      </button>
      <button 
        @click="activeTab = 'departments'"
        :class="[
          'flex items-center gap-2.5 px-6 py-3.5 border-b-2 font-bold text-sm transition-all duration-200 whitespace-nowrap rounded-t-xl',
          activeTab === 'departments' 
            ? 'border-brand-purple text-brand-purple bg-brand-purple/5' 
            : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
        ]">
        <i class="mdi mdi-domain text-lg"></i>
        <span>Departments Manager</span>
      </button>
      <button 
        @click="activeTab = 'preferences'"
        :class="[
          'flex items-center gap-2.5 px-6 py-3.5 border-b-2 font-bold text-sm transition-all duration-200 whitespace-nowrap rounded-t-xl',
          activeTab === 'preferences' 
            ? 'border-brand-purple text-brand-purple bg-brand-purple/5' 
            : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
        ]">
        <i class="mdi mdi-tune text-lg"></i>
        <span>HRMS System Preferences</span>
      </button>
    </div>

    <!-- Spinner loading state -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
      <div class="w-12 h-12 border-4 border-brand-purple border-t-transparent rounded-full animate-spin"></div>
      <p class="text-gray-500 font-bold mt-4 text-sm">Retrieving system configurations...</p>
    </div>

    <!-- Content Panel -->
    <div v-else class="grid grid-cols-1 gap-6">
      
      <!-- TAB 1: Company Profile -->
      <div v-if="activeTab === 'profile'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Logo & Quick Stats Card -->
        <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-between text-center min-h-[350px]">
          <div class="w-full">
            <h3 class="text-sm font-black text-gray-400 uppercase tracking-widest text-left mb-6">Company Brand</h3>
            
            <div class="relative group w-32 h-32 mx-auto mb-4 bg-gray-50 rounded-3xl border border-gray-150 flex items-center justify-center overflow-hidden shadow-inner">
              <img :src="companyData.logo || defaultLogo" alt="Logo" class="max-w-[75%] max-h-[75%] object-contain" />
              
              <!-- Hover Overlay for upload -->
              <label class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-all duration-300 rounded-3xl">
                <i class="mdi mdi-camera-plus-outline text-2xl mb-1"></i>
                <span class="text-[10px] font-black uppercase tracking-wider">Update Logo</span>
                <input type="file" class="hidden" accept="image/*" @change="handleLogoUpload" :disabled="saving" />
              </label>
            </div>
            
            <h4 class="text-lg font-black text-gray-900">{{ companyData.name || 'Set Company Name' }}</h4>
            <p class="text-xs text-gray-550 mt-1 max-w-xs mx-auto truncate font-medium">{{ companyData.website || 'No website link' }}</p>
          </div>

          <!-- Quick Statistics details -->
          <div class="w-full mt-6 grid grid-cols-2 gap-3 pt-6 border-t border-gray-100">
            <div class="bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <p class="text-2xl font-black text-brand-purple">{{ employees.length }}</p>
              <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Employees</p>
            </div>
            <div class="bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <p class="text-2xl font-black text-brand-orange">{{ companyData.departments.length }}</p>
              <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Departments</p>
            </div>
          </div>
        </div>

        <!-- Form fields Card -->
        <div class="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
          <h3 class="text-sm font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-3">
            Profile Details
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="space-y-2">
              <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Company Legal Name</label>
              <input 
                v-model="companyData.name" 
                type="text" 
                placeholder="TechCorp Solutions Inc." 
                class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold"
              />
            </div>
            
            <div class="space-y-2">
              <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Website URL</label>
              <input 
                v-model="companyData.website" 
                type="text" 
                placeholder="www.techcorp.com" 
                class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="space-y-2">
              <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Corporate Email Address</label>
              <input 
                v-model="companyData.email" 
                type="email" 
                placeholder="contact@techcorp.com" 
                class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold"
              />
            </div>
            
            <div class="space-y-2">
              <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Contact Phone Number</label>
              <input 
                v-model="companyData.phone" 
                type="text" 
                placeholder="+1 (555) 123-4567" 
                class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold"
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Company Description / Tagline</label>
            <textarea 
              v-model="companyData.description" 
              rows="3" 
              placeholder="Leading the way in digital transformation..."
              class="w-full bg-gray-55 border border-gray-200 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-medium resize-none"
            ></textarea>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Corporate Headquarters Address</label>
            <input 
              v-model="companyData.address" 
              type="text" 
              placeholder="123 Innovation Drive, Silicon Valley, CA" 
              class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold"
            />
          </div>

          <!-- Save Button -->
          <div class="flex justify-end pt-4 border-t border-gray-100">
            <button 
              @click="saveProfile" 
              :disabled="saving"
              class="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-brand-purple text-white hover:bg-brand-purple/95 font-bold transition-all shadow-lg shadow-brand-purple/20 disabled:opacity-50">
              <i v-if="saving" class="mdi mdi-loading mdi-spin text-lg"></i>
              <i v-else class="mdi mdi-checkbox-marked-circle-outline text-lg"></i>
              <span>{{ saving ? 'Saving Profile...' : 'Save Profile Settings' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- TAB 2: Departments Manager -->
      <div v-if="activeTab === 'departments'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Add New Department Column -->
        <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 class="text-sm font-black text-gray-400 uppercase tracking-widest block border-b border-gray-50 pb-2">
            Create Department
          </h3>
          <p class="text-xs text-gray-550 leading-relaxed font-semibold">
            Add new divisions or functional areas within the organization. These will become available for assignment when onboarding new staff.
          </p>
          
          <div class="space-y-2 pt-2">
            <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Department Name</label>
            <input 
              v-model="newDepartmentName" 
              type="text" 
              placeholder="e.g. Quality Assurance" 
              @keyup.enter="addDepartment"
              class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold"
            />
          </div>

          <button 
            @click="addDepartment" 
            :disabled="!newDepartmentName.trim() || saving"
            class="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-brand-purple text-white hover:bg-brand-purple/90 font-bold transition-all disabled:opacity-50">
            <i class="mdi mdi-plus-box-outline text-lg"></i>
            <span>Add Department</span>
          </button>
        </div>

        <!-- Departments List Column -->
        <div class="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
          <div class="flex items-center justify-between border-b border-gray-50 pb-3">
            <h3 class="text-sm font-black text-gray-400 uppercase tracking-widest">
              Active Departments
            </h3>
            <span class="px-2.5 py-1 text-xs font-bold text-brand-purple bg-brand-purple/10 rounded-lg">
              {{ companyData.departments.length }} Total
            </span>
          </div>

          <div v-if="!companyData.departments.length" class="text-center py-12 text-gray-450 font-bold text-sm">
            <i class="mdi mdi-alert-circle-outline text-3xl block mb-2 text-gray-300"></i>
            No active departments. Add a department to get started.
          </div>

          <div v-else class="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
            <div 
              v-for="(dept, index) in companyData.departments" 
              :key="dept" 
              class="group flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-brand-purple/20 hover:bg-gray-50/50 transition-all duration-200"
            >
              <!-- Info / Edit Mode -->
              <div class="flex-grow min-w-0 mr-4">
                <div v-if="editingDeptIndex === index" class="flex items-center gap-2">
                  <input 
                    v-model="editingDeptName" 
                    type="text" 
                    class="bg-white border border-gray-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-purple text-sm font-semibold text-gray-800 w-full max-w-sm"
                    @keyup.enter="saveEditDept(index)"
                    @keyup.esc="cancelEditDept"
                  />
                  <button @click="saveEditDept(index)" class="p-1.5 bg-emerald-50 text-emerald-650 hover:bg-emerald-100 rounded-lg transition-all" title="Save">
                    <i class="mdi mdi-check text-lg"></i>
                  </button>
                  <button @click="cancelEditDept" class="p-1.5 bg-red-50 text-red-650 hover:bg-red-100 rounded-lg transition-all" title="Cancel">
                    <i class="mdi mdi-close text-lg"></i>
                  </button>
                </div>
                <div v-else class="flex items-center gap-3">
                  <span class="w-2.5 h-2.5 rounded-full bg-brand-purple/60"></span>
                  <p class="font-bold text-gray-800 truncate">{{ dept }}</p>
                </div>
              </div>

              <!-- Badges & Action Buttons -->
              <div v-if="editingDeptIndex !== index" class="flex items-center gap-3 flex-shrink-0">
                <span class="px-2.5 py-1 text-xs font-bold text-gray-550 bg-gray-100 rounded-lg whitespace-nowrap">
                  {{ departmentCounts[dept] || 0 }} Staff
                </span>
                
                <div class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                  <button 
                    @click="startEditDept(index, dept)" 
                    class="p-2 text-gray-400 hover:text-brand-purple hover:bg-brand-purple/10 rounded-xl transition-all"
                    title="Rename"
                  >
                    <i class="mdi mdi-pencil-outline text-lg"></i>
                  </button>
                  <button 
                    @click="deleteDepartment(dept)" 
                    class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Delete"
                  >
                    <i class="mdi mdi-trash-can-outline text-lg"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: HRMS System Preferences -->
      <div v-if="activeTab === 'preferences'" class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
        <h3 class="text-sm font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-3">
          HRMS Configuration Panel
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Currency Setting -->
          <div class="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/10">
                <i class="mdi mdi-currency-usd text-xl"></i>
              </div>
              <div>
                <h4 class="font-bold text-gray-950 text-sm">System Currency</h4>
                <p class="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Used in Payroll & Payslips</p>
              </div>
            </div>
            <select 
              v-model="preferences.currency" 
              class="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-purple"
            >
              <option value="USD">USD ($) - United States Dollar</option>
              <option value="INR">INR (₹) - Indian Rupee</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="GBP">GBP (£) - British Pound</option>
              <option value="CAD">CAD ($) - Canadian Dollar</option>
            </select>
          </div>

          <!-- Default Shift Setting -->
          <div class="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center border border-orange-500/10">
                <i class="mdi mdi-clock-outline text-xl"></i>
              </div>
              <div>
                <h4 class="font-bold text-gray-950 text-sm">Default Staff Shift</h4>
                <p class="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Assigned to newly onboarded staff</p>
              </div>
            </div>
            <select 
              v-model.number="preferences.defaultShiftId" 
              class="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-purple"
            >
              <option v-for="shift in shiftsList" :key="shift.id" :value="shift.id">
                {{ shift.name }} ({{ shift.start_time }} - {{ shift.end_time }})
              </option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <!-- Correction Approvals Configuration -->
          <div class="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/10">
                <i class="mdi mdi-calendar-check text-xl"></i>
              </div>
              <div>
                <h4 class="font-bold text-gray-950 text-sm">Attendance Correction Requests</h4>
                <p class="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Control employee correction approvals</p>
              </div>
            </div>
            <select 
              v-model="preferences.allowCorrection" 
              class="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-purple"
            >
              <option value="true">Enable (Requires manual admin approval)</option>
              <option value="false">Disable (Employees cannot request corrections)</option>
            </select>
          </div>

          <!-- Self Clock-in configuration -->
          <div class="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-650 flex items-center justify-center border border-emerald-500/10">
                <i class="mdi mdi-map-marker-radius text-xl"></i>
              </div>
              <div>
                <h4 class="font-bold text-gray-950 text-sm">Self Clock-In / Web Clock-In</h4>
                <p class="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Allow web-interface clock-in buttons</p>
              </div>
            </div>
            <select 
              v-model="preferences.allowSelfClock" 
              class="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-purple"
            >
              <option value="true">Allow all employees to clock-in from user portal</option>
              <option value="false">Restrict (Clock-in managed by attendance logs upload)</option>
            </select>
          </div>
        </div>

        <!-- Preferences Save button -->
        <div class="flex justify-end pt-4 border-t border-gray-100">
          <button 
            @click="savePreferences" 
            :disabled="saving"
            class="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-brand-purple text-white hover:bg-brand-purple/95 font-bold transition-all shadow-lg shadow-brand-purple/20 disabled:opacity-50">
            <i v-if="saving" class="mdi mdi-loading mdi-spin text-lg"></i>
            <i v-else class="mdi mdi-checkbox-marked-circle-outline text-lg"></i>
            <span>{{ saving ? 'Saving Settings...' : 'Save Configuration Preferences' }}</span>
          </button>
        </div>
      </div>

    </div>
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

/* Animations transitions */
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
