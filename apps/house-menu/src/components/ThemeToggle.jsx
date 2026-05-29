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
      className="fixed bottom-6 right-6 z-50 p-3 rounded-full backdrop-blur-xl border border-white/10 shadow-lg"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #f59e0b, #f97316)'
          : 'linear-gradient(135deg, #1e1b4b, #312e81)',
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDark ? <Sun size={20} className="text-white" /> : <Moon size={20} className="text-white" />}
    </motion.button>
  );
}
