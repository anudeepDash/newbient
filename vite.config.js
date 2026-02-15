import path from 'path';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      imap: path.resolve(__dirname, './src/lib/mock.js'),
      mailparser: path.resolve(__dirname, './src/lib/mock.js'),
      nodemailer: path.resolve(__dirname, './src/lib/mock.js')
    }
  },
  build: {
    rollupOptions: {
      external: ['imap', 'mailparser', 'nodemailer', 'fs', 'net', 'tls', 'child_process']
    }
  },
  optimizeDeps: {
    exclude: ['imap', 'mailparser', 'nodemailer']
  },
  define: {
    global: 'window',
    'process.env': {}
  }
})
