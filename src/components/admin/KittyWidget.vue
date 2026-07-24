<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { queryKitty } from '../../services/kittyService';
import { addToast } from '../../services/toastService';

const isOpen = ref(false);
const showSettings = ref(false);
const apiKey = ref('');
const selectedModel = ref('gemini-2.5-flash');
const inputMessage = ref('');
const messages = ref([]);
const isTyping = ref(false);
const chatContainer = ref(null);
const props = defineProps({
  companyId: {
    type: Number,
    required: true,
    default: 1
  }
});

// Suggestion chips
const suggestions = [
  { text: 'Who is absent today?', icon: 'mdi-account-remove-outline' },
  { text: 'How many new joined this month?', icon: 'mdi-account-multiple-plus-outline' },
  { text: 'Show candidate pipeline', icon: 'mdi-briefcase-account-outline' },
  { text: 'Active leaves today', icon: 'mdi-calendar-remove' }
];

onMounted(() => {
  // Load saved API Key, model, and message history
  apiKey.value = localStorage.getItem('kitty_api_key') || '';
  selectedModel.value = localStorage.getItem('kitty_model') || 'gemini-2.5-flash';
  
  const savedHistory = localStorage.getItem('kitty_chat_history');
  if (savedHistory) {
    try {
      messages.value = JSON.parse(savedHistory);
    } catch (e) {
      console.error('Error loading chat history:', e);
    }
  }

  // If no history, add greeting
  if (messages.value.length === 0) {
    messages.value.push({
      id: 1,
      sender: 'kitty',
      text: 'Meow! I am **Kitty**, your company database co-pilot. I can fetch live details about attendance, leaves, new joins, and candidates! Ask me anything, or try the suggestions below. 😸',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }
});

const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

const toggleChat = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    scrollToBottom();
  }
};

const saveSettings = () => {
  localStorage.setItem('kitty_api_key', apiKey.value.trim());
  localStorage.setItem('kitty_model', selectedModel.value);
  showSettings.value = false;
  addToast(apiKey.value.trim() ? `Kitty configured with ${selectedModel.value}!` : 'API Key cleared. Kitty is running in local fallback mode.', 'success');
};

const sendMessage = async (textToSend) => {
  const msgText = (textToSend || inputMessage.value).trim();
  if (!msgText) return;

  // Clear input
  if (!textToSend) {
    inputMessage.value = '';
  }

  // Push User message
  const userMsg = {
    id: Date.now(),
    sender: 'user',
    text: msgText,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  messages.value.push(userMsg);
  saveHistoryToStorage();
  scrollToBottom();

  // Show typing indicator
  isTyping.value = true;
  
  try {
    const response = await queryKitty(msgText, props.companyId, apiKey.value, selectedModel.value);
    
    // Push Kitty response
    const kittyMsg = {
      id: Date.now() + 1,
      sender: 'kitty',
      text: response,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    messages.value.push(kittyMsg);
    saveHistoryToStorage();
  } catch (error) {
    addToast('Kitty encountered an error querying the database', 'error');
  } finally {
    isTyping.value = false;
    scrollToBottom();
  }
};

const clearChat = () => {
  if (confirm('Clear Kitty chat logs?')) {
    messages.value = [
      {
        id: Date.now(),
        sender: 'kitty',
        text: 'Meow! Clean slate! What database metric can I inspect for you now? 😸',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    saveHistoryToStorage();
  }
};

const saveHistoryToStorage = () => {
  // Keep last 30 messages to avoid overfilling localStorage
  const trimmed = messages.value.slice(-30);
  localStorage.setItem('kitty_chat_history', JSON.stringify(trimmed));
};

// Markdown formatter to make responses look premium
const formatMessage = (text) => {
  if (!text) return '';
  
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold: **text** -> <strong>text</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italics: _text_ -> <em>text</em>
    .replace(/_(.*?)_/g, '<em>$1</em>')
    // Bullet points: - **item** -> <li><strong>item</strong></li>
    .replace(/^-\s+(.*)$/gm, '<li class="ml-4 list-disc pb-1 text-gray-700">$1</li>')
    // Line breaks
    .replace(/\n/g, '<br>');

  // Group multiple consecutive <li> elements in a <ul>
  formatted = formatted.replace(/(<li.*?>.*?<\/li>\s*)+/g, (match) => {
    return `<ul class="my-2 space-y-1">${match}</ul>`;
  });

  return formatted;
};
</script>

<template>
  <div>
    <!-- FLOATING ACTION BUTTON (FAB) -->
    <button @click="toggleChat"
      class="fixed bottom-6 right-6 z-[80] w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 via-brand-purple to-indigo-500 text-white shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group focus:outline-none">
      
      <!-- Pulse Ring animation -->
      <span class="absolute inset-0 rounded-full bg-brand-purple/40 animate-ping opacity-75 group-hover:animate-none"></span>
      
      <!-- Icon (Cat head) -->
      <i class="mdi mdi-cat text-2xl relative z-10 transition-transform group-hover:rotate-12"></i>
      
      <!-- Little Badge -->
      <span class="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
        <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
      </span>
    </button>

    <!-- CHAT FLOATING WINDOW -->
    <aside :class="[
      'fixed bottom-24 right-6 w-[420px] sm:w-[500px] h-[650px] sm:h-[750px] max-h-[calc(100vh-120px)] bg-white/95 border border-purple-100 shadow-2xl z-[90] flex flex-col transition-all duration-300 ease-in-out transform origin-bottom-right rounded-3xl overflow-hidden backdrop-blur-md',
      isOpen ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto' : 'translate-y-8 opacity-0 scale-95 pointer-events-none'
    ]">
      
      <!-- HEADER -->
      <header class="h-20 bg-white/95 backdrop-blur-md border-b border-purple-100 px-6 flex items-center justify-between flex-shrink-0 z-10 relative">
        <div class="flex items-center gap-3">
          <!-- Branded Avatar matching Layout -->
          <div class="relative flex-shrink-0">
            <div class="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-150 flex items-center justify-center text-brand-purple shadow-sm">
              <i class="mdi mdi-cat text-2xl"></i>
            </div>
            <!-- Status dot indicator -->
            <span class="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
              <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            </span>
          </div>
          
          <div class="text-left">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-black tracking-tight text-gray-950 leading-none">Kitty AI</h3>
              <span class="px-2 py-0.5 text-[9px] font-black uppercase bg-purple-50 text-brand-purple border border-purple-100 rounded-md tracking-wider leading-none shadow-sm">
                CO-PILOT
              </span>
            </div>
            <p class="text-[10px] text-gray-400 font-bold mt-1.5 flex items-center gap-1 leading-none">
              <span class="inline-block w-1.5 h-1.5 rounded-full" :class="apiKey ? 'bg-emerald-500' : 'bg-brand-orange'"></span>
              {{ apiKey ? 'Gemini 2.5 Active' : 'Local Database Engine' }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <!-- Clear Chat -->
          <button @click="clearChat" 
            class="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-150 text-gray-450 hover:text-brand-purple hover:bg-brand-purple/10 hover:border-brand-purple/20 transition-all duration-200 shadow-sm" title="Clear logs">
            <i class="mdi mdi-trash-can-outline text-base"></i>
          </button>
          <!-- Settings -->
          <button @click="showSettings = !showSettings" 
            :class="['w-9 h-9 flex items-center justify-center rounded-xl border transition-all duration-200 shadow-sm', showSettings ? 'bg-brand-purple border-brand-purple text-white shadow-md shadow-brand-purple/10' : 'bg-gray-50 border-gray-150 text-gray-450 hover:text-brand-purple hover:bg-brand-purple/10 hover:border-brand-purple/20']" title="AI Settings">
            <i class="mdi mdi-cog-outline text-base"></i>
          </button>
          <!-- Close -->
          <button @click="isOpen = false" 
            class="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-150 text-gray-450 hover:text-red-500 hover:bg-red-50 hover:border-red-150 transition-all duration-200 shadow-sm">
            <i class="mdi mdi-close text-base"></i>
          </button>
        </div>
      </header>

      <!-- DRAWER BODY CONTAINER -->
      <div class="flex-grow flex flex-col min-h-0 relative">
        
        <!-- SETTINGS PANEL (Slide down overlay) -->
        <transition enter-active-class="transition duration-200 ease-out" enter-from-class="-translate-y-2 opacity-0" enter-to-class="translate-y-0 opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="translate-y-0 opacity-100" leave-to-class="-translate-y-2 opacity-0">
          <div v-if="showSettings" class="absolute inset-x-0 top-0 bg-gray-50 border-b border-gray-100 p-5 z-20 shadow-lg">
            <h4 class="text-xs font-black uppercase text-gray-400 tracking-wider mb-2">Configure Kitty AI</h4>
            <p class="text-[11px] text-gray-500 mb-4 leading-relaxed">
              By default, Kitty answers core metrics locally. To enable full conversational capabilities, paste your 
              <a href="https://aistudio.google.com/" target="_blank" class="text-brand-purple font-bold hover:underline">Google AI Studio Gemini API Key</a> below.
            </p>
            
            <div class="space-y-3">
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Gemini API Key</label>
                <div class="relative">
                  <i class="mdi mdi-key-outline absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input v-model="apiKey" type="password" placeholder="AIzaSy..."
                    class="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple" />
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 font-sans">Generative Model</label>
                <select v-model="selectedModel"
                  class="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all">
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy)</option>
                  <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash Latest</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Heavy)</option>
                </select>
              </div>
              
              <div class="flex justify-end gap-2 pt-2">
                <button @click="showSettings = false" class="px-3.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-500 hover:bg-gray-100 transition">
                  Cancel
                </button>
                <button @click="saveSettings" class="px-3.5 py-1.5 rounded-lg bg-brand-purple text-white text-[11px] font-bold hover:bg-purple-700 transition shadow-sm shadow-brand-purple/10">
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </transition>

        <!-- CHAT MESSAGE LOGS -->
        <div ref="chatContainer" class="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50/50 custom-scrollbar">
          
          <div v-for="msg in messages" :key="msg.id" :class="['flex gap-3 max-w-[85%]', msg.sender === 'user' ? 'ml-auto flex-row-reverse' : '']">
            <!-- Avatar -->
            <div :class="['w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border', 
              msg.sender === 'user' ? 'bg-purple-50 border-purple-100 text-brand-purple' : 'bg-white border-purple-100 text-brand-purple'
            ]">
              <i :class="['mdi', msg.sender === 'user' ? 'mdi-account-outline' : 'mdi-cat']"></i>
            </div>
            
            <!-- Message Bubble -->
            <div>
              <div :class="[
                'p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm',
                msg.sender === 'user' 
                  ? 'bg-brand-purple text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 border border-purple-100/40 rounded-tl-none'
              ]">
                <div v-html="formatMessage(msg.text)"></div>
              </div>
              <span class="text-[9px] text-gray-400 block mt-1 px-1" :class="msg.sender === 'user' ? 'text-right' : ''">
                {{ msg.time }}
              </span>
            </div>
          </div>

          <!-- Typing indicator -->
          <div v-if="isTyping" class="flex gap-3 max-w-[85%]">
            <div class="w-8 h-8 rounded-full bg-white border border-purple-100 text-brand-purple flex items-center justify-center flex-shrink-0 animate-bounce">
              <i class="mdi mdi-cat"></i>
            </div>
            <div>
              <div class="bg-white border border-purple-100/40 p-3.5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                <span class="text-xs text-gray-500 font-medium">Kitty is querying database...</span>
                <span class="flex gap-1">
                  <span class="w-1.5 h-1.5 bg-brand-purple rounded-full animate-bounce duration-300"></span>
                  <span class="w-1.5 h-1.5 bg-brand-purple rounded-full animate-bounce duration-300 delay-75"></span>
                  <span class="w-1.5 h-1.5 bg-brand-purple rounded-full animate-bounce duration-300 delay-150"></span>
                </span>
              </div>
            </div>
          </div>

        </div>

        <!-- SUGGESTIONS & FOOTER -->
        <footer class="p-4 bg-white border-t border-purple-50 flex-shrink-0">
          
          <!-- Suggestions list -->
          <div v-if="messages.length < 5 && !isTyping" class="mb-3">
            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Ask Kitty about:</p>
            <div class="flex flex-wrap gap-2">
              <button v-for="chip in suggestions" :key="chip.text" @click="sendMessage(chip.text)"
                class="px-3 py-1.5 text-[10px] font-bold text-gray-600 bg-gray-50 hover:bg-purple-50 hover:text-brand-purple border border-gray-200 rounded-xl transition-all flex items-center gap-1">
                <i :class="['mdi', chip.icon, 'text-xs']"></i>
                {{ chip.text }}
              </button>
            </div>
          </div>

          <!-- Input bar -->
          <form @submit.prevent="() => sendMessage()" class="flex items-center gap-2">
            <input v-model="inputMessage" type="text" placeholder="Type your question for Kitty..." :disabled="isTyping"
              class="flex-grow px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all placeholder:text-gray-400" />
            
            <button type="submit" :disabled="!inputMessage.trim() || isTyping"
              class="w-10 h-10 flex-shrink-0 rounded-2xl bg-brand-purple text-white flex items-center justify-center shadow-md shadow-brand-purple/15 hover:bg-purple-700 transition disabled:opacity-50">
              <i class="mdi mdi-send text-base"></i>
            </button>
          </form>
        </footer>

      </div>
    </aside>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #E5E7EB;
  border-radius: 9px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #D1D5DB;
}
</style>
