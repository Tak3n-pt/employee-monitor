import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3847',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3847',
        ws: true,
      },
    },
  },
  build: {
    outDir: '../public-new',
    emptyOutDir: true,
  },
})
