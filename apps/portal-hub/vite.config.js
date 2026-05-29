import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const monoRoot = path.resolve(__dirname, '../../');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  envDir: path.resolve(__dirname, "../../"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react": path.resolve(monoRoot, "node_modules/react"),
      "react-dom": path.resolve(monoRoot, "node_modules/react-dom")
    },
    preserveSymlinks: true,
  }
})
