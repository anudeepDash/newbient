import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        // Default chunking is safer for preventing dependency execution order issues
      }
    },
    chunkSizeWarningLimit: 2000
  }
})
