import React, { memo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';
import {
  UtensilsCrossed,
  ChefHat,
  Truck,
  Search,
  Settings,
  LayoutGrid,
  ChevronRight,
  X,
  Menu,
  ClipboardList,
  LogOut,
  User,
} from 'lucide-react';

const SECTIONS = [
  {
    id: 'customer',
    path: '/',
    label: 'Carta & Pedidos',
    sublabel: 'Menú Digital',
    icon: UtensilsCrossed,
    color: 'text-cm-accent',
    bg: 'bg-cm-accent/10',
    activeBg: 'bg-cm-accent',
    hint: null,
  },
  {
    id: 'cocina',
    path: '/cocina',
    label: 'Cocina KDS',
    sublabel: 'Módulo de Cocina',
    icon: ChefHat,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    activeBg: 'bg-orange-500',
    hint: 'PIN: 1234',
  },
  {
    id: 'despacho',
    path: '/despacho',
    label: 'Despacho',
    sublabel: 'Panel de Reparto',
    icon: Truck,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    activeBg: 'bg-blue-500',
    hint: 'PIN: 5678',
  },
  {
    id: 'rastreo',
    path: '/rastreo',
    label: 'Rastrear Pedido',
    sublabel: 'Seguimiento',
    icon: Search,
    color: 'text-green-600',
    bg: 'bg-green-500/10',
    activeBg: 'bg-green-600',
    hint: null,
  },
  {
    id: 'mozo',
    path: '/mozo',
    label: 'Mozo',
    sublabel: 'Toma de Pedidos',
    icon: ClipboardList,
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
    activeBg: 'bg-teal-500',
    hint: 'PIN: 0000',
  },
  {
    id: 'admin',
    path: '/admin',
    label: 'Admin Hub',
    sublabel: 'Panel de Control',
    icon: Settings,
    color: 'text-purple-600',
    bg: 'bg-purple-500/10',
    activeBg: 'bg-purple-600',
    hint: 'PIN: admin',
  },
];

function HouseMenuNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { branches, activeBranchId, setActiveBranchId } = useBranch();

  const { user, logout } = useAuth();

  const currentSection = SECTIONS.find(s =>
    s.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(s.path)
  ) || SECTIONS[0];

  const handleNav = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-cm-border flex-col z-50 shadow-cm-md">
        {/* Brand */}
        <div className="p-6 border-b border-cm-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cm-accent flex items-center justify-center font-black text-white text-lg rounded-none border border-cm-border shadow-cm-md">
              H
            </div>
            <div>
              <p className="font-black text-cm-text text-base leading-tight">HOUSE</p>
              <p className="text-[0.6rem] font-bold text-cm-muted tracking-widest uppercase">Menu System</p>
            </div>
          </div>
          
          {/* Branch Selector */}
          <div className="mt-4">
            <label className="text-[0.6rem] font-bold text-cm-muted uppercase tracking-widest mb-1 block">Sucursal Activa</label>
            <select 
              value={activeBranchId}
              onChange={(e) => setActiveBranchId(e.target.value)}
              className="w-full bg-cm-bg border-2 border-cm-border rounded-lg p-2 text-sm font-bold text-cm-text focus:outline-none focus:border-cm-accent transition-colors cursor-pointer"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Nav label */}
        <div className="px-6 pt-5 pb-2">
          <p className="text-[0.6rem] font-bold text-cm-muted tracking-[0.2em] uppercase flex items-center gap-1.5">
            <LayoutGrid className="w-3 h-3" /> Módulos
          </p>
        </div>

        {/* Links */}
        <nav className="flex-1 px-4 space-y-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = currentSection.id === section.id;

            return (
              <button
                key={section.id}
                onClick={() => handleNav(section.path)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all group border-2 ${
                  isActive
                    ? `${section.activeBg} text-white border-cm-border shadow-cm-md`
                    : `bg-transparent text-cm-muted border-transparent hover:bg-cm-accent/5 hover:border-cm-border`
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isActive ? 'bg-white/20' : section.bg
                }`}>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : section.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold leading-tight ${isActive ? 'text-white' : 'text-cm-text'}`}>
                    {section.label}
                  </p>
                  {import.meta.env.DEV && (
                    <p className={`text-[0.65rem] font-bold mt-0.5 ${isActive ? 'text-white/70' : 'text-cm-muted'}`}>
                      {section.sublabel}
                    </p>
                  )}
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-white/70 flex-shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* Footer — User Info + Logout */}
        <div className="p-4 border-t-2 border-cm-border space-y-2">
          {user ? (
            <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-cm-accent/10 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-cm-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-cm-text truncate">{user.name || user.email}</p>
                  <p className="text-[0.55rem] font-bold text-cm-muted uppercase tracking-wider">{user.role}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-cm-error/10 hover:bg-cm-error/20 text-cm-error text-[0.65rem] font-bold transition-colors"
              >
                <LogOut className="w-3 h-3" /> Cerrar Sesión
              </button>
            </div>
          ) : (
            <div className="bg-cm-accent/5 border border-cm-accent/20 rounded-xl p-3">
              <p className="text-[0.65rem] font-bold text-cm-muted uppercase tracking-widest mb-1">Módulo Activo</p>
              <p className="text-sm font-black text-cm-accent">{currentSection.label}</p>
            </div>
          )}
          {import.meta.env.DEV && currentSection.hint && (
            <p className="text-[0.6rem] text-cm-muted/50 text-center font-bold">
              {currentSection.hint}
            </p>
          )}
        </div>
      </aside>

      {/* ── Mobile Hamburger ────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-cm-border flex items-center justify-between px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-cm-accent flex items-center justify-center font-black text-white border border-cm-border shadow-cm-md">
            H
          </div>
          <span className="font-black text-cm-text text-sm">{currentSection.label}</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg border-2 border-cm-border text-cm-text"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/40 z-50"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="md:hidden fixed left-0 top-0 h-full w-72 bg-white border-r border-cm-border z-50 flex flex-col p-5 justify-between"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-cm-accent flex items-center justify-center font-black text-white border-2 border-cm-border">H</div>
                  <span className="font-black text-cm-text">House Menu</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 border-2 border-cm-border rounded-lg text-cm-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Branch Selector */}
              <div className="mb-6 px-1">
                <label className="text-[0.6rem] font-bold text-cm-muted uppercase tracking-widest mb-1 block">Sucursal Activa</label>
                <select 
                  value={activeBranchId}
                  onChange={(e) => setActiveBranchId(e.target.value)}
                  className="w-full bg-cm-bg border-2 border-cm-border rounded-lg p-2 text-sm font-bold text-cm-text focus:outline-none focus:border-cm-accent transition-colors cursor-pointer"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <nav className="space-y-2">
                {SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const isActive = currentSection.id === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => handleNav(section.path)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left border-2 transition-all ${
                        isActive
                          ? `${section.activeBg} text-white border-cm-border shadow-cm-md`
                          : 'bg-transparent text-cm-muted border-transparent hover:bg-cm-accent/5'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : section.color}`} />
                      <div>
                        <p className={`text-sm font-bold ${isActive ? 'text-white' : 'text-cm-text'}`}>{section.label}</p>
                        {import.meta.env.DEV && (
                          <p className={`text-[0.65rem] font-bold ${isActive ? 'text-white/70' : 'text-cm-muted'}`}>{section.sublabel}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </nav>

              {/* Mobile User + Logout */}
              <div className="mt-auto pt-4 border-t border-cm-border">
                {user ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-cm-accent/10 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-cm-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-cm-text truncate">{user.name || user.email}</p>
                        <p className="text-[0.55rem] font-bold text-cm-muted uppercase tracking-wider">{user.role}</p>
                      </div>
                    </div>
                    <button onClick={logout} className="p-2 rounded-lg text-cm-error hover:bg-cm-error/10 transition-colors" title="Cerrar sesión">
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <p className="text-[0.65rem] text-cm-muted text-center font-bold">Sesión no iniciada</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(HouseMenuNav);
