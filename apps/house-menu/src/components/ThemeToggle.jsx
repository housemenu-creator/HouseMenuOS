import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <motion.button
      onClick={toggleTheme}
      className="fixed bottom-6 right-6 z-50 inline-flex h-12 w-12 items-center justify-center rounded-cm-full border border-cm-border bg-cm-surface text-cm-text shadow-cm-lg backdrop-blur-xl transition-colors hover:bg-cm-surface-hover focus:outline-none focus:ring-2 focus:ring-cm-accent/40"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDark ? <Sun size={20} className="text-cm-warning" /> : <Moon size={20} className="text-cm-accent" />}
    </motion.button>
  );
}
