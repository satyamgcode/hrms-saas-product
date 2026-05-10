<script setup>
import { ref } from 'vue';
import searchIcon from '../../assets/icons/search.svg';

const searchQuery = ref('');
</script>

<template>
  <div class="flex items-center gap-4">
    <!-- Search Bar -->
    <div class="relative group hidden md:block">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-purple">
        <img :src="searchIcon" class="w-4 h-4 opacity-50 group-focus-within:opacity-100" />
      </div>
      <input 
        type="text" 
        v-model="searchQuery"
        placeholder="Search for anything..." 
        class="block w-64 lg:w-96 pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple focus:bg-white transition-all"
      />
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <button class="p-2 text-gray-400 hover:text-brand-purple hover:bg-brand-purple/10 rounded-xl transition-all relative">
        <i class="mdi mdi-bell-outline text-xl"></i>
        <span class="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
      </button>
      
      <button class="p-2 text-gray-400 hover:text-brand-purple hover:bg-brand-purple/10 rounded-xl transition-all">
        <i class="mdi mdi-cog-outline text-xl"></i>
      </button>

      <button class="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-purple text-white rounded-2xl font-bold text-sm hover:shadow-lg hover:shadow-brand-purple/30 transition-all active:scale-95 ml-2">
        <i class="mdi mdi-plus"></i>
        <span>Quick Action</span>
      </button>
    </div>
  </div>
</template>