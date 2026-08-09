import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root of the monorepo (two levels up from apps/house-menu)
const monoRoot = path.resolve(__dirname, '../../');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  envDir: path.resolve(__dirname, '.'),
  server: {
    port: 5176,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Force all packages to use the SAME React instance from root
      "react": path.resolve(monoRoot, "node_modules/react"),
      "react-dom": path.resolve(monoRoot, "node_modules/react-dom"),
      "react-router-dom": path.resolve(monoRoot, "node_modules/react-router-dom"),
    },
    preserveSymlinks: true,
  },
  optimizeDeps: {
    include: ['clsx', 'react-router-dom', 'framer-motion', 'lucide-react', 'firebase/app', 'firebase/database', 'firebase/firestore', 'firebase/auth', 'firebase/storage'],
    exclude: ['@house/db', '@house/store', '@house/ui', '@house/tokens'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase')) return 'firebase';
          // These must share a chunk with React to prevent duplicate
          // ReactSharedInternals. Vite/Rolldown inlines React source when
          // these are in separate chunks, causing React error #310.
          if (id.includes('framer-motion') || id.includes('lucide-react')) return 'vendor';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) return 'vendor';

          // kds must share the SAME React instance as vendor. DO NOT create a
          // separate kds chunk — Rolldown inlines ReactSharedInternals into
          // each chunk, causing duplicate React instances and error #310.
          // if (id.includes('kds/') && !id.includes('KioskMode')) return 'kds';
        }
      }
    }
  }
})
