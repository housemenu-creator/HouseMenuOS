import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root of the monorepo (two levels up from apps/worker-portal)
const monoRoot = path.resolve(__dirname, '../../');

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '../../'),
  server: {
    port: 5179,
    strictPort: true,
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
})
