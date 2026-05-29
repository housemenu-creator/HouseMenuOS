import { motion } from "framer-motion";
import { Sun, Moon, Settings } from "lucide-react";
import type { ReactNode } from "react";

interface HeaderProps {
  dark: boolean;
  toggleTheme: () => void;
  children?: ReactNode;
}

export default function Header({ dark, toggleTheme, children }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 glass border-b border-hub-border">
      <div className="flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-hub-success animate-pulse" />
          <h1 className="text-xl font-bold tracking-tight">HouseHub</h1>
          <span className="text-xs text-hub-muted hidden sm:inline">Control Center</span>
        </div>

        <div className="flex items-center gap-4">
          {children}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-hub-border/50 transition-colors"
            title={dark ? "Modo claro" : "Modo oscuro"}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </motion.button>
          <Settings size={18} className="text-hub-muted cursor-pointer hover:text-hub-text transition-colors" />
        </div>
      </div>
    </header>
  );
}
