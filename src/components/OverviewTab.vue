<script setup>
import { ref, onMounted } from 'vue';
import { getCurrentUser, getUserProfile } from '../services/api';
import EmployeePage from './EmployeePage.vue';

const employeeData = ref({
    name: 'Loading...',
    designation: '',
    email: '',
    website: '',
    phone: '',
    team: 0,
    awards: 0,
    projects: 0,
    clients: 0,
    socialLinks: {
        facebook: '#',
        twitter: '#',
        linkedin: '#',
    },
    bio: '',
    avatar: '',
    location: '',
    joiningDate: '',
    department: ''
});

onMounted(async () => {
    try {
        const user = await getCurrentUser();
        if (user) {
            const profile = await getUserProfile({ email: user.email });
            if (profile) {
                employeeData.value = {
                    ...profile,
                    role: profile.role || profile.designation || 'Member',
                    avatar: profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || user.email)}&background=8A3EEA&color=fff`,
                };
            }
        }
    } catch (error) {
        console.error('Error fetching employee data:', error);
    }
});

const stats = [
    { label: 'Team Members', key: 'team', icon: 'mdi-account-group', color: 'bg-blue-50 text-blue-600' },
    { label: 'Awards Won', key: 'awards', icon: 'mdi-trophy', color: 'bg-orange-50 text-orange-600' },
    { label: 'Total Projects', key: 'projects', icon: 'mdi-briefcase-check', color: 'bg-green-50 text-green-600' },
    { label: 'Happy Clients', key: 'clients', icon: 'mdi-heart', color: 'bg-red-50 text-red-600' },
];
</script>

<template>
    <EmployeePage>
        <div class="p-4 md:p-8">
            <!-- Profile Header Card -->
            <div class="relative mb-12">
                <!-- Cover Background -->
                <div class="h-48 w-full bg-gradient-to-r from-brand-purple to-brand-purple/60 rounded-3xl overflow-hidden shadow-inner">
                    <div class="absolute inset-0 opacity-10 pattern-dots"></div>
                </div>
                
                <!-- Profile Info Overlay -->
                <div class="flex flex-col md:flex-row items-end gap-6 -mt-16 px-6 md:px-10">
                    <div class="relative group">
                        <img 
                            :src="employeeData.avatar || `https://ui-avatars.com/api/?name=${employeeData.name}&background=8A3EEA&color=fff`" 
                            alt="Avatar"
                            class="w-32 h-32 md:w-40 md:h-40 rounded-3xl border-4 border-white shadow-xl object-cover transition-transform group-hover:scale-[1.02]" 
                        />
                        <div class="absolute inset-0 bg-black/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button class="bg-white/90 p-2 rounded-xl text-brand-purple shadow-lg">
                                <i class="mdi mdi-camera text-xl"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="flex-grow pb-4 text-center md:text-left">
                        <div class="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                            <h2 class="text-3xl font-black text-gray-900 tracking-tight">{{ employeeData.name }}</h2>
                            <span class="inline-flex items-center px-3 py-1 bg-brand-purple/10 text-brand-purple text-xs font-black uppercase tracking-widest rounded-full">
                                {{ employeeData.role || 'Member' }}
                            </span>
                        </div>
                        <div class="flex flex-wrap justify-center md:justify-start items-center gap-4 text-gray-500 font-medium">
                            <div class="flex items-center gap-1.5">
                                <i class="mdi mdi-map-marker text-brand-purple"></i>
                                <span>{{ employeeData.location || 'Remote' }}</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <i class="mdi mdi-domain text-brand-purple"></i>
                                <span>{{ employeeData.department || 'General' }}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="pb-4 flex gap-2">
                        <button class="p-3 bg-gray-50 text-gray-400 hover:text-brand-purple hover:bg-brand-purple/10 rounded-2xl transition-all shadow-sm">
                            <i class="mdi mdi-email-outline text-xl"></i>
                        </button>
                        <button class="px-6 py-3 bg-brand-purple text-white rounded-2xl font-bold shadow-lg shadow-brand-purple/25 hover:scale-[1.02] active:scale-95 transition-all">
                            Edit Profile
                        </button>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Left Column: Stats & Bio -->
                <div class="lg:col-span-2 space-y-8">
                    <!-- Stats Grid -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div v-for="stat in stats" :key="stat.key" 
                             class="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div :class="['w-10 h-10 rounded-xl flex items-center justify-center mb-4', stat.color]">
                                <i :class="['mdi text-xl', stat.icon]"></i>
                            </div>
                            <p class="text-2xl font-black text-gray-900">{{ employeeData[stat.key] || 0 }}</p>
                            <p class="text-sm font-bold text-gray-400">{{ stat.label }}</p>
                        </div>
                    </div>

                    <!-- Bio Section -->
                    <div class="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                        <h3 class="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                            <i class="mdi mdi-account-details text-brand-purple"></i>
                            About Me
                        </h3>
                        <p class="text-gray-600 leading-relaxed font-medium">
                            {{ employeeData.bio || 'No bio available. Add one to help people get to know you better!' }}
                        </p>
                    </div>
                </div>

                <!-- Right Column: Contact & Social -->
                <div class="space-y-8">
                    <div class="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                        <h3 class="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                            <i class="mdi mdi-card-account-phone text-brand-purple"></i>
                            Contact Info
                        </h3>
                        
                        <div class="space-y-5">
                            <div class="flex items-center gap-4 group">
                                <div class="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-brand-purple group-hover:bg-brand-purple/10 transition-colors">
                                    <i class="mdi mdi-email text-xl"></i>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-xs font-bold text-gray-400 uppercase">Email</p>
                                    <a :href="`mailto:${employeeData.email}`" class="text-sm font-bold text-gray-900 truncate block hover:text-brand-purple transition-colors">
                                        {{ employeeData.email }}
                                    </a>
                                </div>
                            </div>

                            <div class="flex items-center gap-4 group">
                                <div class="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-brand-purple group-hover:bg-brand-purple/10 transition-colors">
                                    <i class="mdi mdi-phone text-xl"></i>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-xs font-bold text-gray-400 uppercase">Phone</p>
                                    <a :href="`tel:${employeeData.phone}`" class="text-sm font-bold text-gray-900 truncate block hover:text-brand-purple transition-colors">
                                        {{ employeeData.phone || 'Not provided' }}
                                    </a>
                                </div>
                            </div>

                            <div class="flex items-center gap-4 group">
                                <div class="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-brand-purple group-hover:bg-brand-purple/10 transition-colors">
                                    <i class="mdi mdi-web text-xl"></i>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-xs font-bold text-gray-400 uppercase">Website</p>
                                    <a :href="employeeData.website" target="_blank" class="text-sm font-bold text-gray-900 truncate block hover:text-brand-purple transition-colors">
                                        {{ employeeData.website || 'Add website' }}
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div class="mt-8 pt-8 border-t border-gray-50">
                            <p class="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Social Connect</p>
                            <div class="flex gap-3">
                                <a v-if="employeeData.socialLinks?.facebook" :href="employeeData.socialLinks.facebook" target="_blank" 
                                   class="w-12 h-12 flex items-center justify-center rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                    <i class="mdi mdi-facebook text-2xl"></i>
                                </a>
                                <a v-if="employeeData.socialLinks?.twitter" :href="employeeData.socialLinks.twitter" target="_blank" 
                                   class="w-12 h-12 flex items-center justify-center rounded-2xl bg-sky-50 text-sky-500 hover:bg-sky-500 hover:text-white transition-all shadow-sm">
                                    <i class="mdi mdi-twitter text-2xl"></i>
                                </a>
                                <a v-if="employeeData.socialLinks?.linkedin" :href="employeeData.socialLinks.linkedin" target="_blank" 
                                   class="w-12 h-12 flex items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 hover:bg-indigo-700 hover:text-white transition-all shadow-sm">
                                    <i class="mdi mdi-linkedin text-2xl"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </EmployeePage>
</template>

<style scoped>
.pattern-dots {
    background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0);
    background-size: 24px 24px;
}
</style>
