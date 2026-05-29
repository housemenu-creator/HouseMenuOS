import { Routes, Route, useLocation } from "react-router-dom";
import { useTheme } from "./hooks/useTheme";
import { useKeyboard } from "./hooks/useKeyboard";
import { requestPermission, usePushNotifier } from "./components/alerts/PushNotifier";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import { motion, AnimatePresence } from "framer-motion";

// Static imports for stability during troubleshooting
import Dashboard from "./pages/Dashboard";
import LogsPage from "./pages/Logs";
import ConversationsPage from "./pages/Conversations";
import ExplorerPage from "./pages/Explorer";
import CocinaPage from "./pages/Cocina";
import TerminalPage from "./pages/Terminal";

export default function App() {
  const { dark, toggle } = useTheme();
  const location = useLocation();
  useKeyboard();
  usePushNotifier();

  // Request notification permission once
  requestPermission();

  return (
    <div className="min-h-screen bg-hub-bg text-hub-text font-sans flex flex-col">
      <Header dark={dark} toggleTheme={toggle} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 1.01 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="h-full"
            >
              <Routes location={location}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/conversations" element={<ConversationsPage />} />
                <Route path="/explorer" element={<ExplorerPage />} />
                <Route path="/cocina" element={<CocinaPage />} />
                <Route path="/terminal" element={<TerminalPage />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
