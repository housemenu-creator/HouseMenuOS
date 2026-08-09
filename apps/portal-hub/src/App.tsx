import { useState, useCallback, lazy, Suspense, useEffect, type FC } from 'react';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import AuthScreen from './pages/AuthScreen';
import { Loader2 } from 'lucide-react';
import { appStore } from '@house/store';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import type { Employee, ViewId } from './types';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

const SESSION_KEY = 'portal_employee';

function loadSession(): Employee | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSession(employee: Employee | null) {
  try {
    if (employee) sessionStorage.setItem(SESSION_KEY, JSON.stringify(employee));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* noop */ }
}

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-6 h-6 text-cm-accent animate-spin" />
    </div>
  );
}

const App: FC = () => {
  const [employee, setEmployee] = useState<Employee | null>(() => loadSession());
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [branchId, setBranchId] = useState(() => appStore.getState().activeBranchId);

  // Subscribe to real-time branding customization
  useEffect(() => {
    const customizationRef = ref(db, 'tenants/default/config/customization');

    const unsub = onValue(customizationRef, (snapshot) => {
      const config = snapshot.val() || {};
      const root = document.documentElement;

      const primary = config.primaryColor || '#1E2B38';
      const accent = config.accentColor || '#8A5A00';
      const fontFamily = config.fontFamily || 'Geist';
      const borderRadius = config.borderRadius || 'medium';
      const glassmorphism = config.glassmorphism !== false;

      function hexToRgb(hex: string) {
        if (!hex) return null;
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        } : null;
      }

      function adjustColorBrightness(hex: string, percent: number) {
        const rgb = hexToRgb(hex);
        if (!rgb) return hex;
        const adjust = (val: number) => Math.max(0, Math.min(255, Math.round(val + (255 - val) * percent)));
        const darken = (val: number) => Math.max(0, Math.min(255, Math.round(val * (1 + percent))));
        const r = percent > 0 ? adjust(rgb.r) : darken(rgb.r);
        const g = percent > 0 ? adjust(rgb.g) : darken(rgb.g);
        const b = percent > 0 ? adjust(rgb.b) : darken(rgb.b);
        const toHex = (c: number) => c.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      }

      root.style.setProperty('--cm-primary', primary);
      root.style.setProperty('--cm-accent', accent);

      const primaryRgb = hexToRgb(primary);
      const accentRgb = hexToRgb(accent);

      if (primaryRgb) {
        root.style.setProperty('--cm-primary-light', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.1)`);
        root.style.setProperty('--cm-primary-surface', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.06)`);
      }
      if (accentRgb) {
        root.style.setProperty('--cm-accent-light', `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.15)`);
        root.style.setProperty('--cm-accent-surface', `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.08)`);
      }

      const rootEl = document.querySelector('html');
      const isDark = rootEl?.classList.contains('dark') ?? false;
      const hoverFactor = isDark ? 0.15 : -0.15;
      root.style.setProperty('--cm-primary-hover', adjustColorBrightness(primary, hoverFactor));
      root.style.setProperty('--cm-accent-hover', adjustColorBrightness(accent, hoverFactor));

      // Google Fonts
      const GOOGLE_FONTS: Record<string, string> = {
        'Geist': 'Geist:wght@300;400;500;600;700;800',
        'Inter': 'Inter:wght@300;400;500;600;700;800',
        'Outfit': 'Outfit:wght@300;400;500;600;700;800',
        'Playfair Display': 'Playfair+Display:ital,wght@0,400..900;1,400..900',
        'Montserrat': 'Montserrat:wght@300;400;500;600;700;800',
        'Fira Code': 'Fira+Code:wght@300;400;500;600;700',
      };

      if (GOOGLE_FONTS[fontFamily]) {
        const fontSlug = GOOGLE_FONTS[fontFamily];
        const linkId = `gfont-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`;
        if (!document.getElementById(linkId)) {
          if (!document.getElementById('gfonts-preconnect-api')) {
            const pc1 = document.createElement('link');
            pc1.id = 'gfonts-preconnect-api';
            pc1.rel = 'preconnect';
            pc1.href = 'https://fonts.googleapis.com';
            document.head.appendChild(pc1);

            const pc2 = document.createElement('link');
            pc2.id = 'gfonts-preconnect-static';
            pc2.rel = 'preconnect';
            pc2.href = 'https://fonts.gstatic.com';
            pc2.crossOrigin = 'anonymous';
            document.head.appendChild(pc2);
          }

          const link = document.createElement('link');
          link.id = linkId;
          link.rel = 'stylesheet';
          link.href = `https://fonts.googleapis.com/css2?family=${fontSlug}&display=swap`;
          document.head.appendChild(link);
        }
        root.style.setProperty('--cm-font', `'${fontFamily}', system-ui, sans-serif`);
      } else {
        root.style.setProperty('--cm-font', 'Geist, system-ui, sans-serif');
      }

      const radiusScale: Record<string, Record<string, string>> = {
        none: { sm: '0px', md: '0px', lg: '0px', xl: '0px', '2xl': '0px' },
        soft: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', '2xl': '1rem' },
        medium: { sm: '0.625rem', md: '0.875rem', lg: '1.25rem', xl: '1.75rem', '2xl': '2.5rem' },
        large: { sm: '1rem', md: '1.25rem', lg: '1.75rem', xl: '2.25rem', '2xl': '3.25rem' },
        full: { sm: '9999px', md: '9999px', lg: '9999px', xl: '9999px', '2xl': '9999px' },
      };
      const currentScale = radiusScale[borderRadius] || radiusScale.medium;
      root.style.setProperty('--cm-radius-sm', currentScale.sm);
      root.style.setProperty('--cm-radius-md', currentScale.md);
      root.style.setProperty('--cm-radius-lg', currentScale.lg);
      root.style.setProperty('--cm-radius-xl', currentScale.xl);
      root.style.setProperty('--cm-radius-2xl', currentScale['2xl']);

      if (!glassmorphism) {
        root.style.setProperty('--cm-glass-bg', 'var(--cm-surface)');
        root.style.setProperty('--cm-glass-blur', '0px');
        root.style.setProperty('--cm-glass-border', 'var(--cm-border)');
      } else {
        const glassBg = isDark ? 'rgba(42, 61, 78, 0.72)' : 'rgba(255, 255, 255, 0.72)';
        root.style.setProperty('--cm-glass-bg', glassBg);
        root.style.setProperty('--cm-glass-blur', '20px');
        root.style.setProperty('--cm-glass-border', isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.3)');
      }
    });

    return unsub;
  }, []);

  // Subscribe to branch changes from shared store
  useEffect(() => {
    const unsub = appStore.subscribe((state) => {
      setBranchId(state.activeBranchId);
    });
    return unsub;
  }, []);

  const handleAuthenticated = useCallback((emp: Employee) => {
    setEmployee(emp);
    saveSession(emp);
  }, []);

  const handleLogout = useCallback(() => {
    setEmployee(null);
    setActiveView('dashboard');
    saveSession(null);
  }, []);

  if (!employee) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <Layout
      activeView={activeView}
      onNavigate={setActiveView}
      employee={employee}
      branchId={branchId}
      onLogout={handleLogout}
    >
      <AnimatePresence mode="wait">
        <Suspense fallback={<PageFallback />}>
          {((): React.ReactNode => {
            switch (activeView) {
              case 'dashboard':  return <DashboardPage key="dashboard" employee={employee} branchId={branchId} />;
              case 'schedule':   return <SchedulePage key="schedule" employee={employee} branchId={branchId} />;
              case 'tasks':      return <TasksPage key="tasks" employee={employee} branchId={branchId} />;
              case 'attendance': return <AttendancePage key="attendance" employee={employee} branchId={branchId} />;
              case 'admin':      return <AdminPage key="admin" employee={employee} branchId={branchId} />;
              case 'profile':    return <ProfilePage key="profile" employee={employee} branchId={branchId} />;
              default:           return <DashboardPage key="dashboard" employee={employee} branchId={branchId} />;
            }
          })()}
        </Suspense>
      </AnimatePresence>
    </Layout>
  );
};

export default App;
