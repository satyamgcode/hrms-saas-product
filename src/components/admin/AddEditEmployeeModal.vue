<script setup>
import { ref, reactive, watch, onMounted } from 'vue';
import { getCompany } from '../../services/api';

const props = defineProps({
  show: Boolean,
  employee: Object // Null if creating, object if editing
});

const emit = defineEmits(['close', 'save']);

const currentStep = ref(1);
const formError = ref('');
const loading = ref(false);

const departmentsList = ref([]);
const customDeptName = ref('');

const initialForm = {
  name: '',
  email: '',
  password: '', // Only used when creating
  role: 'Employee',
  designation: '',
  department: '',
  joining_date: '',
  phone: '',
  website: '',
  location: '',
  bio: '',
  current_address: '',
  permanent_address: '',
  office_address: '',
  team: 0,
  awards: 0,
  projects: 0,
  clients: 0,
  avatar: '',
  status: 'active',
  social_links: {
    facebook: '#',
    twitter: '#',
    linkedin: '#'
  }
};

const form = reactive({ ...initialForm });

const loadDepartments = async () => {
  try {
    const company = await getCompany(props.employee?.companyId || 1);
    if (company && Array.isArray(company.departments)) {
      departmentsList.value = [...company.departments];
    } else {
      departmentsList.value = ['Software Development', 'Creative Design', 'Marketing', 'Sales', 'Human Resources', 'Finance'];
    }
  } catch (err) {
    console.error('Error fetching departments:', err);
    departmentsList.value = ['Software Development', 'Creative Design', 'Marketing', 'Sales', 'Human Resources', 'Finance'];
  }

  // Ensure current employee's department is in list
  if (props.employee && props.employee.department) {
    if (!departmentsList.value.includes(props.employee.department)) {
      departmentsList.value.push(props.employee.department);
    }
  }
};

onMounted(() => {
  loadDepartments();
});

watch(() => props.show, async (newVal) => {
  if (newVal) {
    currentStep.value = 1;
    formError.value = '';
    customDeptName.value = '';
    await loadDepartments();
    
    if (props.employee) {
      // Editing Mode
      Object.assign(form, props.employee);
      if (!form.social_links) {
        form.social_links = { facebook: '#', twitter: '#', linkedin: '#' };
      }
    } else {
      // Creating Mode
      Object.assign(form, initialForm);
      form.social_links = { facebook: '', twitter: '', linkedin: '' };
      // Default joining date to today
      const today = new Date().toISOString().split('T')[0];
      form.joining_date = today;
    }
  }
});

const handleCustomDeptBlur = () => {
  const val = customDeptName.value.trim();
  if (val) {
    if (!departmentsList.value.includes(val)) {
      departmentsList.value.push(val);
    }
    form.department = val;
  } else {
    form.department = '';
  }
  customDeptName.value = '';
};

const nextStep = () => {
  if (currentStep.value === 1) {
    if (!form.name || !form.email) {
      formError.value = 'Full Name and Email are required.';
      return;
    }
    if (!props.employee && !form.password) {
      formError.value = 'A temporary password is required for new employees.';
      return;
    }
  }
  formError.value = '';
  currentStep.value++;
};

const prevStep = () => {
  formError.value = '';
  currentStep.value--;
};

const handleSubmit = async () => {
  loading.value = true;
  formError.value = '';
  try {
    emit('save', { ...form });
  } catch (error) {
    formError.value = error.message || 'Operation failed.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto bg-black/50 backdrop-blur-sm">
    <div class="relative w-full max-w-3xl bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden my-8">
      
      <!-- Modal Header -->
      <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <div>
          <h3 class="text-xl font-black text-gray-900">
            {{ employee ? 'Edit Employee Profile' : 'Onboard New Employee' }}
          </h3>
          <p class="text-xs text-gray-500 mt-1">Configure employee account details and personal specifications</p>
        </div>
        <button @click="$emit('close')" class="w-8 h-8 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-all">
          <i class="mdi mdi-close text-lg"></i>
        </button>
      </div>

      <!-- Step Indicator -->
      <div class="px-8 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between text-xs font-bold text-gray-550">
        <div class="flex items-center gap-2" :class="{ 'text-brand-purple': currentStep >= 1 }">
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs border" 
                :class="currentStep >= 1 ? 'border-brand-purple bg-brand-purple/10 text-brand-purple' : 'border-gray-300 text-gray-400'">1</span>
          <span>Account Setup</span>
        </div>
        <div class="h-px bg-gray-200 flex-grow mx-4"></div>
        <div class="flex items-center gap-2" :class="{ 'text-brand-purple': currentStep >= 2 }">
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs border" 
                :class="currentStep >= 2 ? 'border-brand-purple bg-brand-purple/10 text-brand-purple' : 'border-gray-300 text-gray-400'">2</span>
          <span>Employment Details</span>
        </div>
        <div class="h-px bg-gray-200 flex-grow mx-4"></div>
        <div class="flex items-center gap-2" :class="{ 'text-brand-purple': currentStep >= 3 }">
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs border" 
                :class="currentStep >= 3 ? 'border-brand-purple bg-brand-purple/10 text-brand-purple' : 'border-gray-300 text-gray-400'">3</span>
          <span>Contact & Address</span>
        </div>
        <div class="h-px bg-gray-200 flex-grow mx-4"></div>
        <div class="flex items-center gap-2" :class="{ 'text-brand-purple': currentStep >= 4 }">
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs border" 
                :class="currentStep >= 4 ? 'border-brand-purple bg-brand-purple/10 text-brand-purple' : 'border-gray-300 text-gray-400'">4</span>
          <span>Bio & Connect</span>
        </div>
      </div>

      <!-- Modal Body (Form Steps) -->
      <div class="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar bg-white">
        <div v-if="formError" class="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-650 text-sm font-semibold flex items-center gap-3">
          <i class="mdi mdi-alert-circle text-lg"></i>
          <span>{{ formError }}</span>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          
          <!-- STEP 1: Basic Auth & Account Setup -->
          <div v-if="currentStep === 1" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Full Name *</label>
                <input v-model="form.name" type="text" placeholder="John Doe" 
                       class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold" required />
              </div>
              <div class="space-y-2">
                <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Email Address *</label>
                <input v-model="form.email" type="email" placeholder="john.doe@company.com" :disabled="!!employee"
                       class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold disabled:opacity-50" required />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-if="!employee" class="space-y-2">
                <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Temp Password *</label>
                <input v-model="form.password" type="password" placeholder="••••••••" 
                       class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold" />
              </div>
              <div class="space-y-2">
                <label class="text-xs font-black text-gray-500 uppercase tracking-widest">System Role</label>
                <select v-model="form.role" 
                        class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold">
                  <option value="Employee">Employee</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="HR">HR</option>
                </select>
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Avatar URL</label>
              <input v-model="form.avatar" type="text" placeholder="https://example.com/avatar.jpg" 
                     class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold" />
            </div>
          </div>

          <!-- STEP 2: Employment Details -->
          <div v-if="currentStep === 2" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Designation</label>
                <input v-model="form.designation" type="text" placeholder="Senior Backend Developer" 
                       class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold" />
              </div>
              <div class="space-y-2">
                <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Department</label>
                <select v-model="form.department" 
                        class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold">
                  <option value="">Select Department</option>
                  <option v-for="dept in departmentsList" :key="dept" :value="dept">{{ dept }}</option>
                  <option value="custom_other">-- Other / Add New --</option>
                </select>
              </div>
            </div>

            <div v-if="form.department === 'custom_other'" class="space-y-2">
              <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Custom Department Name</label>
              <input v-model="customDeptName" type="text" placeholder="Enter department name" 
                     @blur="handleCustomDeptBlur"
                     @keyup.enter="handleCustomDeptBlur"
                     class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Joining Date</label>
                <input v-model="form.joining_date" type="date" 
                       class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold" />
              </div>
              <div class="space-y-2">
                <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Employment Status</label>
                <select v-model="form.status" 
                        class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div class="space-y-2">
                <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Team Size</label>
                <input v-model.number="form.team" type="number" 
                       class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold" />
              </div>
              <div class="space-y-2">
                <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Projects</label>
                <input v-model.number="form.projects" type="number" 
                       class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold" />
              </div>
              <div class="space-y-2">
                <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Clients</label>
                <input v-model.number="form.clients" type="number" 
                       class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold" />
              </div>
              <div class="space-y-2">
                <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Awards</label>
                <input v-model.number="form.awards" type="number" 
                       class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold" />
              </div>
            </div>
          </div>

          <!-- STEP 3: Contact & Address details -->
          <div v-if="currentStep === 3" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="space-y-2">
                <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Phone Number</label>
                <input v-model="form.phone" type="tel" placeholder="+1 (555) 019-2834" 
                       class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold" />
              </div>
              <div class="space-y-2">
                <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Personal Website</label>
                <input v-model="form.website" type="text" placeholder="www.johndoe.com" 
                       class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold" />
              </div>
              <div class="space-y-2">
                <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Location (City, Country)</label>
                <input v-model="form.location" type="text" placeholder="San Francisco, CA" 
                       class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold" />
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Current Residence Address</label>
              <input v-model="form.current_address" type="text" placeholder="Street name, Appt No, City" 
                     class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold" />
            </div>

            <div class="space-y-2">
              <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Permanent Address</label>
              <input v-model="form.permanent_address" type="text" placeholder="Same or original family residence" 
                     class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold" />
            </div>

            <div class="space-y-2">
              <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Office HQ Address</label>
              <input v-model="form.office_address" type="text" placeholder="Corporate HQ Tech Park, Suite 101" 
                     class="w-full bg-gray-55 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold" />
            </div>
          </div>

          <!-- STEP 4: Social Connect & Bio -->
          <div v-if="currentStep === 4" class="space-y-4">
            <div class="space-y-2">
              <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Professional Summary (Bio)</label>
              <textarea v-model="form.bio" rows="4" placeholder="Brief statement about skills, focus, and history..." 
                        class="w-full bg-gray-55 border border-gray-200 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-850 font-medium resize-none"></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="space-y-2">
                <label class="text-xs font-black text-gray-500 uppercase tracking-widest">LinkedIn Profile</label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                    <i class="mdi mdi-linkedin"></i>
                  </span>
                  <input v-model="form.social_links.linkedin" type="text" placeholder="https://linkedin.com/in/..." 
                         class="w-full pl-10 bg-gray-55 border border-gray-200 rounded-2xl py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold" />
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Twitter Profile</label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                    <i class="mdi mdi-twitter"></i>
                  </span>
                  <input v-model="form.social_links.twitter" type="text" placeholder="https://twitter.com/..." 
                         class="w-full pl-10 bg-gray-55 border border-gray-200 rounded-2xl py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold" />
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-black text-gray-500 uppercase tracking-widest">Facebook Profile</label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                    <i class="mdi mdi-facebook"></i>
                  </span>
                  <input v-model="form.social_links.facebook" type="text" placeholder="https://facebook.com/..." 
                         class="w-full pl-10 bg-gray-55 border border-gray-200 rounded-2xl py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-800 font-semibold" />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- Modal Footer -->
      <div class="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
        <div>
          <button v-if="currentStep > 1" @click="prevStep" 
                  class="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition-all active:scale-95">
            Previous Step
          </button>
        </div>
        <div class="flex gap-3">
          <button @click="$emit('close')" 
                  class="px-6 py-3 bg-white border border-gray-250 hover:bg-gray-50 text-gray-500 rounded-xl font-bold transition-all active:scale-95">
            Cancel
          </button>
          
          <button v-if="currentStep < 4" @click="nextStep" 
                  class="px-6 py-3 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-brand-purple/20">
            Next Step
          </button>
          
          <button v-else @click="handleSubmit" :disabled="loading" 
                  class="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-green-500/20 flex items-center gap-2">
            <span v-if="loading" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
            {{ employee ? 'Save Changes' : 'Confirm Registration' }}
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
</style>
