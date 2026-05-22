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
      receiptHeader: '',
      receiptFooter: '',
      receiptShowSku: true,
      receiptShowPrice: true,
      receiptShowTva: true,
      receiptShowQrcode: true,
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
            store_logo: state.logoUrl,
            receipt_header: state.receiptHeader,
            receipt_footer: state.receiptFooter,
            receipt_show_sku: state.receiptShowSku,
            receipt_show_price: state.receiptShowPrice,
            receipt_show_tva: state.receiptShowTva,
            receipt_show_qrcode: state.receiptShowQrcode,
          }
        });
      },

      // Build the full settings object from flat state
      _buildSettings: () => {
        const state = get();
        return {
          store_name: state.storeName,
          store_address: state.storeAddress,
          store_phone: state.storePhone,
          currency: state.currency,
          tva_rate: String(state.tvaRate),
          store_logo: state.logoUrl,
          receipt_header: state.receiptHeader,
          receipt_footer: state.receiptFooter,
          receipt_show_sku: state.receiptShowSku,
          receipt_show_price: state.receiptShowPrice,
          receipt_show_tva: state.receiptShowTva,
          receipt_show_qrcode: state.receiptShowQrcode,
        };
      },

      // ── New Actions ────────────────────────────────────────────────

      setLogo: (url) => {
        set({ logoUrl: url });
        get()._syncSettings();
      },

      loadSettings: async (force = false) => {
        if (get().isLoaded && !force) return;
        try {
          const { data, error } = await supabase.from('settings').select('key, value');
          if (error) throw error;

          const flat = {};
          const raw = {};
          (data || []).forEach(({ key, value }) => {
            raw[key] = value;
            if (key === 'store_name')          flat.storeName = value;
            if (key === 'store_phone')         flat.storePhone = value;
            if (key === 'store_address')       flat.storeAddress = value;
            if (key === 'store_email')         flat.storeEmail = value;
            if (key === 'currency')            flat.currency = value;
            if (key === 'tva_rate')            flat.tvaRate = parseFloat(value) || 0;
            if (key === 'store_logo')          flat.logoUrl = value;
            if (key === 'receipt_header')      flat.receiptHeader = value;
            if (key === 'receipt_footer')      flat.receiptFooter = value;
            if (key === 'receipt_show_sku')    flat.receiptShowSku = value === 'true';
            if (key === 'receipt_show_price')  flat.receiptShowPrice = value === 'true';
            if (key === 'receipt_show_tva')    flat.receiptShowTva = value === 'true';
            if (key === 'receipt_show_qrcode') flat.receiptShowQrcode = value === 'true';
          });

          // Build the settings object directly from the raw fetched data,
          // not from get() which may be stale.
          const settingsFromDb = {
            store_name:          raw.store_name          ?? get().settings.store_name,
            store_address:       raw.store_address       ?? get().settings.store_address,
            store_phone:         raw.store_phone         ?? get().settings.store_phone,
            currency:            raw.currency            ?? get().settings.currency,
            tva_rate:            raw.tva_rate            ?? get().settings.tva_rate,
            store_logo:          raw.store_logo          ?? get().settings.store_logo,
            receipt_header:      raw.receipt_header      ?? get().settings.receipt_header,
            receipt_footer:      raw.receipt_footer      ?? get().settings.receipt_footer,
            receipt_show_sku:    raw.receipt_show_sku    === 'true' ? true : raw.receipt_show_sku === 'false' ? false : get().settings.receipt_show_sku,
            receipt_show_price:  raw.receipt_show_price  === 'true' ? true : raw.receipt_show_price === 'false' ? false : get().settings.receipt_show_price,
            receipt_show_tva:    raw.receipt_show_tva    === 'true' ? true : raw.receipt_show_tva === 'false' ? false : get().settings.receipt_show_tva,
            receipt_show_qrcode: raw.receipt_show_qrcode === 'true' ? true : raw.receipt_show_qrcode === 'false' ? false : get().settings.receipt_show_qrcode,
          };

          set({
            ...flat,
            settings: settingsFromDb,
            isLoaded: true
          });
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
          const { data: serverSettingsArray, error } = await supabase.from('settings').select('*');
          if (error) throw error;

          const serverSettings = {};
          serverSettingsArray?.forEach(item => { serverSettings[item.key] = item.value; });

          ['receipt_show_sku', 'receipt_show_price', 'receipt_show_tva', 'receipt_show_qrcode'].forEach(key => {
            if (serverSettings[key] === 'true') serverSettings[key] = true;
            if (serverSettings[key] === 'false') serverSettings[key] = false;
          });

          const merged = get()._buildSettings();
          Object.assign(merged, serverSettings);
          set({ settings: merged, isLoading: false });
        } catch (err) {
          console.error('Failed to fetch settings:', err);
          set({ isLoading: false });
        }
      },

      updateSettings: async (newSettings) => {
        set({ isLoading: true });
        try {
          // Map DB column keys → flat state keys for local update
          const flatUpdate = {};
          const dbColumnToFlat = {
            store_name:          'storeName',
            store_phone:         'storePhone',
            store_address:       'storeAddress',
            store_email:         'storeEmail',
            currency:            'currency',
            tva_rate:            'tvaRate',
            store_logo:          'logoUrl',
            receipt_header:      'receiptHeader',
            receipt_footer:      'receiptFooter',
            receipt_show_sku:    'receiptShowSku',
            receipt_show_price:  'receiptShowPrice',
            receipt_show_tva:    'receiptShowTva',
            receipt_show_qrcode: 'receiptShowQrcode',
          };
          for (const [dbKey, val] of Object.entries(newSettings)) {
            const flatKey = dbColumnToFlat[dbKey];
            if (flatKey) flatUpdate[flatKey] = val;
          }

          // Apply to flat state immediately
          set({ ...flatUpdate });

          // Rebuild the settings object from the updated flat state
          const merged = { ...get()._buildSettings() };
          set({ settings: merged });

          // Persist to Supabase using upsert
          for (const [key, value] of Object.entries(newSettings)) {
            await supabase.from('settings').upsert(
              { key, value: String(value) },
              { onConflict: 'key' }
            );
          }

          // Re-sync from DB to confirm everything matches
          await get().loadSettings(true);

          set({ isLoading: false });
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
        receiptHeader: state.receiptHeader,
        receiptFooter: state.receiptFooter,
        receiptShowSku: state.receiptShowSku,
        receiptShowPrice: state.receiptShowPrice,
        receiptShowTva: state.receiptShowTva,
        receiptShowQrcode: state.receiptShowQrcode,
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
