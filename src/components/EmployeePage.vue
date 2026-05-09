<script setup>
import { onBeforeMount, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const employeeDetails = [
   { text: 'Overview', icon: 'mdi mdi-view-dashboard', route: '/overview' },
   { text: 'Details', icon: 'mdi mdi-chart-bar', route: '/details' },
   { text: 'Contact', icon: 'mdi mdi-calendar', route: '/contact' },
   { text: 'Documents', icon: 'mdi mdi-account', route: '/documents' },
   // { text: 'Experience', icon: 'mdi mdi-chat', route: '/experience' },
   // { text: 'Portfolio', icon: 'mdi mdi-email', route: '/portfolio' },
];

const activeTab = ref('');
const router = useRouter();
const route = useRoute();
console.log(route.path)

onBeforeMount(() => {
   activeTab.value = route.path;
});

const setActiveTab = (tab) => {
   activeTab.value = tab.route;
   router.push(tab.route);
};
</script>

<template>
   <div class="p-4 text-gray-800">
      <div class="flex items-center justify-between">
         <p class="text-2xl font-semibold">Employee Data</p>
         <div class="flex items-center gap-2 sm:mr-36">
            <div 
               v-for="employee in employeeDetails" 
               :key="employee.text" 
               @click="setActiveTab(employee)"
               :class="[
                  'cursor-pointer p-1 px-2 rounded-md',
                  activeTab === employee.route ? 'bg-purple-200 text-purple-700' : 'hover:bg-gray-200'
               ]"
            >
               <i :class="employee.icon"></i> {{ employee.text }}
            </div>
         </div>
      </div>
      <slot></slot>
   </div>
</template>
