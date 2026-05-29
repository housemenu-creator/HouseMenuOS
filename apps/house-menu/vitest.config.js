import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const monoRoot = path.resolve(__dirname, '../../');

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    server: {
      deps: {
        inline: ['@house/ui', '@house/db', '@house/store'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react': path.resolve(monoRoot, 'node_modules/react'),
      'react-dom': path.resolve(monoRoot, 'node_modules/react-dom'),
    },
  },
});
