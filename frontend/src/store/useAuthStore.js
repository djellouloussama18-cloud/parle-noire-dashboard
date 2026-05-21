import { create } from 'zustand';
import { loginApi, logoutApi, getMeApi, changePasswordApi } from '../api/auth.api';

const useAuthStore = create((set, get) => ({
  user: (() => {
    try {
      const u = localStorage.getItem('user');
      return u && u !== 'undefined' ? JSON.parse(u) : null;
    } catch (e) {
      console.error('Error parsing user from localStorage:', e);
      return null;
    }
  })(),
  token: localStorage.getItem('token') || null,
  isLoading: false,
  error: null,

  login: async (usernameOrEmail, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await loginApi(usernameOrEmail, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('login_time', Date.now().toString());

      set({ token: data.token, user: data.user, isLoading: false });
      return true;
    } catch (err) {
      const errMsg = err.response?.data?.message || 'اسم المستخدم أو كلمة المرور غير صحيحة';
      set({ error: errMsg, isLoading: false });
      throw new Error(errMsg);
    }
  },

  logout: async () => {
    try {
      await logoutApi();
    } catch (e) {
      console.warn('Silent logout error on server', e);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('login_time');
    set({ token: null, user: null });
  },

  changePassword: async (otp, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      const response = await changePasswordApi(otp, newPassword);
      set({ isLoading: false });
      return response.message;
    } catch (err) {
      const errMsg = err.response?.data?.message || 'فشل تحديث كلمة المرور';
      set({ error: errMsg, isLoading: false });
      throw new Error(errMsg);
    }
  },

  checkSessionTimeout: () => {
    // Don't redirect if already on login page
    if (window.location.pathname === '/login') return;
    const loginTime = localStorage.getItem('login_time');
    if (loginTime) {
      const hoursElapsed = (Date.now() - parseInt(loginTime, 10)) / (1000 * 60 * 60);
      if (hoursElapsed >= 8) {
        console.warn('🔴 8 hours session timeout reached.');
        get().logout();
        window.location.href = '/login';
      }
    }
  }
}));

export default useAuthStore;
