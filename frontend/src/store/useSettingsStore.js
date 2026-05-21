import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useSettingsStore = create((set, get) => ({
  settings: {
    store_name: 'متجر الأناقة',
    store_address: 'الجزائر العاصمة',
    store_phone: '0555123456',
    currency: 'د.ج',
    tva_rate: '19',
    receipt_header: 'أهلاً بكم في متجر الأناقة',
    receipt_footer: 'شكراً لزيارتكم! الفاتورة صالحة للإرجاع خلال 3 أيام.',
    receipt_show_sku: true,
    receipt_show_price: true,
    receipt_show_tva: true,
    receipt_show_qrcode: true,
    groq_api_key: '',
    store_logo: ''
  },
  accentColor: '#00FF7F',
  fontSize: 'normal', // small, normal, large
  themeMode: 'dark', // dark, light
  language: 'ar', // ar, en
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      get().loadLocalPreferences(); // Load initial from local
      
      const { data: serverSettingsArray, error } = await supabase.from('settings').select('*');
      if (error) throw error;
      
      const serverSettings = {};
      serverSettingsArray?.forEach(item => { serverSettings[item.key] = item.value; });
      
      // Convert boolean strings to boolean
      const parsed = { ...serverSettings };
      ['receipt_show_sku', 'receipt_show_price', 'receipt_show_tva', 'receipt_show_qrcode'].forEach(key => {
        if (parsed[key] === 'true') parsed[key] = true;
        if (parsed[key] === 'false') parsed[key] = false;
      });

      const merged = { ...get().settings, ...parsed };
      set({ settings: merged, isLoading: false });
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      set({ isLoading: false });
    }
  },

  updateSettings: async (newSettings) => {
    set({ isLoading: true });
    try {
      for (const [key, value] of Object.entries(newSettings)) {
        await supabase.from('settings').update({ value: String(value) }).eq('key', key);
      }
      
      const merged = { ...get().settings, ...newSettings };
      localStorage.setItem('pos_settings', JSON.stringify(merged));
      set({ settings: merged, isLoading: false });
      return true;
    } catch (err) {
      console.error('Failed to update settings:', err);
      set({ isLoading: false });
      throw err;
    }
  },

  uploadLogo: async (file) => {
    // For Supabase Storage, you'd upload here. Mocking for now.
    const store_logo = '/placeholder-logo.png';
    set(state => ({
      settings: { ...state.settings, store_logo }
    }));
    localStorage.setItem('pos_settings', JSON.stringify({ ...get().settings, store_logo }));
    return store_logo;
  },

  setAccentColor: (color) => {
    set({ accentColor: color });
    localStorage.setItem('pos_accent_color', color);
  },

  setFontSize: (size) => {
    set({ fontSize: size });
    localStorage.setItem('pos_font_size', size);
  },

  setThemeMode: (mode) => {
    set({ themeMode: mode });
    localStorage.setItem('pos_theme_mode', mode);
  },

  setLanguage: (lang) => {
    set({ language: lang });
    localStorage.setItem('pos_language', lang);
  },

  loadLocalPreferences: () => {
    try {
      const local = localStorage.getItem('pos_settings');
      if (local && local !== 'undefined') {
        set({ settings: JSON.parse(local) });
      }
    } catch (e) {
      console.error('Error parsing pos_settings from localStorage:', e);
    }
    const color = localStorage.getItem('pos_accent_color');
    if (color) {
      set({ accentColor: color });
    }
    const size = localStorage.getItem('pos_font_size');
    if (size) {
      set({ fontSize: size });
    }
    const theme = localStorage.getItem('pos_theme_mode');
    if (theme) {
      set({ themeMode: theme });
    }
    const lang = localStorage.getItem('pos_language');
    if (lang) {
      set({ language: lang });
    }
  }
}));

export default useSettingsStore;
