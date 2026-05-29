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
  server: { port: 5183, host: true },
  resolve: {
    alias: {
      "react": path.resolve(monoRoot, "node_modules/react"),
      "react-dom": path.resolve(monoRoot, "node_modules/react-dom"),
    },
    preserveSymlinks: true,
  },
})
