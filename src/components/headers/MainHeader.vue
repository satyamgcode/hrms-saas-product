<script setup>
import searchIcon from '../../assets/icons/search.svg';
</script>

<template>
    <div class="flex items-center border-b-2 border-purple-200 py-2 px-2 bg-gray-50 justify-between pr-4">
        <div class="flex items-center border rounded-lg px-2 py-1 shadow-sm">
            <img :src="searchIcon">
            <input type="text" placeholder="Search ..." class="ml-2 bg-gray-50 outline-none focus:ring-0 text-sm sm:min-w-96 sm:h-6" />
        </div>

        <button class="ml-4 bg-purple-500 text-white rounded-lg py-1 px-4 hover:bg-purple-600 transition-colors">
            New
        </button>
    </div>
</template>