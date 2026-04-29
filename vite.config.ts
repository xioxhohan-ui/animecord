import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        secure: false,
      },
      '/src/avatar frame': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    }
  },
  // Ensure avatar frames are served in dev mode
  assetsInclude: ['**/*.PNG'],
})
