import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  ScrollText, 
  MessageSquare, 
  Puzzle, 
  ChefHat, 
  Terminal, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/logs", label: "Logs", icon: ScrollText },
  { to: "/conversations", label: "Chats", icon: MessageSquare },
  { to: "/explorer", label: "MCP Tools", icon: Puzzle },
  { to: "/cocina", label: "Cocina", icon: ChefHat },
  { to: "/terminal", label: "Terminal", icon: Terminal },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 240 }}
      className="border-r border-cm-border bg-cm-surface/30 hidden md:flex flex-col relative transition-all duration-300 ease-[0.25, 0.1, 0.25, 1]"
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-cm-accent text-white flex items-center justify-center shadow-lg shadow-cm-accent/40 z-50 hover:scale-110 transition-all active:scale-95"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="p-6">
        {!isCollapsed ? (
          <div className="text-[10px] font-black text-cm-text-secondary uppercase tracking-[0.2em] px-3">Menú Principal</div>
        ) : (
          <div className="h-4 w-full border-b border-cm-border/50" />
        )}
      </div>

      <div className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${
                isActive
                  ? "bg-cm-accent text-white shadow-lg shadow-cm-accent/20 font-bold"
                  : "text-cm-text-secondary hover:bg-cm-accent/5 hover:text-cm-text font-medium"
              }`
            }
          >
            <Icon size={20} className="shrink-0 transition-transform group-hover:scale-110" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="whitespace-nowrap overflow-hidden text-sm tracking-tight"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </div>

      <div className="p-6 border-t border-cm-border/50">
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cm-accent to-orange-400 border-2 border-white/20 shadow-inner shrink-0" />
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="text-[10px] font-black tracking-tight uppercase truncate">Administrador</p>
              <p className="text-[9px] text-cm-text-secondary font-bold truncate">HQ Peruvian Branch</p>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
