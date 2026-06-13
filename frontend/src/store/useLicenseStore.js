import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getLicenseInfo } from '../api/license.api';

const useLicenseStore = create(
  persist(
    (set) => ({
      serial: '',
      fingerprint: '',
      activatedAt: '',
      isLoading: false,
      error: null,

      loadLicenseInfo: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await getLicenseInfo();
          set({
            serial: data.serial || '',
            fingerprint: data.fingerprint || '',
            activatedAt: data.activatedAt || '',
            isLoading: false,
          });
        } catch (err) {
          set({ error: err.message, isLoading: false });
        }
      },
    }),
    {
      name: 'parle-nior-license',
      partialize: (state) => ({
        serial: state.serial,
        fingerprint: state.fingerprint,
        activatedAt: state.activatedAt,
      }),
    }
  )
);

export default useLicenseStore;
