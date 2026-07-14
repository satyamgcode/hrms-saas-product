<script setup>
import { reactive, ref, onMounted } from 'vue';
import { getUsers, createUser } from '../services/api';

const users = ref([]);
const loading = ref(true);
const showForm = ref(false);
const formError = ref('');

const newUser = reactive({
  name: '',
  email: '',
  role: 'Employee',
  designation: '',
  avatar: '',
});

const roleOptions = [
  'Employee',
  'HR',
  'Manager',
  'Finance',
  'Admin',
  'Contractor',
  'Other',
];

const loadUsers = async () => {
  loading.value = true;
  try {
    users.value = await getUsers();
  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    loading.value = false;
  }
};

const resetNewUserForm = () => {
  newUser.name = '';
  newUser.email = '';
  newUser.role = 'Employee';
  newUser.designation = '';
  newUser.avatar = '';
  formError.value = '';
};

const handleCreateUser = async () => {
  if (!newUser.name || !newUser.email || !newUser.role) {
    formError.value = 'Name, email, and role are required.';
    return;
  }

  try {
    loading.value = true;
    const created = await createUser({
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      designation: newUser.designation,
      avatar: newUser.avatar || null,
      companyId: 1,
    });
    users.value.unshift(created);
    resetNewUserForm();
    showForm.value = false;
  } catch (error) {
    console.error('Error creating user:', error);
    formError.value = error?.message || 'Unable to create user. Please try again.';
  } finally {
    loading.value = false;
  }
};

onMounted(loadUsers);
</script>

<template>
    <div class="p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <!-- Premium Header Section -->
        <div class="bg-white p-5 sm:p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-orange to-red-500 flex items-center justify-center text-white shadow-lg shadow-orange-200">
                    <i class="mdi mdi-account-group text-3xl"></i>
                </div>
                <div>
                    <h2 class="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Team Directory</h2>
                    <p class="text-sm font-medium text-gray-500 mt-1">Manage and connect with your team members</p>
                </div>
            </div>
            
            <div class="flex items-center gap-3 w-full md:w-auto">
                <div class="relative w-full md:w-64">
                    <i class="mdi mdi-magnify absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                    <input type="text" placeholder="Search team..." class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand-purple focus:bg-white transition-all text-sm font-medium">
                </div>
                <button @click="showForm = !showForm" class="flex-shrink-0 bg-brand-purple hover:bg-brand-purple/90 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-purple/20 active:scale-95">
                    <i class="mdi mdi-plus"></i>
                    <span class="hidden sm:inline">{{ showForm ? 'Close' : 'Add Member' }}</span>
                </button>
            </div>
        </div>

        <div v-if="showForm" class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-8">
            <div class="grid gap-4 lg:grid-cols-2">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Full name</label>
                    <input v-model="newUser.name" type="text" placeholder="John Doe" class="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-brand-purple focus:ring-brand-purple/20 focus:outline-none" />
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Email address</label>
                    <input v-model="newUser.email" type="email" placeholder="john@company.com" class="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-brand-purple focus:ring-brand-purple/20 focus:outline-none" />
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                    <select v-model="newUser.role" class="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-brand-purple focus:ring-brand-purple/20 focus:outline-none">
                        <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Designation</label>
                    <input v-model="newUser.designation" type="text" placeholder="Product Designer" class="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-brand-purple focus:ring-brand-purple/20 focus:outline-none" />
                </div>
            </div>
            <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
                <button @click="handleCreateUser" class="inline-flex items-center justify-center rounded-2xl bg-brand-purple px-6 py-3 text-sm font-bold text-white hover:bg-brand-purple/90 transition-all">Create team member</button>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center py-20">
            <span class="animate-spin h-10 w-10 border-4 border-brand-purple border-t-transparent rounded-full shadow-lg"></span>
        </div>

        <!-- Users Grid -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div v-for="user in users" :key="user.id" 
                 class="group bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-gray-100 hover:border-brand-purple/30 hover:shadow-xl hover:shadow-brand-purple/5 transition-all duration-300 flex items-center gap-4 cursor-pointer">
                
                <div class="relative flex-shrink-0">
                    <img :src="user.avatar || `https://ui-avatars.com/api/?name=${user.name || user.full_name}&background=8A3EEA&color=fff`" 
                         :alt="user.name || user.full_name" 
                         class="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm group-hover:scale-105 transition-transform duration-300" />
                    <!-- Online Status Indicator (mocked) -->
                    <span class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                </div>
                
                <div class="flex-grow min-w-0">
                    <h3 class="text-sm font-bold text-gray-900 truncate group-hover:text-brand-purple transition-colors">{{ user.name || user.full_name }}</h3>
                    <p class="text-xs font-semibold text-brand-purple capitalize truncate mt-0.5">{{ user.role }}</p>
                    <p class="text-[10px] text-gray-500 uppercase tracking-wider truncate mt-1">{{ user.designation || 'General' }}</p>
                </div>
                
                <div class="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 md:opacity-100">
                    <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-brand-orange hover:bg-orange-50 rounded-lg transition-colors" title="Email User" @click.stop="() => {}">
                        <i class="mdi mdi-email-outline text-base"></i>
                    </button>
                    <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-brand-purple hover:bg-purple-50 rounded-lg transition-colors" title="View Profile">
                        <i class="mdi mdi-arrow-right text-base"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-if="!loading && users.length === 0" class="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="mdi mdi-account-off-outline text-4xl text-gray-400"></i>
            </div>
            <h3 class="text-lg font-bold text-gray-900">No users found</h3>
            <p class="text-gray-500 text-sm mt-1">Get started by adding a new team member.</p>
        </div>
    </div>
</template>
