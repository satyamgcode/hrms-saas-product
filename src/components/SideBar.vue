<script setup>
import { ref, computed } from 'vue';
import { defineProps, defineEmits } from 'vue';
import SearchIcon from '../assets/icons/search.svg';

// Props and emits setup
const props = defineProps({
    users: Array,
});
const emit = defineEmits(['select-user']);

// Search-related states
const isSearchExpanded = ref(false);
const searchQuery = ref('');

// Toggle the search input visibility
const toggleSearch = () => {
    isSearchExpanded.value = true;
};

// Close search when losing focus
const closeSearch = () => {
    isSearchExpanded.value = false;
    searchQuery.value = ''; // Reset search query when closing
};

// Emit event when a user is selected
const selectUser = (user) => {
    emit('select-user', user);
};

// Filter users based on the search query
const filteredUsers = computed(() => {
    if (!searchQuery.value) return props.users;
    return props.users.filter((user) =>
        user.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
});
</script>

<template>
    <div class="w-1/4 bg-gray-100 p-4 overflow-auto relative">
        <div class="flex items-center justify-between mb-4">
            <!-- Message Text -->
            <h3 :class="{
                'font-semibold text-md transition-all duration-300': true,
                'opacity-0': isSearchExpanded,
            }">Message</h3>

            <!-- Search Icon & Input -->
            <div class="relative"> <img :src="SearchIcon" alt="Search Icon" class="w-4 h-4 text-gray-600 cursor-pointer"
                    @click="toggleSearch" />
                <!-- Search Input Field -->
                <input v-if="isSearchExpanded" v-model="searchQuery" type="text" placeholder="Search..."
                    class="absolute right-0 top-0 transition-all duration-300 w-48 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none shadow-lg"
                    @blur="closeSearch" />
            </div>
        </div>

        <!-- Users List -->
        <div v-for="user in filteredUsers" :key="user.id"
            class="cursor-pointer mb-1 p-1 bg-white rounded-lg shadow hover:bg-gray-200" @click="selectUser(user)">
            <div class="flex items-center">
                <img :src="user.avatar" alt="User Avatar" class="w-6 h-6 rounded-full mr-3" />
                <span class="text-gray-700 font-semibold text-xs">{{ user.name }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Optional Styling */
.flex {
    display: flex;
}
</style>