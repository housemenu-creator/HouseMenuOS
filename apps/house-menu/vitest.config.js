import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const monoRoot = path.resolve(__dirname, '../../');

export default defineConfig({
  test: {
    pool: 'forks',
    globals: true,
    environment: 'jsdom',
    testTimeout: 15_000,
    env: {
      VITE_ENCRYPTION_PEPPER: 'house_portal_os_dev_pepper_2026_segura',
      VITE_ENABLE_VOUCHER_OCR: 'true',
    },
    setupFiles: ['./src/test/env-setup.js', './src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'src/**/*.test.*',
        'src/test/**',
        'src/**/*.d.ts',
        'src/main.jsx',
      ],
    },
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
