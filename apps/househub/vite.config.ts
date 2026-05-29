import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const monoRoot = path.resolve(__dirname, '../../');

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '../../'),
  server: { port: 5177, host: true },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react": path.resolve(monoRoot, "node_modules/react"),
      "react-dom": path.resolve(monoRoot, "node_modules/react-dom"),
      "react-router-dom": path.resolve(monoRoot, "node_modules/react-router-dom"),
    },
    preserveSymlinks: true,
  },
  optimizeDeps: {
    include: ['firebase/app', 'firebase/database', 'recharts', 'framer-motion', 'lucide-react'],
  },
})
