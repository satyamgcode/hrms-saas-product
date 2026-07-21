<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { 
  getCurrentSession, 
  getUserProfile, 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '../../services/api';
import searchIcon from '../../assets/icons/search.svg';

const searchQuery = ref('');
const router = useRouter();
const isAdmin = ref(false);
const currentUserId = ref(null);
const currentCompanyId = ref(1);

const notifications = ref([]);
const showNotificationsDropdown = ref(false);

const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.read).length;
});

const loadNotifications = async () => {
  if (currentUserId.value) {
    try {
      const data = await getNotifications(currentUserId.value, currentCompanyId.value, isAdmin.value);
      notifications.value = data;
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  }
};

const toggleNotifications = async () => {
  showNotificationsDropdown.value = !showNotificationsDropdown.value;
  if (showNotificationsDropdown.value) {
    await loadNotifications();
  }
};

const handleMarkAllAsRead = async () => {
  if (currentUserId.value) {
    try {
      await markAllNotificationsAsRead(currentUserId.value, currentCompanyId.value);
      notifications.value.forEach(n => n.read = true);
    } catch (e) {
      console.error('Error marking all as read:', e);
    }
  }
};

const handleMarkAsRead = async (notification) => {
  if (notification.read) return;
  try {
    await markNotificationAsRead(notification.id, currentCompanyId.value);
    notification.read = true;
  } catch (e) {
    console.error('Error marking notification as read:', e);
  }
};

const closeNotifications = (e) => {
  if (!e.target.closest('.notifications-wrapper')) {
    showNotificationsDropdown.value = false;
  }
};

const navigateToSettings = () => {
  router.push('/settings');
};

const navigateToAdmin = () => {
  router.push('/admin/dashboard');
};

let intervalId = null;

onMounted(async () => {
  window.addEventListener('click', closeNotifications);
  try {
    const session = await getCurrentSession();
    const authUser = session?.user;
    if (authUser) {
      currentUserId.value = authUser.id;
      const profile = await getUserProfile({ userId: authUser.id });
      isAdmin.value = profile?.role?.toLowerCase() === 'admin';
      currentCompanyId.value = profile?.companyId || 1;
      
      await loadNotifications();
      
      // Auto reload notifications every 30 seconds for live updates
      intervalId = setInterval(loadNotifications, 30000);
    }
  } catch (error) {
    console.error('Error checking admin role in header:', error);
  }
});

onUnmounted(() => {
  window.removeEventListener('click', closeNotifications);
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>

<template>
  <div class="flex items-center gap-4">
    <!-- Search Bar -->
    <div class="relative group hidden md:block">
      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors">
        <img :src="searchIcon" class="w-4 h-4 opacity-40 group-focus-within:opacity-100 transition-opacity" />
      </div>
      <input 
        type="text" 
        v-model="searchQuery"
        placeholder="Search employee directory, policies..." 
        class="block w-64 lg:w-[420px] pl-11 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-brand-purple/5 focus:border-brand-purple focus:bg-white transition-all shadow-sm"
      />
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2.5">
      <!-- Notification Button & Dropdown -->
      <div class="relative notifications-wrapper">
        <button @click="toggleNotifications" 
                class="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-brand-purple hover:bg-brand-purple/10 hover:border-brand-purple/20 shadow-sm transition-all duration-200 relative">
          <i class="mdi mdi-bell-outline text-lg"></i>
          <span v-if="unreadCount > 0" class="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 border border-white rounded-full animate-pulse"></span>
        </button>

        <!-- Dropdown Card -->
        <div v-if="showNotificationsDropdown" 
             class="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white border border-gray-150 rounded-3xl shadow-2xl z-[150] overflow-hidden animate-in fade-in slide-in-from-top-3 duration-250">
          <!-- Popover Header -->
          <div class="px-5 py-4 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
            <h4 class="font-black text-gray-900 text-xs tracking-tight flex items-center gap-1.5">
              <i class="mdi mdi-bell-ring-outline text-brand-purple text-base"></i>
              Notifications
              <span v-if="unreadCount > 0" class="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-black rounded-full uppercase tracking-wider">{{ unreadCount }} New</span>
            </h4>
            <button v-if="unreadCount > 0" @click="handleMarkAllAsRead" class="text-[9px] font-black text-brand-purple uppercase tracking-widest hover:text-purple-750 transition-colors">
              Mark all read
            </button>
          </div>

          <!-- Popover List -->
          <div class="max-h-80 overflow-y-auto divide-y divide-gray-50 custom-scrollbar">
            <div v-for="notif in notifications" :key="notif.id" 
                 @click="handleMarkAsRead(notif)"
                 :class="['p-4 flex gap-3 cursor-pointer transition-all hover:bg-purple-50/30', !notif.read ? 'bg-purple-50/15' : '']">
              <!-- Type Icon -->
              <div class="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center" 
                   :class="[
                     notif.type === 'success' ? 'bg-green-50 text-green-600' :
                     notif.type === 'warning' ? 'bg-yellow-50 text-yellow-600' :
                     notif.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                   ]">
                <i class="mdi text-base" 
                   :class="[
                     notif.type === 'success' ? 'mdi-checkbox-marked-circle-outline' :
                     notif.type === 'warning' ? 'mdi-alert-circle-outline' :
                     notif.type === 'error' ? 'mdi-close-circle-outline' : 'mdi-information-outline'
                   ]"></i>
              </div>

              <!-- Message details -->
              <div class="flex-grow min-w-0">
                <p class="text-xs font-bold text-gray-900 leading-snug">{{ notif.title }}</p>
                <p class="text-[11px] text-gray-500 font-medium leading-relaxed mt-0.5">{{ notif.message }}</p>
                <p class="text-[9px] text-gray-400 font-semibold mt-1">
                  {{ new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }} &middot; {{ new Date(notif.created_at).toLocaleDateString() }}
                </p>
              </div>

              <!-- Unread status dot -->
              <div v-if="!notif.read" class="flex-shrink-0 self-center">
                <span class="w-2 h-2 bg-brand-purple rounded-full block"></span>
              </div>
            </div>

            <!-- Empty state -->
            <div v-if="notifications.length === 0" class="py-10 text-center px-4">
              <div class="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-gray-100">
                <i class="mdi mdi-bell-off-outline text-2xl text-gray-400"></i>
              </div>
              <p class="text-xs font-bold text-gray-900">All caught up!</p>
              <p class="text-[11px] text-gray-400 font-medium mt-0.5">No notifications right now.</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Settings Button -->
      <button @click="navigateToSettings" class="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-brand-purple hover:bg-brand-purple/10 hover:border-brand-purple/20 shadow-sm transition-all duration-200" title="Account Settings">
        <i class="mdi mdi-cog-outline text-lg"></i>
      </button>

      <!-- Admin Panel Switch -->
      <button 
        v-if="isAdmin" 
        @click="navigateToAdmin" 
        class="flex items-center gap-2 px-5 py-2.5 bg-brand-purple text-white hover:bg-brand-purple/95 font-bold text-xs rounded-xl transition-all duration-200 active:scale-95 shadow-md shadow-brand-purple/20 border border-brand-purple/10"
        title="Access Administrative Console"
      >
        <i class="mdi mdi-shield-crown text-sm"></i>
        <span>Admin Panel</span>
      </button>
    </div>
  </div>
</template>