<!-- ChatRoom.vue -->
<template>
  <div v-if="currentUser" class="w-full flex flex-col overflow-auto">
    <!-- Chat Header -->
    <div class="flex items-center gap-2 bg-white p-2 shadow justify-between">
      <div class="flex items-center gap-2">
        <button @click="backToUserList" class="text-gray-500 hover:text-gray-700"><i
            class="mdi mdi-arrow-left text-lg"></i></button>
        <div class="flex items-center">
          <img :src="currentUser?.avatar" alt="User Avatar" class="w-7 h-7 rounded-full mr-3" />
          <div class="text-gray-700 font-semibold">{{ currentUser.name }}</div>
        </div>
      </div>
      <div class="flex gap-3 mr-3">
        <i class="mdi mdi-video text-red-500 text-2xl"></i>
        <i class="mdi mdi-phone text-green-500 text-2xl"></i>
      </div>
    </div>


    <!-- Chat Messages -->
    <div class="flex flex-col flex-grow overflow-y-auto p-4 bg-purple-50">
      <div>
        <div class="flex justify-center">
          <img :src="currentUser.avatar" class="rounded-full ">
        </div>
        <div class="flex flex-col items-center justify-center mt-2 text-gray-700 font-semibold text-3xl">
          <p>
            {{ currentUser.name }}
          </p>
          <p class="text-sm">
            user and you are now connected
          </p>
        </div>
      </div>

      <div v-for="message in messages" :key="message.id" class="mb-4">
        <!-- Message from the selected user -->
        <div v-if="message.userId === currentUser.id" class="flex items-start">
          <img :src="currentUser?.avatar" alt="User Avatar" class="w-8 h-8 rounded-full mr-3" />
          <div class="max-w-xs text-sm px-2 font-normal bg-gray-300 text-gray-800 p-1 rounded-lg">
            {{ message.text }}
          </div>
        </div>

        <!-- Message sent by the current user -->
        <div v-else class="flex justify-end">
          <div class="max-w-xs text-sm font-normal bg-purple-500 text-white p-1 px-2 rounded-lg">
            {{ message.text }}
          </div>
        </div>
      </div>
    </div>

    <!-- Message Input -->
    <div class="bg-white p-3 shadow flex items-center">
      <textarea v-model="newMessage" placeholder="Type a message..."
        class="w-full h-12 p-2 border border-gray-300 rounded-lg resize-none"></textarea>
      <img class="cursor-pointer ml-2 border border-gray-300 rounded-lg px-2 py-1" @click="sendMessage"
        :src="SendButton" alt="0">


    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, ref } from 'vue';
import SendButton from '../assets/icons/send-button.svg';

const props = defineProps({
  currentUser: Object,
  messages: Array,
});

const emit = defineEmits(['back-to-list', 'send-message']);

const newMessage = ref('');

const sendMessage = () => {
  if (newMessage.value.trim() !== '') {
    emit('send-message', newMessage.value);
    newMessage.value = '';
  }
};

const backToUserList = () => {
  emit('back-to-list');
};
</script>