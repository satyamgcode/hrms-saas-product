<template>
    <div class="flex h-[93vh]">
      <Sidebar :users="users" @select-user="selectUser" />

      <ChatRoom
        v-if="currentUser"
        :currentUser="currentUser"
        :messages="messages"
        @back-to-list="backToUserList"
        @send-message="sendMessage"
      />
    </div>
</template>

<script setup>
import { ref } from 'vue';
import Sidebar from './SideBar.vue';
import ChatRoom from './ChatMessage.vue';

const users = ref([
  { id: 1, name: 'John Doe', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
  { id: 2, name: 'Jane Smith', avatar: 'https://randomuser.me/api/portraits/women/2.jpg' },
  { id: 3, name: 'Robert Brown', avatar: 'https://randomuser.me/api/portraits/men/3.jpg' },
  { id: 4, name: 'Sarah Johnson', avatar: 'https://randomuser.me/api/portraits/women/4.jpg' },
  { id: 5, name: 'David Lee', avatar: 'https://randomuser.me/api/portraits/men/5.jpg' },
  { id: 6, name: 'Emily Davis', avatar: 'https://randomuser.me/api/portraits/women/6.jpg' },
  { id: 7, name: 'Michael Chen', avatar: 'https://randomuser.me/api/portraits/men/7.jpg' },
  { id: 8, name: 'Olivia Wilson', avatar: 'https://randomuser.me/api/portraits/women/8.jpg' },
  { id: 9, name: 'Daniel Kim', avatar: 'https://randomuser.me/api/portraits/men/9.jpg' },
  { id: 10, name: 'Sophia Chen', avatar: 'https://randomuser.me/api/portraits/women/10.jpg' },
  { id: 11, name: 'Matthew Park', avatar: 'https://randomuser.me/api/portraits/men/11.jpg' },
  { id: 12, name: 'Isabella Lee', avatar: 'https://randomuser.me/api/portraits/women/12.jpg' },
  { id: 13, name: 'Ethan Nguyen', avatar: 'https://randomuser.me/api/portraits/men/13.jpg' },
  { id: 14, name: 'Ava Kim', avatar: 'https://randomuser.me/api/portraits/women/14.jpg' },
  { id: 15, name: 'Alexander Kim', avatar: 'https://randomuser.me/api/portraits/men/15.jpg' },
  { id: 16, name: 'Mia Nguyen', avatar: 'https://randomuser.me/api/portraits/women/16.jpg' },
  { id: 17, name: 'Daniel Kim', avatar: 'https://randomuser.me/api/portraits/men/17.jpg' },
  { id: 18, name: 'Olivia Wilson', avatar: 'https://randomuser.me/api/portraits/women/18.jpg' },
  { id: 19, name: 'Michael Chen', avatar: 'https://randomuser.me/api/portraits/men/19.jpg' },
  { id: 20, name: 'Emily Davis', avatar: 'https://randomuser.me/api/portraits/women/20.jpg' },
  { id: 21, name: 'Matthew Park', avatar: 'https://randomuser.me/api/portraits/men/21.jpg' },
  { id: 22, name: 'Isabella Lee', avatar: 'https://randomuser.me/api/portraits/women/22.jpg' },
  { id: 23, name: 'Ethan Nguyen', avatar: 'https://randomuser.me/api/portraits/men/23.jpg' },
  { id: 24, name: 'Ava Kim', avatar: 'https://randomuser.me/api/portraits/women/24.jpg' },
  { id: 25, name: 'Alexander Kim', avatar: 'https://randomuser.me/api/portraits/men/25.jpg' },
  { id: 26, name: 'Mia Nguyen', avatar: 'https://randomuser.me/api/portraits/women/26.jpg' },
]);

const currentUser = ref(null);
const messages = ref([]);

// Select user to chat with
const selectUser = (user) => {
  currentUser.value = user;
  // Dummy messages for the selected user
  messages.value = [
    { id: 1, text: `Hello ${user.name}!`, userId: user.id },
    { id: 2, text: 'How are you?', userId: user.id },
  ];
};

// Send message
const sendMessage = (message) => {
  if (currentUser.value) {
    messages.value.push({
      id: messages.value.length + 1,
      text: message,
      userId: 0,
    });
  }
};

// Go back to user list
const backToUserList = () => {
  currentUser.value = null;
};
</script>

<style scoped>
.flex {
  display: flex;
}
.h-screen {
  height: 100vh;
}
</style>
