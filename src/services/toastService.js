import { ref } from 'vue';

export const toasts = ref([]);

export const addToast = (message, type = 'success') => {
  const id = Date.now() + Math.random().toString(36).substr(2, 9);
  const newToast = { id, message, type };
  toasts.value.push(newToast);

  setTimeout(() => {
    removeToast(id);
  }, 4000);
};

export const removeToast = (id) => {
  toasts.value = toasts.value.filter(t => t.id !== id);
};
