import { create } from 'zustand';

const useAuthStore = create(() => ({
  user: { id: 'default', full_name: 'Merchant Owner', email: 'merchant@local', role: 'admin' },
  isAuthenticated: true,
}));

export default useAuthStore;
