<template>
  <router-view />

  <!-- Global Toasts Container -->
  <div class="fixed top-6 right-6 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
    <transition-group name="toast-anim">
      <div 
        v-for="toast in toasts" 
        :key="toast.id"
        :class="[
          'pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-center justify-between gap-3 text-xs font-semibold bg-white/95 backdrop-blur-md transition-all duration-300',
          toast.type === 'success' ? 'border-emerald-100 text-emerald-800 bg-emerald-50/95 shadow-emerald-500/5' : '',
          toast.type === 'warning' ? 'border-amber-100 text-amber-800 bg-amber-50/95 shadow-amber-500/5' : '',
          toast.type === 'error' ? 'border-red-100 text-red-800 bg-red-50/95 shadow-red-500/5' : ''
        ]"
      >
        <span>{{ toast.message }}</span>
        <button 
          @click="removeToast(toast.id)"
          class="text-[10px] uppercase font-bold text-slate-400 hover:text-slate-600 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { toasts, removeToast } from './services/toastService';
</script>

<style>
/* Global styles */
:root {
  --brand-purple: #8A3EEA;
  --brand-orange: #F3901B;
}

.text-brand-purple { color: var(--brand-purple); }
.bg-brand-purple { background-color: var(--brand-purple); }
.text-brand-orange { color: var(--brand-orange); }
.bg-brand-orange { background-color: var(--brand-orange); }

.bg-brand-purple\/10 { background-color: rgba(138, 62, 234, 0.1); }
.border-brand-purple\/20 { border-color: rgba(138, 62, 234, 0.2); }

/* Animation CSS Styles */
.toast-anim-enter-active {
  animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.toast-anim-leave-active {
  animation: toastOut 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes toastIn {
  0% {
    transform: scale(0.95) translateY(-20px);
    opacity: 0;
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

@keyframes toastOut {
  0% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
  100% {
    transform: scale(0.95) translateY(-10px);
    opacity: 0;
  }
}
</style>
