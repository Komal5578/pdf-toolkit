import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // pdfjs-dist is loaded dynamically from CDN at runtime — NOT bundled by Vite.
  // This avoids all optimizer/worker version-mismatch issues.
  optimizeDeps: {
    include: ['pdf-lib', 'jspdf', 'mammoth', 'jszip'],
    exclude: ['pdfjs-dist'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('pdf-lib')) return 'pdf-lib';
          if (id.includes('jspdf')) return 'jspdf';
          if (id.includes('mammoth')) return 'mammoth';
          if (id.includes('jszip')) return 'jszip';
        },
      },
    },
    chunkSizeWarningLimit: 3000,
  },
})
