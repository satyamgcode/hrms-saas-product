<script setup>
import { onBeforeMount, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const employeeDetails = [
   { text: 'Overview', icon: 'mdi mdi-view-dashboard', route: '/overview' },
   { text: 'Details', icon: 'mdi mdi-card-account-details', route: '/details' },
   { text: 'Contact', icon: 'mdi mdi-phone', route: '/contact' },
   { text: 'Documents', icon: 'mdi mdi-file-document', route: '/documents' },
   { text: 'Salary & Payslips', icon: 'mdi mdi-cash-multiple', route: '/payslips' },
];

const activeTab = ref('');
const router = useRouter();
const route = useRoute();

onBeforeMount(() => {
   activeTab.value = route.path;
});

watch(() => route.path, (newPath) => {
   activeTab.value = newPath;
});

const setActiveTab = (tab) => {
   activeTab.value = tab.route;
   router.push(tab.route);
};
</script>

<template>
   <div class="space-y-6">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-2">
         <div>
            <h1 class="text-3xl font-black text-gray-900 tracking-tight">Employee Profile</h1>
            <p class="text-gray-500 font-medium">Manage and view detailed employee information</p>
         </div>

         <div
            class="flex items-center justify-between md:justify-start gap-1 bg-gray-100/50 p-1 rounded-2xl overflow-x-auto no-scrollbar">
            <button v-for="employee in employeeDetails" :key="employee.text" @click="setActiveTab(employee)" :class="[
               'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap',
               activeTab === employee.route
                  ? 'bg-white text-brand-purple shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            ]">
               <i :class="[employee.icon, 'text-lg']"></i>
               <span class="sm:block hidden">{{ employee.text }}</span>
            </button>
         </div>

      </div>

      <div class="">
         <slot></slot>
      </div>
   </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
   display: none;
}

.no-scrollbar {
   -ms-overflow-style: none;
   scrollbar-width: none;
}
</style>
