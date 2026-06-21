import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pdf-lib', 'pdfjs-dist', 'jspdf', 'mammoth', 'jszip'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('pdf-lib')) return 'pdf-lib';
          if (id.includes('pdfjs-dist')) return 'pdfjs';
          if (id.includes('jspdf')) return 'jspdf';
          if (id.includes('mammoth')) return 'mammoth';
          if (id.includes('jszip')) return 'jszip';
        },
      },
    },
    chunkSizeWarningLimit: 3000,
  },
})
