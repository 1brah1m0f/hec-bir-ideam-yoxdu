import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * index.html → src/canvas-app. One document, one bundle, one React root.
 * The API lives in server/; the dev server proxies /api to it so the page runs
 * against the real backend in development too.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
})
