import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('recharts') || id.includes('d3-')) return 'charts'
          if (
            id.includes('katex') ||
            id.includes('markdown-it') ||
            id.includes('/marked/')
          ) {
            return 'markdown'
          }
          if (id.includes('highlight.js')) return 'syntax-highlighting'
          if (id.includes('@tiptap') || id.includes('prosemirror')) return 'editor'
          if (id.includes('gsap')) return 'gsap'
          if (id.includes('radix-ui')) return 'radix-ui'
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('axios')) return 'http-vendor'
          if (
            id.includes('react-dom') ||
            id.includes('/react/') ||
            id.includes('react-router') ||
            id.includes('scheduler')
          ) {
            return 'react-vendor'
          }
          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://algo.zhiyuansofts.cn',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
