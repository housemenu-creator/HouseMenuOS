import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, UtensilsCrossed, Search, User, LogIn, Menu, X, LayoutDashboard } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { ROUTES, slugRoute, staffDashboardRoute } from '../lib/routes';
import CustomerAuthModal from './CustomerAuthModal';
import logo from '../assets/logo.jpg';

const LINKS = [
  { id: 'inicio', label: 'Inicio', path: ROUTES.HOME, icon: Home },
  { id: 'carta', label: 'Carta', path: ROUTES.CARTA, icon: UtensilsCrossed },
  { id: 'rastreo', label: 'Rastrear', path: ROUTES.RASTREO, icon: Search },
];

export default function PublicNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useTenant();
  const { user: staffUser, isAuthenticated: staffAuth } = useAuth();
  const { isAuthenticated: customerAuth, points } = useCustomerAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const to = (path) => slugRoute(slug, path);

  const isActive = (path) => {
    const fullPath = to(path);
    if (location.pathname === fullPath) return true;
    // Home active cuando es exactamente / o /r/:slug
    if (path === ROUTES.HOME) {
      return location.pathname === '/' || (slug && location.pathname === `/r/${slug}`);
    }
    return false;
  };

  const handleNav = (path) => {
    navigate(to(path));
    setMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 h-14 bg-cm-bg/80 backdrop-blur-lg border-b border-cm-border/60 shadow-sm">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <button onClick={() => handleNav(ROUTES.HOME)} className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="House" className="w-7 h-7 rounded-lg object-cover border border-cm-border shadow-cm-sm" />
            <span className="text-sm font-black tracking-widest text-cm-accent hidden sm:block">HOUSE</span>
          </button>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {LINKS.map((link) => {
              const active = isActive(link.path);
              return (
                <button
                  key={link.id}
                  onClick={() => handleNav(link.path)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    active
                      ? 'bg-cm-accent/10 text-cm-accent'
                      : 'text-cm-text-secondary hover:text-cm-text hover:bg-cm-surface'
                  }`}
                >
                  <link.icon className="w-3.5 h-3.5" />
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Right side: admin link + auth */}
          <div className="flex items-center gap-2">
            {staffAuth ? (
              <button
                onClick={() => navigate(staffDashboardRoute(staffUser?.role || 'admin'))}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-cm-accent border border-cm-accent/20 hover:bg-cm-accent/10 transition-all"
              >
                <User className="w-3.5 h-3.5" />
                Dash
              </button>
            ) : customerAuth ? (
              <button
                onClick={() => navigate(to(ROUTES.MI_CUENTA))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-cm-accent border border-cm-accent/20 hover:bg-cm-accent/10 transition-all"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{points} pts</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-cm-text-secondary hover:text-cm-accent transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Iniciar Sesión</span>
              </button>
            )}

            {/* Admin link — sutil, siempre visible */}
            <button
              onClick={() => navigate(to(ROUTES.ADMIN))}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[0.6rem] font-bold text-cm-text-tertiary hover:text-cm-accent hover:bg-cm-accent/5 transition-all uppercase tracking-wider"
            >
              <LayoutDashboard className="w-3 h-3" />
              Admin
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen((p) => !p)}
              className="md:hidden p-1.5 rounded-lg text-cm-text-secondary hover:text-cm-text hover:bg-cm-surface transition-all"
              aria-label="Menú"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed top-14 left-0 right-0 z-30 bg-cm-bg border-b border-cm-border/60 shadow-lg md:hidden"
          >
            <div className="p-4 space-y-1">
              {LINKS.map((link) => {
                const active = isActive(link.path);
                return (
                  <button
                    key={link.id}
                    onClick={() => handleNav(link.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                      active
                        ? 'bg-cm-accent/10 text-cm-accent'
                        : 'text-cm-text-secondary hover:text-cm-text hover:bg-cm-surface'
                    }`}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </button>
                );
              })}
              {/* Admin link en mobile */}
              <button
                onClick={() => { setMenuOpen(false); navigate(to(ROUTES.ADMIN)); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-cm-text-secondary hover:text-cm-accent hover:bg-cm-accent/5 transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                Admin
              </button>

              {!staffAuth && !customerAuth && (
                <button
                  onClick={() => { setMenuOpen(false); setShowAuth(true); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-cm-accent hover:bg-cm-accent/10 transition-all border-t border-cm-border/40 mt-2 pt-3"
                >
                  <LogIn className="w-4 h-4" />
                  Iniciar Sesión
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CustomerAuthModal open={showAuth} onClose={() => setShowAuth(false)} initialMode="login" />
    </>
  );
}
