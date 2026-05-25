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
        try {
          const { data, error } = await supabase.from('settings').select('key, value');
          if (error) throw error;

          const flat = {};
          (data || []).forEach(({ key, value }) => {
            switch (key) {
              case 'store_name':          flat.storeName = value; break;
              case 'store_phone':         flat.storePhone = value; break;
              case 'store_address':       flat.storeAddress = value; break;
              case 'store_email':         flat.storeEmail = value; break;
              case 'currency':            flat.currency = value; break;
              case 'tva_rate':            flat.tvaRate = parseFloat(value) || 0; break;
              case 'store_logo':          flat.logoUrl = value; break;
              case 'receipt_header':      flat.receiptHeader = value; break;
              case 'receipt_footer':      flat.receiptFooter = value; break;
              case 'receipt_show_sku':    flat.receiptShowSku = value === 'true'; break;
              case 'receipt_show_price':  flat.receiptShowPrice = value === 'true'; break;
              case 'receipt_show_tva':    flat.receiptShowTva = value === 'true'; break;
              case 'receipt_show_qrcode': flat.receiptShowQrcode = value === 'true'; break;
            }
          });

          set({
            ...flat,
            isLoaded: true,
            settings: {
              store_name:         flat.storeName ?? '',
              store_address:      flat.storeAddress ?? '',
              store_phone:        flat.storePhone ?? '',
              store_email:        flat.storeEmail ?? '',
              currency:           flat.currency ?? '',
              tva_rate:           String(flat.tvaRate ?? 0),
              store_logo:         flat.logoUrl ?? '',
              receipt_header:     flat.receiptHeader ?? '',
              receipt_footer:     flat.receiptFooter ?? '',
              receipt_show_sku:   flat.receiptShowSku ?? true,
              receipt_show_price: flat.receiptShowPrice ?? true,
              receipt_show_tva:   flat.receiptShowTva ?? true,
              receipt_show_qrcode:flat.receiptShowQrcode ?? true,
            }
          });
        } catch (err) {
          console.error('Failed to load settings:', err);
        }
      },

      saveSettings: async (newSettings) => {
        const keyMap = {
          storeName:          'store_name',
          storePhone:         'store_phone',
          storeAddress:       'store_address',
          storeEmail:         'store_email',
          currency:           'currency',
          tvaRate:            'tva_rate',
          logoUrl:            'store_logo',
          receiptHeader:      'receipt_header',
          receiptFooter:      'receipt_footer',
          receiptShowSku:     'receipt_show_sku',
          receiptShowPrice:   'receipt_show_price',
          receiptShowTva:     'receipt_show_tva',
          receiptShowQrcode:  'receipt_show_qrcode',
        };

        for (const [stateKey, dbKey] of Object.entries(keyMap)) {
          if (newSettings[stateKey] !== undefined) {
            await supabase.from('settings').upsert(
              { key: dbKey, value: String(newSettings[stateKey]) },
              { onConflict: 'key' }
            );
          }
        }

        await get().loadSettings(true);
        localStorage.setItem('pos_settings', JSON.stringify(get().settings));
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
          const keyMap = {
            store_name:         'store_name',
            store_phone:        'store_phone',
            store_address:      'store_address',
            store_email:        'store_email',
            currency:           'currency',
            tva_rate:           'tva_rate',
            store_logo:         'store_logo',
            receipt_header:     'receipt_header',
            receipt_footer:     'receipt_footer',
            receipt_show_sku:   'receipt_show_sku',
            receipt_show_price: 'receipt_show_price',
            receipt_show_tva:   'receipt_show_tva',
            receipt_show_qrcode:'receipt_show_qrcode',
            storeName:          'store_name',
            storePhone:         'store_phone',
            storeAddress:       'store_address',
            storeEmail:         'store_email',
            tvaRate:            'tva_rate',
            logoUrl:            'store_logo',
            receiptHeader:      'receipt_header',
            receiptFooter:      'receipt_footer',
            receiptShowSku:     'receipt_show_sku',
            receiptShowPrice:   'receipt_show_price',
            receiptShowTva:     'receipt_show_tva',
            receiptShowQrcode:  'receipt_show_qrcode',
          };

          for (const [stateKey, dbKey] of Object.entries(keyMap)) {
            if (newSettings[stateKey] !== undefined) {
              await supabase.from('settings').upsert(
                { key: dbKey, value: String(newSettings[stateKey]) },
                { onConflict: 'key' }
              );
            }
          }

          set({ isLoaded: false });
          await get().loadSettings(true);
          localStorage.setItem('pos_settings', JSON.stringify(get().settings));
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
            set({
              settings: parsed,
              storeName: parsed.store_name ?? get().storeName,
              storePhone: parsed.store_phone ?? get().storePhone,
              storeAddress: parsed.store_address ?? get().storeAddress,
              currency: parsed.currency ?? get().currency,
              tvaRate: parseFloat(parsed.tva_rate) || get().tvaRate,
              logoUrl: parsed.store_logo ?? get().logoUrl,
              receiptHeader: parsed.receipt_header ?? get().receiptHeader,
              receiptFooter: parsed.receipt_footer ?? get().receiptFooter,
              receiptShowSku: parsed.receipt_show_sku ?? get().receiptShowSku,
              receiptShowPrice: parsed.receipt_show_price ?? get().receiptShowPrice,
              receiptShowTva: parsed.receipt_show_tva ?? get().receiptShowTva,
              receiptShowQrcode: parsed.receipt_show_qrcode ?? get().receiptShowQrcode,
            });
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
      },

      subscribeToSettings: () => {
        const channel = supabase.channel('settings-realtime')
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'settings' },
            () => { get().loadSettings(true); }
          )
          .subscribe();
        return channel;
      },
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
