import { create } from 'zustand';

const useNotificationStore = create((set) => ({
  toasts: [],
  addToast: (message, type = 'success', duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }]
    }));

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, duration);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  }
}));

export default function useNotification() {
  const { toasts, addToast, removeToast } = useNotificationStore();
  
  return {
    toasts,
    showSuccess: (msg, dur) => addToast(msg, 'success', dur),
    showError: (msg, dur) => addToast(msg, 'error', dur || 5000),
    showWarning: (msg, dur) => addToast(msg, 'warning', dur),
    remove: removeToast
  };
}
