import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

const useSettingsStore = create(
  persist(
    (set, get) => ({
      // Store info
      storeName: 'PARLE NIOR',
      storePhone: '',
      storeAddress: '',
      storeEmail: '',
      currency: 'د.ج',
      tvaRate: 0,
      logoUrl: '',
      isLoaded: false,

      // Legacy settings object for backward compatibility (used by Sales, Sidebar, etc.)
      settings: {
        store_name: 'PARLE NIOR',
        store_address: '',
        store_phone: '',
        currency: 'د.ج',
        tva_rate: '0',
        receipt_header: '',
        receipt_footer: '',
        receipt_show_sku: true,
        receipt_show_price: true,
        receipt_show_tva: true,
        receipt_show_qrcode: true,
        store_logo: ''
      },

      // Theme & UI prefs
      accentColor: '#00FF7F',
      fontSize: 'normal',
      themeMode: 'dark',
      language: 'ar',
      isLoading: false,

      // Sync flat fields → legacy settings object (keeps everything in sync)
      _syncSettings: () => {
        const state = get();
        set({
          settings: {
            ...state.settings,
            store_name: state.storeName,
            store_address: state.storeAddress,
            store_phone: state.storePhone,
            currency: state.currency,
            tva_rate: String(state.tvaRate),
            store_logo: state.logoUrl
          }
        });
      },

      // ── New Actions ────────────────────────────────────────────────

      setLogo: (url) => {
        set({ logoUrl: url });
        get()._syncSettings();
      },

      loadSettings: async () => {
        if (get().isLoaded) return;
        try {
          const { data, error } = await supabase.from('settings').select('key, value');
          if (error) throw error;

          const s = {};
          (data || []).forEach(({ key, value }) => {
            if (key === 'store_name')       s.storeName = value;
            if (key === 'store_phone')      s.storePhone = value;
            if (key === 'store_address')    s.storeAddress = value;
            if (key === 'store_email')      s.storeEmail = value;
            if (key === 'currency')         s.currency = value;
            if (key === 'tva_rate')         s.tvaRate = parseFloat(value) || 0;
            if (key === 'store_logo')       s.logoUrl = value;
            if (key === 'receipt_header')   s.receipt_header = value;
            if (key === 'receipt_footer')   s.receipt_footer = value;
            if (key === 'receipt_show_sku') s.receipt_show_sku = value === 'true';
            if (key === 'receipt_show_price') s.receipt_show_price = value === 'true';
            if (key === 'receipt_show_tva') s.receipt_show_tva = value === 'true';
            if (key === 'receipt_show_qrcode') s.receipt_show_qrcode = value === 'true';
          });

          set({ ...s, isLoaded: true });
          get()._syncSettings();
        } catch (err) {
          console.error('Failed to load settings:', err);
        }
      },

      saveSettings: async (newSettings) => {
        set(newSettings);
        get()._syncSettings();

        const keyMap = {
          storeName:    'store_name',
          storePhone:   'store_phone',
          storeAddress: 'store_address',
          storeEmail:   'store_email',
          currency:     'currency',
          tvaRate:      'tva_rate',
          logoUrl:      'store_logo',
        };

        for (const [stateKey, dbKey] of Object.entries(keyMap)) {
          if (newSettings[stateKey] !== undefined) {
            await supabase.from('settings').upsert(
              { key: dbKey, value: String(newSettings[stateKey]) },
              { onConflict: 'key' }
            );
          }
        }
      },

      // ── Legacy Actions (keep for backward compat) ──────────────────

      fetchSettings: async () => {
        set({ isLoading: true });
        try {
          get().loadLocalPreferences();
          const { data: serverSettingsArray, error } = await supabase.from('settings').select('*');
          if (error) throw error;

          const serverSettings = {};
          serverSettingsArray?.forEach(item => { serverSettings[item.key] = item.value; });

          ['receipt_show_sku', 'receipt_show_price', 'receipt_show_tva', 'receipt_show_qrcode'].forEach(key => {
            if (serverSettings[key] === 'true') serverSettings[key] = true;
            if (serverSettings[key] === 'false') serverSettings[key] = false;
          });

          const merged = { ...get().settings, ...serverSettings };
          set({ settings: merged, isLoading: false });
          get()._syncSettings();
        } catch (err) {
          console.error('Failed to fetch settings:', err);
          set({ isLoading: false });
        }
      },

      updateSettings: async (newSettings) => {
        set({ isLoading: true });
        try {
          // Use upsert instead of update so new keys work
          for (const [key, value] of Object.entries(newSettings)) {
            await supabase.from('settings').upsert(
              { key, value: String(value) },
              { onConflict: 'key' }
            );
          }

          const merged = { ...get().settings, ...newSettings };
          set({ settings: merged, isLoading: false });
          get()._syncSettings();
          return true;
        } catch (err) {
          console.error('Failed to update settings:', err);
          set({ isLoading: false });
          throw err;
        }
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
            const parsed = JSON.parse(local);
            set({ settings: parsed });
          }
        } catch (e) {
          console.error('Error parsing pos_settings from localStorage:', e);
        }
        const color = localStorage.getItem('pos_accent_color');
        if (color) set({ accentColor: color });
        const size = localStorage.getItem('pos_font_size');
        if (size) set({ fontSize: size });
        const theme = localStorage.getItem('pos_theme_mode');
        if (theme) set({ themeMode: theme });
        const lang = localStorage.getItem('pos_language');
        if (lang) set({ language: lang });
      }
    }),
    {
      name: 'parle-nior-settings',
      partialize: (state) => ({
        storeName: state.storeName,
        storePhone: state.storePhone,
        storeAddress: state.storeAddress,
        storeEmail: state.storeEmail,
        currency: state.currency,
        tvaRate: state.tvaRate,
        logoUrl: state.logoUrl,
        settings: state.settings,
        accentColor: state.accentColor,
        fontSize: state.fontSize,
        themeMode: state.themeMode,
        language: state.language,
        isLoaded: state.isLoaded,
      })
    }
  )
);

export default useSettingsStore;
