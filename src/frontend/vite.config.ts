/// <reference types="node" />
/// <reference types="vite/client" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Compute __dirname in ESM context
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@contracts': resolve(__dirname, '../../contracts'),
      '@libs': resolve(__dirname, '../../libs'),
      '@backend': resolve(__dirname, '../backend'),
      '@config': resolve(__dirname, '../../config'),
    },
  },
  define: {
    global: 'globalThis',
  },
  server: {
    port: 3001,
    host: true,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ethers: ['ethers'],
          reown: ['@reown/appkit', '@reown/appkit-adapter-ethers'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['ethers', '@reown/appkit', '@reown/appkit-adapter-ethers'],
  },
  esbuild: {
    target: 'es2020',
  },
})