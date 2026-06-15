import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  base: '/piramid/',
  envDir: path.resolve(__dirname, '../../../'),
  server: { port: 5182, host: true },
  resolve: {
    alias: {
      "react": path.resolve(__dirname, "../../../node_modules/react"),
      "react-dom": path.resolve(__dirname, "../../../node_modules/react-dom"),
    },

  },
})
