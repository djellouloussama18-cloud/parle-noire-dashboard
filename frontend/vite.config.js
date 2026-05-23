import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
  ],
  optimizeDeps: {
    include: ['use-sync-external-store/shim/with-selector.js'],
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
  }
})
