import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, ClipboardList, TrendingUp, Settings } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import OrdersToday from './pages/OrdersToday';
import Ranking from './pages/Ranking';
import SettingsPage from './pages/Settings';
import { NexusSidebar } from '@house/ui';
import './index.css';

function Sidebar() {
  const location = useLocation();
  const links = [
    { path: '/', label: 'Dashboard', icon: <Home size={20} /> },
    { path: '/orders', label: 'Pedidos del Día', icon: <ClipboardList size={20} /> },
    { path: '/ranking', label: 'Ranking', icon: <TrendingUp size={20} /> },
    { path: '/settings', label: 'Ajustes', icon: <Settings size={20} /> },
  ];

  return (
    <aside className="w-64 border-r border-[var(--cm-border)] bg-[rgba(22,18,46,0.5)] backdrop-blur-xl hidden md:flex flex-col">
      <div className="p-6">
        <h1 className="font-sans text-[10px] text-cm-accent leading-relaxed">
          WORKER<br /><span className="text-cm-accent-hover">PORTAL</span>
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                 isActive 
                    ? 'bg-cm-accent-light text-cm-accent border border-cm-accent/30' 
                    : 'text-cm-text-secondary hover:text-cm-text hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              {link.icon}
              <span className="font-semibold">{link.label}</span>
            </Link>
          );
        })}
      </nav>
      {/* Nexus Sidebar handles back navigation now, but we can keep a local action if desired 
          Removing the back to Nexus button here to avoid duplication
      */}
    </aside>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden text-cm-text bg-cm-bg font-body">
        <NexusSidebar activeApp="worker" />
        
        {/* Inner layout for worker portal */}
        <div className="flex flex-1 pl-20 lg:pl-64 transition-all duration-300">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/orders" element={<OrdersToday />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;

