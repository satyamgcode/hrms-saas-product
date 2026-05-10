<script setup>
import { ref, onMounted } from 'vue';
import { getApiUrl } from '../services/api';

const holidays = ref([]);
const loading = ref(true);

onMounted(async () => {
    try {
        const response = await fetch(getApiUrl('holidays'));
        if (response.ok) {
            holidays.value = await response.json();
        }
    } catch (error) {
        console.error('Error fetching holidays:', error);
    } finally {
        loading.value = false;
    }
});
</script>

<template>
    <div class="p-6">
        <h2 class="text-3xl font-bold text-gray-800 mb-8 text-center">Company Holidays 2026</h2>
        
        <div v-if="loading" class="flex justify-center py-12">
            <span class="animate-spin h-10 w-10 border-4 border-brand-purple border-t-transparent rounded-full"></span>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="holiday in holidays" :key="holiday.id" 
                 class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between mb-4">
                    <div class="p-3 bg-brand-purple/10 rounded-xl">
                        <i class="mdi mdi-calendar-star text-2xl text-brand-purple"></i>
                    </div>
                    <span :class="{
                        'bg-blue-100 text-blue-600': holiday.type === 'Public',
                        'bg-orange-100 text-orange-600': holiday.type === 'National',
                        'bg-purple-100 text-purple-600': holiday.type === 'Optional'
                    }" class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        {{ holiday.type }}
                    </span>
                </div>
                <h3 class="text-xl font-bold text-gray-800 mb-1">{{ holiday.name }}</h3>
                <p class="text-gray-500 flex items-center gap-2">
                    <i class="mdi mdi-clock-outline"></i>
                    {{ new Date(holiday.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }}
                </p>
            </div>
        </div>

        <div v-if="!loading && holidays.length === 0" class="text-center py-12">
            <i class="mdi mdi-calendar-remove text-6xl text-gray-300"></i>
            <p class="text-gray-500 mt-4">No holidays scheduled for this period.</p>
        </div>
    </div>
</template>
