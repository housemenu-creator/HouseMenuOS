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
  envDir: path.resolve(__dirname, '../../'),
  server: {
    port: 5176,
    host: true
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
    include: ['clsx', 'react-router-dom', 'framer-motion', 'lucide-react', 'firebase/app', 'firebase/database'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase')) return 'firebase';
          if (id.includes('node_modules/framer-motion')) return 'framer';
          if (id.includes('node_modules/lucide-react')) return 'icons';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) return 'vendor';
          if (id.includes('kds/')) return 'kds';
          if (id.includes('/customer/')) return 'customer';
        }
      }
    }
  }
})


